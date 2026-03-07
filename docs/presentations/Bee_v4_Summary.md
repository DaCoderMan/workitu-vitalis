# Bee v4.0 — What Is Bee?

## 10 Things to Know

1. **AI Chief of Staff** — Bee is an autonomous AI assistant that manages tasks, schedule, email, and business operations for Yonatan Perlin, Founder & CEO of Workitu Tech.

2. **5 Surfaces, 1 Brain** — Bee operates across Claude Code, Claude.ai, Telegram, a REST API, and an autonomous VPS agent — all sharing a single GitHub-synced brain repo.

3. **27 Agent Tools** — The autonomous agent runs 9 tool modules covering ClickUp tasks, Gmail, Calendar, site monitoring, content management, performance reporting, pricing, file operations, and an Obsidian vault.

4. **23 MCP Operations** — Claude Code and Claude.ai directly access ClickUp (10+ ops), Gmail (5 ops), and Google Calendar (8 ops) through MCP — no relay or middleware needed.

5. **19 AI Skills** — Claude.ai has specialized skills for revenue strategy, lead outreach, client management, full-stack development, PRD-to-deploy pipelines, medical tracking, weekly reviews, and more.

6. **Always-On Telegram Bot** — A Telegram chat interface with 7 slash commands and free-form AI conversation, backed by DeepSeek with access to all 27 tools.

7. **Vault REST API** — 8 HTTPS endpoints at `api.workitu.com` for searching, reading, creating, and linking Obsidian notes — accessible from any surface or external service.

8. **Runs Itself Daily** — Every morning at 8:00 AM IST, the autonomous agent generates a briefing from ClickUp, Gmail, and Calendar data — no human trigger needed.

9. **Full Dev & Deploy Pipeline** — Bee can scaffold projects, write code, commit to GitHub, and deploy to Vercel or a Hetzner VPS — end to end from a PRD.

10. **Security-First Design** — Path validation, shell injection prevention, API key auth, admin-only Telegram, rate limiting, HTTPS, and zero secrets in the repo.
