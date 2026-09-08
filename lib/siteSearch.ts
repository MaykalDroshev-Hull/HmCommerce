import { Product } from './data';
import { isListedOnStorefront } from './product-availability';

export interface SearchCategoryItem {
  id: string;
  name: string;
  description: string;
  href: string;
  keywords: string[];
}

export interface SearchPageItem {
  id: string;
  title: string;
  description: string;
  href: string;
  keywords: string[];
}

export interface SearchResults {
  products: Product[];
  categories: SearchCategoryItem[];
  pages: SearchPageItem[];
  totalMatches: number;
}

export const SITE_CATEGORIES: SearchCategoryItem[] = [
  {
    id: 'dogs',
    name: 'Dogs Collection',
    description: 'Adventure collars, leads & harnesses for canine explorers',
    href: '/products?pet=dogs',
    keywords: ['dog', 'dogs', 'puppy', 'puppies', 'canine', 'hound', 'labrador', 'spaniel', 'retriever', 'frenchie'],
  },
  {
    id: 'cats',
    name: 'Cats Collection',
    description: 'Featherlight collars & accessories for curious felines',
    href: '/products?pet=cats',
    keywords: ['cat', 'cats', 'kitten', 'kittens', 'feline'],
  },
  {
    id: 'unipet',
    name: 'Unipet (All Pets)',
    description: 'Universal travel, wellness & adventure gear for every pet',
    href: '/products?pet=unipet',
    keywords: ['unipet', 'all pets', 'pet', 'pets', 'furbaby', 'animals', 'universal'],
  },
  {
    id: 'collars',
    name: 'All-Weather Collars',
    description: 'High-tenacity ripstop webbing & anodised alloy hardware',
    href: '/for-him',
    keywords: ['collar', 'collars', 'daydrift', 'buckle', 'neck', 'neckwear', 'zinc'],
  },
  {
    id: 'harnesses',
    name: 'Adventure Harnesses',
    description: 'Ergonomic, coat-protecting harnesses for active walks',
    href: '/for-her',
    keywords: ['harness', 'harnesses', 'chest', 'vest', 'pull', 'strap'],
  },
  {
    id: 'leads',
    name: 'Leads & Leashes',
    description: 'Weatherproof training leads & comfortable padded leashes',
    href: '/products?search=Lead',
    keywords: ['lead', 'leads', 'leash', 'leashes', 'training', 'rope', 'recall'],
  },
  {
    id: 'accessories',
    name: 'Pet Accessories',
    description: 'Tag silencers, travel bowls, mats & outdoor essentials',
    href: '/accessories',
    keywords: ['accessory', 'accessories', 'gear', 'bowl', 'mat', 'tag', 'silencer'],
  },
  {
    id: 'walking',
    name: 'Walking & Hiking Gear',
    description: 'All-weather equipment engineered for wet British bridleways',
    href: '/products?search=Walking',
    keywords: ['walk', 'walking', 'trail', 'hiking', 'outdoor', 'muddy', 'bridleway'],
  },
  {
    id: 'cosy',
    name: 'Cosy & Sleep Collection',
    description: 'Orthopaedic beds, snuggle mats & calming fleece blankets',
    href: '/products?search=Bed',
    keywords: ['bed', 'beds', 'sleep', 'rest', 'cosy', 'blanket', 'mat', 'orthopaedic'],
  },
  {
    id: 'new-season',
    name: 'New Arrivals',
    description: 'Fresh colourways and newly released adventure pet gear',
    href: '/products?isfeatured=true',
    keywords: ['new', 'fresh', 'arrivals', 'featured', 'latest', 'season'],
  },
];

export const SITE_PAGES: SearchPageItem[] = [
  {
    id: 'size-guide',
    title: 'Size Guide & Fit Finder',
    description: 'Interactive collar sizing chart, 2-finger rule & breed fit recommendations',
    href: '/size-guide',
    keywords: ['size', 'sizing', 'guide', 'chart', 'measure', 'measurement', 'measurements', 'fit', 'neck', 'chest', 'girth', 'small', 'medium', 'large', 'xl', 'dimension', 'cm', 'inches', 'breed'],
  },
  {
    id: 'about',
    title: 'About MB-Paws',
    description: 'Our heritage, British design philosophy, and commitment to pet wellness',
    href: '/about',
    keywords: ['about', 'about us', 'story', 'heritage', 'mission', 'brand', 'who we are', 'team', 'ethics', 'craftsmanship', 'quality'],
  },
  {
    id: 'support',
    title: 'Customer Support Hub',
    description: 'Get in touch with our UK care team, order inquiries & assistance',
    href: '/support',
    keywords: ['support', 'help', 'contact', 'customer service', 'email', 'phone', 'hours', 'message', 'team'],
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    description: 'Instant answers on collar sizing, water-resistance, and Klarna payments',
    href: '/support#faq',
    keywords: ['faq', 'faqs', 'questions', 'answers', 'help', 'ask', 'how to', 'what is', 'inquiries'],
  },
  {
    id: 'delivery',
    title: 'Delivery & Shipping Information',
    description: 'Free UK delivery on orders over £50, dispatch times & tracking updates',
    href: '/support',
    keywords: ['delivery', 'shipping', 'postage', 'courier', 'tracked', 'dispatch', 'royal mail', 'rates', 'uk delivery', 'free delivery'],
  },
  {
    id: 'returns',
    title: 'Returns & 30-Day Exchanges',
    description: 'Hassle-free 30-day exchange and returns policy on all unworn items',
    href: '/support',
    keywords: ['return', 'returns', 'refund', 'refunds', 'exchange', 'exchanges', 'warranty', 'policy', '30 days', 'money back'],
  },
  {
    id: 'account',
    title: 'Customer Account & Orders',
    description: 'Sign in, track your live dispatch orders, and manage saved favourites',
    href: '/user',
    keywords: ['account', 'login', 'sign in', 'register', 'profile', 'orders', 'order tracking', 'order history', 'password', 'forgot password'],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    description: 'UK GDPR compliance, data protection, and cookie preferences',
    href: '/privacy-policy',
    keywords: ['privacy', 'privacy policy', 'policy', 'gdpr', 'data', 'cookies', 'security'],
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    description: 'Terms and conditions for purchasing and using the MB-Paws website',
    href: '/terms-of-service',
    keywords: ['terms', 'terms of service', 'service', 'conditions', 'legal', 'rights', 'contract'],
  },
];

export function searchSite(query: string, products: Product[] = []): SearchResults {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { products: [], categories: [], pages: [], totalMatches: 0 };
  }

  const tokens = q.split(/\s+/).filter(Boolean);

  // 1. Categories match
  const matchingCategories = SITE_CATEGORIES.filter((cat) => {
    const haystack = `${cat.name} ${cat.description} ${cat.keywords.join(' ')}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });

  // 2. Pages match
  const matchingPages = SITE_PAGES.filter((page) => {
    const haystack = `${page.title} ${page.description} ${page.keywords.join(' ')}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });

  // 3. Products match
  const matchingProducts = products.filter((p) => {
    if (!isListedOnStorefront(p)) return false;
    const haystack = `${p.brand || ''} ${p.model || ''} ${p.name || ''} ${p.description || ''} ${p.category || ''}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });

  return {
    products: matchingProducts,
    categories: matchingCategories,
    pages: matchingPages,
    totalMatches: matchingProducts.length + matchingCategories.length + matchingPages.length,
  };
}
