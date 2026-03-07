# Bee v4.0 — Full Capability Reference

> Last updated: 2026-03-02

Bee is Yonatan Perlin's AI Chief of Staff, operating across 5 surfaces with 27+ tools, 8 REST endpoints, and 19 skills.

---

## Architecture Overview

```
                    ┌─────────────────────────────┐
                    │    Bee v4.0 Brain (GitHub)    │
                    │  config/ context/ vault/ docs/ │
                    └──────┬──────────┬──────────┬──┘
                           │          │          │
            ┌──────────────┼──────────┼──────────┼──────────────┐
            │              │          │          │              │
      Claude Code    Claude.ai    Telegram    Vault API    Autonomous
      (MCP tools)    (Skills)    (Bot)       (REST)       (Cron Agent)
      Full R/W       Memory      Chat        HTTPS        Daily 8AM
```

---

## Surface 1: Autonomous Agent (VPS)

**Runs:** Daily at 08:00 IST via cron
**Model:** DeepSeek (deepseek-chat daily / deepseek-reasoner weekly)
**Location:** `/var/www/bee-brain/agent/` on Hetzner VPS
**Max:** 10 API calls/day, 4096 tokens/call

### 9 Tool Modules (27 tools total)

#### 1. ClickUp (4 tools)
| Tool | What it does |
|------|-------------|
| `clickup_get_overdue_tasks` | Returns all tasks past due date |
| `clickup_get_tasks_due_today` | Returns tasks due today |
| `clickup_get_task` | Fetch single task by ID |
| `clickup_create_comment` | Add comment to a task |

#### 2. Gmail (1 tool)
| Tool | What it does |
|------|-------------|
| `gmail_search_unread_important` | Search unread important emails (sender, subject, snippet) |

#### 3. Google Calendar (1 tool)
| Tool | What it does |
|------|-------------|
| `gcal_list_events_today` | Today's events with time, title, location |

#### 4. GitHub / Files (2 tools)
| Tool | What it does |
|------|-------------|
| `read_file` | Read any file from the brain repo |
| `write_file` | Write file to brain repo (auto-creates directories) |

#### 5. Site Monitor (3 tools)
| Tool | What it does |
|------|-------------|
| `check_site_health` | GET /api/health on the Bee website |
| `check_broken_links` | Crawl site (max 20 pages), find broken links |
| `send_alert` | Send Telegram alert (info/warning/critical) |

#### 6. Content Manager (5 tools)
| Tool | What it does |
|------|-------------|
| `list_blog_drafts` | Get blog posts with 'ready' or 'draft' status |
| `publish_blog_post` | Move post to 'published', trigger ISR revalidation |
| `add_portfolio_item` | Create portfolio entry in ClickUp |
| `trigger_revalidation` | Call /api/revalidate on the Bee website |
| `get_content_stats` | Count portfolio items and blog posts |

#### 7. Performance Reporter (2 tools)
| Tool | What it does |
|------|-------------|
| `generate_weekly_report` | Compile leads/clients/revenue stats (last 7 days) |
| `send_performance_report` | Email report via Resend API |

#### 8. Pricing Manager (2 tools)
| Tool | What it does |
|------|-------------|
| `get_current_pricing` | Read current plan prices from config |
| `update_plan_price` | Update price for a plan (starter/standard/enterprise) |

#### 9. Obsidian Vault (7 tools)
| Tool | What it does |
|------|-------------|
| `vault_search` | Full-text search by content, tag, folder, or frontmatter |
| `vault_read` | Read note content with parsed YAML frontmatter |
| `vault_create` | Create note with frontmatter, tags, and content |
| `vault_update` | Modify note (append/replace/prepend modes) |
| `vault_list` | List notes by folder or tag (recursive) |
| `vault_daily_note` | Get or create daily note, append timestamped entries |
| `vault_link` | Add `[[wikilink]]` from one note to another |

---

## Surface 2: Telegram Bot

**Always on** via PM2 on VPS
**Auth:** Only responds to admin Telegram user
**Chat:** DeepSeek AI with full tool-use loop (max 8 tool calls/message)

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

### Free-Form Chat
- Send any message and Bee responds using DeepSeek AI
- Has access to all 27 agent tools
- Keeps conversation context (20 messages, 30-min TTL)
- Rate limited: 10 messages/minute

---

## Surface 3: Vault REST API

**URL:** `https://api.workitu.com/api/vault/`
**Auth:** `X-API-Key` header
**Rate limit:** 30 requests/minute
**Framework:** FastAPI (port 3003 behind nginx)

### 8 Endpoints

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/health` | Health check (no auth required) |
| POST | `/search` | Search notes by content/tag/folder/frontmatter |
| POST | `/read` | Read a note by path |
| POST | `/create` | Create a new note with content and frontmatter |
| POST | `/update` | Update existing note (append/replace/prepend) |
| POST | `/list` | List notes by folder or tag |
| POST | `/daily` | Get or create daily note, append entries |
| POST | `/link` | Add wikilink between two notes |

### Additional Endpoints
| Path | What it does |
|------|-------------|
| `/docs` | Interactive API documentation (Swagger UI) |
| `/redoc` | Alternative API documentation |
| `/openapi.json` | OpenAPI schema |

---

## Surface 4: Claude Code (MCP)

Claude Code has **direct MCP access** to external services plus full filesystem/git/terminal access.

### ClickUp MCP (10+ operations)
| Operation | What it does |
|-----------|-------------|
| `clickup_search` | Search tasks, docs, anything across workspace |
| `clickup_get_task` | Fetch task details by ID |
| `clickup_update_task` | Modify task (status, assignees, dates, custom fields) |
| `clickup_create_task` | Create new task in any list |
| `clickup_create_task_comment` | Add comment to task |
| `clickup_get_list` | Resolve list name to ID |
| `clickup_get_folder` | Resolve folder name to ID |
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
| `gcal_create_event` | Create event (attendees, recurrence, Google Meet) |
| `gcal_update_event` | Modify existing event |
| `gcal_delete_event` | Remove event |
| `gcal_find_meeting_times` | Find mutual availability with others |
| `gcal_find_my_free_time` | Find open slots in my calendar |
| `gcal_list_calendars` | Browse available calendars |
| `gcal_respond_to_event` | RSVP (accept/decline/tentative) |

### Native Capabilities
- Full filesystem read/write
- Git operations (commit, push, branch, deploy)
- Terminal/bash execution
- SSH to VPS
- Script execution (Python, Node, Bash)
- Project scaffolding and deployment

---

## Surface 5: Claude.ai Skills

### Core System (4 skills)
| Skill | What it does |
|-------|-------------|
| `bee-chief-of-staff` | Task orchestration, priority management |
| `bee-memory-engine` | Memory management and context boot |
| `bee-skill-developer` | Create new Bee skills |
| `bee-skill-manager` | Skill lifecycle management |

### Business & Revenue (4 skills)
| Skill | What it does |
|-------|-------------|
| `profit-mode-engine` | Revenue strategy and tracking |
| `outreach-composer` | Lead generation and outreach messages |
| `client-project-manager` | Client delivery and project tracking |
| `prd-creator` | Product requirement documents |

### Development (6 skills)
| Skill | What it does |
|-------|-------------|
| `fullstack-site-builder` | Build and deploy Next.js sites |
| `prd-to-deploy` | PRD to GitHub to Vercel pipeline |
| `site-enhancer` | UI/UX polish and improvements |
| `website-revamp` | Website redesign |
| `git-operations` | Source control management |
| `automation-builder` | n8n/Make/Zapier workflows |

### Personal & Health (2 skills)
| Skill | What it does |
|-------|-------------|
| `medical-tracker` | Doctor appointments, medications |
| `weekly-review` | Weekly retrospective |

### Automation (1 skill)
| Skill | What it does |
|-------|-------------|
| `daily-briefing` | Morning overview generation |

### Content (1 skill)
| Skill | What it does |
|-------|-------------|
| `youtube-video-creator` | Video production workflow |

### Storage & Memory (1 skill)
| Skill | What it does |
|-------|-------------|
| `obsidian-vault` | Persistent notes with `[[wikilinks]]` |

---

## Obsidian Vault Structure

```
vault/
  daily/          — Daily notes (YYYY-MM-DD.md)
  inbox/          — Quick capture
  projects/       — Project notes
  people/         — Contact and relationship notes
  decisions/      — Decision logs
  templates/      — Note templates
    daily.md      — Daily note template
    meeting.md    — Meeting notes template
    decision.md   — Decision record template
    client.md     — Client profile template
  .obsidian/      — Obsidian desktop config
```

**Sync:** Obsidian Git plugin auto-commits every 10 minutes.

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
| `api.workitu.com` | 65.109.230.136 (HTTPS) | Vault REST API |
| `blaze-post.com` | Vercel | Bee website |
| `workitu.com` | Vercel | Main domain |

### External Services
| Service | Used for |
|---------|----------|
| DeepSeek API | Agent + Telegram AI (OpenAI-compatible) |
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

- **Path validation** — No directory traversal outside repo/vault
- **Shell injection prevention** — subprocess list-form in all tools
- **API key auth** — X-API-Key header on Vault API
- **Telegram auth** — Admin-only via user ID check
- **Rate limiting** — 30 req/min on API, 10 msg/min on Telegram
- **Environment isolation** — `.env` on VPS only, never in repo
- **HTTPS** — Let's Encrypt cert with auto-renewal

---

## Quick Reference

**Total tools across all surfaces:** 27 agent tools + 23 MCP operations + 19 skills
**Autonomous actions:** Daily briefing, site monitoring, content publishing
**Chat interfaces:** Telegram bot, Claude.ai, Claude Code
**API access:** `https://api.workitu.com/api/vault/`
**Revenue target:** ₪7,000/month
