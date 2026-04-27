# StackPulse 🔍
> A personalized AI radar that monitors your specific tech stack and tells you the 1–2 things worth acting on this week.

## How We Used Google AI
- **Gemini 1.5 Pro (Vertex AI):** Relevance scoring engine — scores every ingested item against the user's declared stack across 3 dimensions: stack relevance, cost impact, action urgency
- **Gemini API:** Digest generation, cost impact calculation, and conversational chat ("Ask Pulse")
- **Firebase Firestore:** Real-time storage for stacks, scored items, and digests
- **Google Cloud Run:** Hosts both frontend and backend
- **Cloud Scheduler:** Triggers ingestion worker every 6 hours

## Tech Stack
- Frontend: Next.js 14, Tailwind CSS, shadcn/ui → Cloud Run
- Backend: FastAPI (Python) → Cloud Run
- AI: Gemini 1.5 Pro via google-generativeai SDK
- DB: Firebase Firestore
- Ingestion: RSS feeds, GitHub Releases API, HN Algolia API

## Installation
### Prerequisites
- Node.js 18+, Python 3.11+, Firebase project, GCP project with Vertex AI enabled

### Frontend
cd frontend && npm install && NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev

### Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload

### AI Module
cd ai && pip install -r requirements.txt

## Live Demo
[URL will be added after Cloud Run deployment]

## Team
Built at Build with AI Hackathon 2026 — GDG on Campus, FAST NUCES CFD
