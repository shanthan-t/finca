# Finca Frontend Development Guide

Finca's frontend is a Next.js 14 App Router application for a blockchain-based agricultural supply chain platform.

This document explains how to develop, extend, and debug the frontend safely, especially around the new AI routing flow.

## Goals

The frontend is responsible for:

- rendering the user experience
- collecting user input
- calling trusted server routes
- reading and writing chain records from Supabase
- presenting AI-routed results from `/api/ai`

The frontend is not responsible for:

- computing hashes
- simulating blockchain logic
- inventing chain state
- fabricating validation results

## Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase JS
- Groq-backed AI routing through the server-side `/api/ai` route

## Project Layout

```text
frontend/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── route.ts
│   │   │   └── audio/route.ts
│   │   └── v1/
│   │       ├── batches/route.ts
│   │       ├── blocks/route.ts
│   │       └── validate/route.ts
│   ├── add-event/page.tsx
│   ├── batches/[batchId]/page.tsx
│   ├── create-batch/page.tsx
│   ├── dashboard/page.tsx
│   └── verify/page.tsx
├── components/
├── lib/
│   ├── ai/
│   │   ├── history.ts
│   │   └── router.ts
│   ├── api.ts
│   ├── blockchain-response.ts
│   ├── data.ts
│   ├── persistence.ts
│   ├── persistence-server.ts
│   ├── server-api.ts
│   ├── supabase.ts
│   ├── supabase-server.ts
│   ├── types.ts
│   └── utils.ts
├── supabase/migrations/
└── render.yaml
```

## Core Frontend Flows

### 1. Create batch

User flow:

1. User opens `/create-batch`
2. Form submits to the local frontend API adapter
3. Frontend route proxies to the backend blockchain service
4. Returned genesis block is stored in Supabase
5. UI redirects to `/batches/[batchId]`

Important files:

- `components/forms/create-batch-form.tsx`
- `lib/api.ts`
- `lib/persistence.ts`
- `app/api/v1/batches/route.ts`

### 2. Add event

User flow:

1. User opens `/add-event`
2. Frontend loads the latest block from Supabase
3. It submits the next event to the backend
4. The returned block is stored in Supabase
5. UI refreshes the batch chain

Important files:

- `components/forms/add-event-form.tsx`
- `lib/api.ts`
- `lib/persistence.ts`
- `app/api/v1/blocks/route.ts`

### 3. Validate chain

User flow:

1. User opens `/verify`
2. Frontend loads the full chain from Supabase
3. It posts the chain to `/api/v1/validate`
4. Validation status is rendered in the UI

Important files:

- `components/forms/verify-workspace.tsx`
- `lib/api.ts`
- `app/api/v1/validate/route.ts`

### 4. AI routing

User flow:

1. Frontend sends a natural-language request to `POST /api/ai`
2. The server-side router resolves intent and context
3. The router reads batch state and recent router history
4. It executes blockchain or Supabase actions
5. It returns a structured envelope for the UI
6. It logs the turn into `ai_router_history`

Important files:

- `app/api/ai/route.ts`
- `lib/ai/router.ts`
- `lib/ai/history.ts`
- `lib/persistence-server.ts`

## Environment Variables

Use these in `frontend/.env.local` during development:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
API_URL=http://127.0.0.1:8000/api/v1
API_HOSTPORT=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
FINCA_AI_MODEL=llama-3.3-70b-versatile
```

### Variable roles

- `NEXT_PUBLIC_SUPABASE_URL`
  Public Supabase project URL used by the browser and server reads.

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  Public Supabase anon key used by the browser and server reads.

- `NEXT_PUBLIC_API_URL`
  Public backend URL for browser-visible configuration.

- `API_URL`
  Direct backend URL used by server routes.

- `API_HOSTPORT`
  Alternative private-network host and port for Render deployments.

- `SUPABASE_SERVICE_ROLE_KEY`
  Recommended for server-side AI persistence and history logging.

- `GROQ_API_KEY`
  Enables model-assisted intent classification and translation.

- `FINCA_AI_MODEL`
  Controls which Groq model is used by the frontend AI router.

## Local Development

From the repository root:

```bash
npm run install:frontend
npm run install:backend
cp .env.example frontend/.env.local
npm run dev
```

Or run the frontend only:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://127.0.0.1:3000
```

Backend docs:

```text
http://127.0.0.1:8000/docs
```

## Frontend API Surface

### Blockchain adapter routes

- `POST /api/v1/batches`
- `POST /api/v1/blocks`
- `POST /api/v1/validate`

These are thin Next.js server routes that forward requests to the real blockchain backend.

### AI route

`POST /api/ai`

Request:

```json
{
  "query": "Add a shipped event for batch RICE-001",
  "session_id": "demo-session",
  "language": "en",
  "voice_mode": false,
  "response_style": "brief",
  "context": {
    "event_type": "shipped",
    "data": {
      "actor": "Transporter A",
      "location": "Chennai",
      "status": "in transit"
    }
  }
}
```

Response:

```json
{
  "assistant_message": "Added Shipped to batch RICE-001 as block 1.",
  "intent": "add_block",
  "confidence": 0.95,
  "router_plan": {
    "intent": "add_block",
    "confidence": 0.95,
    "requires_api_call": true,
    "api_calls": [],
    "history_context_used": [],
    "response_style": "brief",
    "tts_required": false,
    "follow_up_needed": false,
    "follow_up_question": null
  },
  "api_calls_made": [],
  "history_used": [],
  "execution_results": {},
  "audio_url": null,
  "requires_user_action": false,
  "follow_up_question": null,
  "session_id": "demo-session",
  "turn_id": 7,
  "router_version": "2026-04-01.2",
  "warnings": []
}
```

## AI Router Behavior

The AI route is a control layer, not a freeform chatbot.

It should:

- classify intent
- resolve missing references like "this batch" or "verify it"
- read the latest batch state from Supabase
- call the blockchain API when needed
- persist AI-created chain updates back into Supabase
- log every turn into `ai_router_history`

### Supported intents

- `create_batch`
- `add_block`
- `validate_chain`
- `get_batch_details`
- `get_dashboard_summary`
- `explain_batch`
- `translate_explain`
- `voice_explain`
- `search_history`
- `tamper_check`
- `unknown`

### Current AI limitations

- TTS is scaffolded but not yet connected to a real provider
- the route can classify with heuristics without Groq, but results are better with `GROQ_API_KEY`
- UI for the AI route is not yet implemented; the server contract is ready first

## Supabase Schema

Apply these migrations:

- `supabase/migrations/20260401_init_finca.sql`
- `supabase/migrations/20260401_add_ai_router_history.sql`

Tables used by the frontend:

- `batches`
- `blocks`
- `ai_router_history`

## Safe Extension Rules

When changing the frontend:

- do not compute blockchain hashes on the frontend
- do not fabricate chain state in UI helpers
- prefer changing adapters in `lib/api.ts` or `lib/server-api.ts` over changing many pages
- keep browser writes in `lib/persistence.ts`
- keep server writes in `lib/persistence-server.ts`
- keep AI routing logic in `lib/ai/router.ts`
- keep AI history logging in `lib/ai/history.ts`

## How To Add New Frontend Features

### Add a new AI intent

1. Add the intent to `lib/types.ts`
2. Extend intent detection in `lib/ai/router.ts`
3. Add plan generation for the intent
4. Add execution behavior for the intent
5. Update docs and any future UI that consumes `/api/ai`

### Add a new blockchain event type

1. Extend event inference in `lib/ai/router.ts`
2. Update form options in `components/forms/add-event-form.tsx`
3. Ensure the backend accepts the event shape
4. Decide which metadata fields should be suggested in the UI

### Add TTS

1. Implement a real provider in `app/api/ai/audio/route.ts`
2. Return a real `audio_url`
3. Keep text generation separate from audio generation
4. Do not block non-voice AI requests on TTS

## Testing And Verification

Recommended checks:

```bash
cd frontend
npm run typecheck
npm run build
```

Manual checks:

1. Create a batch from the UI
2. Add an event from the UI
3. Validate the chain
4. Call `POST /api/ai` for `create_batch`
5. Call `POST /api/ai` for `add_block`
6. Call `POST /api/ai` for `validate_chain`
7. Confirm `ai_router_history` rows are created

## Deployment Notes

### Frontend-only Render deployment

Use:

- `frontend/render.yaml`

Provide:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `API_URL` or `API_HOSTPORT`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`

### Full-stack Render deployment

Use the repository root:

- `render.yaml`

That blueprint deploys:

- backend service
- frontend service

and wires the frontend to the backend over private networking using `API_HOSTPORT`.

## Recommended Next Frontend Tasks

- build a dedicated AI workspace page or drawer
- show router plan details for debugging
- show warnings returned by `/api/ai`
- allow session-scoped AI history browsing
- wire real TTS audio playback
- add frontend tests for the AI route consumer

## Key Files

- `app/api/ai/route.ts`
- `lib/ai/router.ts`
- `lib/ai/history.ts`
- `lib/data.ts`
- `lib/api.ts`
- `lib/persistence.ts`
- `lib/persistence-server.ts`
- `lib/types.ts`
- `components/forms/create-batch-form.tsx`
- `components/forms/add-event-form.tsx`
- `components/forms/verify-workspace.tsx`

This guide is the frontend development reference for the current Finca codebase.
