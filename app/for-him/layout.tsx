import type { Metadata } from 'next';

const OG_IMAGE = 'https://static-b2c.loropiana.com/cms/resource/image/440282/portrait_ratio3x4/768/1024/fb215413f1cad8636d48b2f0c1eaa1ce/62B14DD519AB6DBA760C9CE121E9F924/lp-assouline-book-1080x1350-14-.jpg';

export const metadata: Metadata = {
  title: 'Outdoor Gear | MB-Paws',
  description:
    'High performance canine gear engineered for durability and style across all-weather outdoor adventures.',
  keywords: ['outdoor dog gear', 'heavy duty collar', 'tactical leash', 'adventure accessories'],
  alternates: { canonical: 'https://mb-paws.co.uk/for-him' },
  openGraph: {
    title: 'Outdoor Gear | MB-Paws',
    description:
      'High performance canine gear engineered for durability and style across all-weather outdoor adventures.',
    images: [{ url: OG_IMAGE, alt: 'MB-Paws – Outdoor Gear' }],
  },
};


export default function ForHimLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
