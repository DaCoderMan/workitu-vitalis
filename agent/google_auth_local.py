#!/usr/bin/env python3
"""Google OAuth setup — writes auth URL to HTML file, opens it, waits for callback."""

import os
import sys
import subprocess
import tempfile
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
]

AGENT_DIR = Path(__file__).parent
TOKEN_PATH = AGENT_DIR / "token.json"

_client_id = os.environ.get("GOOGLE_CLIENT_ID")
_client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")

if not _client_id or not _client_secret:
    print("ERROR: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.")
    sys.exit(1)

CLIENT_CONFIG = {
    "installed": {
        "client_id": _client_id,
        "client_secret": _client_secret,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["http://localhost"],
    }
}


def main():
    print("=== Google OAuth Setup ===", flush=True)

    # Check existing token
    if TOKEN_PATH.exists():
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
        if creds and creds.valid:
            print("Token already valid!", flush=True)
            _test_apis(creds)
            return
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing expired token...", flush=True)
            creds.refresh(Request())
            TOKEN_PATH.write_text(creds.to_json())
            _test_apis(creds)
            return

    flow = InstalledAppFlow.from_client_config(CLIENT_CONFIG, SCOPES)

    print("Opening browser and waiting for authorization...", flush=True)
    print(">>> CLOSE ALL OLD GOOGLE AUTH TABS FIRST <<<", flush=True)
    creds = flow.run_local_server(
        port=8085,
        open_browser=True,
        prompt="consent",
        access_type="offline",
    )

    TOKEN_PATH.write_text(creds.to_json())
    print(f"\nToken saved to: {TOKEN_PATH}", flush=True)
    _test_apis(creds)


def _test_apis(creds):
    from googleapiclient.discovery import build

    try:
        svc = build("gmail", "v1", credentials=creds)
        profile = svc.users().getProfile(userId="me").execute()
        print(f"Gmail OK: {profile['emailAddress']}", flush=True)
    except Exception as e:
        print(f"Gmail FAILED: {e}", flush=True)

    try:
        svc = build("calendar", "v3", credentials=creds)
        events = svc.events().list(calendarId="primary", maxResults=3).execute()
        print(f"Calendar OK: {len(events.get('items', []))} events", flush=True)
    except Exception as e:
        print(f"Calendar FAILED: {e}", flush=True)


if __name__ == "__main__":
    main()
