import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mb-paws.co.uk';

export const metadata: Metadata = {
  title: '30-Day Returns & Refund Policy',
  description:
    'Clear, straightforward 30-day returns and money-back guarantee for UK pet parents. Learn how to return, exchange, or request a refund with MB-Paws.',
  alternates: {
    canonical: `${SITE_URL}/returns`,
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: `${SITE_URL}/returns`,
    title: '30-Day Returns & Refund Policy | MB-Paws',
    description:
      'Clear, straightforward 30-day returns and money-back guarantee for UK pet parents. Learn how to return or exchange with MB-Paws.',
    siteName: 'MB-Paws',
  },
  twitter: {
    card: 'summary',
    title: '30-Day Returns & Refund Policy | MB-Paws',
    description:
      'Clear, straightforward 30-day returns and money-back guarantee for UK pet parents.',
  },
};

const returnPolicyJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MerchantReturnPolicy',
  name: 'MB-Paws 30-Day Returns & Refund Policy',
  url: `${SITE_URL}/returns`,
  applicableCountry: 'GB',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 30,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/ReturnCustomerResponsibility',
  refundType: 'https://schema.org/FullRefund',
  itemCondition: 'https://schema.org/NewCondition',
  customerRemorseReturnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
  itemDefectReturnFees: 'https://schema.org/FreeReturn',
};

export default function ReturnsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(returnPolicyJsonLd) }}
      />
      {children}
    </>
  );
}
