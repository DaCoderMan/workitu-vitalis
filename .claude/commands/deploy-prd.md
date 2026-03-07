---
description: "Build a full project from a PRD, create GitHub repo, deploy to Vercel"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch
---

# Deploy PRD — Full Project Pipeline

You are Bee, executing the PRD-to-deployment pipeline. Take a PRD, develop it into a complete project, push to GitHub, and deploy to Vercel.

## Input

The user provides either:
- A ClickUp task ID containing the PRD (use `clickup_get_task`)
- A file path to a local PRD document
- A description of the project to build

## Pipeline Steps

### Step 1: Parse the PRD
- Extract: project name, features list, tech stack, target audience, design notes
- If the PRD is vague, ask clarifying questions before proceeding
- Determine the project slug: `workitu-[name]` (kebab-case, no spaces)

### Step 2: Pre-flight Checks
Run these checks before starting:
```bash
gh auth status
npx vercel whoami
```
If either fails, stop and tell the user to authenticate first.

### Step 3: Scaffold the Project
```bash
cd D:/Projects
npx create-next-app@latest workitu-[name] --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --no-react-compiler
cd workitu-[name]
npx shadcn@latest init -d
npx shadcn@latest add button card input textarea badge separator sheet sonner -y
npm install next-themes lucide-react
```

### Step 4: Develop the Project
Write ALL source files based on the PRD requirements:
- Follow the same patterns as `workitu-bee-site` (the reference implementation)
- Use shadcn components, Tailwind 4, oklch theme
- Include dark mode support via next-themes
- Keep it clean and production-ready
- Add a `vercel.json` with `"regions": ["fra1"]`
- Add a `.env.example` documenting required env vars

### Step 5: Build & Verify
```bash
npm run build
```
Fix any errors before proceeding.

### Step 6: Git & GitHub
```bash
git add -A
git commit -m "feat: initial [project-name] — [one-line description]

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
gh repo create DaCoderMan/workitu-[name] --public --source=. --push
```

### Step 7: Deploy to Vercel
```bash
npx vercel --yes --prod
```
Capture the deployment URL from the output.

### Step 8: Update ClickUp
If the PRD came from a ClickUp task:
- Mark the task as complete
- Add a comment with the live URL and GitHub URL

### Step 9: Register in Brain Repo
Update `D:/Projects/Workitulife/config/bee-config.json`:
- Add the project to the `deployed_projects` array

Format:
```json
{
  "name": "workitu-[name]",
  "github": "https://github.com/DaCoderMan/workitu-[name]",
  "vercel_url": "[deployment-url]",
  "deployed_at": "YYYY-MM-DD",
  "prd_source": "[clickup task ID or file path]"
}
```

### Step 10: Summary
Output a summary:
- Project name and description
- GitHub repo URL
- Live Vercel URL
- ClickUp task status (if applicable)
- Tech stack used

## Reference Implementation
The Bee website (`D:/Projects/workitu-bee-site`) is the gold standard. Follow its patterns for:
- File structure (`src/components/sections/`, `src/config/`, `src/lib/`)
- shadcn component usage
- Dark mode via next-themes ThemeProvider
- Responsive design with Tailwind
- API routes in `src/app/api/`

## Conventions
- GitHub org: `DaCoderMan`
- Repo naming: `workitu-[project]`
- Commit style: conventional commits (`feat:`, `fix:`, etc.)
- Deploy region: `fra1` (Frankfurt)
- Always add `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` to commits
