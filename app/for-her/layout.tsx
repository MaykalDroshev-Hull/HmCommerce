import type { Metadata } from 'next';

const OG_IMAGE = 'https://static-b2c.loropiana.com/cms/resource/image/440282/portrait_ratio3x4/768/1024/fb215413f1cad8636d48b2f0c1eaa1ce/62B14DD519AB6DBA760C9CE121E9F924/lp-assouline-book-1080x1350-14-.jpg';

export const metadata: Metadata = {
  title: 'Collection | MB-Paws',
  description:
    'Explore modern essentials designed for durability and minimalist aesthetics by MB-Paws.',
  keywords: ['dog gear', 'collars', 'leads', 'harnesses', 'lifestyle'],
  alternates: { canonical: 'https://mb-paws.co.uk/for-her' },
  openGraph: {
    title: 'Collection | MB-Paws',
    description:
      'Explore modern essentials designed for durability and minimalist aesthetics.',
    images: [{ url: OG_IMAGE, alt: 'MB-Paws – Collection' }],
  },
};


export default function ForHerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
