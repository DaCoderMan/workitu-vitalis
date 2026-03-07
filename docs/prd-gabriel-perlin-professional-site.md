# PRD: Gabriel Perlin Professional Site (Bee's Forge)

**Status:** Draft  
**Created:** 2026-03-04  
**Owner:** Gabriel Perlin  
**Delivery:** Bee's Forge  
**Product Type:** Professional personal website with blog

## 1. Overview

Build a professional website for Gabriel Perlin that establishes credibility, showcases expertise, and supports long-form content publishing through a built-in blog.

The site should feel polished, fast, and trustworthy on desktop and mobile, while being easy for Gabriel to update regularly.

## 2. Goals

1. Present Gabriel as a credible professional with a clear personal brand.
2. Publish and organize blog content for thought leadership and SEO growth.
3. Generate qualified inbound opportunities through a clear contact path.
4. Keep content operations simple so publishing does not depend on developers.

## 3. Success Metrics

1. Core Web Vitals in green on key pages.
2. Blog publishing workflow under 10 minutes per post.
3. 95+ Lighthouse score target for performance and SEO on homepage/blog pages.
4. Monthly growth in organic traffic and blog page views.
5. Contact form conversion from relevant visitors.

## 4. Target Audience

1. Potential clients evaluating Gabriel’s expertise.
2. Recruiters and partners validating background and quality of work.
3. Readers interested in Gabriel’s domain knowledge and insights.

## 5. Information Architecture

### Primary Pages

1. `/` Home
2. `/about` About Gabriel
3. `/blog` Blog listing
4. `/blog/[slug]` Blog post detail
5. `/contact` Contact page

### Optional Expansion Pages

1. `/projects` Selected work or case studies
2. `/speaking` Talks, interviews, or media

## 6. Functional Requirements

### 6.1 Home Page

1. Hero with positioning statement and CTA.
2. Short credibility section (bio, highlights, trust markers).
3. Latest blog posts section (3–6 most recent).
4. Primary CTA to contact or book a conversation.

### 6.2 About Page

1. Professional biography with photo.
2. Skills, domains, and experience highlights.
3. Optional timeline for career milestones.

### 6.3 Blog System

1. CMS-backed blog authoring and publishing flow.
2. Rich text support with headings, links, images, code blocks, quotes.
3. Slug, title, excerpt, cover image, publish date, tags, reading time.
4. Draft and published states.
5. Blog listing with filtering by tag and pagination.
6. Related posts module on each blog post page.
7. SEO metadata per post (title, description, OG image).

### 6.4 Contact

1. Contact form with name, email, company, message.
2. Spam protection (captcha or equivalent).
3. Confirmation state and email delivery to Gabriel.

### 6.5 Admin/Content Ops

1. Non-technical content editing workflow.
2. Preview before publishing.
3. Image optimization pipeline.

## 7. Non-Functional Requirements

1. Responsive for mobile, tablet, desktop.
2. Accessibility target WCAG 2.1 AA baseline.
3. Fast page loads and optimized media.
4. Secure headers, form validation, and bot protection.
5. Clean URL structure and sitemap generation.

## 8. Design Direction

1. Professional and minimal visual language.
2. Strong typography hierarchy for readability.
3. Brand-forward but restrained color palette.
4. Editorial reading experience optimized for long-form posts.
5. Subtle motion only where it improves clarity.

## 9. SEO Requirements

1. Metadata and canonical URLs across all indexable pages.
2. Auto-generated sitemap and robots file.
3. Structured data:
   - Person schema for Gabriel
   - Article schema for blog posts
4. Open Graph and Twitter cards for share previews.

## 10. Analytics

1. Track visits, referrers, top content, and conversions.
2. Track blog engagement (time on page, scroll depth optional).
3. Dashboard report cadence: monthly review.

## 11. Recommended Technical Stack (Bee's Forge)

1. Frontend: Next.js + TypeScript
2. Styling: Tailwind CSS
3. Content: Headless CMS or MDX workflow
4. Deployment: Vercel
5. Forms: API route + email delivery integration
6. Analytics: privacy-friendly analytics tooling

## 12. Delivery Plan (Bee's Forge)

### Phase 1: Foundation

1. Project setup and design system basics.
2. Home/About/Contact pages.
3. Initial SEO + analytics setup.

### Phase 2: Blog Engine

1. CMS integration and blog content model.
2. Blog listing and post template.
3. Tag filtering and related posts.

### Phase 3: Polish & Launch

1. Accessibility and performance pass.
2. Final QA across devices/browsers.
3. Production release and monitoring.

## 13. Acceptance Criteria

1. All primary pages are live and responsive.
2. Gabriel can create, edit, preview, and publish posts without code changes.
3. Blog posts render correctly with metadata and sharing cards.
4. Contact form delivers messages reliably and blocks obvious spam.
5. Baseline performance, accessibility, and SEO checks pass.

## 14. Risks and Mitigation

1. **Risk:** Slow content publishing due to complex CMS setup.  
   **Mitigation:** Start with a simple authoring workflow and expand later.
2. **Risk:** Design delays from unclear brand direction.  
   **Mitigation:** Approve style tiles and page wireframes early.
3. **Risk:** SEO underperformance due to inconsistent posting cadence.  
   **Mitigation:** Establish a realistic publishing calendar.

## 15. Open Questions

1. Which CMS should Bee's Forge use: MDX-in-repo, Sanity, or Contentful?
2. Should the contact CTA be email only or include calendar booking?
3. Does Gabriel want a public projects/case-study section at launch?
4. Is multilingual support required for launch or post-launch?
