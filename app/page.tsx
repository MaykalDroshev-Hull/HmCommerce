'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PublicPageLayout from '@/components/PublicPageLayout';
import ProductCard from '@/components/ProductCard';
import TrustBar from '@/components/TrustBar';
import LoadingScreen from '@/components/LoadingScreen';
import { useProducts } from '@/context/ProductContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { isListedOnStorefront } from '@/lib/product-availability';
import {
  Shield,
  Droplets,
  Sparkles,
  Compass,
  Star,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowDown,
} from 'lucide-react';

const HERO_IMAGE = '/hero-home.png';

const FAQS = [
  {
    q: 'How do I choose the right size for my dog?',
    a: 'Measure around your dog\'s neck with a soft tape measure where the collar naturally sits. Add two fingers of breathing room. Consult our size guide table (XS to XL) to find the ideal match for your breed.',
  },
  {
    q: 'Is the gear waterproof and suitable for swimming?',
    a: 'Yes! The high-tenacity ripstop webbing and anodised zinc-alloy buckle are completely mud and water-resistant. Simply rinse with freshwater after muddy trails or saltwater swims and allow to air dry.',
  },
  {
    q: 'How does Klarna Pay in 3 work?',
    a: 'At checkout, select Klarna. The total is split into 3 equal interest-free payments. The first is taken when your order is dispatched, and the remaining two every 30 days. 0% interest, no added fees when paid on time.',
  },
  {
    q: 'What is your UK delivery and returns policy?',
    a: 'We offer tracked UK delivery (Free on orders over £50, standard £3.99) and a 30-day hassle-free return window on all unworn gear with original tags intact.',
  },
];

const REVIEWS = [
  {
    author: 'James W. (Cotswolds)',
    dog: 'Labrador Retriever • Size L',
    rating: 5,
    title: 'Outstanding build quality',
    comment:
      'The zinc-alloy buckle feels indestructible, and the Heathered Graphite colour looks gorgeous on my black lab. Handles muddy woodland walks effortlessly.',
  },
  {
    author: 'Charlotte H. (Edinburgh)',
    dog: 'Cocker Spaniel • Size M',
    rating: 5,
    title: 'Comfortable and no fur matting',
    comment:
      'Previous nylon collars pinched his fur, but the soft folded edges on the Daydrift collar are smooth and gentle. Klarna made buying matching leads easy too.',
  },
  {
    author: 'Oliver T. (London)',
    dog: 'French Bulldog • Size S',
    rating: 5,
    title: 'Sleek, minimal, premium',
    comment:
      'Very Lululemon-like aesthetic for dogs. Super clean matte finish and no annoying jingle from tags thanks to the separate loop.',
  },
];

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [faqOpenIdx, setFaqOpenIdx] = useState<number | null>(0);
  const { products, isLoading: productsLoading } = useProducts();
  const { settings, isLoading: settingsLoading } = useStoreSettings();
  const { theme } = useTheme();

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    const storeName = settings?.storename || 'MB-Paws';
    document.title = `${storeName} | Premium Adventure Dog Gear`;
  }, [settings?.storename]);

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  // Selected products: all available storefront products
  const selectedProducts = products.filter((p) => isListedOnStorefront(p));

  if (settingsLoading && productsLoading) {
    return <LoadingScreen />;
  }

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <div className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
        {/* =========================================================================
            1. HERO SECTION
        ========================================================================== */}
        <section className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pt-4 sm:pt-6 pb-4">
          <div
            className="relative overflow-hidden rounded-2xl sm:rounded-3xl min-h-[460px] sm:min-h-[520px] lg:min-h-[560px]"
            style={{ backgroundColor: '#f5f3ee' }}
          >
            <Image
              src={HERO_IMAGE}
              alt="MB-Paws – Premium Adventure Dog Collars and Gear"
              fill
              sizes="(max-width: 768px) 100vw, 1280px"
              className="object-cover"
              style={{ objectPosition: '75% center' }}
              priority
            />

            {/* Gradient Overlays for optimal editorial readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#f9f7f2]/95 via-[#f9f7f2]/85 to-transparent sm:from-[#f9f7f2] sm:via-[#f9f7f2]/80 sm:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent sm:hidden" />

            <div className="relative z-10 flex h-full min-h-[460px] sm:min-h-[520px] lg:min-h-[560px] items-end sm:items-center px-5 sm:px-8 lg:px-14 py-10 sm:py-12 max-w-2xl">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/10 sm:bg-neutral-900/5 text-neutral-900 mb-4 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em]">
                    New 2026 Collection
                  </span>
                </div>

                <h1 className="font-serif-display text-3xl sm:text-5xl lg:text-6xl leading-[1.08] mb-4 text-white sm:text-neutral-950 font-normal">
                  Adventure-Ready Gear For Your Dog.
                </h1>

                <p className="text-sm sm:text-base lg:text-lg leading-relaxed mb-8 text-white/90 sm:text-neutral-600 max-w-xl">
                  Minimalist, high-performance canine gear engineered in the UK.
                  Crafted with aircraft-grade zinc-alloy hardware and hydrophobic ripstop
                  webbing for all-weather endurance.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <a
                    href="#selected-products"
                    className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 bg-neutral-950 text-white hover:bg-neutral-800 shadow-sm"
                  >
                    <span>Shop Selected Products</span>
                    <ArrowDown size={16} />
                  </a>

                  <a
                    href="#performance"
                    className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 border border-white/60 sm:border-neutral-300 text-white sm:text-neutral-900 hover:bg-white/10 sm:hover:bg-neutral-50"
                  >
                    <span>Why MB-Paws</span>
                    <ArrowRight size={16} />
                  </a>
                </div>

                {/* Micro trust indicators */}
                <div className="mt-8 pt-6 border-t border-white/20 sm:border-neutral-200/80 flex items-center gap-4 sm:gap-6 text-[11px] sm:text-xs text-white/85 sm:text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500 sm:text-emerald-700" />
                    <span>Free UK Delivery &gt; £50</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500 sm:text-emerald-700" />
                    <span>Klarna 0% Interest</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500 sm:text-emerald-700" />
                    <span>4.9 / 5.0 Rating</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. TRUST BAR
        ========================================================================== */}
        <TrustBar />

        {/* =========================================================================
            3. SELECTED PRODUCTS SECTION (ALL PRODUCTS)
        ========================================================================== */}
        <section id="selected-products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-12 sm:mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              Curated Collection
            </p>
            <h2 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl font-normal text-neutral-950 tracking-tight">
              Selected Products
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-xl mx-auto">
              Every collar and lead is precision-engineered with soft folded edges,
              heavy-duty tensile stitching, and silent hardware for maximum canine comfort.
            </p>
          </div>

          {productsLoading ? (
            <div className="py-20 text-center">
              <p className="text-sm text-neutral-400">Loading collection...</p>
            </div>
          ) : selectedProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {selectedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center border border-dashed border-neutral-200 rounded-2xl">
              <p className="text-sm text-neutral-500">No products currently available.</p>
            </div>
          )}

          {/* Quick links footer for the section */}
          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-900 hover:text-neutral-600 transition-colors border-b border-neutral-900 pb-0.5"
            >
              <span>View Full Store Catalogue</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* =========================================================================
            4. CRAFTED FOR PERFORMANCE (FROM PRODUCT PAGE)
        ========================================================================== */}
        <section id="performance" className="border-t border-neutral-200 bg-neutral-50/60 py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center space-y-3 mb-12 sm:mb-16">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                Crafted For Performance
              </h2>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-950 tracking-tight">
                Minimalist design. Maximum all-weather endurance.
              </p>
              <p className="text-sm text-neutral-600 leading-relaxed max-w-md mx-auto">
                Engineered to handle British downpours, muddy bridleways, and coastal runs without losing shape or comfort.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              <div className="p-6 bg-white rounded-2xl border border-neutral-200 space-y-3 shadow-sm hover:border-neutral-300 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
                  <Shield size={22} strokeWidth={1.75} />
                </div>
                <h3 className="font-bold text-base text-neutral-950">Matte Zinc-Alloy Buckle</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Aircraft-grade quick-release buckle tested for swift unfastening while locking rigidly under rigorous pulling force.
                </p>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-neutral-200 space-y-3 shadow-sm hover:border-neutral-300 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
                  <Droplets size={22} strokeWidth={1.75} />
                </div>
                <h3 className="font-bold text-base text-neutral-950">Water &amp; Mud Repellent</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Hydrophobic weave prevents water absorption, foul odour buildup, and heavy soggy collars after rainy country walks.
                </p>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-neutral-200 space-y-3 shadow-sm hover:border-neutral-300 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
                  <Sparkles size={22} strokeWidth={1.75} />
                </div>
                <h3 className="font-bold text-base text-neutral-950">Zero Coat Breakage</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Silky tubular webbing edges eliminate neck friction, protecting delicate fur and sensitive skin on long daily excursions.
                </p>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-neutral-200 space-y-3 shadow-sm hover:border-neutral-300 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
                  <Compass size={22} strokeWidth={1.75} />
                </div>
                <h3 className="font-bold text-base text-neutral-950">Quiet Tag Attachment</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Separate dedicated silicone-backed loop isolates dog tags away from the main lead attachment ring, silencing constant metal jingle.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. EDITORIAL LIFESTYLE CALLOUT
        ========================================================================== */}
        <section className="border-t border-neutral-200 bg-white py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-neutral-400">
              The MB-Paws Philosophy
            </p>
            <blockquote className="font-serif-display text-2xl sm:text-3xl lg:text-4xl font-normal text-neutral-950 leading-snug">
              &ldquo;We believe dog gear should meet the same rigorous design standards as technical outdoor apparel. Clean lines, zero clutter, built to last a lifetime.&rdquo;
            </blockquote>
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold pt-2">
              Designed in the United Kingdom
            </p>
          </div>
        </section>

        {/* =========================================================================
            6. VERIFIED CUSTOMER REVIEWS (FROM PRODUCT PAGE)
        ========================================================================== */}
        <section id="reviews" className="py-16 sm:py-24 border-t border-neutral-200 bg-neutral-50/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center space-y-3 mb-12 sm:mb-16">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                Verified Customer Feedback
              </h2>
              <div className="flex items-center justify-center gap-2 text-neutral-900">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={17} className="fill-neutral-950 text-neutral-950" />
                  ))}
                </div>
                <span className="font-bold text-base">4.9 / 5.0 (12 Reviews)</span>
              </div>
              <p className="text-xs text-neutral-500">Genuine reviews from dog owners across the UK</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {REVIEWS.map((rev) => (
                <div
                  key={rev.author}
                  className="p-6 rounded-2xl border border-neutral-200 bg-white space-y-4 flex flex-col justify-between shadow-sm"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5 text-neutral-900">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} size={14} className="fill-neutral-950 text-neutral-950" />
                        ))}
                      </div>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400">
                        {rev.dog}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-neutral-950">{rev.title}</h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">&ldquo;{rev.comment}&rdquo;</p>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="font-semibold text-neutral-900">{rev.author}</span>
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 size={12} /> Verified Buyer
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            7. FAQS SECTION (FROM PRODUCT PAGE)
        ========================================================================== */}
        <section id="faq" className="py-16 sm:py-24 border-t border-neutral-200 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-3 mb-12">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                Questions &amp; Answers
              </h2>
              <p className="font-serif-display text-2xl sm:text-3xl lg:text-4xl font-normal text-neutral-950 tracking-tight">
                Frequently Asked Questions
              </p>
            </div>

            <div className="divide-y divide-neutral-200 bg-neutral-50/50 rounded-2xl border border-neutral-200 px-6">
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

            <div className="mt-8 text-center text-xs text-neutral-500">
              <span>Have another question? Reach us at </span>
              <a href="mailto:support@mb-paws.co.uk" className="underline font-medium text-neutral-900">
                support@mb-paws.co.uk
              </a>
            </div>
          </div>
        </section>
      </div>
    </PublicPageLayout>
  );
}
