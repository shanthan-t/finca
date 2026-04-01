from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    def load_dotenv():
        return False

try:
    from .blockchain import create_block, create_genesis_block, validate_chain
    from .models import BatchCreate, BlockCreate, ValidateRequest
except ImportError:  # pragma: no cover
    from backend.blockchain import create_block, create_genesis_block, validate_chain
    from backend.models import BatchCreate, BlockCreate, ValidateRequest

load_dotenv()

app = FastAPI(
    title="Agri Blockchain Engine",
    description="Tamper-proof agricultural supply chain event service.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


@app.post("/api/v1/batches")
def create_batch(batch: BatchCreate):
    block = create_genesis_block(batch)
    return {
        "success": True,
        "block": block,
    }


@app.post("/api/v1/blocks")
def add_block(block_input: BlockCreate):
    block = create_block(block_input)
    return {
        "success": True,
        "block": block,
    }


@app.post("/api/v1/validate")
def validate(req: ValidateRequest):
    is_valid, broken_index = validate_chain(req.blocks)
    return {
        "is_valid": is_valid,
        "broken_index": broken_index,
    }
