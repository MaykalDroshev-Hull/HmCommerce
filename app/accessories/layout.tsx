import type { Metadata } from 'next';

const OG_IMAGE = 'https://static-b2c.loropiana.com/cms/resource/image/440282/portrait_ratio3x4/768/1024/fb215413f1cad8636d48b2f0c1eaa1ce/62B14DD519AB6DBA760C9CE121E9F924/lp-assouline-book-1080x1350-14-.jpg';

export const metadata: Metadata = {
  title: 'Accessories | MB-Paws',
  description:
    'Premium accessories by MB-Paws – high-durability hardware, minimalist leads, and adventure essentials.',
  keywords: ['accessories', 'dog accessories', 'leashes', 'collars', 'minimalist pet gear'],
  alternates: { canonical: 'https://mb-paws.co.uk/accessories' },
  openGraph: {
    title: 'Accessories | MB-Paws',
    description:
      'Premium accessories and lifestyle gear by MB-Paws.',
    images: [{ url: OG_IMAGE, alt: 'MB-Paws – Accessories' }],
  },
};


export default function AccessoriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
