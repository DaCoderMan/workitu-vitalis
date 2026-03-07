"""Bee Vault API — FastAPI server exposing Obsidian vault tools over HTTP."""

import os
import sys
from pathlib import Path

# Ensure agent dir is importable
AGENT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(AGENT_DIR))

# Set brain path if not already set
if not os.environ.get("BEE_BRAIN_PATH"):
    os.environ["BEE_BRAIN_PATH"] = str(AGENT_DIR.parent)

from dotenv import load_dotenv
load_dotenv(AGENT_DIR / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.auth import api_key_middleware
from api.routes import router
from api.gmail_routes import gmail_router
from api.gcal_routes import gcal_router

app = FastAPI(
    title="Ria API",
    description="REST API for Ria AI — vault, Gmail, Calendar, and more.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(api_key_middleware)
app.include_router(router, prefix="/api/vault")
app.include_router(gmail_router, prefix="/api/gmail")
app.include_router(gcal_router, prefix="/api/gcal")
