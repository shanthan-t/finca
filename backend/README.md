# Agri Blockchain Engine

FastAPI backend for generating tamper-proof agricultural supply chain blocks, validating block chains, and serving structured JSON to a frontend or Supabase-backed workflow.

## Project Structure

```text
.
├── backend/
│   ├── __init__.py
│   ├── blockchain.py
│   ├── main.py
│   ├── models.py
│   └── utils.py
├── render.yaml
├── requirements.txt
└── README.md
```

## Local Development

1. Create a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the API from the repository root:

```bash
python -m uvicorn backend.main:app --reload
```

You can also start it from the repository root with:

```bash
npm run dev:backend
```

Open `http://127.0.0.1:8000/docs` for Swagger UI.

## API Routes

- `GET /api/v1/health`
- `POST /api/v1/batches`
- `POST /api/v1/blocks`
- `POST /api/v1/validate`

## Example Requests

### Create a Batch

```json
{
  "batch_id": "BATCH-001",
  "crop_name": "Wheat",
  "farmer_name": "Arun Kumar",
  "farm_location": "Punjab"
}
```

### Add a Block

```json
{
  "batch_id": "BATCH-001",
  "event_type": "shipped",
  "data": {
    "shipment_id": "SHIP-1001",
    "destination": "Delhi"
  },
  "previous_hash": "LAST_BLOCK_HASH",
  "index": 1
}
```

### Validate a Chain

Send blocks in index order, oldest to newest.

```json
{
  "blocks": []
}
```

## Render Deployment

This repository includes `render.yaml` for one-click Render blueprint deployment.

- Build command: `pip install -r requirements.txt`
- Start command: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/api/v1/health`

You can deploy by creating a new Web Service in Render and pointing it at this repository, or by using the blueprint flow with `render.yaml`.
