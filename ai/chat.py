"""
chat.py — Pulse chatbot interface.
Cerebras (primary) + Groq (fallback) streaming via LLMClient.
"""

from __future__ import annotations

from typing import Generator

from llm_client import LLMClient

# Module-level singleton — initialized once at import time
client = LLMClient()


def chat_stream(
    message: str,
    history: list[dict],
    stack: dict,
    item_context: dict | None = None,
) -> Generator[str, None, None]:
    """
    Stream a Pulse response for a single user message.

    Args:
        message: The new user message.
        history: Prior conversation turns (list of {role, content} dicts).
                 Trimmed to last 6 turns internally.
        stack: Founder's declared stack dict.
        item_context: Optional digest item being discussed.

    Yields:
        String chunks of the streamed response.
    """
    # Keep only the most recent 6 turns to stay within context limits
    trimmed_history = history[-6:]
    messages = trimmed_history + [{"role": "user", "content": message}]
    yield from client.chat_stream(messages, stack, item_context)


def build_greeting(stack: dict) -> str:
    """
    Generate a stack-aware 2-sentence greeting from Pulse.

    Args:
        stack: Founder's declared stack dict.

    Returns:
        A 2-sentence greeting string specific to their stack.
    """
    model_list = ", ".join(stack.get("models", ["your AI stack"]))
    infra_list = ", ".join(stack.get("infra", ["your infrastructure"]))

    greeting_prompt = (
        f"You are Pulse, the AI technical co-founder assistant inside StackPulse. "
        f"Introduce yourself in exactly 2 sentences to a founder whose stack includes "
        f"{model_list} running on {infra_list}. "
        f"Be specific to their stack. Do not be generic. Do not start with 'Great'."
    )

    chunks = list(
        client.chat_stream(
            messages=[{"role": "user", "content": greeting_prompt}],
            stack=stack,
            item_context=None,
        )
    )
    return "".join(chunks)
