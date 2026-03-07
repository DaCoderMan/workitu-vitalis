"""Shared Google API credential loader for Gmail and Calendar tools.

Handles token loading, refresh, and service building in one place.
"""

import os
import logging

log = logging.getLogger("bee-agent")

_services = {}


def get_google_service(api: str, version: str):
    """Build and cache a Google API service. Returns None if not configured."""
    cache_key = f"{api}:{version}"
    if cache_key in _services:
        return _services[cache_key]

    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        _default_token = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "token.json")
        token_path = os.environ.get("GOOGLE_TOKEN_PATH", _default_token)
        if not os.path.exists(token_path):
            log.warning(f"Google token not found at {token_path}")
            return None

        creds = Credentials.from_authorized_user_file(token_path)

        if creds.expired and creds.refresh_token:
            log.info(f"Refreshing expired Google credentials for {api}")
            creds.refresh(Request())

        if not creds.valid:
            log.warning(f"Google credentials invalid for {api}")
            return None

        service = build(api, version, credentials=creds)
        _services[cache_key] = service
        return service
    except Exception as e:
        log.error(f"Failed to build Google {api} service: {e}")
        return None
