# Bee Skills Index

Reference for Claude Code. Full skill definitions live in Claude.ai `/mnt/skills/user/`.

## Core System (4)
| Skill | Triggers | Purpose |
|-------|----------|---------|
| bee-chief-of-staff | "Bee", task mgmt, priorities, schedule | Core orchestration |
| bee-memory-engine | Boot, memory, context, "fix yourself" | Memory + persistence |
| bee-skill-developer | Create/modify Bee skills | Meta-skill creation |
| bee-skill-manager | Install/update/package skills | Skill lifecycle |

## Business & Revenue (4)
| Skill | Triggers | Purpose |
|-------|----------|---------|
| profit-mode-engine | Revenue, money, pricing, clients | Master revenue skill |
| outreach-composer | Outreach, leads, cold emails, LinkedIn | Lead generation |
| client-project-manager | Client projects, milestones, delivery | Client work mgmt |
| prd-creator | PRD, specs, requirements | Product planning |

## Development (6)
| Skill | Triggers | Purpose |
|-------|----------|---------|
| fullstack-site-builder | Build website, Next.js, deploy | Full dev lifecycle |
| **prd-to-deploy** | `/deploy-prd`, build from PRD, launch project | **Full pipeline: PRD → code → GitHub → Vercel** |
| site-enhancer | Improve design, polish UI | Visual upgrades |
| website-revamp | workitu.com, company site | Company web presence |
| git-operations | Git, GitHub, deploy, version control | Source control |
| automation-builder | n8n, Make, Zapier, workflows | Automation design |

## Personal & Health (2)
| Skill | Triggers | Purpose |
|-------|----------|---------|
| medical-tracker | Doctor, meds, health, appointments | Medical management |
| weekly-review | Weekly summary, progress report | Weekly retrospective |

## Automation (1)
| Skill | Triggers | Purpose |
|-------|----------|---------|
| daily-briefing | Morning, briefing, today, schedule, "what's today" | Auto-generated daily overview from ClickUp/Calendar/Gmail |

## Content (1)
| Skill | Triggers | Purpose |
|-------|----------|---------|
| youtube-video-creator | YouTube, video, content marketing | Video production |

## Storage & Memory (1)
| Skill | Triggers | Purpose |
|-------|----------|---------|
| obsidian-vault | Notes, vault, remember, search notes, daily note | Persistent Obsidian vault — search, create, update notes with [[wikilinks]] |

## Claude Code MCP-Powered Actions

Claude Code can now directly execute these operations via MCP (no Claude.ai relay needed):

**ClickUp Operations:**
- Search/create/update/complete tasks in any list
- Add comments to document progress
- Browse workspace hierarchy (spaces, folders, lists)
- Manage documents and pages

**Gmail Operations:**
- Search and read emails
- Create draft replies
- Check for important messages

**Calendar Operations:**
- View upcoming appointments
- Create/update events
- Find free time slots
- Check availability for meetings

**Obsidian Vault Operations:**
- Search notes by content, tags, or frontmatter (vault_search)
- Read/create/update notes with YAML frontmatter (vault_read/create/update)
- Create/append to daily notes (vault_daily_note)
- Link notes with [[wikilinks]] (vault_link)
- List notes by folder or tag (vault_list)
- Vault location: `vault/` in brain repo, syncs via Git
