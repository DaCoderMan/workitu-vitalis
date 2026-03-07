"""Pricing adjustment automation — Bee can update pricing config based on demand signals.

Reads/writes config/paypal-config.json in the brain repo.
When pricing changes, commits and pushes so Vercel auto-deploys.
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path

log = logging.getLogger("bee-agent")

BRAIN_REPO = os.getenv("BEE_BRAIN_PATH", "/var/www/bee-brain")
PAYPAL_CONFIG_PATH = os.path.join(BRAIN_REPO, "config", "paypal-config.json")

# ─── Tool Definitions ────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "get_current_pricing",
        "description": "Get the current pricing configuration from paypal-config.json.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "update_plan_price",
        "description": "Update the price of a subscription plan. Requires plan name and new price.",
        "input_schema": {
            "type": "object",
            "properties": {
                "plan_name": {
                    "type": "string",
                    "description": "Plan name: 'starter', 'standard', or 'enterprise'",
                },
                "new_price": {
                    "type": "number",
                    "description": "New monthly price in USD",
                },
                "reason": {
                    "type": "string",
                    "description": "Reason for the price change (logged in commit)",
                },
            },
            "required": ["plan_name", "new_price", "reason"],
        },
    },
]


# ─── Tool Implementations ────────────────────────────────────────────────────

def get_current_pricing(**kwargs) -> dict:
    """Read current pricing from config."""
    try:
        config = json.loads(Path(PAYPAL_CONFIG_PATH).read_text())
        plans = config.get("subscription_plans", {})
        return {
            "plans": {
                name: {"price": p.get("price"), "currency": p.get("currency", "USD")}
                for name, p in plans.items()
            },
            "one_time": config.get("one_time_payments", {}),
            "config_path": PAYPAL_CONFIG_PATH,
        }
    except FileNotFoundError:
        return {"error": "paypal-config.json not found"}
    except Exception as e:
        return {"error": str(e)}


def update_plan_price(plan_name: str, new_price: float, reason: str = "", **kwargs) -> dict:
    """Update a plan's price and commit the change."""
    import subprocess

    # Price validation
    if new_price <= 0 or new_price >= 10000:
        return {"error": f"Invalid price: {new_price}. Must be > 0 and < 10000."}

    try:
        config_path = Path(PAYPAL_CONFIG_PATH)
        original_content = config_path.read_text()
        config = json.loads(original_content)
        plans = config.get("subscription_plans", {})

        if plan_name not in plans:
            return {"error": f"Plan '{plan_name}' not found. Available: {list(plans.keys())}"}

        old_price = plans[plan_name].get("price")
        plans[plan_name]["price"] = new_price
        config["subscription_plans"] = plans

        # Write updated config
        config_path.write_text(json.dumps(config, indent=2) + "\n")

        # Git commit and push
        cwd = BRAIN_REPO
        commit_msg = f"chore: update {plan_name} pricing ${old_price} → ${new_price}\n\nReason: {reason}"
        try:
            subprocess.run(["git", "add", "config/paypal-config.json"], cwd=cwd, check=True,
                           capture_output=True, text=True, timeout=30)
            subprocess.run(["git", "commit", "-m", commit_msg], cwd=cwd, check=True,
                           capture_output=True, text=True, timeout=30)
            subprocess.run(["git", "push"], cwd=cwd, check=True,
                           capture_output=True, text=True, timeout=60)
        except subprocess.CalledProcessError as e:
            # Git failed — revert the file write so we don't report a false update
            config_path.write_text(original_content)
            log.error(f"Git failed during price update, reverted file: {e}")
            return {"updated": False, "committed": False, "error": f"Git failed (file reverted): {e}"}

        return {
            "updated": True,
            "plan": plan_name,
            "old_price": old_price,
            "new_price": new_price,
            "reason": reason,
            "committed": True,
        }
    except Exception as e:
        return {"error": str(e)}


# ─── Dispatch ─────────────────────────────────────────────────────────────────

TOOL_HANDLERS = {
    "get_current_pricing": get_current_pricing,
    "update_plan_price": update_plan_price,
}

def execute(tool_name: str, args: dict) -> dict:
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return {"error": f"Unknown tool: {tool_name}"}
    return handler(**args)
