# StackPulse — AGENTS.md (Antigravity reads this file for all global rules)

## Ownership — Never write outside your assigned directory
- /frontend  → frontend branch, Member C
- /backend   → backend branch, Member A
- /ai        → ai-pipeline branch, Member B

## API Contract (frozen — do not change without team agreement)
POST /api/stack    → body: { models:[], infra:[], frameworks:[], spend:{service:amount} }
GET  /api/digest   → returns: { items:[...], generated_at: ISO }
GET  /api/item/:id → returns: { ...item, full_summary, suggested_action }
POST /api/chat     → body: { message:string, item_id?:string } → SSE stream

## Firestore Collections (frozen)
- stacks/demo_user
- items/[url_hash]
- digests/latest

## Commit Rules
- Format: [frontend|backend|ai] short description
- Push to YOUR branch only. Never push to main directly.
- Commit after every working addition, not at the end.

## Environment Variables
- GEMINI_API_KEY
- GOOGLE_CLOUD_PROJECT
- FIRESTORE_DATABASE
- NEXT_PUBLIC_API_URL (frontend only)

## Global Guards
- Never hardcode API keys anywhere
- All Gemini calls go through /ai/scorer.py only
- No auth, no multi-tenant. Single demo profile: demo_user
