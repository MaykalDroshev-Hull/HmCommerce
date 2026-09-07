import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Size Guide | MB-Paws',
  description:
    'Find the perfect collar and harness fit for your dog. Accurate neck and chest measurements with the official MB-Paws sizing chart and measuring guide.',
  alternates: { canonical: 'https://mb-paws.co.uk/size-guide' },
  openGraph: {
    title: 'Size Guide | MB-Paws',
    description:
      'Find the perfect collar and harness fit for your dog with the official MB-Paws sizing chart.',
    images: [{ url: '/size-chart.jpg', alt: 'MB-Paws Size Chart & Measuring Guide' }],
  },
};

export default function SizeGuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
