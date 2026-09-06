'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ProductMediaGallery from './ProductMediaGallery';
import ProductDetails from './ProductDetails';
import ProductStickyBanner from './ProductStickyBanner';
import { Product } from '@/lib/data';
import { Shield, Sparkles, Droplets, Compass, CheckCircle2, ChevronDown, ChevronUp, Star } from 'lucide-react';

interface ProductViewProps {
  product: Product;
  superPromo?: any;
}

const FAQS = [
  {
    q: 'How do I choose the right size for my dog?',
    a: 'Measure around your dog\'s neck with a soft tape measure where the collar would naturally sit. Add two fingers of breathing room. Consult our size guide table (XS to XL) to find the ideal match.',
  },
  {
    q: 'Is the collar waterproof and suitable for swimming?',
    a: 'Yes! The high-tenacity ripstop webbing and anodised zinc-alloy buckle are mud and water-resistant. Rinse with freshwater after saltwater swims and air dry.',
  },
  {
    q: 'How does Klarna Pay in 3 work?',
    a: 'At checkout, select Klarna. The total cost is split into 3 equal interest-free payments. The first is taken when your order is dispatched, and the remaining two every 30 days. No interest, no fees when paid on time.',
  },
  {
    q: 'What is your UK returns policy?',
    a: 'We offer hassle-free 30-day returns on all unworn items with original tags intact. Simply contact support@m-bsomething.co.uk to receive a pre-paid Royal Mail return label.',
  },
];

const REVIEWS = [
  {
    author: 'James W. (Cotswolds)',
    dog: 'Labrador Retriever • Size L',
    rating: 5,
    title: 'Outstanding British build quality',
    comment: 'The zinc-alloy buckle feels indestructible, and the Heathered Graphite colour looks gorgeous on my black lab. Handles muddy woodland walks effortlessly.',
  },
  {
    author: 'Charlotte H. (Edinburgh)',
    dog: 'Cocker Spaniel • Size M',
    rating: 5,
    title: 'Comfortable and no fur matting',
    comment: 'Previous nylon collars pinched his fur, but the soft folded edges on the Daydrift collar are smooth and gentle. Klarna made buying matching leads easy too.',
  },
  {
    author: 'Oliver T. (London)',
    dog: 'French Bulldog • Size S',
    rating: 5,
    title: 'Sleek, minimal, premium',
    comment: 'Very Lululemon-like aesthetic for dogs. Super clean matte finish and no annoying jingle from tags thanks to the separate loop.',
  },
];

export default function ProductView({ product }: ProductViewProps) {
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [focusImage, setFocusImage] = useState<string | null>(null);

  // Sticky banner state
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [selectedColour, setSelectedColour] = useState('Heathered Graphite Grey');
  const [selectedColourHex, setSelectedColourHex] = useState('#4A4D50');
  const [selectedSize, setSelectedSize] = useState('XS');
  const [faqOpenIdx, setFaqOpenIdx] = useState<number | null>(0);

  const buyButtonRef = useRef<HTMLButtonElement | null>(null);

  // Initialize Gallery Images
  useEffect(() => {
    const rawImages = product.images || (product as any).Images || [];
    if (Array.isArray(rawImages) && rawImages.length > 0) {
      setGalleryImages(rawImages);
    } else {
      setGalleryImages([
        'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-graphite-grey.jpg',
        'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-sand-khaki.jpg',
        'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-hardware-detail.jpg',
        'https://rrpmpvffewatuldyytqf.supabase.co/storage/v1/object/public/products/collar-lifestyle.jpg',
      ]);
    }
  }, [product.images, (product as any).Images]);

  // Variant change callback
  const handleVariantImageChange = useCallback((images: string[] | string | undefined) => {
    if (images) {
      const first = Array.isArray(images) ? images[0] : images;
      setFocusImage(first || null);
    }
  }, []);

  // Option change callback from ProductDetails
  const handleOptionChange = (col: string, hex: string, sz: string) => {
    setSelectedColour(col);
    setSelectedColourHex(hex);
    setSelectedSize(sz);
  };

  // Scroll observer to trigger sticky banners
  useEffect(() => {
    const btn = buyButtonRef.current;
    if (!btn) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When buy button is above the viewport (scrolled past), show sticky banner
        const isAbove = entry.boundingClientRect.bottom < 0;
        setIsStickyVisible(isAbove);
      },
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' }
    );

    observer.observe(btn);

    // Also track scroll directly for responsiveness
    const handleScroll = () => {
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setIsStickyVisible(rect.bottom < 60);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const productName = product.name || 'Daydrift Adventure Dog Collar';
  const price = Number(product.price || 36.00);

  const handleStickyAddToCart = () => {
    if (buyButtonRef.current) {
      buyButtonRef.current.click();
    }
  };

  return (
    <div className="bg-white min-h-screen text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Sticky Banner (Desktop Top & Mobile Bottom) */}
      <ProductStickyBanner
        isVisible={isStickyVisible}
        productName={productName}
        price={price}
        currencySymbol="£"
        selectedColour={selectedColour}
        selectedColourHex={selectedColourHex}
        selectedSize={selectedSize}
        onAddToCart={handleStickyAddToCart}
      />

      {/* Main Product Section: 2-Column Grid */}
      <main id="product" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-14 items-start">
          {/* Left Column: 2x2 Image Grid (7 cols on desktop) */}
          <div className="md:col-span-7 space-y-4">
            <ProductMediaGallery
              images={galleryImages}
              productName={productName}
              focusImage={focusImage}
            />
          </div>

          {/* Right Column: Sticky Purchase Details Panel (5 cols on desktop) */}
          <div className="md:col-span-5 md:sticky md:top-24 self-start">
            <ProductDetails
              product={product}
              onVariantChange={handleVariantImageChange}
              onOptionChangeCallback={handleOptionChange}
              buyButtonRef={buyButtonRef}
            />
          </div>
        </div>
      </main>

      {/* Deep-Dive Features Section (#features) */}
      <section id="features" className="border-t border-neutral-200 bg-neutral-50/60 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-12 sm:mb-16">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              Crafted For Performance
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-950 tracking-tight">
              Minimalist design. Maximum British weather endurance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 bg-white rounded-lg border border-neutral-200 space-y-3">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900">
                <Shield size={20} />
              </div>
              <h3 className="font-bold text-base text-neutral-950">Matte Zinc-Alloy Buckle</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Aircraft-grade quick-release buckle tested for swift unfastening while locking rigidly under rigorous pulling force.
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg border border-neutral-200 space-y-3">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900">
                <Droplets size={20} />
              </div>
              <h3 className="font-bold text-base text-neutral-950">Water & Mud Repellent</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Hydrophobic weave prevents water absorption, foul odour buildup, and heavy soggy collars after rainy country walks.
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg border border-neutral-200 space-y-3">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900">
                <Sparkles size={20} />
              </div>
              <h3 className="font-bold text-base text-neutral-950">Zero Coat Breakage</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Silky tubular webbing edges eliminate neck friction, protecting delicate fur and sensitive skin on long daily excursions.
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg border border-neutral-200 space-y-3">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900">
                <Compass size={20} />
              </div>
              <h3 className="font-bold text-base text-neutral-950">Quiet Tag Attachment</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Separate dedicated silicone-backed loop isolates dog tags away from the main lead attachment ring, silencing constant metal jingle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Reviews Section (#reviews) */}
      <section id="reviews" className="py-16 sm:py-24 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-12 sm:mb-16">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              Verified Customer Feedback
            </h2>
            <div className="flex items-center justify-center gap-2 text-neutral-900 text-lg">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} className="fill-neutral-950 text-neutral-950" />
                ))}
              </div>
              <span className="font-bold text-base">4.9 / 5.0 (12 Reviews)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {REVIEWS.map((rev) => (
              <div
                key={rev.author}
                className="p-6 rounded-lg border border-neutral-200 bg-white space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-0.5 text-neutral-900">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} size={14} className="fill-neutral-950 text-neutral-950" />
                    ))}
                  </div>
                  <h3 className="font-bold text-sm text-neutral-950">{rev.title}</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">&ldquo;{rev.comment}&rdquo;</p>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                  <span className="font-semibold text-neutral-900">{rev.author}</span>
                  <span className="flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 size={12} /> Verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section (#faq) */}
      <section id="faq" className="py-16 sm:py-24 border-t border-neutral-200 bg-neutral-50/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              Questions & Answers
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-950 tracking-tight">
              Frequently Asked Questions
            </p>
          </div>

          <div className="divide-y divide-neutral-200 bg-white rounded-lg border border-neutral-200 px-6">
            {FAQS.map((faq, idx) => {
              const isOpen = faqOpenIdx === idx;
              return (
                <div key={faq.q} className="py-5">
                  <button
                    type="button"
                    onClick={() => setFaqOpenIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left font-bold text-sm text-neutral-900 hover:text-neutral-700 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen && (
                    <div className="pt-3 text-xs text-neutral-600 leading-relaxed animate-in fade-in duration-200">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
