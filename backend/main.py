"""
StackPulse REST API — FastAPI application.

Endpoints:
  GET  /health           → liveness probe
  POST /api/stack        → save user tech stack to Firestore
  GET  /api/digest       → return scored digest items
  GET  /api/item/{id}    → return full item detail
  POST /api/chat         → SSE stream from Gemini via ai.scorer
"""

import os
import sys
import logging
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from google.api_core import exceptions as gcp_exceptions
from pydantic import BaseModel

from db import get_db

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s  %(message)s",
)
logger = logging.getLogger("stackpulse.api")

# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(title="StackPulse API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler for GCP errors ──────────────────────────────────

@app.exception_handler(gcp_exceptions.GoogleAPICallError)
async def gcp_error_handler(request: Request, exc: gcp_exceptions.GoogleAPICallError):
    logger.error("Firestore RPC error: %s", exc)
    return JSONResponse(
        status_code=503,
        content={"detail": f"Firestore unavailable: {exc.message}"},
    )


# ── Models ───────────────────────────────────────────────────────────────────


class StackPayload(BaseModel):
    models: List[str]
    infra: List[str]
    frameworks: List[str]
    spend: Dict[str, float]


class ChatPayload(BaseModel):
    message: str
    item_id: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def _require_db():
    """Return Firestore client or raise 503."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Firestore unavailable")
    return db


# ── Endpoints ────────────────────────────────────────────────────────────────


@app.get("/health")
def health():
    return {"status": "ok", "service": "stackpulse-backend"}


@app.post("/api/stack")
def save_stack(payload: StackPayload):
    db = _require_db()
    db.collection("stacks").document("demo_user").set(payload.model_dump())
    logger.info("Saved stack for demo_user")
    return {"success": True, "stack_id": "demo_user"}


@app.get("/api/digest")
def get_digest():
    db = _require_db()
    doc = db.collection("digests").document("latest").get()
    if not doc.exists:
        return {"items": [], "generated_at": None}

    data = doc.to_dict()
    items = data.get("items", [])
    items.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
    return {"items": items, "generated_at": data.get("generated_at")}


@app.get("/api/item/{item_id}")
def get_item(item_id: str):
    db = _require_db()
    doc = db.collection("items").document(item_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Item not found")
    return doc.to_dict()


@app.post("/api/chat")
def chat_endpoint(payload: ChatPayload):
    # Resolve ai/ module path (one level above /backend)
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if root_dir not in sys.path:
        sys.path.insert(0, root_dir)

    try:
        from ai.scorer import chat as scorer_chat  # noqa: WPS433
    except ImportError:
        logger.warning("ai.scorer module not found")
        raise HTTPException(status_code=501, detail="ai.scorer not implemented")

    # If item_id provided, fetch context from Firestore
    item_context = None
    if payload.item_id:
        db = get_db()
        if db:
            doc = db.collection("items").document(payload.item_id).get()
            if doc.exists:
                item_context = doc.to_dict()

    generator = scorer_chat(payload.message, item_context)
    return StreamingResponse(generator, media_type="text/event-stream")


# ── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
