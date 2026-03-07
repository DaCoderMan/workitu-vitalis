# Bee v4.0 — AI Chief of Staff

**Capabilities Overview**
Workitu Tech — March 2026

---

## What is Bee?

- AI Chief of Staff for Yonatan Perlin, Founder & CEO of Workitu Tech
- Operates across **5 surfaces**: Claude Code, Claude.ai, Telegram, Vault API, Autonomous Agent
- **27+ agent tools**, 23 MCP operations, 19 AI skills
- Shared brain repo synced via GitHub
- Mission: reach **₪7,000/mo** revenue → $1B by 2087

---

## Architecture

```
                ┌─────────────────────────────────┐
                │    Bee v4.0 Brain (GitHub)        │
                │  config/ context/ vault/ docs/    │
                └──────┬──────┬──────┬──────┬──────┘
                       │      │      │      │
                Claude Code  Claude.ai  Telegram  Vault API  Autonomous
                (MCP tools)  (Skills)   (Bot)     (REST)     (Cron Agent)
                Full R/W     Memory     Chat      HTTPS      Daily 8AM
```

- **Central brain repo** (workitu-bee-brain) on GitHub
- **Claude Code** — full filesystem, git, terminal, MCP access (primary operator)
- **Claude.ai** — memory, dashboard, skills, MCP access
- **Telegram Bot** — always-on chat with AI + all 27 tools
- **Vault REST API** — HTTPS endpoints for note management
- **Autonomous Agent** — daily cron on VPS, DeepSeek AI

---

## Surface 1: Autonomous Agent

**Runs:** Daily at 08:00 IST on Hetzner VPS
**Model:** DeepSeek (deepseek-chat / deepseek-reasoner)
**Location:** `/var/www/bee-brain/agent/`
**Max:** 10 API calls/day, 4096 tokens/call

### 9 Tool Modules (27 tools total)

| Module | Tools | What it does |
|--------|-------|-------------|
| **ClickUp** | 4 | Overdue tasks, due today, get task, create comment |
| **Gmail** | 1 | Search unread important emails |
| **Google Calendar** | 1 | Today's events with time, title, location |
| **GitHub / Files** | 2 | Read/write files in the brain repo |
| **Site Monitor** | 3 | Health checks, broken links, Telegram alerts |
| **Content Manager** | 5 | Blog drafts, publish, portfolio, revalidation, stats |
| **Performance Reporter** | 2 | Weekly report generation + email via Resend |
| **Pricing Manager** | 2 | Read/update plan prices |
| **Obsidian Vault** | 7 | Search, read, create, update, list, daily note, link |

---

## Surface 2: Telegram Bot

- Always-on via PM2 on VPS
- Admin-only authentication via Telegram user ID
- DeepSeek AI with full tool-use loop (max 8 tool calls/message)
- Conversation context: 20 messages, 30-min TTL
- Rate limited: 10 messages/minute

### 7 Slash Commands

| Command | What it does |
|---------|-------------|
| `/start` | Show help menu |
| `/help` | Show help menu |
| `/tasks` | Show overdue + due-today tasks |
| `/calendar` | Show today's events |
| `/status` | Show current-state.md |
| `/briefing` | Show today's daily briefing |
| `/clear` | Clear conversation history |

---

## Surface 3: Vault REST API

**URL:** `https://api.workitu.com/api/vault/`
**Auth:** X-API-Key header
**Rate limit:** 30 requests/minute
**Framework:** FastAPI (port 3003 behind nginx)

### 8 Endpoints

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/health` | Health check (no auth) |
| POST | `/search` | Search notes by content/tag/folder/frontmatter |
| POST | `/read` | Read a note by path |
| POST | `/create` | Create a new note |
| POST | `/update` | Update existing note (append/replace/prepend) |
| POST | `/list` | List notes by folder or tag |
| POST | `/daily` | Get or create daily note, append entries |
| POST | `/link` | Add wikilink between two notes |

---

## Surface 4: Claude Code (MCP)

**Primary operator** — full filesystem, git, terminal, SSH, deployment access.

### ClickUp MCP (10+ operations)

| Operation | What it does |
|-----------|-------------|
| `clickup_search` | Search tasks, docs, anything across workspace |
| `clickup_get_task` | Fetch task details by ID |
| `clickup_update_task` | Modify task (status, assignees, dates) |
| `clickup_create_task` | Create new task in any list |
| `clickup_create_task_comment` | Add comment to task |
| `clickup_get_list` / `get_folder` | Resolve names to IDs |
| `clickup_get_workspace_hierarchy` | Browse spaces, folders, lists |
| `clickup_create_document` | Create new document |
| `clickup_update_document_page` | Modify document page content |

### Gmail MCP (5 operations)

| Operation | What it does |
|-----------|-------------|
| `gmail_search_messages` | Query inbox with full Gmail search syntax |
| `gmail_read_message` | Read full message content |
| `gmail_read_thread` | Read entire email thread |
| `gmail_create_draft` | Compose email draft |
| `gmail_get_profile` | Get authenticated account info |

### Google Calendar MCP (8 operations)

| Operation | What it does |
|-----------|-------------|
| `gcal_list_events` | View calendar events in a time range |
| `gcal_create_event` | Create event (attendees, recurrence, Meet) |
| `gcal_update_event` | Modify existing event |
| `gcal_delete_event` | Remove event |
| `gcal_find_meeting_times` | Find mutual availability |
| `gcal_find_my_free_time` | Find open slots |
| `gcal_list_calendars` | Browse available calendars |
| `gcal_respond_to_event` | RSVP (accept/decline/tentative) |

### Native Capabilities

- Full filesystem read/write
- Git operations (commit, push, branch, deploy)
- Terminal/bash execution
- SSH to VPS
- Script execution (Python, Node, Bash)
- Project scaffolding and deployment (Vercel, Hetzner)

---

## Surface 5: Claude.ai Skills (19 total)

### Core System (4)

| Skill | What it does |
|-------|-------------|
| `bee-chief-of-staff` | Task orchestration, priority management |
| `bee-memory-engine` | Memory management and context boot |
| `bee-skill-developer` | Create new Bee skills |
| `bee-skill-manager` | Skill lifecycle management |

### Business & Revenue (4)

| Skill | What it does |
|-------|-------------|
| `profit-mode-engine` | Revenue strategy and tracking |
| `outreach-composer` | Lead generation and outreach messages |
| `client-project-manager` | Client delivery and project tracking |
| `prd-creator` | Product requirement documents |

### Development (6)

| Skill | What it does |
|-------|-------------|
| `fullstack-site-builder` | Build and deploy Next.js sites |
| `prd-to-deploy` | PRD to GitHub to Vercel pipeline |
| `site-enhancer` | UI/UX polish and improvements |
| `website-revamp` | Website redesign |
| `git-operations` | Source control management |
| `automation-builder` | n8n/Make/Zapier workflows |

### Personal & Health (2)

| Skill | What it does |
|-------|-------------|
| `medical-tracker` | Doctor appointments, medications |
| `weekly-review` | Weekly retrospective |

### Automation, Content & Storage (3)

| Skill | What it does |
|-------|-------------|
| `daily-briefing` | Morning overview generation |
| `youtube-video-creator` | Video production workflow |
| `obsidian-vault` | Persistent notes with `[[wikilinks]]` |

---

## Infrastructure

### VPS (Hetzner CX23)

| Service | Port | Process |
|---------|------|---------|
| nginx | 80/443 | Reverse proxy |
| bee-telegram | — | PM2 (Telegram bot) |
| bee-vault-api | 3003 | PM2 (FastAPI) |
| bee-backend | 3001 | PM2 (Node.js) |
| n8n | 5678 | Workflow automation |

### Domains

| Domain | Points to | Purpose |
|--------|-----------|---------|
| `api.workitu.com` | 65.109.230.136 | Vault REST API |
| `blaze-post.com` | Vercel | Bee website |
| `workitu.com` | Vercel | Main domain |

### External Services

| Service | Used for |
|---------|----------|
| DeepSeek API | Agent + Telegram AI |
| ClickUp API | Task management |
| Gmail API | Email access |
| Google Calendar API | Schedule management |
| Resend API | Email sending (reports) |
| Telegram Bot API | Chat interface |
| GitHub | Source control |
| Vercel | Website hosting |
| Cloudflare | DNS management |

---

## Security

- **Path validation** — no directory traversal outside repo/vault
- **Shell injection prevention** — subprocess list-form in all tools
- **API key auth** — X-API-Key header on Vault API
- **Telegram auth** — admin-only via user ID check
- **Rate limiting** — 30 req/min on API, 10 msg/min on Telegram
- **HTTPS** — Let's Encrypt cert with auto-renewal
- **Environment isolation** — `.env` on VPS only, never in repo

---

## By the Numbers

| Metric | Value |
|--------|-------|
| Operational surfaces | **5** |
| Agent tools | **27** |
| MCP operations | **23** |
| AI skills | **19** |
| REST API endpoints | **8** |
| Telegram commands | **7** |
| Tool modules | **9** |
| Autonomous schedule | **Daily 8:00 AM IST** |
| Revenue target | **₪7,000/month** |

---

*Bee v4.0 — AI Chief of Staff*
*workitu.com — blaze-post.com*
*Workitu Tech — March 2026*
