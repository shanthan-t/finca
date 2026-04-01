# Finca

Finca is split into a Next.js frontend in `frontend/` and a FastAPI backend in `backend/`.

The repository root now also includes a full-stack `render.yaml` blueprint that deploys both services together on Render.

## Run Locally

Install dependencies:

```bash
npm run install:frontend
npm run install:backend
```

Create a frontend env file:

```bash
cp .env.example frontend/.env.local
```

Start both apps from the repository root:

```bash
npm run dev
```

Or run each side separately:

```bash
npm run dev:frontend
npm run dev:backend
```

Frontend: `http://127.0.0.1:3000`

Backend docs: `http://127.0.0.1:8000/docs`

## Render

- Use [`render.yaml`](/home/shanthant/Desktop/Personal/Projects/Finca/render.yaml) from the repo root for a full-stack Render blueprint.
- Use [`frontend/render.yaml`](/home/shanthant/Desktop/Personal/Projects/Finca/frontend/render.yaml) or [`backend/render.yaml`](/home/shanthant/Desktop/Personal/Projects/Finca/backend/render.yaml) only if you want to deploy each service separately.
