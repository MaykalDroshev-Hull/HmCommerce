# SEO & Accessibility (A11y) Standards

## 1. SEO Requirements (Search Engines & Google Shopping Bots)
- **Semantic HTML5 Structure**: Always use semantic landmarks (`<main>`, `<header>`, `<nav>`, `<article>`, `<section>`, `<aside>`, `<footer>`).
- **Heading Hierarchy**: Exactly one `<h1>` per page. Subsequent headings must follow an orderly hierarchy (`<h2>`, `<h3>`) without skipping levels.
- **Metadata & OpenGraph**: Provide unique, descriptive page titles and meta descriptions on all pages. Always configure OpenGraph (`og:title`, `og:description`, `og:image`, `og:url`) and Twitter Card tags.
- **Schema.org Structured Data**:
  - All product pages must render valid Schema.org `Product` JSON-LD.
  - Essential fields for Googlebot and Google Shopping:
    - `name`, `description`, `image`, `brand` (`@type: 'Brand'`)
    - `offers`:
      - `@type: 'Offer'`
      - `price`: Clean numeric string (e.g. `'19.99'`)
      - `priceCurrency`: `'GBP'`
      - `availability`: `'https://schema.org/InStock'` or `'https://schema.org/OutOfStock'`
      - `itemCondition`: `'https://schema.org/NewCondition'`
      - `sku`: Variant or base product SKU
      - `url`: Canonical product URL
      - `seller`: `{ '@type': 'Organization', name: 'MB-Paws' }`
- **Sitemap & Robots**: Ensure all active products are exposed in `sitemap.xml` with canonical URLs, and `robots.txt` permits crawling of product routes.

## 2. Accessibility (A11y / WCAG 2.1 AA)
- **Descriptive Alt Text**: Every image must have meaningful, context-rich `alt` text describing the subject (e.g. "Golden Retriever wearing yellow bee pet hoodie"). Decorative images must explicitly specify `aria-hidden="true"` or empty `alt=""`.
- **Interactive Elements**: Every icon button, modal trigger, hamburger menu, and swatch without visible text must have an explicit `aria-label` or `aria-labelledby`.
- **State Indicators**: Use standard ARIA attributes (`aria-expanded`, `aria-selected`, `aria-disabled`, `aria-controls`, `aria-live`) for dynamic components like accordions, tabs, drawers, and variant buttons.
- **Keyboard Navigation & Focus**: Interactive elements must be focusable via keyboard (`Tab` / `Enter` / `Space`) with visible high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-offset-2`).
- **Colour Contrast**: Ensure text adheres to WCAG AA minimum contrast ratio (at least 4.5:1 for normal text, 3:1 for large text).
