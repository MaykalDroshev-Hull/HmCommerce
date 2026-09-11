'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PublicPageLayout from '@/components/PublicPageLayout';
import { useProducts } from '@/context/ProductContext';

import { useStoreSettings } from '@/context/StoreSettingsContext';
import { isListedOnStorefront } from '@/lib/product-availability';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowDown,
  Shield,
  Droplets,
  Sparkles,
  CheckCircle2,
  Star,
  X,
  Clock,
} from 'lucide-react';

// ============================================================================
// DATA & ASSETS (Pet-Parent Brand Tone: Warm, Knowledgeable, British en-GB)
// ============================================================================

const HERO_BG = '/campaign/hero-index-banner.jpg';


// Animal categories cards (Dogs, Cats, New Season, Unipet)
const PET_CATEGORIES = [
  {
    id: 'dogs',
    title: 'Dogs',
    subtitle: 'Engineered for big leaps & wet muddy trails',
    image: '/campaign/card-dogs-neutral.jpg',
    link: '/products?search=Dog',
    buttonText: 'Shop Dogs',
  },
  {
    id: 'cats',
    title: 'Cats',
    subtitle: 'Featherlight comfort for curious indoor & outdoor explorers',
    image: '/campaign/card-cats-neutral.jpg',
    link: '/products?search=Cat',
    buttonText: 'Shop Cats',
  },
  {
    id: 'new-arrivals',
    title: 'New Season',
    subtitle: 'Fresh colourways and trail-ready gear pet parents love',
    image: '/campaign/card-puppy-neutral.jpg',
    link: '/products?isfeatured=true',
    buttonText: 'Shop New',
  },
  {
    id: 'unipet',
    title: 'Unipet (All Pets)',
    subtitle: 'Versatile travel & daily wellness gear for every furbaby',
    image: '/campaign/card-unipet-neutral.jpg',
    link: '/products',
    buttonText: 'Shop Unipet',
  },
];

// Activities categories (Walking, Fun, Cosy) - Patagonia 3-column layout
const ACTIVITIES = [
  {
    id: 'walking',
    title: 'Walking',
    headline: 'Misty Bridleways & Morning Walks',
    description:
      'Engineered with hydrophobic ripstop webbing and aircraft-grade alloy buckles so wet British weather never slows your daily strolls.',
    image: '/campaign/activity-walking.jpg',
    exploreLinks: [
      { label: 'All-Weather Collars', href: '/products?search=Collar' },
      { label: 'Padded Leads', href: '/products?search=Lead' },
      { label: 'Adventure Harnesses', href: '/products?search=Harness' },
    ],
  },
  {
    id: 'fun',
    title: 'Fun',
    headline: 'Zoomies, Scent Trails & High Bounces',
    description:
      'Keep your furbaby mentally stimulated and joyfully active with gear crafted for interactive play, training, and tail-wagging happiness.',
    image: '/campaign/activity-fun.jpg',
    exploreLinks: [
      { label: 'Training Leads', href: '/products?search=Lead' },
      { label: 'Enrichment Toys', href: '/products' },
      { label: 'Recall Essentials', href: '/products' },
    ],
  },
  {
    id: 'cosy',
    title: 'Cosy',
    headline: 'Deep Slumber & Restorative Naps',
    description:
      'After an energetic afternoon outside, treat your devoted pet to orthopaedic support, soothing fleece blankets, and warm, gentle comfort.',
    image: '/campaign/activity-cosy.jpg',
    exploreLinks: [
      { label: 'Orthopaedic Beds', href: '/products' },
      { label: 'Travel Snuggle Mats', href: '/products' },
      { label: 'Calming Blankets', href: '/products' },
    ],
  },
];

// Stories & Tips / Tricks (Patagonia 4-card editorial format)
interface StoryItem {
  id: string;
  category: string;
  readTime: string;
  title: string;
  teaser: string;
  image: string;
  content: string[];
  keyTips: string[];
}

const STORIES: StoryItem[] = [
  {
    id: 'collar-fit-rule',
    category: 'Pet Care & Sizing',
    readTime: '3 min read',
    title: 'The 2-Finger Fit Rule: Sizing Your Dog’s Collar for Maximum Canine Comfort',
    teaser:
      'Can you slip two fingers comfortably under their collar? Here’s our pet-parent guide to preventing coat matting and keeping your furbaby secure.',
    image: '/campaign/story-collar-fit.jpg',
    content: [
      'As pet parents, we want our dogs to feel secure without ever feeling constricted. A collar that’s even slightly too tight can cause friction, hair matting, and discomfort around sensitive neck muscles. Too loose, and a sudden squirrel pursuit might leave you holding an empty lead.',
      'That’s where the classic 2-Finger Test comes in. Wrap a soft measuring tape where the collar naturally rests—roughly midway between the base of their neck and their shoulders. Once fastened, you should be able to slide two flat fingers comfortably between the webbing and your dog’s fur.',
      'Our Daydrift Adventure Collar features soft, folded-edge tubular webbing specifically designed to distribute pulling force evenly and protect delicate fur from breakage on everyday walks.',
    ],
    keyTips: [
      'Measure twice: once when your dog is standing, once while seated.',
      'Allow extra breathing room for growing pups and thick double coats.',
      'Inspect collar fit every 4–6 weeks as seasons and fur density change.',
    ],
  },
  {
    id: 'muddy-paws-guide',
    category: 'UK Trails & Weather',
    readTime: '4 min read',
    title: 'Muddy Paws & Rainy Days: Our Pet Parent Trail Survival Guide',
    teaser:
      'British downpours won’t stop your daily zoomies! Here’s how hydrophobic ripstop gear and a simple post-walk routine keep your hallway spotless.',
    image: '/campaign/story-muddy-paws.jpg',
    content: [
      'Let’s be honest: in the UK, if you waited for dry weather to walk your dog, you’d never leave the house! Muddy puddles and soaked grass are pure joy for our dogs, but nobody loves soggy, smelly gear that stays damp for days.',
      'Traditional nylon collars act like sponges, absorbing dirty puddle water and trapping unpleasant bacteria against your dog’s skin. That’s why we engineered our gear with hydrophobic ripstop weave that repels water on contact.',
      'A simple rinse under cold tap water after a woodland romp removes silt, grit, and mud in seconds. Hang it to air dry, and your collar is fresh and ready for tomorrow morning’s stroll.',
    ],
    keyTips: [
      'Keep a microfibre drying mitt right beside your front door.',
      'Rinse zinc-alloy buckles with fresh tap water after salty coastal walks.',
      'Apply wholesome natural paw balm to soothe pads after rocky hikes.',
    ],
  },
  {
    id: 'playtime-trust',
    category: 'Play & Training',
    readTime: '5 min read',
    title: 'Playtime That Builds Trust: 3 Fun Enrichment Games for Happy Tails',
    teaser:
      'Tired dogs are happy dogs, but mental workouts beat endless fetching. Discover 3 snappy sniffing games that strengthen your pet-parent bond.',
    image: '/campaign/story-playtime-trust.jpg',
    content: [
      'Did you know that 15 minutes of focused sniffing burns as much canine mental energy as an hour-long brisk walk? While physical exercise keeps muscles lean, sensory enrichment is what truly calms active minds and prevents restless chewing at home.',
      'Playing together is also the single fastest way to reinforce positive recall. When your furbaby associates you with thrilling games and wholesome rewards, they naturally check in with you more frequently during off-lead adventures.',
      'Try sprinkling a few healthy treats across a damp lawn for a "sniff safari," or use a dedicated long-line lead to practice enthusiastic hide-and-seek behind park trees.',
    ],
    keyTips: [
      'Start scent games in low-distraction spots before trying open parks.',
      'Keep training sessions short and snappy (5 to 10 minutes maximum).',
      'Always finish on a high note with praise, cuddles, and a wholesome treat.',
    ],
  },
  {
    id: 'cosy-sleep-health',
    category: 'Health & Well-Being',
    readTime: '4 min read',
    title: 'Why Quality Sleep Matters for Your Furbaby’s Joints & Well-Being',
    teaser:
      'Adult dogs sleep up to 14 hours a day! From orthopaedic foam to quiet sleep sanctuaries, here’s how restorative rest protects their mobility.',
    image: '/campaign/story-cosy-sleep.jpg',
    content: [
      'Watch your dog during a deep sleep and you’ll see twitching paws, gentle woofs, and tail flicks. Just like us, pets process their daily experiences during REM cycles and need undisturbed downtime to rebuild muscle tissue and rest growing joints.',
      'Active dogs, working breeds, and seniors in particular benefit tremendously from supportive orthopaedic bedding that cushions hips and elbows against cold, hard timber floors.',
      'Pairing a comfortable, temperature-neutral sleeping nest with lightweight, silent hardware on their everyday collar ensures they rest soundly without disruptive jingles every time they shift position.',
    ],
    keyTips: [
      'Position dog beds away from draughty doors and noisy hallway thoroughfares.',
      'Choose breathable, machine-washable covers that repel dog hair.',
      'Look for separate tag silencers to keep nighttime slumbers whisper-quiet.',
    ],
  },
];

// Verified Pet Parent Reviews
const REVIEWS = [
  {
    author: 'James W. (Cotswolds)',
    furbaby: 'Golden Retriever • Size L',
    rating: 5,
    title: 'Outstanding build quality & zero chafing',
    comment:
      'The zinc-alloy buckle feels indestructible, and the Heathered Graphite colour looks gorgeous on my lab. Handles muddy woodland rambles effortlessly and cleans in seconds.',
  },
  {
    author: 'Charlotte H. (Edinburgh)',
    furbaby: 'Cocker Spaniel • Size M',
    rating: 5,
    title: 'Super soft on his neck fur',
    comment:
      'Previous nylon collars pinched and matted his fur, but the soft folded edges on the Daydrift collar are wonderfully gentle. Klarna made buying matching leads effortless too.',
  },
  {
    author: 'Oliver T. (London)',
    furbaby: 'French Bulldog • Size S',
    rating: 5,
    title: 'Sleek, minimal, ultra-premium',
    comment:
      'Genuinely feels like technical outdoor gear for dogs. Crisp matte hardware, zero annoying jingle from tags, and very comfortable for daily city strolls.',
  },
];

// Top Homepage FAQs (#faq)
const HOME_FAQS = [
  {
    q: 'How do I choose the right collar size for my dog?',
    a: 'Measure around your dog’s neck where their collar naturally sits using a soft measuring tape. Apply the 2-Finger Rule: you should be able to comfortably slip two flat fingers between the collar webbing and your dog’s fur. Refer to our interactive Size Guide for breed recommendations and exact centimetre measurements from XS to XL.',
  },
  {
    q: 'Is the Daydrift Adventure Collar waterproof and mud-resistant?',
    a: 'Yes! Our collars are crafted with high-tenacity, hydrophobic ripstop webbing and aircraft-grade anodised zinc alloy hardware. They shed water, resist dirt, and dry quickly without retaining wet dog odours. After salty sea dips, simply rinse with fresh tap water.',
  },
  {
    q: 'How does Klarna 3 interest-free payments work?',
    a: 'At checkout, select Klarna. Your total purchase is split into 3 equal payments with 0% interest and no added fees when paid on time. The first payment is taken upon dispatch, and the remaining two payments follow every 30 days. Available to UK residents aged 18+.',
  },
  {
    q: 'What is your UK delivery and 30-day return policy?',
    a: 'We offer Free UK Tracked Delivery on all orders over £50 (or £3.99 standard delivery). If the size or colour isn’t quite right for your furbaby, we offer hassle-free 30-day returns and exchanges on all unworn items with original packaging.',
  },
];

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const storiesScrollRef = useRef<HTMLDivElement>(null);

  const { products } = useProducts();
  const { settings } = useStoreSettings();

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    const storeName = settings?.storename || 'MB-Paws';
    document.title = `${storeName} | Premium Adventure Pet Gear`;
  }, [settings?.storename]);

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  // Find the primary featured product from the database if available
  const availableProducts = products.filter((p) => isListedOnStorefront(p));
  const featuredProduct =
    availableProducts.find((p) => p.isfeatured) || availableProducts[0];

  const scrollCategories = (direction: 'left' | 'right') => {
    if (!categoriesScrollRef.current) return;
    const offset = direction === 'left' ? -340 : 340;
    categoriesScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const scrollStories = (direction: 'left' | 'right') => {
    if (!storiesScrollRef.current) return;
    const offset = direction === 'left' ? -340 : 340;
    storiesScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <div className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-950 selection:text-white">
        {/* =====================================================================
            1. HERO SECTION (Patagonia Slogan & Bold Editorial Format)
        ====================================================================== */}
        {/* =====================================================================
            1. HERO SECTION (MB-Paws British Technical Outdoor Campaign)
        ====================================================================== */}
        <section className="relative w-full bg-neutral-950 text-white overflow-hidden">
          <div className="relative min-h-[580px] sm:min-h-[660px] lg:min-h-[760px] flex items-center justify-center">
            <Image
              src={settings?.heroimageurl || HERO_BG}
              alt="MB-Paws – British Technical Outdoor Pet Gear"
              fill
              priority
              sizes="100vw"
              className="object-cover object-[center_35%] brightness-[0.80] contrast-[1.05]"
            />

            {/* Gradient Overlays for high-contrast editorial typography */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/35 to-neutral-950/40" />
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/20 to-black/60 pointer-events-none" />

            {/* Editorial Content Overlay */}
            <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-24 text-center flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-400 mb-3 drop-shadow">
                British Technical Outdoor Gear
              </span>

              {/* Bold Editorial Title */}
              <h1 className="font-serif-display text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight leading-[1.05] mb-5 text-white drop-shadow-md">
                Worth every wag.
              </h1>

              {/* Warm, Snappy Pet-Parent Subtitle */}
              <p className="text-sm sm:text-base lg:text-lg text-white/90 max-w-2xl leading-relaxed mb-8 sm:mb-10 font-light drop-shadow">
                We’ve engineered technical outdoor gear for your furbaby’s
                biggest adventures, wettest bridleways, and happiest days out
                together. Built for endurance, styled with British minimalism.
              </p>

              {/* High-Contrast Pill CTA Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <Link
                  href="/products"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-xs uppercase tracking-[0.14em] bg-white text-neutral-950 hover:bg-neutral-100 transition-all duration-200 shadow-lg active:scale-95"
                >
                  <span>Shop All Products</span>
                  <ArrowRight size={15} />
                </Link>

                <a
                  href="#featured-product"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-xs uppercase tracking-[0.14em] text-white border border-white/60 hover:bg-white/15 backdrop-blur-sm transition-all duration-200 active:scale-95"
                >
                  <span>Featured Collar</span>
                  <ArrowRight size={15} />
                </a>
              </div>

              {/* British Trust Badges */}
              <div className="pt-8 mt-8 border-t border-white/15 flex flex-wrap items-center justify-center gap-6 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  <span>Free UK Delivery &gt; £50</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  <span>Klarna 0% Interest</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  <span>30-Day British Returns</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            2. SUB-NAV BAR & ANIMAL CATEGORIES CAROUSEL (Dogs, Cats, Unipet)
        ====================================================================== */}
        <section
          id="pet-categories"
          className="scroll-mt-20 border-b border-neutral-200 bg-neutral-50/50 py-10 sm:py-16"
        >
          <span id="product" className="sr-only" />

          {/* Cards Carousel Header & Controls */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-6 sm:mb-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 mb-1.5">
                  Shop By Pet
                </p>
                <h2 className="font-serif-display text-2xl sm:text-4xl font-normal text-neutral-950 tracking-tight">
                  Cats, Dogs &amp; Unipet Gear
                </h2>
              </div>

              {/* Carousel Next / Prev Controls & Shop All Link */}
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-900 hover:text-neutral-600 transition-colors mr-2"
                >
                  <span>Shop All</span>
                  <ArrowRight size={13} />
                </Link>
                <button
                  type="button"
                  onClick={() => scrollCategories('left')}
                  className="w-10 h-10 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-700 hover:text-neutral-950 hover:border-neutral-950 transition-colors"
                  aria-label="Previous categories"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCategories('right')}
                  className="w-10 h-10 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-700 hover:text-neutral-950 hover:border-neutral-950 transition-colors"
                  aria-label="Next categories"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Horizontal Scroll / Grid Carousel Container */}
            <div className="relative group">
              <div
                ref={categoriesScrollRef}
                className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
              >
                {PET_CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex-shrink-0 w-[78vw] sm:w-[280px] lg:w-[305px] snap-start flex flex-col group/card"
                  >
                    <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-neutral-100 shadow-sm transition-transform duration-300 group-hover/card:-translate-y-1">
                      <Image
                        src={cat.image}
                        alt={cat.title}
                        fill
                        sizes="(max-width: 640px) 78vw, 305px"
                        className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                      />
                      {/* Gentle Dark Bottom Gradient for lifestyle imagery */}
                      {!cat.image.startsWith('/campaign/') && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />
                      )}
                    </div>

                    <div className="pt-4 flex flex-col flex-1">
                      <h3 className="font-serif-display text-xl sm:text-2xl font-normal text-neutral-950 mb-1">
                        {cat.title}
                      </h3>
                      <p className="text-xs text-neutral-600 mb-4 leading-relaxed line-clamp-2">
                        {cat.subtitle}
                      </p>

                      <div className="mt-auto">
                        <Link
                          href={cat.link}
                          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-[0.14em] bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
                        >
                          {cat.buttonText}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Right Arrow Peek Indicator */}
              <button
                type="button"
                onClick={() => scrollCategories('right')}
                className="sm:hidden absolute right-2 top-1/3 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 text-neutral-900 shadow-md flex items-center justify-center border border-neutral-200 z-10"
                aria-label="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================================
            3. FEATURED PRODUCT SHOWCASE
               (Replaces Patagonia's "Just hanging out online" banner)
        ====================================================================== */}
        <section
          id="features"
          className="scroll-mt-20 relative w-full bg-neutral-950 text-white overflow-hidden min-h-[580px] sm:min-h-[660px] lg:min-h-[740px] flex flex-col justify-between"
        >
          <span id="featured-product" className="sr-only" />
          {/* Full-Bleed High-Resolution Lifestyle Background */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/products/collar-lifestyle.jpg"
              alt="Daydrift Adventure Dog Collar worn on adventure walk"
              fill
              sizes="100vw"
              className="object-cover object-[75%_center] sm:object-center brightness-[0.88] contrast-[1.05]"
            />
            {/* Cinematic Gradient Vignette - Softened to leave the middle & right photo visible */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent sm:from-black/80 sm:via-black/20 sm:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent sm:hidden" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full min-h-[580px] sm:min-h-[660px] lg:min-h-[740px] py-12 sm:py-16 lg:py-20 flex flex-col justify-between">
            {/* Docked on top: Product Name */}
            <div className="max-w-md lg:max-w-xl">
              <h2 className="font-serif-display text-3xl sm:text-5xl lg:text-6xl font-normal text-white leading-[1.08]">
                The Daydrift Adventure Dog Collar.
              </h2>
            </div>

            {/* Pushed lower: Technical specs, Price & CTA */}
            <div className="max-w-md lg:max-w-lg space-y-4 pt-10">
              {/* Technical Feature Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-white/85">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Matte Alloy Buckle</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Water &amp; Mud Repellent</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Zero Coat Chafing</span>
                </div>
              </div>

              {/* Price & 0% Interest (without 'with Klarna') */}
              <div className="pt-2 border-t border-white/20 flex flex-wrap items-baseline gap-3 text-white">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight">
                  £38.00
                </span>
                <span className="text-xs text-white/75">
                  or 3 payments of{' '}
                  <strong className="text-white font-semibold">£12.67</strong> at
                  0% interest
                </span>
              </div>

              {/* Single Clean CTA Action */}
              <div className="pt-1">
                <Link
                  href={
                    featuredProduct?.id
                      ? `/products/${featuredProduct.id}`
                      : '/products/a51e34f9-bdf0-41dc-a266-bc1e37fcb816'
                  }
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-xs uppercase tracking-[0.14em] bg-white text-neutral-950 hover:bg-neutral-100 transition-all shadow-md active:scale-95"
                >
                  <span>Shop Collar — £38.00</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            4. ACTIVITIES CATEGORIES (Walking, Fun, Cosy)
               (Patagonia 3-Column: Surfing, Climbing, Trail Running)
        ====================================================================== */}
        <section id="activities" className="py-16 sm:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10 sm:mb-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2">
                Gear Engineered By Activity
              </p>
              <h2 className="font-serif-display text-3xl sm:text-5xl font-normal text-neutral-950 tracking-tight">
                Walking, Fun &amp; Cosy Moments
              </h2>
              <p className="text-sm text-neutral-600 mt-3 leading-relaxed">
                Whether splashing across rainy bridleways, playing high-energy
                fetch, or curling up for a sound snooze, we’ve got your
                furbaby covered.
              </p>
            </div>

            {/* 3-Column Editorial Grid (Mobile: Touch-friendly swipeable cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {ACTIVITIES.map((act) => (
                <div key={act.id} className="group/act flex flex-col">
                  {/* Photo Container */}
                  <div className="relative aspect-[4/3] sm:aspect-[3/2] w-full rounded-2xl overflow-hidden bg-neutral-100 shadow-sm">
                    <Image
                      src={act.image}
                      alt={act.headline}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover/act:scale-105"
                    />
                  </div>

                  {/* Content Below Photo (Matches Patagonia format) */}
                  <div className="pt-5 flex flex-col flex-1">
                    <h3 className="font-serif-display text-2xl font-normal text-neutral-950 mb-1">
                      {act.title}
                    </h3>
                    <p className="text-xs font-medium text-neutral-700 mb-2">
                      {act.headline}
                    </p>
                    <p className="text-xs text-neutral-500 leading-relaxed mb-4">
                      {act.description}
                    </p>

                    {/* Sub-links (Patagonia format: "Explore: Men's, Women's") */}
                    <div className="mt-auto pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="text-neutral-400 font-medium">Explore:</span>
                      {act.exploreLinks.map((item, idx) => (
                        <span key={item.label} className="inline-flex items-center gap-2">
                          <Link
                            href={item.href}
                            className="font-semibold text-neutral-900 hover:text-neutral-600 transition-colors underline-offset-4 hover:underline"
                          >
                            {item.label}
                          </Link>
                          {idx < act.exploreLinks.length - 1 && (
                            <span className="text-neutral-300">·</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================================
            5. CAMPAIGN SHOWCASE: "ENGINEERED FOR THE ELEMENTS"
        ====================================================================== */}
        <section className="py-14 sm:py-24 bg-neutral-950 text-white border-t border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative w-full aspect-[16/11] sm:aspect-[16/9] lg:aspect-[21/9] min-h-[440px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center group">
              <Image
                src="/campaign/banner-engineered-elements.jpg"
                alt="MB-Paws – Engineered for the Elements"
                fill
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="object-cover object-[center_45%] brightness-[0.76] contrast-[1.05] transition-transform duration-700 group-hover:scale-[1.02]"
              />

              {/* High-contrast gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/35 to-neutral-950/40" />

              {/* Centered Display Typography & Interactive CTA */}
              <div className="relative z-10 text-center px-6 max-w-3xl flex flex-col items-center">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400 mb-3 drop-shadow">
                  All-Weather Hydrophobic Ripstop
                </span>
                <h2 className="font-serif-display text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white mb-4 drop-shadow-md">
                  Engineered For The Elements
                </h2>
                <p className="text-sm sm:text-base text-white/90 max-w-xl mb-8 font-light leading-relaxed drop-shadow">
                  High-tenacity technical fleece and taped weatherproof protection crafted for torrential British downpours and rocky Highland rambles.
                </p>

                <Link
                  href="/products?search=Fleece"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-xs uppercase tracking-[0.14em] bg-white text-neutral-950 hover:bg-neutral-100 transition-all shadow-lg active:scale-95"
                >
                  <span>Shop Fleece</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            6. STORIES & PET CARE TIPS / TRICKS (Patagonia Latest Stories)
        ====================================================================== */}
        <section
          id="stories"
          className="py-16 sm:py-24 border-t border-neutral-200 bg-neutral-50/60"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header with "View all" link */}
            <div className="flex items-end justify-between mb-8 sm:mb-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 mb-1.5">
                  Pet Parent Journal
                </p>
                <div className="flex items-baseline gap-3">
                  <h2 className="font-serif-display text-2xl sm:text-4xl font-normal text-neutral-950 tracking-tight">
                    Latest Stories &amp; Tips
                  </h2>
                </div>
              </div>

              {/* Story scroll controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollStories('left')}
                  className="w-10 h-10 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-700 hover:text-neutral-950 hover:border-neutral-950 transition-colors"
                  aria-label="Previous stories"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollStories('right')}
                  className="w-10 h-10 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-700 hover:text-neutral-950 hover:border-neutral-950 transition-colors"
                  aria-label="Next stories"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Stories Horizontal Card Row / Deck */}
            <div className="relative group">
              <div
                ref={storiesScrollRef}
                className="flex items-stretch gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
              >
                {STORIES.map((story) => (
                  <div
                    key={story.id}
                    className="flex-shrink-0 w-[82vw] sm:w-[320px] lg:w-[350px] snap-start flex flex-col bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300"
                  >
                    {/* Story Photo */}
                    <div className="relative aspect-[16/10] w-full bg-neutral-100">
                      <Image
                        src={story.image}
                        alt={story.title}
                        fill
                        sizes="(max-width: 640px) 82vw, 350px"
                        className="object-cover"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-neutral-950/80 backdrop-blur-md text-white text-[10px] font-semibold uppercase tracking-wider">
                        {story.category}
                      </span>
                    </div>

                    {/* Story Card Body */}
                    <div className="p-5 flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium mb-2">
                          <Clock size={12} />
                          <span>{story.readTime}</span>
                        </div>

                        <h3 className="font-bold text-base text-neutral-950 leading-snug mb-2 line-clamp-2">
                          {story.title}
                        </h3>

                        <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3 mb-4">
                          {story.teaser}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => setActiveStory(story)}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.14em] border border-neutral-900 text-neutral-950 hover:bg-neutral-950 hover:text-white transition-colors"
                        >
                          Read Story
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Right Arrow Peek Indicator */}
              <button
                type="button"
                onClick={() => scrollStories('right')}
                className="sm:hidden absolute right-2 top-1/3 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 text-neutral-900 shadow-md flex items-center justify-center border border-neutral-200 z-10"
                aria-label="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================================
            7. VERIFIED CUSTOMER REVIEWS (PET PARENTS ACROSS THE UK)
        ====================================================================== */}
        <section
          id="reviews"
          className="scroll-mt-20 py-16 sm:py-20 border-t border-neutral-200 bg-white"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center space-y-3 mb-10 sm:mb-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                Verified Pet Parent Feedback
              </p>
              <div className="flex items-center justify-center gap-2 text-neutral-950">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={17}
                      className="fill-neutral-950 text-neutral-950"
                    />
                  ))}
                </div>
                <span className="font-bold text-base">
                  4.9 / 5.0 (Loved by 1,200+ Pet Parents)
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Honest feedback from dogs and their devoted companions across the UK
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {REVIEWS.map((rev) => (
                <div
                  key={rev.author}
                  className="p-6 rounded-2xl border border-neutral-200 bg-neutral-50/40 space-y-4 flex flex-col justify-between shadow-sm"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5 text-neutral-950">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className="fill-neutral-950 text-neutral-950"
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold text-neutral-500">
                        {rev.furbaby}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-neutral-950">
                      {rev.title}
                    </h4>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  </div>

                  <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-neutral-900">
                      {rev.author}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 size={13} /> Verified Buyer
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================================
            8. FREQUENTLY ASKED QUESTIONS (#faq)
        ====================================================================== */}
        <section
          id="faq"
          className="scroll-mt-20 py-16 sm:py-24 border-t border-neutral-200 bg-neutral-50/50"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-2 mb-10 sm:mb-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                Common Pet Parent Questions
              </p>
              <h2 className="font-serif-display text-2xl sm:text-4xl font-normal text-neutral-950 tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600">
                Clear answers on sizing, all-weather durability, and Klarna payments.
              </p>
            </div>

            <div className="max-w-3xl mx-auto divide-y divide-neutral-200 border-y border-neutral-200 bg-white rounded-2xl shadow-xs px-6 sm:px-8 py-2">
              {HOME_FAQS.map((faq, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div key={faq.q} className="py-4">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left py-2 font-semibold text-sm sm:text-base text-neutral-950 hover:text-neutral-700 transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp size={18} className="text-neutral-400 shrink-0 ml-4" />
                      ) : (
                        <ChevronDown size={18} className="text-neutral-400 shrink-0 ml-4" />
                      )}
                    </button>
                    {isOpen && (
                      <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed pb-3 pt-1">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <Link
                href="/support"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:text-neutral-600 transition-colors underline-offset-4 hover:underline"
              >
                <span>Have more questions? Visit our Help &amp; Support Hub</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* =====================================================================
            STORY READER MODAL
        ====================================================================== */}

        {activeStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
              role="dialog"
              aria-modal="true"
            >
              {/* Modal Top Bar */}
              <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <span>{activeStory.category}</span>
                  <span>·</span>
                  <span>{activeStory.readTime}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStory(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                  aria-label="Close story"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-neutral-100">
                  <Image
                    src={activeStory.image}
                    alt={activeStory.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 700px"
                    className="object-cover"
                  />
                </div>

                <h2 className="font-serif-display text-2xl sm:text-3xl font-normal text-neutral-950 leading-tight">
                  {activeStory.title}
                </h2>

                <div className="space-y-4 text-sm text-neutral-700 leading-relaxed font-light">
                  {activeStory.content.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>

                {/* Key Pet Parent Tips Callout */}
                <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    Key Pet Parent Takeaways
                  </h4>
                  <ul className="space-y-2 text-xs text-neutral-700">
                    {activeStory.keyTips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Related Collar CTA */}
                <div className="p-5 rounded-2xl bg-neutral-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-sm">
                      Ready to gear up your furbaby?
                    </h5>
                    <p className="text-xs text-white/80">
                      Explore our all-weather adventure collars engineered in the UK.
                    </p>
                  </div>
                  <Link
                    href={
                      featuredProduct?.id
                        ? `/products/${featuredProduct.id}`
                        : '/products/a51e34f9-bdf0-41dc-a266-bc1e37fcb816'
                    }
                    onClick={() => setActiveStory(null)}
                    className="flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-neutral-950 hover:bg-neutral-100 transition-colors"
                  >
                    View Adventure Collar
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicPageLayout>
  );
}
