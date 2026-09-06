import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Special Offers | M-B Something',
  description:
    'Exclusive limited-edition offers and special releases by M-B Something.',
  alternates: { canonical: 'https://mb-something.co.uk/super-promo' },
};


export default function SuperPromoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
