#!/usr/bin/env python3
"""Setup n8n owner account and activate workflows."""
import urllib.request
import json
import http.cookiejar

BASE = "http://localhost:5678"
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# Step 1: Setup owner
print("Setting up owner account...")
setup_data = json.dumps({
    "email": "jonathanperlin@gmail.com",
    "password": "BeeN8n2026",
    "firstName": "Yonatan",
    "lastName": "Perlin"
}).encode()

req = urllib.request.Request(
    f"{BASE}/rest/owner/setup",
    data=setup_data,
    headers={"Content-Type": "application/json"},
)
try:
    resp = opener.open(req)
    body = json.loads(resp.read().decode())
    print("Owner setup OK:", json.dumps(body.get("data", {}), indent=2)[:200])
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    print(f"Setup HTTP {e.code}: {error_body[:300]}")
    if e.code == 400 and "already" in error_body.lower():
        print("Owner already set up, trying login...")
    else:
        exit(1)

# Step 2: Login
print("\nLogging in...")
login_data = json.dumps({
    "emailOrLdapLoginId": "jonathanperlin@gmail.com",
    "password": "BeeN8n2026"
}).encode()

req = urllib.request.Request(
    f"{BASE}/rest/login",
    data=login_data,
    headers={"Content-Type": "application/json"},
)
try:
    resp = opener.open(req)
    body = json.loads(resp.read().decode())
    print("Login OK:", body.get("data", {}).get("email", "unknown"))
except urllib.error.HTTPError as e:
    print(f"Login failed: HTTP {e.code}: {e.read().decode()[:300]}")
    exit(1)

# Step 3: Skip personalization
print("\nSkipping personalization survey...")
req = urllib.request.Request(
    f"{BASE}/rest/me/survey",
    data=json.dumps({}).encode(),
    headers={"Content-Type": "application/json"},
)
try:
    opener.open(req)
    print("Survey skipped")
except:
    print("Survey skip failed (non-critical)")

# Step 4: List and activate workflows
print("\nActivating workflows...")
req = urllib.request.Request(
    f"{BASE}/rest/workflows",
    headers={"Content-Type": "application/json"},
)
try:
    resp = opener.open(req)
    body = json.loads(resp.read().decode())
    workflows = body.get("data", [])
    print(f"Found {len(workflows)} workflows")
except urllib.error.HTTPError as e:
    print(f"List failed: HTTP {e.code}")
    exit(1)

for wf in workflows:
    wf_id = wf["id"]
    wf_name = wf["name"]
    if wf.get("active"):
        print(f"  Already active: {wf_name}")
        continue

    activate_data = json.dumps({"active": True}).encode()
    req = urllib.request.Request(
        f"{BASE}/rest/workflows/{wf_id}",
        data=activate_data,
        method="PATCH",
        headers={"Content-Type": "application/json"},
    )
    try:
        resp = opener.open(req)
        result = json.loads(resp.read().decode())
        active = result.get("data", {}).get("active", False)
        print(f"  Activated: {wf_name} (active={active})")
    except urllib.error.HTTPError as e:
        print(f"  Failed: {wf_name}: HTTP {e.code} - {e.read().decode()[:100]}")

# Step 5: Create API key for future use
print("\nCreating API key...")
req = urllib.request.Request(
    f"{BASE}/rest/me/api-keys",
    data=json.dumps({"label": "bee-automation"}).encode(),
    headers={"Content-Type": "application/json"},
)
try:
    resp = opener.open(req)
    body = json.loads(resp.read().decode())
    api_key = body.get("data", {}).get("apiKey", "")
    print(f"API Key created: {api_key[:20]}...")
    # Save to file
    with open("/root/.n8n/api-key.txt", "w") as f:
        f.write(api_key)
    print("Saved to /root/.n8n/api-key.txt")
except urllib.error.HTTPError as e:
    print(f"API key creation failed: HTTP {e.code} - {e.read().decode()[:100]}")

print("\nDone!")
