#!/usr/bin/env python3
"""One-time Google OAuth setup for Bee agent.

Opens a browser for you to authorize Gmail + Calendar access.
Generates token.json that the VPS agent uses for API calls.

Usage:
    python agent/google_auth_setup.py
"""

import json
import os
import sys
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
]

AGENT_DIR = Path(__file__).parent
TOKEN_PATH = AGENT_DIR / "token.json"

# Read client credentials from environment variables
_client_id = os.environ.get("GOOGLE_CLIENT_ID")
_client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")

if not _client_id or not _client_secret:
    print("ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables must be set.", file=sys.stderr)
    print("Export them before running this script:", file=sys.stderr)
    print("  export GOOGLE_CLIENT_ID='your-client-id.apps.googleusercontent.com'", file=sys.stderr)
    print("  export GOOGLE_CLIENT_SECRET='GOCSPX-...'", file=sys.stderr)
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
    print("=== Google OAuth Setup for Bee Agent ===", flush=True)

    creds = None

    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
        if creds and creds.valid:
            print("Token already valid!", flush=True)
            _test_apis(creds)
            return
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing expired token...", flush=True)
            creds.refresh(Request())
            TOKEN_PATH.write_text(creds.to_json())
            print(f"Token refreshed and saved to: {TOKEN_PATH}", flush=True)
            _test_apis(creds)
            return

    print("Starting OAuth flow...", flush=True)
    print("A browser window will open. Sign in and grant access.", flush=True)
    sys.stdout.flush()

    flow = InstalledAppFlow.from_client_config(CLIENT_CONFIG, SCOPES)
    creds = flow.run_local_server(port=8085, open_browser=True)

    TOKEN_PATH.write_text(creds.to_json())
    print(f"\nToken saved to: {TOKEN_PATH}", flush=True)

    _test_apis(creds)


def _test_apis(creds):
    from googleapiclient.discovery import build

    try:
        service = build("gmail", "v1", credentials=creds)
        profile = service.users().getProfile(userId="me").execute()
        print(f"Gmail OK: {profile['emailAddress']}", flush=True)
    except Exception as e:
        print(f"Gmail test failed: {e}", flush=True)

    try:
        service = build("calendar", "v3", credentials=creds)
        events = service.events().list(calendarId="primary", maxResults=1).execute()
        print(f"Calendar OK: {len(events.get('items', []))} events", flush=True)
    except Exception as e:
        print(f"Calendar test failed: {e}", flush=True)


if __name__ == "__main__":
    main()
