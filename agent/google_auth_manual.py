#!/usr/bin/env python3
"""Manual Google OAuth setup (no browser auto-open needed).

Prints a URL — open it yourself, authorize, then paste the redirect URL back.
"""

import os
import sys
import json
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
]

AGENT_DIR = Path(__file__).parent
TOKEN_PATH = AGENT_DIR / "token.json"

_client_id = os.environ.get("GOOGLE_CLIENT_ID")
_client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")

if not _client_id or not _client_secret:
    print("ERROR: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars first.")
    sys.exit(1)

CLIENT_CONFIG = {
    "installed": {
        "client_id": _client_id,
        "client_secret": _client_secret,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
    }
}


def main():
    print("=== Google OAuth Manual Setup ===\n")

    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
        if creds and creds.valid:
            print("Token already valid!")
            _test_apis(creds)
            return
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing expired token...")
            creds.refresh(Request())
            TOKEN_PATH.write_text(creds.to_json())
            print(f"Token refreshed: {TOKEN_PATH}")
            _test_apis(creds)
            return

    flow = InstalledAppFlow.from_client_config(CLIENT_CONFIG, SCOPES)
    flow.redirect_uri = "urn:ietf:wg:oauth:2.0:oob"

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
    )

    print("1. Open this URL in your browser:\n")
    print(auth_url)
    print("\n2. Sign in and authorize access.")
    print("3. Copy the authorization code and paste it below.\n")

    code = input("Authorization code: ").strip()

    flow.fetch_token(code=code)
    creds = flow.credentials

    TOKEN_PATH.write_text(creds.to_json())
    print(f"\nToken saved to: {TOKEN_PATH}")
    _test_apis(creds)


def _test_apis(creds):
    from googleapiclient.discovery import build

    try:
        service = build("gmail", "v1", credentials=creds)
        profile = service.users().getProfile(userId="me").execute()
        print(f"Gmail OK: {profile['emailAddress']}")
    except Exception as e:
        print(f"Gmail FAILED: {e}")

    try:
        service = build("calendar", "v3", credentials=creds)
        events = service.events().list(calendarId="primary", maxResults=3).execute()
        print(f"Calendar OK: {len(events.get('items', []))} events")
    except Exception as e:
        print(f"Calendar FAILED: {e}")


if __name__ == "__main__":
    main()
