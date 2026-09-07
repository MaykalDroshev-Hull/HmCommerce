import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | MB-Paws',
  description:
    'Learn more about MB-Paws – precision craftsmanship, minimalist design, and premium adventure essentials.',
  alternates: { canonical: 'https://mb-paws.co.uk/about' },
  openGraph: {
    title: 'About Us | MB-Paws',
    description:
      'Learn more about MB-Paws – precision craftsmanship and minimalist lifestyle.',
  },
};


export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
