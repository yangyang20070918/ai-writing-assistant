# AI Writing Assistant

AI-powered writing tool built with **Next.js + TypeScript** (frontend) and **FastAPI + Python** (backend), using **Claude API** for AI capabilities.

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, React
- **Backend:** FastAPI, Python, Pydantic
- **AI:** Claude API (Anthropic)

## Features

- **Translation:** Japanese / English / Chinese mutual translation
- **Summarization:** Condense long text into concise summaries
- **Text Generation:** Generate articles from keywords with selectable style (blog, business, casual, technical)

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows
pip install -r requirements.txt

# Set your API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ai/translate | Translate text between languages |
| POST | /api/ai/summarize | Summarize text |
| POST | /api/ai/generate | Generate text from keywords |

## Project Structure

```
ai-writing-assistant/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI entry point
│       ├── routers/ai.py        # API route handlers
│       └── services/claude_service.py  # Claude API integration
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Home page
│   │   ├── translate/page.tsx   # Translation page
│   │   ├── summarize/page.tsx   # Summarization page
│   │   ├── generate/page.tsx    # Text generation page
│   │   └── components/          # Shared components
│   └── lib/api.ts               # API client
└── README.md
```
