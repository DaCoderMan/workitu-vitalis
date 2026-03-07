"""API key authentication and rate limiting middleware."""

import os
import time
import logging
from starlette.requests import Request
from starlette.responses import JSONResponse

log = logging.getLogger("bee-vault-api")

VAULT_API_KEY = os.environ.get("VAULT_API_KEY", "")
RATE_LIMIT = 30  # requests per minute
_rate_tracker: dict[str, list[float]] = {}

# Paths that don't require auth
PUBLIC_PATHS = {"/api/vault/health", "/docs", "/openapi.json", "/redoc"}


def _check_rate_limit(key: str) -> bool:
    """Returns True if under rate limit, False if exceeded."""
    now = time.time()
    if key not in _rate_tracker:
        _rate_tracker[key] = []
    _rate_tracker[key] = [t for t in _rate_tracker[key] if now - t < 60]
    if len(_rate_tracker[key]) >= RATE_LIMIT:
        return False
    _rate_tracker[key].append(now)
    return True


async def api_key_middleware(request: Request, call_next):
    """Validate API key and enforce rate limits."""
    path = request.url.path.rstrip("/")

    # Public endpoints skip auth
    if path in PUBLIC_PATHS:
        return await call_next(request)

    # Check API key
    if not VAULT_API_KEY:
        return JSONResponse(
            status_code=500,
            content={"error": "VAULT_API_KEY not configured on server"},
        )

    api_key = request.headers.get("X-API-Key", "")
    if api_key != VAULT_API_KEY:
        return JSONResponse(
            status_code=401,
            content={"error": "Invalid or missing API key"},
        )

    # Rate limit
    if not _check_rate_limit(api_key):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded (30 req/min)"},
        )

    return await call_next(request)
