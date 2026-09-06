import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | M-B Something',
  description:
    'Learn more about M-B Something – precision craftsmanship, minimalist design, and premium adventure essentials.',
  alternates: { canonical: 'https://mb-something.co.uk/about' },
  openGraph: {
    title: 'About Us | M-B Something',
    description:
      'Learn more about M-B Something – precision craftsmanship and minimalist lifestyle.',
  },
};


export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
