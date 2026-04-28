"""
tests/test_scorer.py — StackPulse AI pipeline test suite.
ALL network calls are mocked. Zero real API calls.
"""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Ensure the ai/ directory is on the path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import scorer
import chat

# ---------------------------------------------------------------------------
# Test fixtures
# ---------------------------------------------------------------------------

MOCK_STACK = {
    "models": ["Gemini 1.5 Pro"],
    "infra": ["Cloud Run", "Firebase"],
    "frameworks": ["FastAPI"],
    "spend": {"Vertex AI": 400, "Firebase": 150, "Cloud Run": 280},
}

MOCK_ITEM = {
    "title": "Gemini Flash 2.0 — 40% cheaper inference",
    "source": "Google AI Blog",
    "url": "https://blog.google/gemini-flash-2",
    "raw_content": "Google released Gemini Flash 2.0 with price reductions.",
}

MOCK_GEMINI_SCORE = json.dumps({
    "stack_relevance": 9,
    "cost_impact_score": 8,
    "action_urgency": 7,
    "relevance_score": 8.0,
    "impact_summary": "Flash 2.0 cuts your Vertex AI costs by ~40%.",
    "category": "act",
    "cost_impact": {
        "current_service": "Vertex AI Gemini 1.5 Pro",
        "current_monthly_cost": 400,
        "alternative_name": "Gemini Flash 2.0",
        "alternative_monthly_cost": 220,
        "savings": 180,
        "confidence": "estimated",
    },
})

MOCK_DIGEST_SUMMARY = "**Gemini Flash 2.0 cuts your AI spend by 40%**\n\nACT NOW\n- Switch to Flash 2.0 to save ~$180/month on Vertex AI."

MOCK_CEREBRAS_CHUNKS = ["Hello", " founder"]


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_llm_client_mock(gemini_return: str = MOCK_GEMINI_SCORE) -> MagicMock:
    mock = MagicMock()
    mock.call_gemini.return_value = gemini_return
    mock.chat_stream.return_value = iter(MOCK_CEREBRAS_CHUNKS)
    return mock


# ---------------------------------------------------------------------------
# Tests — scorer.py
# ---------------------------------------------------------------------------

class TestScoreItem(unittest.TestCase):

    @patch("scorer.LLMClient")
    def test_score_item_returns_required_fields(self, MockLLMClient):
        MockLLMClient.return_value = _make_llm_client_mock()
        result = scorer.score_item(MOCK_ITEM, MOCK_STACK)

        required = {
            "stack_relevance", "cost_impact_score", "action_urgency",
            "relevance_score", "impact_summary", "category", "cost_impact", "scored_at",
        }
        for key in required:
            self.assertIn(key, result, f"Missing key: {key}")

    @patch("scorer.LLMClient")
    def test_score_item_category_act_on_high_scores(self, MockLLMClient):
        MockLLMClient.return_value = _make_llm_client_mock()
        result = scorer.score_item(MOCK_ITEM, MOCK_STACK)
        self.assertEqual(result["category"], "act")

    @patch("scorer.LLMClient")
    def test_score_item_handles_json_parse_failure(self, MockLLMClient):
        mock = _make_llm_client_mock(gemini_return="not json")
        MockLLMClient.return_value = mock
        result = scorer.score_item(MOCK_ITEM, MOCK_STACK)

        # Should not raise — must return a graceful fallback dict
        self.assertIsInstance(result, dict)
        self.assertEqual(result["relevance_score"], 0.0)
        self.assertEqual(result["category"], "radar")
        self.assertIn("scored_at", result)

    @patch("scorer.LLMClient")
    def test_score_item_scored_at_present(self, MockLLMClient):
        MockLLMClient.return_value = _make_llm_client_mock()
        result = scorer.score_item(MOCK_ITEM, MOCK_STACK)
        self.assertIn("scored_at", result)
        self.assertIsInstance(result["scored_at"], str)
        self.assertTrue(len(result["scored_at"]) > 0)


# ---------------------------------------------------------------------------
# Tests — scorer.generate_digest
# ---------------------------------------------------------------------------

class TestGenerateDigest(unittest.TestCase):

    def _make_items(self, scores: list[float]) -> list[dict]:
        return [
            {
                "title": f"Item {i}",
                "raw_content": "content",
                "source": "src",
                "relevance_score": score,
                "impact_summary": f"Impact {i}",
                "category": "watch",
            }
            for i, score in enumerate(scores)
        ]

    @patch("scorer.LLMClient")
    def test_generate_digest_sorts_by_relevance(self, MockLLMClient):
        mock = MagicMock()
        mock.call_gemini.return_value = MOCK_DIGEST_SUMMARY
        MockLLMClient.return_value = mock

        items = self._make_items([3.0, 9.0, 1.5, 7.5, 5.0])
        result = scorer.generate_digest(items, MOCK_STACK)

        scores = [it["relevance_score"] for it in result["items"]]
        self.assertEqual(scores, sorted(scores, reverse=True),
                         "Items must be sorted by relevance_score descending")
        self.assertEqual(result["items"][0]["relevance_score"], 9.0)

    @patch("scorer.LLMClient")
    def test_generate_digest_returns_correct_keys(self, MockLLMClient):
        mock = MagicMock()
        mock.call_gemini.return_value = MOCK_DIGEST_SUMMARY
        MockLLMClient.return_value = mock

        items = self._make_items([5.0, 7.0])
        result = scorer.generate_digest(items, MOCK_STACK)

        for key in ("summary", "items", "generated_at"):
            self.assertIn(key, result, f"Missing key: {key}")
        self.assertIsInstance(result["summary"], str)
        self.assertIsInstance(result["items"], list)


# ---------------------------------------------------------------------------
# Tests — chat.py
# ---------------------------------------------------------------------------

class TestChat(unittest.TestCase):

    @patch("chat.client")
    def test_chat_stream_yields_chunks(self, mock_client):
        mock_client.chat_stream.return_value = iter(MOCK_CEREBRAS_CHUNKS)

        chunks = list(chat.chat_stream("Hello", [], MOCK_STACK, None))
        self.assertEqual("".join(chunks), "Hello founder")

    @patch("chat.client")
    def test_history_trimmed_to_6_turns(self, mock_client):
        """Pass 10-turn history; captured messages arg must have len == 7 (6 + new)."""
        captured_messages: list = []

        def _capture_stream(messages, stack, item_context=None):
            captured_messages.extend(messages)
            return iter(["ok"])

        mock_client.chat_stream.side_effect = _capture_stream

        long_history = [
            {"role": "user" if i % 2 == 0 else "assistant", "content": f"turn {i}"}
            for i in range(10)
        ]

        list(chat.chat_stream("new message", long_history, MOCK_STACK, None))

        # 6 trimmed history turns + 1 new user message
        self.assertEqual(len(captured_messages), 7,
                         f"Expected 7 messages (6 history + 1 new), got {len(captured_messages)}")
        self.assertEqual(captured_messages[-1]["content"], "new message")


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    unittest.main()
