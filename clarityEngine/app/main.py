from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .api.endpoints  import router as api_router

load_dotenv()

app = FastAPI(
    title="Clarity Engine API",
    description="An AI solution to demistify complex legal documents.",
    version="1.0.0"
)

origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://127.0.0.1",
    "http://127.0.0.1:8000",
    "null"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)

app.include_router(api_router, prefix="/api")

@app.get("/", tags=["Health Check"])
def read_root():
    return {"status": "ok", "message":"Welcome to the Clarity Engine!"}