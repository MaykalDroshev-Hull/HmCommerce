import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mb-something.co.uk';

const OG_IMAGE = 'https://static-b2c.loropiana.com/cms/resource/image/440282/portrait_ratio3x4/768/1024/fb215413f1cad8636d48b2f0c1eaa1ce/62B14DD519AB6DBA760C9CE121E9F924/lp-assouline-book-1080x1350-14-.jpg';

async function fetchProduct(id: string) {
  try {
    const supabase = createServerClient();

    const { data: product, error } = await supabase
      .from('products')
      .select('productid, name, description')
      .eq('productid', id)
      .neq('isdeleted', true)
      .eq('isdisabled', false)
      .single();

    if (error || !product) {
      return null;
    }

    const { data: images } = await supabase
      .from('product_images')
      .select('imageurl')
      .eq('productid', id)
      .is('productvariantid', null)
      .order('sortorder', { ascending: true })
      .limit(1);

    const nameParts = product.name?.split(' ') || [];
    const brand = nameParts[0] || '';

    return {
      name: product.name,
      description: product.description,
      brand,
      images: (images ?? []).map((img) => img.imageurl).filter(Boolean),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);

  if (!product) {
    return {
      title: 'Product Not Found',
      robots: { index: false, follow: false },
    };
  }

  const name: string = product.name || 'Product';
  const brand: string = product.brand || 'M-B Something';
  const description: string =
    product.description ||
    `${brand ? `${brand} – ` : ''}${name} | Premium Lifestyle from M-B Something`;

  const rawImages: unknown = product.images;
  const firstImage: string | null =
    Array.isArray(rawImages) && rawImages.length > 0
      ? (rawImages[0] as string)
      : null;
  const ogImage = firstImage || OG_IMAGE;

  const title = brand ? `${brand} ${name}` : name;
  const canonical = `${SITE_URL}/products/${id}`;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    image: ogImage,
    url: canonical,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      url: canonical,
      seller: { '@type': 'Organization', name: 'M-B Something' },
    },
  };

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'en_GB',
      url: canonical,
      title,
      description,
      siteName: 'M-B Something',
      images: [{ url: ogImage, alt: title }],
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    other: {
      'script:ld+json': JSON.stringify(productJsonLd),
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
