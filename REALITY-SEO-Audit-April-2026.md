# SEO Audit: realitydn.com
**Date:** April 10, 2026  
**Audit Type:** Full Site Audit

---

## Executive Summary

REALITY's website (realitydn.com) has a clean, modern foundation with good social meta tags and a clear brand identity — but it's leaving significant organic search traffic on the table. The site is a **React single-page application (SPA) with client-side rendering**, which means Google sees an empty `<div id="root"></div>` unless it successfully executes JavaScript. This is the single biggest SEO risk. Beyond that, the site has **only one indexed page** on Google, no blog or content section, no structured data, and no sitemap — meaning it's essentially invisible for the dozens of high-intent keywords people use to find bars, cafes, and events in Đà Nẵng.

**Biggest strength:** Strong brand identity, good Open Graph tags, and an active social presence on Instagram and Facebook that drives direct traffic.

**Top 3 priorities:**
1. Fix JavaScript rendering so Google can actually crawl your content (or add server-side rendering)
2. Add structured data (LocalBusiness, Event) so you appear in Maps and event searches
3. Create content pages targeting high-value keywords like "bars in Da Nang," "Da Nang events," and "community space Da Nang"

**Overall assessment:** Needs work. The technical foundation is blocking almost all organic discovery.

---

## Keyword Opportunity Table

| Keyword | Est. Difficulty | Opportunity Score | Current Ranking | Intent | Recommended Content Type |
|---------|----------------|-------------------|-----------------|--------|--------------------------|
| bars in da nang | Hard | High | Not ranking | Commercial | Landing page / homepage optimization |
| best cocktail bars da nang | Moderate | High | Not ranking | Commercial | Blog post or dedicated page |
| da nang nightlife | Hard | High | Not ranking | Informational | Guide page |
| da nang events this week | Moderate | High | Not ranking | Navigational | Events calendar page |
| community space da nang | Easy | High | Not ranking | Commercial | Homepage / about page |
| live music da nang | Moderate | High | Not ranking | Commercial | Events page |
| cafe da nang | Hard | Medium | Not ranking | Commercial | Homepage optimization |
| things to do in da nang at night | Moderate | High | Not ranking | Informational | Blog post |
| da nang expat bars | Easy | High | Not ranking | Commercial | Landing page |
| open mic da nang | Easy | High | Not ranking | Navigational | Events page |
| coworking cafe da nang | Moderate | Medium | Not ranking | Commercial | Blog post |
| da nang digital nomad hangouts | Easy | High | Not ranking | Informational | Blog post |
| cocktails da nang | Moderate | Medium | Not ranking | Commercial | Menu / drinks page |
| da nang art events | Easy | High | Not ranking | Navigational | Events page |
| best coffee da nang | Hard | Medium | Not ranking | Commercial | Blog post |
| da nang happy hour | Easy | High | Not ranking | Transactional | Dedicated page |
| where to meet people da nang | Easy | High | Not ranking | Informational | Blog post / about page |
| da nang bar with events | Easy | High | Not ranking | Commercial | Events page |
| reality bar da nang | Easy | High | Not ranking | Navigational | Homepage |
| an thuong nightlife | Moderate | Medium | Not ranking | Informational | Blog post |
| da nang music venue | Easy | High | Not ranking | Commercial | Events / about page |
| quán bar đà nẵng | Hard | Medium | Not ranking | Commercial | Vietnamese landing page |
| sự kiện đà nẵng | Moderate | Medium | Not ranking | Navigational | Vietnamese events page |

---

## On-Page SEO Issues

| Page | Issue | Severity | Recommended Fix |
|------|-------|----------|-----------------|
| Homepage | **Client-side rendering only** — `<body>` contains empty `<div id="root"></div>` | Critical | Implement SSR (Next.js), static pre-rendering, or at minimum dynamic rendering for bots |
| Homepage | **Only 1 page indexed** on Google (`site:realitydn.com` returns 1 result) | Critical | Add content pages, submit sitemap, fix rendering |
| Homepage | Title tag is good: "REALITY — coffee / cocktails / community" (46 chars) | Pass | — |
| Homepage | Meta description is good: includes location, value prop (93 chars) | Pass | Could be longer (150-160 chars) — add address or a call to action |
| Homepage | **No H1 tag visible to crawlers** — content is rendered via JavaScript | Critical | Ensure H1 is in server-rendered HTML |
| Homepage | **No internal links** visible to crawlers — all navigation is JS-rendered | Critical | Add server-rendered nav links or a static HTML fallback |
| Homepage | Open Graph tags are well-configured | Pass | — |
| Homepage | Twitter card tags are well-configured | Pass | — |
| Homepage | **No hreflang tags** for Vietnamese/English content | Medium | Add `hreflang` if you serve bilingual content |
| Homepage | **www redirect issue** — `www.realitydn.com` redirect was cancelled | High | Ensure www → non-www redirect works cleanly (301 redirect) |
| All pages | **No alt text visible** to crawlers on images (JS-rendered) | High | Add alt text and ensure it's in server-rendered HTML |

---

## Content Gap Recommendations

| Topic / Keyword | Why It Matters | Recommended Format | Priority | Est. Effort |
|----------------|----------------|-------------------|----------|-------------|
| **Events calendar page** | People search "da nang events this week" constantly; competitors like Digital Danang own this | Dedicated /events page with upcoming shows, open mics, art nights | High | Moderate |
| **"Best bars in Da Nang" guide** | High-volume keyword; competitors like MAKARA, Luxe Detour, and Tripadvisor rank for this | Blog post featuring REALITY + other spots (positions you as an authority) | High | Moderate |
| **Vietnamese-language content** | Huge local audience searching in Vietnamese ("quán bar đà nẵng") | Vietnamese version of key pages | High | Substantial |
| **Menu / drinks page** | People searching for cocktails, coffee, happy hour in Da Nang | Dedicated /menu page with drink descriptions | High | Quick win |
| **"Where to meet people in Da Nang"** | Directly aligned with REALITY's mission; low competition | Blog post about community, events, making friends | High | Quick win |
| **Da Nang nightlife guide** | High search volume, positions REALITY as the insider source | Long-form blog post / guide | Medium | Moderate |
| **Digital nomad / coworking content** | Da Nang is a fast-growing nomad hub; REALITY fits the "work + social" niche | Blog post: "Best places to work and socialize in Da Nang" | Medium | Quick win |
| **About / story page** | Builds trust, provides crawlable content about the brand and location | /about page with your story, address, hours | High | Quick win |
| **Location / directions page** | Local search queries need address, map, transport info | Dedicated section or page with Google Maps embed | High | Quick win |

---

## Technical SEO Checklist

| Check | Status | Details |
|-------|--------|---------|
| **HTTPS** | Pass | Site loads over HTTPS |
| **Mobile viewport** | Pass | `<meta name="viewport" content="width=device-width, initial-scale=1.0"/>` present |
| **Server-side rendering** | Fail | React SPA with empty `<div id="root"></div>` — Google may not render JS content |
| **XML Sitemap** | Fail | No sitemap detected — add `/sitemap.xml` and submit to Google Search Console |
| **robots.txt** | Warning | Not verified — ensure it exists and doesn't block important paths |
| **Structured data (Schema.org)** | Fail | No JSON-LD or schema markup — add LocalBusiness, Restaurant, and Event schemas |
| **Canonical tags** | Warning | Not visible in server HTML — may be JS-rendered |
| **Page speed** | Warning | Google Fonts loaded (2 families); JS bundle is a single chunk — could benefit from code splitting |
| **Font preconnect** | Pass | `rel="preconnect"` for Google Fonts is present |
| **Module preload** | Pass | Key JS chunks use `rel="modulepreload"` |
| **Favicon** | Pass | Multiple favicon formats provided (ico, svg, apple-touch-icon) |
| **Open Graph image** | Warning | `og:image` references `/images/og-image.jpg` — verify this file exists and is high quality |
| **www redirect** | Fail | Redirect from `www.realitydn.com` appears broken (cancelled redirect) |
| **Core Web Vitals** | Warning | Cannot fully assess without page load data; SPA hydration may cause LCP/CLS issues |
| **Google Search Console** | Unknown | Strongly recommended — set up if not already done |
| **Google Business Profile** | Unknown | Critical for local search — ensure profile is claimed and complete |

---

## Competitor Comparison Summary

| Dimension | realitydn.com | makarabar.com (MAKARA) | sagadanang.com (SAGA) |
|-----------|--------------|----------------------|---------------------|
| **Indexed pages** | ~1 | Many (blog + "best of" lists) | Few (basic site) |
| **Content depth** | Single-page SPA | Multi-page with blog content, curated lists, and guides | Basic info + events |
| **Blog / content marketing** | None | Yes — "Da Nang's Best" list series drives organic traffic | Minimal |
| **Structured data** | None | Likely present | Unknown |
| **Social presence** | Instagram + Facebook (active) | Instagram + Facebook + Blog | Instagram + Facebook + Resident Advisor |
| **Local SEO** | Weak (no schema, no visible address in HTML) | Strong (location info, multiple pages) | Moderate |
| **Keyword targeting** | Not ranking for any target keywords | Ranks for "best cocktail bars da nang," "best nightlife da nang" | Ranks for "techno bar da nang" |
| **Bilingual content** | Unknown (JS-rendered) | English-focused | English-focused |
| **Publishing frequency** | No blog | Regular content | Occasional event posts |

**Key takeaway:** MAKARA is the standout competitor in terms of SEO. They've built "Da Nang's Best" list content that ranks for high-value keywords and drives traffic to their bar. This is a playbook REALITY could adapt — writing about the Da Nang community scene from an insider perspective.

---

## Prioritized Action Plan

### Quick Wins (Do This Week)

1. **Set up Google Business Profile** (if not done)  
   Impact: High | Effort: 1 hour  
   Claim and complete your Google Business listing with photos, hours, menu link, and event info. This is the single fastest way to appear in local search and Maps.

2. **Set up Google Search Console**  
   Impact: High | Effort: 30 minutes  
   Submit your site, check indexing status, and identify any crawl errors.

3. **Fix the www redirect**  
   Impact: Medium | Effort: 30 minutes  
   Ensure `www.realitydn.com` does a clean 301 redirect to `realitydn.com`.

4. **Extend your meta description**  
   Impact: Low | Effort: 15 minutes  
   Current: 93 characters. Expand to ~155 characters: *"REALITY — coffee, cocktails, and community at 86 Mai Thúc Lân, Đà Nẵng. Events, live music, open mics, and the easiest place to make friends in the city."*

5. **Add JSON-LD structured data to the HTML `<head>`**  
   Impact: High | Effort: 1-2 hours  
   Add `LocalBusiness` and `Restaurant` schema with name, address, hours, menu URL, and social links. This can go in the static HTML even if the rest is JS-rendered.

### Strategic Investments (Plan This Quarter)

6. **Implement server-side rendering or pre-rendering**  
   Impact: Critical | Effort: Multi-day  
   Options: migrate to Next.js with SSR, use a pre-rendering service (Prerender.io, Rendertron), or generate static HTML for key pages. This unblocks everything else.

7. **Create an events page (/events)**  
   Impact: High | Effort: 1-2 days  
   A regularly updated calendar of upcoming events. Add `Event` schema markup to each event. This page alone could rank for "da nang events," "live music da nang," "open mic da nang."

8. **Create a drinks/menu page (/menu)**  
   Impact: Medium | Effort: Half day  
   Showcase your coffee and cocktail offerings. Target "cocktails da nang," "best coffee da nang," "da nang happy hour."

9. **Launch a simple blog**  
   Impact: High | Effort: Ongoing  
   Start with 2-3 cornerstone posts: "Best Bars in Da Nang" (insider guide), "Where to Meet People in Da Nang," "Da Nang Events Guide." These target high-volume keywords and position REALITY as a community authority.

10. **Add Vietnamese-language content**  
    Impact: High | Effort: Ongoing  
    Create Vietnamese versions of key pages to capture local search traffic ("quán bar đà nẵng," "sự kiện đà nẵng").

11. **Build an XML sitemap and submit it**  
    Impact: Medium | Effort: 1 hour (after new pages exist)  
    Generate a sitemap.xml listing all pages, submit to Google Search Console.

12. **Start a backlink strategy**  
    Impact: High | Effort: Ongoing  
    Get listed on Da Nang guides (Digital Danang, Tripadvisor, Da Nang Leisure, Nomadwise). Pitch to travel bloggers. MAKARA's "best of" list strategy is a proven model — create your own curated guides.

---

*Audit performed April 10, 2026. For precise keyword volume and ranking data, connect an SEO tool like Ahrefs or Semrush.*
