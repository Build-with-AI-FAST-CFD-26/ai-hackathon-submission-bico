"""
scorer.py — StackPulse AI relevance scorer
Uses Gemini (primary) to score digest items against the founder's stack.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

PROMPTS_DIR = Path(__file__).parent / "prompts"


def _load_prompt(name: str) -> str:
    """Load an XML prompt file by name (without extension)."""
    path = PROMPTS_DIR / f"{name}.xml"
    return path.read_text(encoding="utf-8")


def _build_score_prompt(stack_json: dict, item: dict) -> str:
    template = _load_prompt("score_prompt")
    return (
        template
        .replace("{stack_json}", json.dumps(stack_json, indent=2))
        .replace("{item_title}", item.get("title", ""))
        .replace("{item_summary}", item.get("summary", ""))
        .replace("{item_source}", item.get("source", ""))
        .replace("{item_published}", item.get("published", ""))
    )


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def score_item(stack_json: dict, item: dict) -> dict[str, Any]:
    """
    Score a single item against the founder's stack using Gemini.

    Args:
        stack_json: The founder's declared stack (list of tools/services).
        item: A dict with keys: title, summary, source, published.

    Returns:
        Dict with keys: score, severity, reason, action_required, action_hint.
    """
    import google.generativeai as genai

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "paste_your_google_ai_studio_key_here":
        raise ValueError("GEMINI_API_KEY not configured in ai/.env")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = _build_score_prompt(stack_json, item)
    response = model.generate_content(prompt)

    raw = response.text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw.strip())


def score_items(stack_json: dict, items: list[dict]) -> list[dict]:
    """Score a list of items against the founder's stack."""
    results = []
    for item in items:
        try:
            score_data = score_item(stack_json, item)
            results.append({**item, **score_data})
        except Exception as exc:  # noqa: BLE001
            results.append({**item, "score": 0, "severity": "low", "reason": str(exc),
                            "action_required": False, "action_hint": None})
    return results


if __name__ == "__main__":
    # Quick smoke test
    sample_stack = [
        {"name": "Gemini 1.5 Pro", "type": "llm", "monthly_cost_usd": 200},
        {"name": "Firebase", "type": "database", "monthly_cost_usd": 50},
    ]
    sample_item = {
        "title": "Gemini 2.0 Flash pricing update",
        "summary": "Google announces 50% price reduction on Gemini 2.0 Flash input tokens.",
        "source": "Google Blog",
        "published": "2024-01-15",
    }
    print("Running scorer smoke test...")
    result = score_item(sample_stack, sample_item)
    print(json.dumps(result, indent=2))
