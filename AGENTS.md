# Project Rules & Guidelines

## 1. Core Principles: Speed, Simplicity, Minimalism
- **Speed & Performance**: Fast page loads, minimal DOM footprint, optimized Next.js Image loading, zero unnecessary layout shifts.
- **Simplicity & Minimalism**: Clean editorial style inspired by modern premium lifestyle brands (like Lululemon). Generous whitespace, crisp typography, clean borders, minimalist icons, high contrast CTAs.
- **Zero Coloured Emojis**: Do NOT use coloured emojis anywhere in the UI. Use clean, monochrome icons and SVGs (e.g. Lucide icons) exclusively. Exceptions are only permitted if explicitly requested by the user.

## 2. Target Audience & Locale: British Market
- **Locale**: United Kingdom (`en-GB`).
- **Language**: English exclusively across the entire site. Use British spelling (`Colour`, `favourite`, `jewellery`, `customise`, etc.).
- **Currency**: British Pound Sterling (`£` / GBP) only. No dual currencies or other currencies.

## 3. Product Page Standard
- **Desktop**: 2-column layout with 2x2 image grid on left, sticky purchase panel on right.
- **Mobile**: Clean responsive slider with swipe indicator and favorite toggle.
- **Sticky Banner on Scroll**:
  - Desktop: Top banner with product name, selected colour swatch, selected size, and `ADD TO BAG - £[PRICE]`.
  - Mobile: Fixed bottom bar with full-width `ADD TO BAG - £[PRICE]`.
- **Klarna 3 Payments**: "3 payments of £[X.XX] at 0% interest with Klarna" + legal line ("18+, T&C apply, Credit subject to status").
- **Product Accordions**: Clean collapsible sections for Features, Fabric / Materials, and Care & Delivery.

## 4. Tone of Voice Instructions: Pet Store Brand
- **Persona:** You are a friendly, knowledgeable pet care expert and fellow pet lover who speaks to customers as devoted "pet parents."
- **Primary Tone:** Warm, enthusiastic, trustworthy, and approachable.
- **Style & Mechanics:**
  - Use conversational language with frequent contractions (e.g., "we've," "you'll," "it's").
  - Keep sentences snappy and easy to scan.
  - Inject subtle, playful pet-related puns or light humor where appropriate, but keep it natural.
  - When discussing health, nutrition, or product specs, switch to clear, authoritative, and reassuring language that builds trust.
  - Always focus on the well-being, happiness, and comfort of the pet.
- **Vocabulary Preferences:**
  - Preferred: "Pet parent," "furbaby," "tail-wagging," "treat," "wholesome," "loved," "care."
  - Avoid: Cold clinical terms, overly formal descriptions, or treating pets as mere "property" or "animals."

## 5. SEO & Accessibility (A11y) Standards
- **SEO Requirements (Google & Search Bots)**:
  - **Semantic Markup**: Always use semantic HTML5 elements (`<main>`, `<header>`, `<nav>`, `<article>`, `<section>`, `<aside>`, `<footer>`).
  - **Heading Hierarchy**: Exactly one `<h1>` per page. Subsections must follow a logical hierarchy (`<h2>`, `<h3>`) without skipping levels.
  - **Metadata & OpenGraph**: Provide unique, descriptive page titles and meta descriptions on all pages. Always configure OpenGraph (`og:title`, `og:description`, `og:image`, `og:url`) and Twitter Card tags.
  - **Schema.org Structured Data**: All product pages must render valid Schema.org `Product` JSON-LD containing `name`, `description`, `image`, `brand`, and `offers` (`price`, `priceCurrency: "GBP"`, `availability`, `itemCondition: "https://schema.org/NewCondition"`, `sku`, `url`) so Google Search and Google Shopping bots can index them seamlessly.
  - **Sitemap & Robots**: Ensure all active products are exposed in `sitemap.xml` with canonical URLs, and `robots.txt` permits crawling of product routes.
- **Accessibility (A11y / WCAG 2.1 AA)**:
  - **Descriptive Alt Text**: Every image must have meaningful, context-rich `alt` text describing the subject (e.g. "Golden Retriever wearing yellow bee pet hoodie"). Decorative images must explicitly specify `aria-hidden="true"` or empty `alt=""`.
  - **Interactive Elements**: Every icon button, modal trigger, hamburger menu, and swatch without visible text must have an explicit `aria-label` or `aria-labelledby`.
  - **State Indicators**: Use standard ARIA attributes (`aria-expanded`, `aria-selected`, `aria-disabled`, `aria-controls`, `aria-live`) for dynamic components like accordions, tabs, drawers, and variant buttons.
  - **Keyboard Navigation & Focus**: Interactive elements must be focusable via keyboard (`Tab` / `Enter` / `Space`) with visible high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-offset-2`).
  - **Colour Contrast**: Ensure text adheres to WCAG AA minimum contrast ratio (at least 4.5:1 for normal text, 3:1 for large text).


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
