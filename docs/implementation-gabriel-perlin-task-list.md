# Implementation Task List: Gabriel Perlin Professional Site

**Source PRD:** `docs/prd-gabriel-perlin-professional-site.md`  
**Created:** 2026-03-04  
**Delivery Model:** Bee's Forge  
**Execution Style:** Ticketed backlog by phase

## 1. Backlog Overview

| ID | Phase | Task | Priority | Est. |
|---|---|---|---|---|
| GAB-001 | Foundation | Finalize brand inputs and content inventory | High | 0.5d |
| GAB-002 | Foundation | App shell, global layout, nav, footer | High | 1d |
| GAB-003 | Foundation | Home page implementation | High | 1d |
| GAB-004 | Foundation | About page implementation | High | 0.5d |
| GAB-005 | Foundation | Contact page + form API + email delivery | High | 1d |
| GAB-006 | Foundation | Core SEO setup (metadata, sitemap, robots, canonicals) | High | 0.5d |
| GAB-007 | Foundation | Analytics instrumentation | Medium | 0.5d |
| GAB-008 | Blog Engine | Choose content pipeline (MDX or CMS) and implement model | High | 1d |
| GAB-009 | Blog Engine | Blog list page (`/blog`) with pagination | High | 1d |
| GAB-010 | Blog Engine | Blog post page (`/blog/[slug]`) with rich content | High | 1d |
| GAB-011 | Blog Engine | Tags, related posts, reading time | Medium | 0.5d |
| GAB-012 | Blog Engine | Post-level SEO (OG/Twitter/Article schema) | High | 0.5d |
| GAB-013 | Blog Engine | Editorial workflow: draft, preview, publish | High | 1d |
| GAB-014 | Blog Engine | Seed initial content (3 launch posts) | Medium | 0.5d |
| GAB-015 | Polish & Launch | Accessibility pass (WCAG 2.1 AA baseline) | High | 0.5d |
| GAB-016 | Polish & Launch | Performance pass (CWV + Lighthouse) | High | 0.5d |
| GAB-017 | Polish & Launch | Security hardening and anti-spam controls | High | 0.5d |
| GAB-018 | Polish & Launch | Cross-device QA + production release checklist | High | 1d |

## 2. Ticket Details

## GAB-001 Finalize Brand Inputs and Content Inventory
- Scope: Confirm positioning statement, bio, profile photo, trust markers, contact destination email.
- Deliverables: Approved copy deck for Home/About/Contact and launch content list.
- Acceptance Criteria:
  - Final approved hero headline + subheadline exists.
  - About page content is complete and approved.
  - Contact workflow destination is defined.

## GAB-002 App Shell, Global Layout, Nav, Footer
- Scope: Implement base layout, typography scale, nav links, footer links, and responsive container system.
- Deliverables: Shared `layout` and reusable section primitives.
- Acceptance Criteria:
  - Header and footer render correctly on mobile and desktop.
  - All primary routes are linked.
  - No layout shift issues during initial load.

## GAB-003 Home Page Implementation
- Scope: Build hero, credibility, latest posts preview, and primary CTA blocks.
- Deliverables: Production-ready homepage with reusable sections.
- Acceptance Criteria:
  - Home reflects approved content from GAB-001.
  - Latest posts block shows newest published posts.
  - Primary CTA routes to `/contact`.

## GAB-004 About Page Implementation
- Scope: Build biography section, strengths/skills blocks, optional timeline section.
- Deliverables: Complete `/about` page.
- Acceptance Criteria:
  - Content is fully editable through chosen content workflow.
  - Page is responsive and accessible.

## GAB-005 Contact Page + Form API + Email Delivery
- Scope: Build `/contact`, server handler, validation, and email notification flow.
- Deliverables: Contact form with success/error states.
- Acceptance Criteria:
  - Required validation on name, email, message.
  - Successful form submission triggers delivery to Gabriel.
  - Spam protection is enabled.

## GAB-006 Core SEO Setup
- Scope: Global metadata strategy, canonical handling, sitemap, robots, and basic schema.
- Deliverables: SEO baseline for all indexable pages.
- Acceptance Criteria:
  - `sitemap.xml` and `robots.txt` are accessible.
  - Canonical tags are present on primary pages.
  - Person schema exists for Gabriel.

## GAB-007 Analytics Instrumentation
- Scope: Add privacy-friendly analytics and conversion tracking for contact submits.
- Deliverables: Page view and conversion events visible in analytics dashboard.
- Acceptance Criteria:
  - Page views are recorded on all key routes.
  - Contact form success event is trackable.

## GAB-008 Content Pipeline and Model
- Scope: Implement selected authoring path (recommended default: MDX-in-repo for speed).
- Deliverables: Content schema for posts with title, slug, excerpt, tags, date, cover, draft flag.
- Acceptance Criteria:
  - New post can be created without code changes outside content files/CMS editor.
  - Draft content is hidden from public listing.

## GAB-009 Blog List Page (`/blog`)
- Scope: Build paginated listing with cards and metadata.
- Deliverables: Blog index with proper empty states.
- Acceptance Criteria:
  - Posts sorted by publish date descending.
  - Pagination works with consistent URLs.
  - Tag data is visible per card.

## GAB-010 Blog Post Page (`/blog/[slug]`)
- Scope: Render article body with rich formatting and responsive media.
- Deliverables: Blog detail template.
- Acceptance Criteria:
  - Headings, links, quotes, code blocks, and images render correctly.
  - Reading time and publish date are shown.
  - 404 behavior exists for invalid slugs.

## GAB-011 Tags, Related Posts, Reading Time
- Scope: Add tag filter UI and related-post logic based on shared tags.
- Deliverables: Tag archive filtering and related section on post page.
- Acceptance Criteria:
  - Tag filter updates list correctly.
  - Related posts exclude current post and show max 3.

## GAB-012 Post-Level SEO
- Scope: Add per-post metadata, OG/Twitter cards, and Article schema.
- Deliverables: SEO-complete blog post template.
- Acceptance Criteria:
  - Social preview data differs per post.
  - Article schema validates in structured-data tester.

## GAB-013 Editorial Workflow (Draft/Preview/Publish)
- Scope: Implement author workflow including preview route and publish controls.
- Deliverables: Documented workflow for content operations.
- Acceptance Criteria:
  - Draft post can be previewed privately.
  - Publish action makes post visible on `/blog`.
  - Workflow documentation exists in repo docs.

## GAB-014 Seed Launch Content
- Scope: Add 3 initial blog posts with proper metadata and visuals.
- Deliverables: Launch-ready blog inventory.
- Acceptance Criteria:
  - Three published posts appear on list page.
  - Each post has unique title, excerpt, tags, and OG metadata.

## GAB-015 Accessibility Pass
- Scope: Keyboard navigation, focus states, form labels, contrast, semantic headings.
- Deliverables: Accessibility issues fixed to baseline target.
- Acceptance Criteria:
  - Full keyboard navigation supported for nav and form flows.
  - No critical accessibility errors in automated audit.

## GAB-016 Performance Pass
- Scope: Optimize images, font loading, hydration, and caching.
- Deliverables: Performance-tuned production build.
- Acceptance Criteria:
  - Homepage and blog pages reach target Lighthouse baseline.
  - Core Web Vitals are green in production monitoring.

## GAB-017 Security Hardening and Anti-Spam
- Scope: Input sanitization, server-side validation, security headers, form abuse mitigation.
- Deliverables: Hardened request handling.
- Acceptance Criteria:
  - Invalid payloads are rejected safely.
  - Contact endpoint has anti-spam control active.

## GAB-018 Cross-Device QA and Launch
- Scope: Final QA on mobile/tablet/desktop, browser sweep, deployment checks, rollback notes.
- Deliverables: Production launch checklist and go-live verification.
- Acceptance Criteria:
  - Core routes pass QA on Chrome, Safari, Edge.
  - Contact flow is verified in production.
  - Post-launch monitoring checklist is completed.

## 3. Execution Order

1. Sprint A: GAB-001 to GAB-007  
2. Sprint B: GAB-008 to GAB-014  
3. Sprint C: GAB-015 to GAB-018

## 4. Definition of Done (Project Level)

1. All high-priority tickets are completed and accepted.
2. Blog publishing can be executed by a non-developer.
3. Contact conversions are trackable in analytics.
4. Performance, accessibility, and SEO baselines pass.
5. Production launch checklist is signed off.
