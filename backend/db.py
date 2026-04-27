"""
Firestore client singleton.
Import `get_db()` from here — never init Firebase elsewhere.
"""

import os
import logging
import firebase_admin
from firebase_admin import firestore

logger = logging.getLogger("stackpulse.db")

_db = None
_initialized = False


def get_db():
    """Return a Firestore client, or None if Firebase cannot init."""
    global _db, _initialized

    if _initialized:
        return _db

    _initialized = True

    try:
        if not firebase_admin._apps:
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
            opts = {"projectId": project_id} if project_id else {}
            firebase_admin.initialize_app(options=opts)

        database_id = os.environ.get("FIRESTORE_DATABASE", "(default)")
        if database_id and database_id != "(default)":
            _db = firestore.client(database_id=database_id)
        else:
            _db = firestore.client()

        logger.info("Firestore client ready (database=%s)", database_id)
    except Exception:
        logger.exception("Firebase init failed — running without Firestore")
        _db = None

    return _db
