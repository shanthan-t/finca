# Finca

Finca is a production-ready Next.js 14 frontend for a blockchain-based agricultural supply chain transparency platform.

Tagline: `From Farm to Trust — Verified.`

Additional documentation:

- [Frontend Development Guide](/home/shanthant/Desktop/Personal/Projects/Finca/frontend/FRONTEND_DEVELOPMENT.md)
- [AI Documentation](/home/shanthant/Desktop/Personal/Projects/Finca/frontend/AI_DOCUMENTATION.md)

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- GSAP
- Supabase JS client

## Pages

- `/` landing page with hero and animated supply-chain flow
- `/dashboard` batch overview
- `/create-batch` genesis batch creation
- `/add-event` append a supply-chain event
- `/batches/[batchId]` synchronized timeline + blockchain explorer
- `/verify` backend validation workspace
- `/api/ai` task-routing API for chain-aware AI planning and execution

## Core Rules Enforced

- Frontend never computes hashes
- Frontend never simulates blockchain logic
- FastAPI owns `/batches`, `/blocks`, and `/validate`
- Supabase is used for persistence and retrieval only
- Each batch is rendered as a chain, not a flat event list

## Environment

Copy `.env.example` to `.env.local` and set:

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

Notes:

- `API_URL` is the direct backend URL for server-side blockchain calls.
- `API_HOSTPORT` is an alternative for Render private networking. When present, the frontend constructs `http://<API_HOSTPORT>/api/v1`.
- `SUPABASE_SERVICE_ROLE_KEY` is recommended for server-side AI history and chain persistence.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

If you want to launch the whole project from the repository root instead, use:

```bash
cd ..
npm run install:frontend
npm run install:backend
cp .env.example frontend/.env.local
npm run dev
```

Production checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Data Flow

Create batch:

1. Frontend submits batch metadata to `POST /batches`
2. FastAPI creates the genesis block
3. Frontend persists the returned batch and genesis block in Supabase
4. UI reads the batch and chain from Supabase

Add event:

1. Frontend fetches the latest block for the selected batch from Supabase
2. Frontend sends event payload to `POST /blocks`
3. FastAPI creates the next block
4. Frontend persists the returned block in Supabase
5. UI re-renders the stored chain

Validate:

1. Frontend fetches the stored chain from Supabase
2. Frontend sends it to `POST /validate`
3. Validation status drives green glow or broken-chain visuals

AI route:

1. Frontend posts a user query to `POST /api/ai`
2. The router loads recent tool history and relevant batch state from Supabase
3. It builds a strict JSON plan for the required blockchain or data action
4. The execution layer runs the selected API calls
5. Create-batch and add-block AI actions persist returned blockchain records back into Supabase
6. The final assistant envelope and audit trail are stored in `ai_router_history`

## AI Route Contract

Example request:

```json
{
  "query": "Add a shipped event for batch RICE-001",
  "session_id": "demo-session",
  "language": "en",
  "voice_mode": false,
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

Example response:

```json
{
  "assistant_message": "Added Shipped to batch RICE-001 as block 1.",
  "intent": "add_block",
  "confidence": 0.95,
  "router_plan": {
    "intent": "add_block",
    "confidence": 0.95,
    "requires_api_call": true,
    "api_calls": [
      {
        "service": "python_blockchain",
        "endpoint": "/blocks",
        "method": "POST",
        "payload": {}
      }
    ],
    "history_context_used": [],
    "response_style": "brief",
    "tts_required": false,
    "follow_up_needed": false,
    "follow_up_question": null
  },
  "api_calls_made": [
    {
      "endpoint": "/blocks",
      "method": "POST",
      "service": "python_blockchain",
      "ok": true
    }
  ],
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

## Supabase Migration Notes

Apply both migrations in order:

- `frontend/supabase/migrations/20260401_init_finca.sql`
- `frontend/supabase/migrations/20260401_add_ai_router_history.sql`

The second migration adds the durable AI audit trail used for cross-turn tool memory.

## Render Deployment

- `frontend/render.yaml` deploys only the Next.js app and expects you to provide `API_URL` or `API_HOSTPORT`.
- The repository-root [`render.yaml`](/home/shanthant/Desktop/Personal/Projects/Finca/render.yaml) deploys both frontend and backend together.
- The root blueprint wires the frontend to the backend over Render private networking through `API_HOSTPORT`.

## API Adapter Note

Because the exact earlier JSON contract was not available in this workspace, the request adapter is centralized in [lib/api.ts](/home/naren/Documents/Finca/lib/api.ts). The current implementation assumes:

- `POST /batches` accepts batch metadata
- `POST /blocks` accepts `batch_id`, `event_type`, `data`, `previous_hash`, and `index`
- `POST /validate` accepts `blocks`

If your FastAPI service uses slightly different field names or nesting, update only [lib/api.ts](/home/naren/Documents/Finca/lib/api.ts) rather than touching the UI.

## Key Files

- [app/page.tsx](/home/naren/Documents/Finca/app/page.tsx)
- [app/dashboard/page.tsx](/home/naren/Documents/Finca/app/dashboard/page.tsx)
- [app/batches/[batchId]/page.tsx](/home/naren/Documents/Finca/app/batches/[batchId]/page.tsx)
- [components/chain/chain-explorer.tsx](/home/naren/Documents/Finca/components/chain/chain-explorer.tsx)
- [components/forms/add-event-form.tsx](/home/naren/Documents/Finca/components/forms/add-event-form.tsx)
- [components/forms/verify-workspace.tsx](/home/naren/Documents/Finca/components/forms/verify-workspace.tsx)
- [lib/data.ts](/home/naren/Documents/Finca/lib/data.ts)
- [lib/api.ts](/home/naren/Documents/Finca/lib/api.ts)

## Verification Status

The app passes:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Security Note

`npm audit --omit dev` reports a high-severity advisory on the `next@14` line itself. This project stays on Next 14 because that version is a hard requirement for the hackathon brief. After the event, the cleanest remediation path is upgrading to a newer major Next.js release that contains the upstream fixes.
