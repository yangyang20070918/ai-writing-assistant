from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import ai

app = FastAPI(title="AI Writing Assistant API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai.router)


@app.get("/")
def root():
    return {"message": "AI Writing Assistant API", "version": "1.0.0"}
