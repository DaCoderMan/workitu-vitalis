# PRD: Deploy Bee Site & Go Live

**Status:** Nearly Complete
**Created:** 2026-03-02
**Owner:** Yonatan Perlin
**Builder:** Bee (Claude Code + Ralph Wiggum loop)
**Site Repo:** github.com/DaCoderMan/workitu-bee-site
**Domain:** blaze-post.com (was bee.workitu.com → changed per user request)
**Live URL:** https://blaze-post.com (alias: workitu-bee-site.vercel.app)

---

## 1. Overview

Deploy the fully-built Bee website to Vercel, configure all environment variables, set up the domain, create required ClickUp lists, configure VPS monitoring cron, and verify everything works end-to-end.

## 2. Prerequisites Status

| Item | Status | Action |
|------|--------|--------|
| Vercel CLI authenticated | ✅ Done | Device OAuth flow completed |
| ClickUp API token | NEEDED | Add to Vercel env vars |
| PayPal credentials | Not yet | Skip for now, add later |
| Domain (blaze-post.com) | ✅ Vercel configured | A records needed in Cloudflare → 76.76.21.21 |
| Resend API key | NEEDED | Add to Vercel env vars |
| VPS SSH access | Working | SSH key added |

## 3. Implementation Steps

### Step 1: Generate Secrets ✅
- JWT_SECRET generated
- MAGIC_LINK_SECRET generated
- CRON_SECRET generated

### Step 2: Create ClickUp Lists ✅
- Portfolio list: 901816399997
- Blog Posts list: 901816400000

### Step 3: Deploy to Vercel ✅
- Project imported via Vercel dashboard (CLI auth failed)
- 12 env vars set (all except CLICKUP_API_TOKEN and RESEND_API_KEY)
- Deployed to production — build time: 48s
- Fixed: Vercel Hobby plan cron limit (changed from hourly to daily)
- Live at: workitu-bee-site.vercel.app

### Step 4: Configure Domain ✅
- Originally added `bee.workitu.com` (workitu.tech didn't exist)
- Changed to `blaze-post.com` per user request — configured via Vercel CLI
- Added `blaze-post.com` + `www.blaze-post.com` as project domains
- Updated SITE_URL + NEXT_PUBLIC_APP_URL env vars to `https://blaze-post.com`
- Production redeployed with new domain — sitemap shows blaze-post.com URLs
- SSL certificates provisioning for blaze-post.com, www.blaze-post.com, bee.workitu.com
- **DNS needed in Cloudflare**: A records for `blaze-post.com` and `www.blaze-post.com` → `76.76.21.21` (proxy OFF)

### Step 5: Configure VPS Monitoring (deferred)
- Deploy updated agent code to VPS
- Add `BEE_SITE_URL=https://blaze-post.com` to agent .env

### Step 6: End-to-End Verification ✅
- [x] Homepage loads at workitu-bee-site.vercel.app
- [x] All nav links work (Services, Portfolio, Blog, Pricing, About, Contact)
- [ ] Contact form submits → ClickUp task (needs CLICKUP_API_TOKEN)
- [x] /login page renders magic link form
- [x] /book page shows booking placeholder
- [x] /api/health returns status OK
- [x] /blog page loads ("Posts coming soon")
- [x] /pricing page loads with 4 plan cards
- [ ] Language switcher (needs manual test)
- [x] Dark/light theme works
- [ ] Mobile responsive (needs manual test)
- [x] SSL valid (https://)
- [x] No console errors

### Step 7: Seed Initial Content ✅
- 3 portfolio items created in ClickUp (Bee AI, Website, n8n Hub)
- 1 blog post draft created in ClickUp

## 4. Environment Variables (Full Set)

```
# ClickUp
CLICKUP_API_TOKEN=<working token>
CLICKUP_PORTFOLIO_LIST_ID=<from Step 2>
CLICKUP_BLOG_LIST_ID=<from Step 2>
CLICKUP_ACTIVE_CLIENTS_LIST_ID=901816199662
CLICKUP_LEADS_LIST_ID=901816199661
CLICKUP_REVENUE_LIST_ID=901816199664

# Resend
RESEND_API_KEY=<from Resend dashboard>
CONTACT_NOTIFICATION_EMAIL=jonathanperlin@gmail.com

# PayPal (skip for now)
# PAYPAL_CLIENT_ID=
# PAYPAL_CLIENT_SECRET=
# PAYPAL_WEBHOOK_ID=
PAYPAL_MODE=live

# Site
SITE_URL=https://blaze-post.com
NEXT_PUBLIC_APP_URL=https://blaze-post.com

# Auth
JWT_SECRET=<generated>
MAGIC_LINK_SECRET=<generated>

# Booking (add when Cal.com ready)
# NEXT_PUBLIC_BOOKING_URL=

# Cron
CRON_SECRET=<generated>
```

## 5. Completion Criteria

- Site accessible at https://blaze-post.com
- Contact form creates ClickUp tasks
- VPS health monitoring active
- At least 2 portfolio items visible
- No console errors
- SSL valid
