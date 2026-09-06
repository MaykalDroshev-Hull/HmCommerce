# Project Guidelines & Principles

## 1. Core Design Philosophy
- **Speed & Performance**: Prioritize snappy interactions, lightweight component trees, minimal re-renders, and optimized asset loading.
- **Simplicity & Minimalism**: Elegant, modern, clean editorial look inspired by premium brands (e.g. Lululemon). Generous whitespace, clean lines, subtle borders, and zero clutter.
- **Visual Clarity**: Bold typography hierarchy, clean swatch selectors, crisp buttons, and intuitive navigation.
- **Zero Coloured Emojis**: Do NOT use coloured emojis anywhere in the UI. Use clean monochrome icons and SVGs (e.g. Lucide icons) exclusively.

## 2. Target Audience & Locale
- **Audience**: British / UK market.
- **Language**: Exclusively British English (`en-GB`). Use British spelling (`Colour`, `favourite`, `jewellery`, `customise`, etc.).
- **Currency**: British Pound Sterling (`£` / GBP) everywhere. No Bulgarian Lev or dual-currency display.
- **Default Locale**: English is the primary and default language across the entire application.

## 3. Product Page Experience
- **Desktop Layout**: Clean 2-column layout with a multi-image grid (2-across) on the left, and sticky product details on the right.
- **Mobile Layout**: Responsive image slider with swipe/navigation dots, favorite button, and clean stacked product details.
- **Scroll-Down Sticky Banner**:
  - **Desktop**: A sleek sticky bar appearing upon scrolling past the main buy box, showing the product title, selected colour swatch, selected size, and an `ADD TO BAG - £[PRICE]` button.
  - **Mobile**: A pinned bottom bar with the bold `ADD TO BAG - £[PRICE]` button for instant conversion while reading details.
- **Flexible Payments (Klarna)**: Display "3 payments of £[X.XX] at 0% interest with Klarna" with legal disclaimer ("18+, T&C apply, Credit subject to status").
- **Product Accordions**: Clean collapsible sections for Features, Specifications/Materials, and Care/Returns.
