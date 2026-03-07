#!/usr/bin/env python3
"""Fix n8n user setup state and activate workflows."""
import sqlite3
import json
import subprocess

DB_PATH = "/root/.n8n/database.sqlite"

conn = sqlite3.connect(DB_PATH)

# 1. Activate user
settings_json = json.dumps({"userActivated": True})
conn.execute(
    "UPDATE user SET settings = ? WHERE id = ?",
    (settings_json, "09052748-8cdd-404b-8768-bc91e140cb54"),
)
conn.commit()
print("User activated")

# 2. Mark owner setup complete
conn.execute(
    "INSERT OR REPLACE INTO settings (key, value, loadOnStartup) VALUES (?, ?, ?)",
    ("userManagement.isInstanceOwnerSetUp", json.dumps("true"), 1),
)
conn.commit()
print("Owner setup marked complete")

# 3. Verify
row = conn.execute(
    "SELECT settings FROM user WHERE id = ?",
    ("09052748-8cdd-404b-8768-bc91e140cb54",),
).fetchone()
print("User settings:", row[0])

row = conn.execute(
    "SELECT value FROM settings WHERE key = ?",
    ("userManagement.isInstanceOwnerSetUp",),
).fetchone()
print("Owner setup:", row[0] if row else "not set")

conn.close()
print("Done. Restart n8n and try logging in.")
