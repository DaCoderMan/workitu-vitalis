#!/usr/bin/env python3
"""Generate n8n workflow JSON files for import via CLI."""
import json
import os

OUTPUT_DIR = "/tmp/n8n-workflows"

workflows = []

# Workflow 1: Daily Briefing
wf1 = {
    "id": "wf-daily-briefing",
    "name": "Daily Briefing to Telegram",
    "nodes": [
        {
            "parameters": {
                "rule": {"interval": [{"field": "cronExpression", "expression": "0 8 * * *"}]}
            },
            "id": "cron-1",
            "name": "Every Day 8AM",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [0, 0]
        },
        {
            "parameters": {
                "resource": "task",
                "operation": "getAll",
                "team": "90182449313",
                "list": "901816199648",
                "limit": 20,
                "filters": {"statuses": ["to do", "in progress"]}
            },
            "id": "clickup-daily",
            "name": "Get Daily Tasks",
            "type": "n8n-nodes-base.clickUp",
            "typeVersion": 1,
            "position": [220, -100],
            "credentials": {"clickUpApi": {"id": "1", "name": "ClickUp API"}}
        },
        {
            "parameters": {
                "resource": "task",
                "operation": "getAll",
                "team": "90182449313",
                "list": "901816199661",
                "limit": 10,
                "filters": {}
            },
            "id": "clickup-leads",
            "name": "Get Leads",
            "type": "n8n-nodes-base.clickUp",
            "typeVersion": 1,
            "position": [220, 100],
            "credentials": {"clickUpApi": {"id": "1", "name": "ClickUp API"}}
        },
        {
            "parameters": {
                "url": "https://api.deepseek.com/chat/completions",
                "sendHeaders": True,
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({model: 'deepseek-chat', messages: [{role: 'system', content: 'You are Bee, AI Chief of Staff. Generate a concise daily briefing. Include: open tasks count, top 3 priorities, leads status. Use *bold* for headers. Keep under 500 chars.'}, {role: 'user', content: 'Tasks: ' + JSON.stringify($items('Get Daily Tasks').map(i => ({name: i.json.name, status: i.json.status?.status}))) + ' Leads: ' + JSON.stringify($items('Get Leads').map(i => ({name: i.json.name, status: i.json.status?.status})))}], max_tokens: 500}) }}",
                "options": {}
            },
            "id": "deepseek-briefing",
            "name": "AI Generate Briefing",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [500, 0],
            "credentials": {"httpHeaderAuth": {"id": "3", "name": "DeepSeek API"}}
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "sendMessage",
                "chatId": "7480714031",
                "text": "={{ 'Daily Briefing\\n\\n' + $json.choices[0].message.content }}",
                "additionalFields": {"parse_mode": "Markdown"}
            },
            "id": "telegram-send",
            "name": "Send to Telegram",
            "type": "n8n-nodes-base.telegram",
            "typeVersion": 1.2,
            "position": [740, 0],
            "credentials": {"telegramApi": {"id": "2", "name": "Telegram Bot"}}
        }
    ],
    "connections": {
        "Every Day 8AM": {"main": [[{"node": "Get Daily Tasks", "type": "main", "index": 0}, {"node": "Get Leads", "type": "main", "index": 0}]]},
        "Get Daily Tasks": {"main": [[{"node": "AI Generate Briefing", "type": "main", "index": 0}]]},
        "Get Leads": {"main": [[{"node": "AI Generate Briefing", "type": "main", "index": 0}]]},
        "AI Generate Briefing": {"main": [[{"node": "Send to Telegram", "type": "main", "index": 0}]]}
    },
    "active": False,
    "settings": {"executionOrder": "v1"},
    "tags": []
}
workflows.append(("wf-daily-briefing.json", wf1))

# Workflow 2: Overdue Task Alerts
wf2 = {
    "id": "wf-overdue-alerts",
    "name": "Overdue Task Alerts to Telegram",
    "nodes": [
        {
            "parameters": {
                "rule": {"interval": [{"field": "cronExpression", "expression": "0 9 * * *"}]}
            },
            "id": "cron-2",
            "name": "Every Day 9AM",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [0, 0]
        },
        {
            "parameters": {
                "resource": "task",
                "operation": "getAll",
                "team": "90182449313",
                "list": "901816199648",
                "limit": 50,
                "filters": {"statuses": ["to do", "in progress"]}
            },
            "id": "clickup-tasks-2",
            "name": "Get All Open Tasks",
            "type": "n8n-nodes-base.clickUp",
            "typeVersion": 1,
            "position": [220, 0],
            "credentials": {"clickUpApi": {"id": "1", "name": "ClickUp API"}}
        },
        {
            "parameters": {
                "jsCode": "const now = Date.now();\nconst overdue = [];\nfor (const item of $input.all()) {\n  const due = item.json.due_date;\n  if (due && parseInt(due) < now) {\n    overdue.push({json: {name: item.json.name, due_date: new Date(parseInt(due)).toLocaleDateString(), status: item.json.status?.status || 'unknown', url: item.json.url || ''}});\n  }\n}\nreturn overdue.length > 0 ? overdue : [{json: {_empty: true}}];"
            },
            "id": "code-filter",
            "name": "Filter Overdue",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [440, 0]
        },
        {
            "parameters": {
                "conditions": {
                    "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                    "conditions": [{"id": "cond1", "leftValue": "={{ $json._empty }}", "rightValue": True, "operator": {"type": "boolean", "operation": "notTrue"}}],
                    "combinator": "and"
                }
            },
            "id": "if-has-overdue",
            "name": "Has Overdue",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [660, 0]
        },
        {
            "parameters": {
                "jsCode": "const items = $input.all();\nlet msg = 'Overdue Tasks Alert\\n\\n';\nfor (const item of items) {\n  msg += '- *' + item.json.name + '* (due ' + item.json.due_date + ')\\n';\n}\nmsg += '\\n' + items.length + ' task(s) past deadline';\nreturn [{json: {message: msg}}];"
            },
            "id": "code-format",
            "name": "Format Message",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [880, -50]
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "sendMessage",
                "chatId": "7480714031",
                "text": "={{ $json.message }}",
                "additionalFields": {"parse_mode": "Markdown"}
            },
            "id": "telegram-overdue",
            "name": "Alert Telegram",
            "type": "n8n-nodes-base.telegram",
            "typeVersion": 1.2,
            "position": [1100, -50],
            "credentials": {"telegramApi": {"id": "2", "name": "Telegram Bot"}}
        }
    ],
    "connections": {
        "Every Day 9AM": {"main": [[{"node": "Get All Open Tasks", "type": "main", "index": 0}]]},
        "Get All Open Tasks": {"main": [[{"node": "Filter Overdue", "type": "main", "index": 0}]]},
        "Filter Overdue": {"main": [[{"node": "Has Overdue", "type": "main", "index": 0}]]},
        "Has Overdue": {"main": [[{"node": "Format Message", "type": "main", "index": 0}], []]},
        "Format Message": {"main": [[{"node": "Alert Telegram", "type": "main", "index": 0}]]}
    },
    "active": False,
    "settings": {"executionOrder": "v1"},
    "tags": []
}
workflows.append(("wf-overdue-alerts.json", wf2))

# Workflow 3: Weekly Revenue Digest
wf3 = {
    "id": "wf-revenue-digest",
    "name": "Weekly Revenue Digest to Telegram",
    "nodes": [
        {
            "parameters": {
                "rule": {"interval": [{"field": "cronExpression", "expression": "0 10 * * 0"}]}
            },
            "id": "cron-3",
            "name": "Every Sunday 10AM",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [0, 0]
        },
        {
            "parameters": {
                "resource": "task",
                "operation": "getAll",
                "team": "90182449313",
                "list": "901816199661",
                "limit": 50,
                "filters": {}
            },
            "id": "clickup-leads-3",
            "name": "Get All Leads",
            "type": "n8n-nodes-base.clickUp",
            "typeVersion": 1,
            "position": [220, -80],
            "credentials": {"clickUpApi": {"id": "1", "name": "ClickUp API"}}
        },
        {
            "parameters": {
                "resource": "task",
                "operation": "getAll",
                "team": "90182449313",
                "list": "901816199662",
                "limit": 50,
                "filters": {}
            },
            "id": "clickup-clients-3",
            "name": "Get Active Clients",
            "type": "n8n-nodes-base.clickUp",
            "typeVersion": 1,
            "position": [220, 80],
            "credentials": {"clickUpApi": {"id": "1", "name": "ClickUp API"}}
        },
        {
            "parameters": {
                "url": "https://api.deepseek.com/chat/completions",
                "sendHeaders": True,
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({model: 'deepseek-chat', messages: [{role: 'system', content: 'You are Bee, AI Chief of Staff. Target: 7000 NIS/month. Generate a weekly revenue digest. Include: pipeline value estimate, active clients count, leads count, next revenue actions. Use *bold*. Be direct and motivating.'}, {role: 'user', content: 'Leads: ' + JSON.stringify($items('Get All Leads').map(i => ({name: i.json.name, status: i.json.status?.status}))) + ' Active Clients: ' + JSON.stringify($items('Get Active Clients').map(i => ({name: i.json.name, status: i.json.status?.status})))}], max_tokens: 600}) }}",
                "options": {}
            },
            "id": "deepseek-revenue",
            "name": "AI Revenue Analysis",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [500, 0],
            "credentials": {"httpHeaderAuth": {"id": "3", "name": "DeepSeek API"}}
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "sendMessage",
                "chatId": "7480714031",
                "text": "={{ 'Weekly Revenue Digest\\n\\n' + $json.choices[0].message.content }}",
                "additionalFields": {"parse_mode": "Markdown"}
            },
            "id": "telegram-revenue",
            "name": "Send Revenue Digest",
            "type": "n8n-nodes-base.telegram",
            "typeVersion": 1.2,
            "position": [740, 0],
            "credentials": {"telegramApi": {"id": "2", "name": "Telegram Bot"}}
        }
    ],
    "connections": {
        "Every Sunday 10AM": {"main": [[{"node": "Get All Leads", "type": "main", "index": 0}, {"node": "Get Active Clients", "type": "main", "index": 0}]]},
        "Get All Leads": {"main": [[{"node": "AI Revenue Analysis", "type": "main", "index": 0}]]},
        "Get Active Clients": {"main": [[{"node": "AI Revenue Analysis", "type": "main", "index": 0}]]},
        "AI Revenue Analysis": {"main": [[{"node": "Send Revenue Digest", "type": "main", "index": 0}]]}
    },
    "active": False,
    "settings": {"executionOrder": "v1"},
    "tags": []
}
workflows.append(("wf-revenue-digest.json", wf3))

# Workflow 4: VPS Health Monitor
wf4 = {
    "id": "wf-vps-health",
    "name": "VPS Health Monitor to Telegram",
    "nodes": [
        {
            "parameters": {
                "rule": {"interval": [{"field": "cronExpression", "expression": "*/30 * * * *"}]}
            },
            "id": "cron-4",
            "name": "Every 30 Minutes",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [0, 0]
        },
        {
            "parameters": {
                "jsCode": "const { execSync } = require('child_process');\ntry {\n  const disk = execSync(\"df -h / | tail -1 | awk '{print $5}'\").toString().trim();\n  const mem = execSync(\"free -m | awk 'NR==2{printf \\\"%d/%dMB\\\", $3, $2}'\").toString().trim();\n  const load = execSync(\"cat /proc/loadavg | awk '{print $1}'\").toString().trim();\n  const pmRaw = execSync('pm2 jlist 2>/dev/null || echo []').toString().trim();\n  const parsed = JSON.parse(pmRaw);\n  const down = parsed.filter(s => s.pm2_env && s.pm2_env.status !== 'online');\n  const diskPct = parseInt(disk);\n  const alert = diskPct > 85 || down.length > 0;\n  return [{json: {disk, mem, load, services_total: parsed.length, services_down: down.map(s => s.name), alert}}];\n} catch(e) {\n  return [{json: {alert: true, error: e.message}}];\n}"
            },
            "id": "code-health",
            "name": "Check System Health",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [260, 0]
        },
        {
            "parameters": {
                "conditions": {
                    "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                    "conditions": [{"id": "alert-check", "leftValue": "={{ $json.alert }}", "rightValue": True, "operator": {"type": "boolean", "operation": "true"}}],
                    "combinator": "and"
                }
            },
            "id": "if-alert",
            "name": "Alert Needed",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [500, 0]
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "sendMessage",
                "chatId": "7480714031",
                "text": "={{ 'VPS ALERT\\n\\nDisk: ' + $json.disk + '\\nMemory: ' + $json.mem + '\\nLoad: ' + $json.load + (($json.services_down && $json.services_down.length > 0) ? '\\nDown: ' + $json.services_down.join(', ') : '') + ($json.error ? '\\nError: ' + $json.error : '') }}",
                "additionalFields": {"parse_mode": "Markdown"}
            },
            "id": "telegram-alert",
            "name": "Send Alert",
            "type": "n8n-nodes-base.telegram",
            "typeVersion": 1.2,
            "position": [740, -50],
            "credentials": {"telegramApi": {"id": "2", "name": "Telegram Bot"}}
        }
    ],
    "connections": {
        "Every 30 Minutes": {"main": [[{"node": "Check System Health", "type": "main", "index": 0}]]},
        "Check System Health": {"main": [[{"node": "Alert Needed", "type": "main", "index": 0}]]},
        "Alert Needed": {"main": [[{"node": "Send Alert", "type": "main", "index": 0}], []]}
    },
    "active": False,
    "settings": {"executionOrder": "v1"},
    "tags": []
}
workflows.append(("wf-vps-health.json", wf4))

# Workflow 5: Weekly Review Generator
wf5 = {
    "id": "wf-weekly-review",
    "name": "Friday Weekly Review to Telegram",
    "nodes": [
        {
            "parameters": {
                "rule": {"interval": [{"field": "cronExpression", "expression": "0 18 * * 5"}]}
            },
            "id": "cron-5",
            "name": "Friday 6PM",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [0, 0]
        },
        {
            "parameters": {
                "resource": "task",
                "operation": "getAll",
                "team": "90182449313",
                "list": "901816199648",
                "limit": 50,
                "filters": {"statuses": ["complete"]}
            },
            "id": "clickup-completed",
            "name": "Get Completed Tasks",
            "type": "n8n-nodes-base.clickUp",
            "typeVersion": 1,
            "position": [220, -80],
            "credentials": {"clickUpApi": {"id": "1", "name": "ClickUp API"}}
        },
        {
            "parameters": {
                "resource": "task",
                "operation": "getAll",
                "team": "90182449313",
                "list": "901816199648",
                "limit": 50,
                "filters": {"statuses": ["to do", "in progress"]}
            },
            "id": "clickup-pending-5",
            "name": "Get Pending Tasks",
            "type": "n8n-nodes-base.clickUp",
            "typeVersion": 1,
            "position": [220, 80],
            "credentials": {"clickUpApi": {"id": "1", "name": "ClickUp API"}}
        },
        {
            "parameters": {
                "url": "https://api.deepseek.com/chat/completions",
                "sendHeaders": True,
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({model: 'deepseek-chat', messages: [{role: 'system', content: 'You are Bee, AI Chief of Staff. Generate a weekly review. Include: accomplishments count, unfinished items, performance score 1-10, motivation for next week. Use *bold*. Be direct and warm. Under 800 chars.'}, {role: 'user', content: 'Completed: ' + JSON.stringify($items('Get Completed Tasks').map(i => i.json.name)) + ' Pending: ' + JSON.stringify($items('Get Pending Tasks').map(i => i.json.name))}], max_tokens: 800}) }}",
                "options": {}
            },
            "id": "deepseek-review",
            "name": "AI Weekly Review",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [500, 0],
            "credentials": {"httpHeaderAuth": {"id": "3", "name": "DeepSeek API"}}
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "sendMessage",
                "chatId": "7480714031",
                "text": "={{ 'Weekly Review\\n\\n' + $json.choices[0].message.content }}",
                "additionalFields": {"parse_mode": "Markdown"}
            },
            "id": "telegram-review",
            "name": "Send Weekly Review",
            "type": "n8n-nodes-base.telegram",
            "typeVersion": 1.2,
            "position": [740, 0],
            "credentials": {"telegramApi": {"id": "2", "name": "Telegram Bot"}}
        }
    ],
    "connections": {
        "Friday 6PM": {"main": [[{"node": "Get Completed Tasks", "type": "main", "index": 0}, {"node": "Get Pending Tasks", "type": "main", "index": 0}]]},
        "Get Completed Tasks": {"main": [[{"node": "AI Weekly Review", "type": "main", "index": 0}]]},
        "Get Pending Tasks": {"main": [[{"node": "AI Weekly Review", "type": "main", "index": 0}]]},
        "AI Weekly Review": {"main": [[{"node": "Send Weekly Review", "type": "main", "index": 0}]]}
    },
    "active": False,
    "settings": {"executionOrder": "v1"},
    "tags": []
}
workflows.append(("wf-weekly-review.json", wf5))

# Workflow 6: New ClickUp Task Notifications
wf6 = {
    "id": "wf-task-notify",
    "name": "New ClickUp Task Notification",
    "nodes": [
        {
            "parameters": {
                "rule": {"interval": [{"field": "cronExpression", "expression": "*/15 * * * *"}]}
            },
            "id": "cron-6",
            "name": "Every 15 Minutes",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [0, 0]
        },
        {
            "parameters": {
                "resource": "task",
                "operation": "getAll",
                "team": "90182449313",
                "list": "901816199648",
                "limit": 5,
                "orderBy": "created",
                "filters": {}
            },
            "id": "clickup-recent",
            "name": "Get Recent Tasks",
            "type": "n8n-nodes-base.clickUp",
            "typeVersion": 1,
            "position": [220, 0],
            "credentials": {"clickUpApi": {"id": "1", "name": "ClickUp API"}}
        },
        {
            "parameters": {
                "jsCode": "const items = $input.all();\nconst now = Date.now();\nconst window = 15 * 60 * 1000;\nconst recent = items.filter(item => {\n  const created = parseInt(item.json.date_created || '0');\n  return (now - created) < window;\n});\nreturn recent.length > 0 ? recent : [{json: {_empty: true}}];"
            },
            "id": "code-recent",
            "name": "Filter New Tasks",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [440, 0]
        },
        {
            "parameters": {
                "conditions": {
                    "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                    "conditions": [{"id": "cond-new", "leftValue": "={{ $json._empty }}", "rightValue": True, "operator": {"type": "boolean", "operation": "notTrue"}}],
                    "combinator": "and"
                }
            },
            "id": "if-new",
            "name": "Has New Tasks",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": [660, 0]
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "sendMessage",
                "chatId": "7480714031",
                "text": "={{ 'New Task Created\\n\\n' + $json.name + '\\nStatus: ' + ($json.status?.status || 'open') }}",
                "additionalFields": {"parse_mode": "Markdown"}
            },
            "id": "telegram-new-task",
            "name": "Notify New Task",
            "type": "n8n-nodes-base.telegram",
            "typeVersion": 1.2,
            "position": [880, -50],
            "credentials": {"telegramApi": {"id": "2", "name": "Telegram Bot"}}
        }
    ],
    "connections": {
        "Every 15 Minutes": {"main": [[{"node": "Get Recent Tasks", "type": "main", "index": 0}]]},
        "Get Recent Tasks": {"main": [[{"node": "Filter New Tasks", "type": "main", "index": 0}]]},
        "Filter New Tasks": {"main": [[{"node": "Has New Tasks", "type": "main", "index": 0}]]},
        "Has New Tasks": {"main": [[{"node": "Notify New Task", "type": "main", "index": 0}], []]}
    },
    "active": False,
    "settings": {"executionOrder": "v1"},
    "tags": []
}
workflows.append(("wf-task-notify.json", wf6))

# Write all files
os.makedirs(OUTPUT_DIR, exist_ok=True)
for filename, wf in workflows:
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w") as f:
        json.dump(wf, f, indent=2)
    print(f"Created {path}")

print(f"\nTotal: {len(workflows)} workflows ready for import")
