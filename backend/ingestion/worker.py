"""
StackPulse Ingestion Worker.

Runs as a Cloud Run Job triggered by Cloud Scheduler every 6 hours.
Pulls from 4 sources, deduplicates, scores via ai.scorer, and updates
the digests/latest document with the top 15 items.

Usage:
    python -m ingestion.worker
"""

import asyncio
import hashlib
import logging
import os
import sys
from datetime import datetime, timezone
from functools import partial

import feedparser
import httpx
from dotenv import load_dotenv

# Resolve project root so `from db import get_db` works when run as module
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from db import get_db  # noqa: E402

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s  %(message)s",
)
logger = logging.getLogger("stackpulse.worker")

# ── Configuration ────────────────────────────────────────────────────────────

RSS_FEEDS = [
    "https://feeds.feedburner.com/blogspot/gJZg",   # Google AI
    "https://www.anthropic.com/rss.xml",
    "https://openai.com/blog/rss.xml",
]

GITHUB_REPOS = [
    "google/generative-ai-python",
    "langchain-ai/langchain",
    "run-llama/llama_index",
    "firebase/firebase-js-sdk",
]

HN_URL = (
    "https://hn.algolia.com/api/v1/search"
    "?tags=story"
    "&query=AI+model+release"
    "&hitsPerPage=20"
    "&numericFilters=points>50"
)

PRICING_URLS = [
    "https://cloud.google.com/vertex-ai/pricing",
    "https://openai.com/pricing",
]

MAX_RAW_CONTENT = 15_000  # chars — avoid oversized Firestore docs


# ── Fetchers ─────────────────────────────────────────────────────────────────


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def fetch_rss(feed_url: str) -> list[dict]:
    """Parse RSS feed in a thread (feedparser is synchronous)."""
    loop = asyncio.get_running_loop()
    parsed = await loop.run_in_executor(None, partial(feedparser.parse, feed_url))
    items = []
    for entry in parsed.entries[:5]:
        url = entry.get("link", "")
        if not url:
            continue
        items.append({
            "title": entry.get("title", ""),
            "url": url,
            "source": "RSS",
            "raw_content": entry.get("summary", "")[:MAX_RAW_CONTENT],
            "fetched_at": _now_iso(),
        })
    logger.info("RSS  %s → %d items", feed_url.split("/")[-1], len(items))
    return items


async def fetch_github(client: httpx.AsyncClient, repo: str) -> list[dict]:
    """Poll latest releases for a GitHub repo."""
    url = f"https://api.github.com/repos/{repo}/releases"
    try:
        resp = await client.get(url, headers={"User-Agent": "StackPulse/0.1"})
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("GitHub %s failed: %s", repo, exc)
        return []

    items = []
    for rel in resp.json()[:3]:
        html_url = rel.get("html_url", "")
        if not html_url:
            continue
        items.append({
            "title": f"{repo} — {rel.get('name') or rel.get('tag_name', '?')}",
            "url": html_url,
            "source": "GitHub",
            "raw_content": (rel.get("body") or "")[:MAX_RAW_CONTENT],
            "fetched_at": _now_iso(),
        })
    logger.info("GitHub %s → %d releases", repo, len(items))
    return items


async def fetch_hn(client: httpx.AsyncClient) -> list[dict]:
    """Fetch top AI stories from HN Algolia API."""
    try:
        resp = await client.get(HN_URL)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("HN fetch failed: %s", exc)
        return []

    items = []
    for hit in resp.json().get("hits", []):
        url = hit.get("url") or hit.get("story_url") or ""
        if not url:
            continue
        items.append({
            "title": hit.get("title", ""),
            "url": url,
            "source": "HN",
            "raw_content": "",
            "fetched_at": _now_iso(),
        })
    logger.info("HN → %d stories", len(items))
    return items


async def fetch_pricing(client: httpx.AsyncClient, url: str) -> list[dict]:
    """Scrape raw HTML from a pricing page for Gemini to parse."""
    try:
        resp = await client.get(url, timeout=15.0)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("Pricing %s failed: %s", url, exc)
        return []

    item = {
        "title": f"Pricing — {url.split('//')[1].split('/')[0]}",
        "url": url,
        "source": "Pricing",
        "raw_content": resp.text[:MAX_RAW_CONTENT],
        "fetched_at": _now_iso(),
    }
    logger.info("Pricing %s → scraped", url)
    return [item]


# ── Processing pipeline ─────────────────────────────────────────────────────


def _url_hash(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


def _load_scorer():
    """Try to import ai.scorer.score_item. Returns the function or None."""
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    if root_dir not in sys.path:
        sys.path.insert(0, root_dir)
    try:
        from ai.scorer import score_item
        return score_item
    except ImportError:
        logger.warning("ai.scorer not found — items will have relevance_score=0")
        return None


async def run() -> None:
    """Main ingestion pipeline."""
    db = get_db()
    if db is None:
        logger.error("Firestore unavailable — aborting ingestion")
        return

    # Load user stack for scoring context
    stack_doc = db.collection("stacks").document("demo_user").get()
    stack = stack_doc.to_dict() if stack_doc.exists else {
        "models": [], "infra": [], "frameworks": [], "spend": {},
    }
    logger.info("Loaded stack for demo_user (exists=%s)", stack_doc.exists)

    # Fetch from all sources concurrently
    async with httpx.AsyncClient(timeout=20.0) as client:
        tasks = [
            *[fetch_rss(url) for url in RSS_FEEDS],
            *[fetch_github(client, repo) for repo in GITHUB_REPOS],
            fetch_hn(client),
            *[fetch_pricing(client, url) for url in PRICING_URLS],
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    raw_items: list[dict] = []
    for r in results:
        if isinstance(r, list):
            raw_items.extend(r)
        elif isinstance(r, Exception):
            logger.warning("Fetcher raised: %s", r)

    logger.info("Total raw items fetched: %d", len(raw_items))

    # Deduplicate + score + store
    score_func = _load_scorer()
    processed: list[dict] = []

    for item in raw_items:
        url = item.get("url")
        if not url:
            continue

        doc_id = _url_hash(url)
        doc_ref = db.collection("items").document(doc_id)

        if doc_ref.get().exists:
            continue  # already ingested

        item["id"] = doc_id
        item["category"] = "watch"
        item["impact_summary"] = ""
        item["cost_impact"] = None
        item["relevance_score"] = 0.0

        if score_func:
            try:
                scored = score_func(item, stack)
                item["relevance_score"] = scored.get("relevance_score", 0.0)
                item["impact_summary"] = scored.get("impact_summary", "")
                item["category"] = scored.get("category", "watch")
                item["cost_impact"] = scored.get("cost_impact")
            except Exception:
                logger.exception("Scoring failed for %s", doc_id)

        doc_ref.set(item)
        processed.append(item)

    logger.info("New items stored: %d", len(processed))

    # Build digest — top 15 by relevance_score
    if processed:
        processed.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
        top15 = processed[:15]
        db.collection("digests").document("latest").set({
            "items": top15,
            "generated_at": _now_iso(),
        })
        logger.info("Updated digests/latest with %d items", len(top15))
    else:
        logger.info("No new items — digest unchanged")


# ── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    asyncio.run(run())
