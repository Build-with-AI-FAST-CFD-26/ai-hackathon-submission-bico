"""
llm_client.py — StackPulse unified LLM client
Cerebras (primary) + Groq (fallback) for chat streaming.
Gemini exclusively for scoring and digest generation.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Generator

import google.generativeai as genai
from dotenv import load_dotenv
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

_PROMPTS_DIR = Path(__file__).parent / "prompts"

load_dotenv(dotenv_path=Path(__file__).parent / ".env")


def _load_prompt(name: str) -> str:
    """Load an XML prompt file by name (without extension)."""
    return (_PROMPTS_DIR / f"{name}.xml").read_text(encoding="utf-8")


def _strip_fences(text: str) -> str:
    """Remove markdown code fences from a string."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first line (```json or ```) and last line (```)
        inner = lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
        text = "\n".join(inner).strip()
    return text


class LLMClient:
    """Single client wrapping Cerebras, Groq, and Gemini behind a common interface."""

    def __init__(self) -> None:
        load_dotenv(dotenv_path=Path(__file__).parent / ".env")

        # Cerebras — OpenAI-compatible endpoint
        self.cerebras = OpenAI(
            api_key=os.environ["CEREBRAS_API_KEY"],
            base_url="https://api.cerebras.ai/v1",
        )
        # Groq — OpenAI-compatible endpoint
        self.groq = OpenAI(
            api_key=os.environ["GROQ_API_KEY"],
            base_url="https://api.groq.com/openai/v1",
        )
        # Gemini
        genai.configure(api_key=os.environ["GEMINI_API_KEY"])

        # Model identifiers — updated to what's actually available on each account
        self.cerebras_model = "qwen-3-235b-a22b-instruct-2507"
        self.cerebras_fallback_model = "llama3.1-8b"   # used if primary is rate-limited
        self.groq_model = "llama-3.3-70b-versatile"
        self.gemini_model = "gemini-2.5-flash"

    def _build_system_prompt(self, stack: dict, item_context: dict | None) -> str:
        """Fill chat_system.xml with founder context."""
        template = _load_prompt("chat_system")
        return (
            template
            .replace("{stack_json}", json.dumps(stack, indent=2))
            .replace(
                "{item_context_or_none}",
                json.dumps(item_context, indent=2) if item_context else "No specific item context.",
            )
        )

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
    def _cerebras_stream(self, full_messages: list[dict], model: str) -> Generator[str, None, None]:
        """Inner streaming call to Cerebras (retried separately from Groq fallback)."""
        stream = self.cerebras.chat.completions.create(
            model=model,
            messages=full_messages,
            stream=True,
            max_tokens=512,
        )
        for chunk in stream:
            yield chunk.choices[0].delta.content or ""

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
    def _groq_stream(self, full_messages: list[dict]) -> Generator[str, None, None]:
        """Inner streaming call to Groq (retried separately)."""
        stream = self.groq.chat.completions.create(
            model=self.groq_model,
            messages=full_messages,
            stream=True,
            max_tokens=512,
        )
        for chunk in stream:
            yield chunk.choices[0].delta.content or ""

    def chat_stream(
        self,
        messages: list[dict],
        stack: dict,
        item_context: dict | None = None,
    ) -> Generator[str, None, None]:
        """
        Stream a chat response from Cerebras (primary) with Groq as automatic fallback.

        Args:
            messages: Conversation history (user/assistant turns, no system message).
            stack: Founder's declared stack dict.
            item_context: Optional digest item being discussed.

        Yields:
            String chunks of the response.
        """
        system_prompt = self._build_system_prompt(stack, item_context)
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        # Try primary Cerebras model first, then internal fallback model
        for cerebras_model in (self.cerebras_model, self.cerebras_fallback_model):
            try:
                yield from self._cerebras_stream(full_messages, cerebras_model)
                return
            except Exception as exc:
                print(f"[Pulse] Cerebras ({cerebras_model}) unavailable: {type(exc).__name__}. Trying next.")

        # Cerebras exhausted — try Groq
        print("[Pulse] Cerebras unavailable, switching to Groq")
        try:
            yield from self._groq_stream(full_messages)
            return
        except Exception as exc:
            print(f"[Pulse] Groq unavailable: {type(exc).__name__}.")

        yield "Pulse is temporarily unavailable. Please try again in a moment."

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    def call_gemini(self, prompt: str, expect_json: bool = False) -> str:
        """
        Call Gemini with retry. Used exclusively for scoring and digest generation.

        Args:
            prompt: The filled prompt string.
            expect_json: If True, appends a JSON-only instruction to the prompt.

        Returns:
            Cleaned response text (fences stripped).
        """
        if expect_json:
            prompt += (
                "\n\nRespond ONLY with valid JSON. "
                "No markdown fences. No preamble. No explanation."
            )

        model = genai.GenerativeModel(self.gemini_model)
        response = model.generate_content(prompt)

        # Log token usage (no key values)
        try:
            usage = response.usage_metadata
            print(
                f"[Gemini] input_tokens={usage.prompt_token_count} "
                f"output_tokens={usage.candidates_token_count}"
            )
        except Exception:
            pass

        return _strip_fences(response.text)
