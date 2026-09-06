import type { Metadata } from 'next';

const OG_IMAGE = 'https://static-b2c.loropiana.com/cms/resource/image/440282/portrait_ratio3x4/768/1024/fb215413f1cad8636d48b2f0c1eaa1ce/62B14DD519AB6DBA760C9CE121E9F924/lp-assouline-book-1080x1350-14-.jpg';

export const metadata: Metadata = {
  title: 'All Products | M-B Something',
  description:
    'Discover the premium collection by M-B Something – high performance adventure gear crafted with precision and minimalism.',
  alternates: { canonical: 'https://mb-something.co.uk/products' },
  openGraph: {
    title: 'All Products | M-B Something',
    description:
      'Discover the premium collection by M-B Something.',
    images: [{ url: OG_IMAGE, alt: 'M-B Something – Collection' }],
  },
};


export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
