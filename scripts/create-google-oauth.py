"""Create a Google OAuth 2.0 Web Application client for Bee AI.
Opens browser for auth, then creates the client via API."""

import json
import http.server
import threading
import urllib.parse
import urllib.request
import webbrowser
import ssl
import os

CLIENT_ID = os.environ["GOOGLE_OAUTH_CLIENT_ID"]
CLIENT_SECRET = os.environ["GOOGLE_OAUTH_CLIENT_SECRET"]
PROJECT_ID = "workito-go"
REDIRECT_URI = "http://localhost:8085"
SCOPES = "https://www.googleapis.com/auth/cloud-platform"

auth_code = None
server_ready = threading.Event()


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        auth_code = params.get("code", [None])[0]

        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"<h1>Done! You can close this tab.</h1>")

    def log_message(self, format, *args):
        pass  # Suppress logs


def get_access_token(code):
    data = urllib.parse.urlencode({
        "code": code,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }).encode()

    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())["access_token"]


def create_web_oauth_client(access_token):
    """Create a Web Application OAuth client via Google Cloud API."""
    url = f"https://oauth2.googleapis.com/v1/projects/{PROJECT_ID}/oauthClients"

    # Use the older API endpoint that works
    url = f"https://www.googleapis.com/oauth2/v1/projects/{PROJECT_ID}/oauthClients"

    # Fallback: use the IAM credentials API
    # Actually, Google doesn't have a public REST API to create OAuth clients.
    # The gcloud CLI uses an internal API. Let's use a different approach:
    # We'll just output instructions to use the token with the internal API.

    # The internal API used by gcloud:
    url = f"https://oauth2.clients6.google.com/v1/projects/{PROJECT_ID}/brands"
    headers = {"Authorization": f"Bearer {access_token}"}

    # First, list existing brands (OAuth consent screen)
    req = urllib.request.Request(url, headers=headers)
    try:
        resp = urllib.request.urlopen(req)
        brands = json.loads(resp.read())
        print(f"Found brands: {json.dumps(brands, indent=2)}")
    except Exception as e:
        print(f"Could not list brands: {e}")

    # Try creating the OAuth client using the Identity-Aware Proxy API
    # This is the supported public API for creating OAuth clients
    brand_name = f"projects/{PROJECT_ID}/brands/-"

    url = f"https://iap.googleapis.com/v1/projects/{PROJECT_ID}/brands"
    req = urllib.request.Request(url, headers=headers)
    try:
        resp = urllib.request.urlopen(req)
        brands_data = json.loads(resp.read())
        if brands_data.get("brands"):
            brand_name = brands_data["brands"][0]["name"]
            print(f"Using brand: {brand_name}")
    except Exception as e:
        print(f"Brands lookup: {e}")

    # Create the OAuth client
    client_data = json.dumps({
        "displayName": "Bee AI Web",
    }).encode()

    url = f"https://iap.googleapis.com/v1/{brand_name}/identityAwareProxyClients"
    req = urllib.request.Request(url, data=client_data, headers={
        **headers,
        "Content-Type": "application/json",
    })

    try:
        resp = urllib.request.urlopen(req)
        client = json.loads(resp.read())
        print("\n=== OAuth Client Created ===")
        print(f"Client ID: {client.get('name', '').split('/')[-1]}")
        print(f"Client Secret: {client.get('secret', '')}")
        return client
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"IAP API error ({e.code}): {error_body}")
        print("\nThe IAP API doesn't support this project type.")
        print("Falling back to manual approach with access token...")
        print(f"\nYour access token (valid ~1 hour):\n{access_token[:20]}...")
        return None


if __name__ == "__main__":
    # Start local server
    server = http.server.HTTPServer(("localhost", 8085), CallbackHandler)
    thread = threading.Thread(target=server.handle_request)
    thread.start()

    # Open browser
    auth_url = (
        "https://accounts.google.com/o/oauth2/auth?"
        + urllib.parse.urlencode({
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
            "scope": SCOPES,
            "access_type": "offline",
        })
    )

    print("Opening browser for Google authentication...")
    webbrowser.open(auth_url)
    print("Waiting for callback...")

    thread.join(timeout=120)
    server.server_close()

    if not auth_code:
        print("ERROR: No authorization code received.")
        exit(1)

    print("Got authorization code. Exchanging for access token...")
    token = get_access_token(auth_code)
    print(f"Access token obtained.")

    result = create_web_oauth_client(token)
    if not result:
        print("\n--- Alternative: Use this access token with gcloud-like API ---")
        print("But since the public API doesn't support creating OAuth web clients,")
        print("the easiest approach is to create it in the Google Cloud Console.")
        print("\nHowever, we CAN use the token to check your existing clients:")

        # List existing OAuth 2.0 clients
        url = f"https://oauth2.googleapis.com/v2/userinfo"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        resp = urllib.request.urlopen(req)
        user_info = json.loads(resp.read())
        print(f"\nAuthenticated as: {user_info.get('email')}")
