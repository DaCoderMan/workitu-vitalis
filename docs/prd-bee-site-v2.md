# PRD: Bee Site v2 — Full Platform

**Status:** Draft
**Created:** 2026-03-01
**Owner:** Yonatan Perlin
**Builder:** Bee (Claude Code + Ralph Wiggum loop)
**Repo:** github.com/DaCoderMan/workitu-bee-site
**Stack:** Next.js 16, Tailwind 4, shadcn/ui, TypeScript

---

## 1. Overview

Evolve the single-page Bee landing site into a full AI automation consulting platform with:
- Multi-language support (English + Hebrew)
- Client dashboard with authentication
- PayPal payment system (subscriptions + one-time)
- Blog powered by ClickUp docs
- Dynamic portfolio pulled from ClickUp
- Autonomous self-updating capabilities
- Booking/scheduling integration
- Health monitoring endpoint

## 2. Site Architecture

### 2.1 Pages

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Landing page (hero, services, portfolio preview, about, contact) | No |
| `/pricing` | Detailed pricing comparison table with PayPal buttons | No |
| `/portfolio` | Full project grid pulled from ClickUp | No |
| `/blog` | Blog listing — posts from ClickUp docs | No |
| `/blog/[slug]` | Individual blog post | No |
| `/book` | Calendar embed for booking discovery calls | No |
| `/dashboard` | Client portal — project status, invoices, chat | Yes |
| `/dashboard/projects` | Client's active projects with status | Yes |
| `/dashboard/invoices` | Downloadable invoices | Yes |
| `/api/health` | Uptime/status endpoint for Bee agent monitoring | No |
| `/api/contact` | Contact form handler (existing) | No |
| `/api/paypal/create-order` | Create PayPal order | No |
| `/api/paypal/capture-order` | Capture payment + provision | No |
| `/api/paypal/webhook` | PayPal IPN/webhook receiver | No |
| `/api/paypal/subscriptions` | Manage subscription lifecycle | No |
| `/api/portfolio` | Serve portfolio data from ClickUp | No |
| `/api/blog` | Serve blog content from ClickUp | No |
| `/api/cron/site-update` | Vercel cron — check for content updates | No |

### 2.2 Multi-Language

- Default: English
- Secondary: Hebrew (RTL support)
- Implementation: next-intl or similar i18n library
- URL pattern: `/en/...` and `/he/...` with language switcher in navbar
- All static text in translation files, dynamic content from ClickUp in original language

## 3. PayPal Payment System

### 3.1 Configuration

Central config at `config/paypal-config.json` in brain repo:

```json
{
  "version": "1.0",
  "environment": "live",
  "currency": "USD",
  "business_email": "paypal@workitu.com",
  "plans": [
    {
      "id": "starter",
      "name": "Starter",
      "type": "subscription",
      "price": 150,
      "interval": "monthly",
      "features": ["Monitoring", "Minor fixes", "Email support", "Monthly report"]
    },
    {
      "id": "standard",
      "name": "Standard",
      "type": "subscription",
      "price": 500,
      "interval": "monthly",
      "features": ["Full automation management", "Priority support", "Weekly reports", "Up to 5 automations"]
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "type": "subscription",
      "price": 1500,
      "interval": "monthly",
      "features": ["Dedicated Bee instance", "Unlimited automations", "24/7 priority", "Custom integrations", "Daily reports"]
    }
  ],
  "one_time": {
    "enabled": true,
    "min_amount": 200,
    "description": "Custom project engagement"
  },
  "webhooks": {
    "on_subscription_created": ["create_clickup_task", "send_welcome_email", "grant_dashboard_access"],
    "on_payment_received": ["create_clickup_task", "send_receipt_email"],
    "on_subscription_cancelled": ["update_clickup_task", "send_offboarding_email"]
  },
  "projects": {
    "bee-site": {
      "plans_enabled": ["starter", "standard", "enterprise"],
      "one_time_enabled": true
    }
  }
}
```

### 3.2 PayPal Integration Flow

1. Client clicks "Subscribe" or "Pay" on pricing page
2. PayPal Smart Buttons render (client-side SDK)
3. Button click → `POST /api/paypal/create-order` (server creates order/subscription via PayPal REST API)
4. Client approves in PayPal popup
5. `POST /api/paypal/capture-order` captures payment
6. PayPal sends webhook to `/api/paypal/webhook`
7. Webhook handler:
   - Creates ClickUp task in Active Clients (901816199662)
   - Sends welcome email via Resend
   - Creates user record for dashboard access
   - Logs payment in Revenue Tracker (901816199664)

### 3.3 PayPal Skill (Reusable)

The PayPal integration must be a **reusable skill** that works across projects:
- Brain repo holds `config/paypal-config.json` with global settings
- Each project references the config and adds project-specific plan mappings
- Shared utilities in a `lib/paypal/` directory that can be copied to any Next.js project
- When `/deploy-prd` creates a new project, it checks if PayPal is needed and copies the skill

### 3.4 Environment Variables

```
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_MODE=live  # or sandbox
```

## 4. Autonomous Site Updates

### 4.1 Update Triggers

| Trigger | What Updates | How |
|---------|-------------|-----|
| New project deployed via `/deploy-prd` | Portfolio section | Bee pushes commit → Vercel auto-deploys |
| New blog post drafted in ClickUp | Blog section | Vercel cron checks ClickUp → rebuilds if new content |
| Pricing change in paypal-config.json | Pricing page | Bee pushes commit → Vercel auto-deploys |
| Config change in bee-config.json | Portfolio data | Bee pushes commit → Vercel auto-deploys |

### 4.2 Technical Implementation

- **GitHub → Vercel auto-deploy**: Already built-in when Vercel project is connected to GitHub repo
- **Content fetching**: Site fetches portfolio + blog data from ClickUp API at build time (ISR with revalidation) or via API routes
- **Vercel Cron**: `vercel.json` defines a cron job that hits `/api/cron/site-update` every hour to check for new ClickUp content
- **Bee agent (VPS)**: Daily check pushes any config changes as commits → triggers Vercel rebuild

### 4.3 Portfolio from ClickUp

- Create a ClickUp list "Portfolio" in Workitu Tech space
- Each task = one project with custom fields:
  - Title (task name)
  - Description (task description)
  - Status: Live / Built / In Progress / Planned
  - Tags: tech stack badges
  - Custom field: Live URL
  - Custom field: GitHub URL
- Site fetches from ClickUp API at build time + ISR revalidation every 1 hour
- When Bee deploys a new project, it creates/updates the ClickUp task → site auto-updates on next revalidation

### 4.4 Blog from ClickUp

- Create a ClickUp list "Blog Posts" in Workitu Tech space
- Each task = one blog post:
  - Title = post title
  - Description = post content (markdown)
  - Status: Draft / Published
  - Tags: categories
  - Custom field: Slug
  - Custom field: Publish Date
- Only "Published" status posts appear on site
- Bee can write blog posts as ClickUp tasks → auto-published on next build
- `/api/blog` fetches and caches posts

## 5. Client Dashboard

### 5.1 Authentication

- Simple email-based magic link auth (no passwords)
- When client pays via PayPal, email is captured → account created
- Login: enter email → receive magic link via Resend → click to authenticate
- Session managed with JWT in httpOnly cookie
- Middleware protects `/dashboard/*` routes

### 5.2 Dashboard Features

| Feature | Description |
|---------|-------------|
| Project Status | Cards showing each active project with ClickUp task status |
| Invoices | List of PayPal transactions with downloadable PDF receipts |
| Chat with Bee | Simple chat widget — messages create ClickUp comments on client's task |
| Book a Call | Embedded calendar scheduling (Cal.com or Calendly) |
| Subscription Management | View/cancel subscription, update payment method (redirects to PayPal) |

### 5.3 Data Sources

- Projects: ClickUp Active Clients list, filtered by client email
- Invoices: PayPal transaction history via API
- Chat: ClickUp task comments via API
- Schedule: Cal.com/Calendly embed

## 6. Bee Autonomous Actions

### 6.1 Autonomous Capabilities (no approval needed)

| Action | Trigger | Implementation |
|--------|---------|----------------|
| Update portfolio | New project deployed | Bee creates ClickUp task in Portfolio list |
| Publish blog posts | Draft moved to "Published" in ClickUp | ISR revalidation picks it up |
| Adjust pricing | Market analysis / demand signals | Bee updates paypal-config.json + pushes |
| Weekly performance report | Sunday 9AM IST cron | Bee agent generates report, emails to Yonatan |
| Auto-respond to contact form | New submission | Templated email sent immediately via Resend |
| Site health check | Daily 8AM IST (with agent) | Bee agent pings /api/health, alerts if down |
| Modify site code | Bug fixes, content updates | Bee pushes commits → Vercel auto-deploys |
| Site uptime monitoring | Continuous | VPS agent checks every hour |
| Broken link detection | Weekly | VPS agent crawls site links |

### 6.2 Auto-Response Templates

Contact form auto-response:
```
Subject: Thanks for reaching out — Workitu Tech

Hi {name},

Thanks for your interest in AI automation. I've received your message
and will get back to you within 24 hours.

In the meantime, you can book a free discovery call: [booking link]

Best,
Yonatan Perlin
Workitu Tech
```

### 6.3 Weekly Performance Report

Generated every Sunday, includes:
- Site visitors (Vercel Analytics API)
- Contact form submissions this week
- New subscribers/payments
- Portfolio views
- Blog post views
- ClickUp task completion rate

## 7. SEO & Analytics

### 7.1 SEO

- **Sitemap**: Auto-generated via `next-sitemap` — includes all pages, blog posts, portfolio items
- **robots.txt**: Allow all, link to sitemap
- **OpenGraph images**: Auto-generated per page using `@vercel/og` (ImageResponse API)
- **JSON-LD**: Structured data for:
  - Organization (Workitu Tech)
  - Service (AI Automation Consulting)
  - Blog posts (Article schema)
  - Pricing (Offer schema)
- All SEO content must be truthful — no fake metrics, no inflated claims

### 7.2 Analytics

- **Vercel Analytics**: Enable via `@vercel/analytics` package
- **Vercel Speed Insights**: Enable via `@vercel/speed-insights`
- No Google Analytics (privacy-friendly approach)

## 8. Rotating Hero

The hero section rotates messaging on each visit or on a timer:

```typescript
const heroVariants = [
  {
    badge: "Free pilot project — zero risk",
    headline: "AI Automation That Saves You Hours",
    subhead: "We build intelligent workflows that eliminate repetitive tasks. Start with a free pilot — pay only when you see results."
  },
  {
    badge: "Built by AI, managed by AI",
    headline: "Your Business Runs Itself",
    subhead: "From lead capture to invoice generation — we automate the workflows that drain your time."
  },
  {
    badge: "Real results, real automation",
    headline: "Stop Doing What Machines Can Do",
    subhead: "Custom AI agents that handle your repetitive work 24/7. No templates, no bloat — built for your exact workflow."
  }
];
```

Rotation: Random on page load, or cycle every 10 seconds with fade transition.

## 9. Mobile & Animations

- All animations must work smoothly on mobile (no janky scroll effects)
- Use `framer-motion` with `prefers-reduced-motion` respect
- Subtle animations only:
  - Fade-in on scroll for sections
  - Hover scale on cards
  - Smooth number counting for stats (if any)
  - Page transitions between routes
- Test on mobile viewport (375px) before shipping

## 10. Booking Integration

- `/book` page with embedded Cal.com or Calendly widget
- Free 30-minute discovery call
- Connected to Yonatan's Google Calendar
- When booking happens → ClickUp task created in Leads list
- CTA buttons throughout site link to `/book`

## 11. Health Monitoring

### `/api/health` Endpoint

```json
{
  "status": "ok",
  "version": "2.0.0",
  "uptime": "72h",
  "last_build": "2026-03-01T14:30:00Z",
  "services": {
    "clickup": "connected",
    "paypal": "connected",
    "resend": "connected"
  },
  "content": {
    "portfolio_items": 6,
    "blog_posts": 3,
    "last_content_update": "2026-03-01T12:00:00Z"
  }
}
```

VPS agent checks this endpoint every hour. If status != "ok", sends Telegram alert.

## 12. Implementation Phases

### Phase 1: Foundation (this Ralph loop)
- [ ] Multi-language setup (next-intl)
- [ ] PayPal integration (config, API routes, Smart Buttons)
- [ ] Pricing page with PayPal buttons
- [ ] Portfolio from ClickUp (API route + ISR)
- [ ] Blog from ClickUp (API route + ISR)
- [ ] `/api/health` endpoint
- [ ] Vercel Analytics integration
- [ ] SEO (sitemap, robots, OG images, JSON-LD)
- [ ] Rotating hero

### Phase 2: Client Experience
- [ ] Magic link authentication
- [ ] Client dashboard (project status, invoices)
- [ ] Chat with Bee widget
- [ ] Booking page (Cal.com embed)
- [ ] Auto-response emails

### Phase 3: Autonomy
- [ ] VPS agent site monitoring
- [ ] Weekly performance reports
- [ ] Auto-publish blog posts
- [ ] Auto-update portfolio
- [ ] Broken link detection
- [ ] Pricing adjustment automation

### Phase 4: Polish
- [ ] Mobile-optimized animations (framer-motion)
- [ ] Hebrew translation
- [ ] Page transitions
- [ ] Performance optimization
- [ ] Domain setup + SSL

## 13. Environment Variables (Full)

```
# Existing
CLICKUP_API_TOKEN=...
RESEND_API_KEY=...
CONTACT_NOTIFICATION_EMAIL=...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_MODE=live

# Auth
JWT_SECRET=...
MAGIC_LINK_SECRET=...

# ClickUp Lists
CLICKUP_PORTFOLIO_LIST_ID=...
CLICKUP_BLOG_LIST_ID=...
CLICKUP_ACTIVE_CLIENTS_LIST_ID=901816199662
CLICKUP_LEADS_LIST_ID=901816199661
CLICKUP_REVENUE_LIST_ID=901816199664

# Vercel
VERCEL_ANALYTICS_ID=...

# Cal.com / Calendly
BOOKING_EMBED_URL=...
```

## 14. Success Criteria

- [ ] All pages load < 2s on mobile
- [ ] PayPal payments work end-to-end (subscribe → ClickUp task → email → dashboard)
- [ ] Portfolio auto-updates when ClickUp list changes
- [ ] Blog posts publish when ClickUp task status = Published
- [ ] Health endpoint returns accurate status
- [ ] Vercel Analytics tracking active
- [ ] SEO: sitemap accessible, OG images render on social share
- [ ] Hebrew version functional with RTL layout
- [ ] Client can log in, see projects, download invoices
- [ ] Contact form auto-responds within 30 seconds
- [ ] VPS agent successfully monitors /api/health
