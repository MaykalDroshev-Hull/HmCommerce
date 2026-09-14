import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mb-paws.co.uk';

const OG_IMAGE = 'https://static-b2c.loropiana.com/cms/resource/image/440282/portrait_ratio3x4/768/1024/fb215413f1cad8636d48b2f0c1eaa1ce/62B14DD519AB6DBA760C9CE121E9F924/lp-assouline-book-1080x1350-14-.jpg';

async function fetchProduct(id: string) {
  try {
    const supabase = createServerClient();

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        productid,
        name,
        description,
        sku,
        product_variants (
          productvariantid,
          sku,
          price,
          compare_at_price,
          quantity,
          trackquantity,
          isvisible
        )
      `)
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
      .limit(6);

    const nameParts = product.name?.split(' ') || [];
    const brand = nameParts[0] || 'MB-Paws';

    const variants = (product.product_variants || []).filter((v: any) => v.isvisible !== false);
    const validPrices = variants
      .map((v: any) => Number(v.price))
      .filter((p: number) => !isNaN(p) && p > 0);
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 19.99;
    const hasStock = variants.length === 0 || variants.some((v: any) => v.trackquantity === false || Number(v.quantity) > 0);

    const canonical = `${SITE_URL}/products/${id}`;
    const rawImages = (images ?? []).map((img) => img.imageurl).filter(Boolean);
    const firstImage = rawImages[0] || OG_IMAGE;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || `${product.name} | Premium pet care essentials from MB-Paws.`,
      brand: {
        '@type': 'Brand',
        name: brand,
      },
      image: rawImages.length > 0 ? rawImages : [OG_IMAGE],
      sku: product.sku || id,
      url: canonical,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'GBP',
        price: minPrice.toFixed(2),
        availability: hasStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        url: canonical,
        seller: {
          '@type': 'Organization',
          name: 'MB-Paws',
        },
      },
    };

    return {
      name: product.name,
      description: product.description,
      brand,
      sku: product.sku || id,
      minPrice,
      hasStock,
      images: rawImages,
      ogImage: firstImage,
      jsonLd,
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
  const brand: string = product.brand || 'MB-Paws';
  const description: string =
    product.description ||
    `${brand ? `${brand} – ` : ''}${name} | Premium Pet Care Essentials from MB-Paws`;

  const ogImage = product.ogImage;
  const title = brand && !name.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${name}` : name;
  const canonical = `${SITE_URL}/products/${id}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'en_GB',
      url: canonical,
      title,
      description,
      siteName: 'MB-Paws',
      images: [{ url: ogImage, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProduct(id);

  return (
    <>
      {product?.jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(product.jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
