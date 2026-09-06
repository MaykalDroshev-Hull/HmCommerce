import type { Metadata } from 'next'
import { DM_Serif_Display, Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const serifDisplay = DM_Serif_Display({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  variable: '--font-serif',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const SITE_URL = 'https://mb-something.co.uk';
const OG_IMAGE = 'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-graphite-grey.jpg';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'M-B Something | Premium Adventure Dog Collars',
    template: '%s | M-B Something',
  },
  description:
    'M-B Something – Minimalist, high-performance canine gear engineered for durability, comfort, and everyday adventure. Free UK tracked delivery on orders over £30. Klarna Pay in 3 available.',
  keywords: [
    'dog collar', 'adventure dog collar', 'tactical dog collar', 'waterproof dog collar',
    'ripstop webbing collar', 'UK dog gear', 'premium pet accessories', 'M-B Something',
  ],
  authors: [{ name: 'M-B Something', url: SITE_URL }],
  creator: 'M-B Something',
  publisher: 'M-B Something',
  category: 'pets',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: SITE_URL,
    siteName: 'M-B Something',
    title: 'M-B Something | Premium Adventure Dog Collars',
    description:
      'Minimalist, high-performance canine gear engineered for durability and all-weather comfort. Free UK tracked delivery.',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 1200,
        alt: 'M-B Something Daydrift Adventure Dog Collar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@mb_something',
    title: 'M-B Something | Premium Adventure Dog Collars',
    description:
      'Minimalist, high-performance canine gear engineered for durability and all-weather comfort.',
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  name: 'M-B Something',
  url: SITE_URL,
  image: OG_IMAGE,
  description:
    'Minimalist, high-performance canine gear engineered for durability and all-weather comfort.',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'GB',
  },
  priceRange: '££',
  currenciesAccepted: 'GBP',
  paymentAccepted: 'Credit Card, Klarna, Debit Card',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLdScript = JSON.stringify(jsonLd)

  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body className={`${serifDisplay.variable} ${inter.variable} antialiased`}>
        {/* In body to avoid head injection from browser extensions; valid for schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript }}
          suppressHydrationWarning
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
