# MB-Paws (MB-paws.co.uk) - Premium Canine Adventure Gear

A modern, high-performance e-commerce platform built with Next.js 16 and Supabase, tailored for the British market (**[MB-paws.co.uk](https://mb-paws.co.uk)**). Engineered with a minimalist editorial design, fast page loads, comprehensive product variant management, Klarna 3-installment payments, and a full-featured admin dashboard.

---

## 🐾 Overview

**MB-Paws** delivers technical, minimalist canine gear designed for durability, all-weather performance, and everyday adventure. The storefront is optimized for the UK market (`en-GB`), featuring British Pound Sterling (`£` / GBP) pricing, tracked delivery thresholds, Klarna Pay in 3, Apple Pay, PayPal, and Stripe checkout.

- **Storefront Domain**: [https://mb-paws.co.uk](https://mb-paws.co.uk)
- **Support Email**: `support@mb-paws.co.uk`
- **Orders Email**: `orders@mb-paws.co.uk`
- **Primary Market**: United Kingdom (en-GB, GBP £)

---

## 🚀 Features

### 🛍️ Storefront & Customer Experience
- **Flagship & Catalog Experience**: 2-column desktop layout with 2x2 image gallery, sticky purchase panel, and fluid mobile slider.
- **Sticky Add-to-Bag Banner**:
  - **Desktop**: Top sticky bar with product name, selected colour swatch, selected size, and instant `ADD TO BAG - £[PRICE]`.
  - **Mobile**: Fixed bottom sticky bar with full-width CTA.
- **Klarna Pay in 3**: Dynamic calculation ("3 payments of £[X.XX] at 0% interest with Klarna") and compliance disclaimers.
- **Delivery & Returns**: Free tracked delivery over £30, 30-day hassle-free returns.
- **Payment Options**: Stripe (Cards, Apple Pay, Klarna), PayPal, and Cash on Delivery.
- **Persistent Cart & Fast Checkout**: Zustand-powered cart drawer and streamlined checkout flow.
- **SEO & Social Metadata**: Rich OpenGraph tags, Twitter cards, dynamic canonical URLs, and Schema.org `OnlineStore` and `Product` structured JSON-LD.

### 👨‍💼 Admin Panel
- **Dashboard Analytics**: Sales metrics, recent orders, weekly revenue charts, and top-selling items.
- **Product Management**: Full CRUD operations with multi-image uploads, dynamic variant generation (size, colour), and inventory control.
- **Order Management**: Order tracking, status updates (Pending, Confirmed, Shipped, Delivered, Cancelled), and customer history.
- **Promotions & Discounts**: Promotional codes with usage tracking and discount percentages.
- **Store Settings**: Customise store name, branding, notification emails, delivery rates, and banner announcements.
- **Media Library**: Supabase Storage-backed image management with preview and copy-to-clipboard functionality.

### 🛠️ Technical Highlights
- **Framework**: Next.js 16 (App Router), React 18, TypeScript.
- **Styling**: Tailwind CSS with sleek monochrome design system and minimal layout shifts.
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) and Supabase Auth.
- **Transactional Emails**: Resend integration for order confirmations, notifications, and customer communications.
- **Strict Compliance**: Adheres to project rules (zero coloured emojis, UK spelling, single currency GBP £).

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS, PostCSS
- **State Management:** Zustand, React Context
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **File Storage:** Supabase Storage (`products` bucket)
- **Email:** Resend API & Nodemailer
- **Payments:** Stripe SDK, PayPal SDK
- **Icons:** Lucide React (monochrome only)
- **Deployment:** Vercel

---

## 📁 Project Structure

```
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (metadata, fonts, JSON-LD)
│   ├── page.tsx                  # Home / Flagship product page
│   ├── products/                 # Product catalog & [id] product pages
│   ├── checkout/                 # Checkout flow & order success
│   ├── admin/                    # Admin dashboard & management tools
│   │   ├── products/             # Product catalog management
│   │   ├── orders/               # Orders & order statuses
│   │   ├── customers/            # Customer records
│   │   ├── discounts/            # Promo codes & discounts
│   │   ├── finance/              # Revenue & financial reporting
│   │   └── settings/             # Store configuration
│   ├── api/                      # Backend API routes (checkout, products, settings, emails)
│   ├── for-him/                  # Outdoor canine gear category
│   ├── for-her/                  # Collection category
│   ├── accessories/              # Leads, collars & hardware
│   └── about/                    # About brand page
├── components/                   # Reusable UI components
│   ├── Header.tsx                # Sticky header & announcement bar
│   ├── Footer.tsx                # Brand footer with UK support details
│   ├── ProductDetails.tsx        # Purchase panel, swatches, Klarna widget
│   ├── ProductStickyBanner.tsx   # Desktop & mobile sticky add-to-bag bar
│   ├── ProductMediaGallery.tsx   # 2x2 desktop grid & mobile gallery
│   └── CartDrawer.tsx            # Persistent slide-out shopping cart
├── context/                      # React Context providers (Auth, StoreSettings)
├── lib/                          # Utility libraries & services
│   ├── supabase/                 # Supabase client & server utilities
│   ├── mail.ts                   # Resend transactional email handler
│   └── storefront-url.ts         # Canonical storefront URL utilities
├── store/                        # Zustand stores (cart, theme)
└── public/                       # Static assets & robots.txt
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or 20.x
- npm or yarn
- Supabase account with active database
- Resend API key for transactional emails
- Stripe & PayPal developer accounts

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MaykalDroshev-Hull/HmCommerce.git
   cd HmCommerce
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Populate `.env.local` with your credentials:
   ```env
   # Site URL
   NEXT_PUBLIC_SITE_URL=https://mb-paws.co.uk

   # Resend Email
   RESEND_API_KEY=re_xxxxxxxx
   RESEND_FROM_EMAIL=orders@mb-paws.co.uk
   RESEND_FROM_NAME="MB-Paws"
   ADMIN_EMAIL=you@yourdomain.co.uk
   CONTACT_EMAIL=support@mb-paws.co.uk

   # Supabase Configurations
   DATABASE_URL=postgresql://postgres:[PASSWORD]@...supabase.com:5432/postgres
   DIRECT_URL=postgresql://postgres:[PASSWORD]@...supabase.co:5432/postgres
   NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Payment Gateways
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx
   STRIPE_SECRET_KEY=sk_test_xxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_client_secret
   ```

4. **Run database migrations**
   Ensure your Supabase PostgreSQL instance has the tables from `schema.txt` applied.

5. **Start development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 Available Scripts

- `npm run dev` – Launch local Next.js development server
- `npm run build` – Create optimized production build
- `npm run start` – Start production server
- `npm run lint` – Run TypeScript type-checking (`tsc --noEmit`)
- `npm run clean` – Purge `.next` build cache

---

## 🚀 Deployment

The project is optimized for zero-config deployment on **Vercel**:

1. Import the repository into Vercel.
2. Add the environment variables from `.env.local` in Project Settings.
3. Configure the custom domain **`mb-paws.co.uk`** (with DNS records pointing to Vercel).
4. Verify Supabase Storage public access for product images (`products` bucket).
5. Set up MX / webhook records in Resend to enable incoming and outgoing mail via `orders@mb-paws.co.uk` and `support@mb-paws.co.uk`.

---

## 📄 License

This project is proprietary software for **MB-Paws** ([MB-paws.co.uk](https://mb-paws.co.uk)). All rights reserved.
