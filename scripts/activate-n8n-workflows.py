#!/usr/bin/env python3
"""Login to n8n and activate all workflows."""
import urllib.request
import json
import http.cookiejar
import time

time.sleep(6)  # Wait for n8n to start

BASE = "http://localhost:5678"
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# Login
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

# List workflows
req = urllib.request.Request(f"{BASE}/rest/workflows", headers={"Content-Type": "application/json"})
try:
    resp = opener.open(req)
    body = json.loads(resp.read().decode())
    workflows = body.get("data", [])
    print(f"Found {len(workflows)} workflows")
except urllib.error.HTTPError as e:
    print(f"List failed: HTTP {e.code}: {e.read().decode()[:300]}")
    exit(1)

# Activate each workflow
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
        body = json.loads(resp.read().decode())
        active = body.get("data", {}).get("active", False)
        print(f"  Activated: {wf_name} (active={active})")
    except urllib.error.HTTPError as e:
        print(f"  Failed: {wf_name}: HTTP {e.code} - {e.read().decode()[:100]}")

print("Done.")
