# StackPulse — AGENTS.md (Antigravity reads this file for all global rules)

## Ownership — Never write outside your assigned directory

- /frontend → frontend branch, Member C
- /backend → backend branch, Member A
- /ai → ai-pipeline branch, Member B

## API Contract (frozen — do not change without team agreement)

POST /api/stack → body: { models:[], infra:[], frameworks:[], spend:{service:amount} }
GET /api/digest → returns: { items:[...], generated_at: ISO }
GET /api/item/:id → returns: { ...item, full_summary, suggested_action }
POST /api/chat → body: { message:string, item_id?:string } → SSE stream

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

## MCP Usage Ruleset

This section defines exactly when, why, and how to invoke the 5 integrated MCP servers for future agent sessions.

### Priority Order

When multiple MCPs could apply, follow this strict priority order:

1. **Context7** first for any library syntax question.
2. **Exa** second if Context7 has no result.
3. **Tavily** for any URL content extraction task.
4. **Google Compute Engine** for any deployment status check.
5. **Honeycomb** last, only on deployed environment errors.

### 1. Tavily

**Purpose:** Web extraction and crawling for the ingestion worker pipeline.

- Always use `tavily_extract` instead of writing httpx + BeautifulSoup scrapers when fetching content from a known URL.
- Always use `tavily_crawl` when you need to pull content from an entire domain (e.g. cloud.google.com/vertex-ai/pricing, openai.com/pricing).
- Always use `tavily_search` when the ingestion worker needs to find new AI-related news items beyond the hardcoded RSS feeds.
- Never write a custom HTML parser for any pricing page, blog, or changelog — Tavily handles this.
- Use `tavily_research` for deep multi-source aggregation tasks only (it is slower — do not use for per-item fetching).

### 2. Context7

**Purpose:** Live, version-accurate documentation for every library used in this project.

- Always call `resolve-library-id` then `query-docs` BEFORE writing any code that uses: FastAPI, firebase-admin, google-generativeai, httpx, feedparser, pydantic, pytest.
- Never rely on training-data knowledge for library syntax — always fetch current docs first.
- Call Context7 once per library per session — cache the result mentally, do not re-fetch the same library twice in one task.
- For FastAPI: fetch docs before writing any route, dependency injection, or middleware.
- For firebase-admin: fetch docs before writing any Firestore read, write, or transaction.
- For google-generativeai: fetch docs before writing any GenerativeModel call, streaming call, or embedding call.

### 3. Exa

**Purpose:** Real working code examples and implementation references from GitHub and the web.

- Use `get_code_context_exa` when you need a real implementation reference for: SSE streaming in FastAPI, GitHub Releases API pagination, HN Algolia API filtering, Cloud Run Job configuration, feedparser RSS patterns.
- Use `web_search_exa` when Context7 does not have docs for a specific tool or version.
- Always prefer `get_code_context_exa` over writing implementation from scratch when the pattern is well-known.
- Do not use Exa for anything Context7 already covers — Context7 is authoritative for supported libraries.

### 4. Google Compute Engine

**Purpose:** GCP infrastructure management and Cloud Run deployment verification.

- Use `get_instance_basic_info` to verify Cloud Run instances are live before running any end-to-end test.
- Use `start_instance` / `stop_instance` only during deployment verification — never during active development.
- Always call `get_instance_basic_info` before declaring a deployment successful.
- Do not use `create_instance` or `delete_instance` without explicit instruction from the user — these are destructive.

### 5. Honeycomb

**Purpose:** Live observability, error tracing, and debugging during deployment and demo.

- Do not invoke Honeycomb during active development — it is for deployed environment debugging only.
- Use `get_trace` when a deployed endpoint returns an unexpected error and the cause is not visible in logs.
- Use `get_query_history` to find the last failed ingestion worker run.
- Use `get_dataset_columns` to understand what telemetry fields are available before writing a query.
- Always try Terminal surface log inspection first — only escalate to Honeycomb if logs are insufficient.

### MCP Anti-Pattern Rules

Agents MUST NEVER do the following:

- Never write a web scraper when Tavily is available.
- Never call a library API from memory when Context7 is available.
- Never search the web with Exa for something Context7 already covers.
- Never invoke Google Compute Engine tools during active coding — deployment phase only.
- Never invoke Honeycomb before the app is deployed to a live environment.
- Never use more than 3 MCP servers in a single agent turn — token cost collapses context.
- Never call `tavily_research` for single-URL extraction — use `tavily_extract` instead.
