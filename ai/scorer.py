"""
scorer.py — StackPulse AI relevance scorer and digest generator.
Gemini is used for ALL scoring and digest work. Never Cerebras/Groq.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from llm_client import LLMClient

_PROMPTS_DIR = Path(__file__).parent / "prompts"

_REQUIRED_SCORE_KEYS = {
    "stack_relevance": 5,
    "cost_impact_score": 5,
    "action_urgency": 5,
    "relevance_score": 0.0,
    "impact_summary": "No summary available.",
    "category": "radar",
    "cost_impact": {
        "current_service": None,
        "current_monthly_cost": None,
        "alternative_name": None,
        "alternative_monthly_cost": None,
        "savings": None,
        "confidence": "unknown",
    },
}


def _load_prompt(name: str) -> str:
    return (_PROMPTS_DIR / f"{name}.xml").read_text(encoding="utf-8")


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_score_keys(parsed: dict) -> dict:
    """Fill any missing keys with safe defaults."""
    result = dict(_REQUIRED_SCORE_KEYS)
    result.update(parsed)
    # Ensure cost_impact sub-dict is complete
    default_ci = dict(_REQUIRED_SCORE_KEYS["cost_impact"])
    if isinstance(result.get("cost_impact"), dict):
        default_ci.update(result["cost_impact"])
    result["cost_impact"] = default_ci
    return result


def score_item(item: dict, stack: dict) -> dict[str, Any]:
    """
    Score a single digest item against the founder's stack using Gemini.

    Args:
        item: Dict with keys: title, raw_content, source (and any other metadata).
        stack: Founder's declared stack dict.

    Returns:
        Merged dict of item + score fields + scored_at timestamp.
    """
    client = LLMClient()
    template = _load_prompt("score_prompt")

    prompt = (
        template
        .replace("{stack_json}", json.dumps(stack, indent=2))
        .replace("{item_title}", item.get("title", ""))
        .replace("{item_content}", str(item.get("raw_content", ""))[:800])
        .replace("{item_source}", item.get("source", ""))
    )

    raw = client.call_gemini(prompt, expect_json=True)

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {
            **item,
            "relevance_score": 0.0,
            "category": "radar",
            "impact_summary": "Could not parse AI response.",
            "stack_relevance": 0,
            "cost_impact_score": 0,
            "action_urgency": 0,
            "cost_impact": dict(_REQUIRED_SCORE_KEYS["cost_impact"]),
            "scored_at": _utcnow(),
        }

    validated = _validate_score_keys(parsed)
    return {**item, **validated, "scored_at": _utcnow()}


def generate_digest(items: list[dict], stack: dict) -> dict[str, Any]:
    """
    Generate a curated digest from a list of scored items.

    Args:
        items: List of scored item dicts (must have relevance_score).
        stack: Founder's declared stack dict.

    Returns:
        Dict with keys: summary (str), items (list, sorted by score), generated_at (str).
    """
    # Sort descending by relevance_score; default 0.0 if missing
    sorted_items = sorted(items, key=lambda x: float(x.get("relevance_score", 0.0)), reverse=True)
    top_15 = sorted_items[:15]

    # Build a token-efficient representation for the prompt
    slim_items = [
        {
            "title": it.get("title", ""),
            "impact_summary": it.get("impact_summary", ""),
            "relevance_score": it.get("relevance_score", 0.0),
            "category": it.get("category", "radar"),
        }
        for it in top_15
    ]

    client = LLMClient()
    template = _load_prompt("digest_prompt")

    prompt = (
        template
        .replace("{stack_json}", json.dumps(stack, indent=2))
        .replace("{items_json}", json.dumps(slim_items, indent=2))
    )

    summary = client.call_gemini(prompt, expect_json=False)

    return {
        "summary": summary.strip(),
        "items": top_15,
        "generated_at": _utcnow(),
    }


if __name__ == "__main__":
    # Quick smoke test (requires real .env keys)
    sample_stack = {
        "models": ["Gemini 1.5 Pro"],
        "infra": ["Cloud Run", "Firebase"],
        "frameworks": ["FastAPI"],
        "spend": {"Vertex AI": 400, "Firebase": 150},
    }
    sample_item = {
        "title": "Gemini 2.0 Flash — 50% price reduction",
        "raw_content": "Google announces 50% price reduction on Gemini 2.0 Flash input tokens effective immediately.",
        "source": "Google AI Blog",
    }
    print("Scoring item...")
    result = score_item(sample_item, sample_stack)
    print(json.dumps(result, indent=2))
