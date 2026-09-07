import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Special Offers | MB-Paws',
  description:
    'Exclusive limited-edition offers and special releases by MB-Paws.',
  alternates: { canonical: 'https://mb-paws.co.uk/super-promo' },
};


export default function SuperPromoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
