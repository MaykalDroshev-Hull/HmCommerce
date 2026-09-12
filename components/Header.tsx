'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, X, Search, User as UserIcon, ShoppingBag, Globe } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { useProducts } from '@/context/ProductContext';
import SearchDropdown from './SearchDropdown';

interface HeaderProps {
  isAdmin?: boolean;
  setIsAdmin?: (value: boolean) => void;
}

const ANNOUNCEMENTS = [
  'Free UK delivery on orders over £50 · Free 30-day returns',
  'Spread the cost in 3 interest-free payments with Klarna',
  'Engineered for durability in all weather conditions',
];

export default function Header({ isAdmin = false, setIsAdmin }: HeaderProps) {
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuRendered, setMobileMenuRendered] = useState(false);
  const [mobileMenuAnim, setMobileMenuAnim] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const router = useRouter();
  const { totalItems, openCart } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const { settings } = useStoreSettings();
  const { products } = useProducts();

  const storeName = settings?.storename || 'MB-Paws';

  // Rotate announcement bar every 6s
  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementIdx((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Handle smooth opening & closing animation for mobile menu with scroll lock
  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuRendered(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMobileMenuAnim(true);
        });
      });
      document.body.style.overflow = 'hidden';
      return () => {
        cancelAnimationFrame(id);
      };
    } else {
      setMobileMenuAnim(false);
      const timer = setTimeout(() => {
        setMobileMenuRendered(false);
      }, 250);
      document.body.style.overflow = '';
      return () => {
        clearTimeout(timer);
      };
    }
  }, [mobileMenuOpen]);

  // Clean up body overflow when unmounted
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle click outside & escape for search dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(target)) {
        setDesktopSearchOpen(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(target)) {
        setMobileSearchOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDesktopSearchOpen(false);
        setMobileSearchOpen(false);
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Close search dropdown on page navigation
  useEffect(() => {
    setDesktopSearchOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setDesktopSearchOpen(false);
      setMobileSearchOpen(false);
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: 'Shop', href: '/products' },
    { label: 'Size Guide', href: '/size-guide' },
    { label: 'Reviews', href: '/#reviews' },
    { label: 'FAQ', href: '/#faq' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/#')) {
      const hash = href.replace('/#', '');
      if (pathname === '/') {
        e.preventDefault();
        setMobileMenuOpen(false);
        document.body.style.overflow = '';
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.history.pushState(null, '', `#${hash}`);
          }
        }, 50);
        return;
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="bg-neutral-100 border-b border-neutral-200 text-neutral-800 text-[11px] sm:text-xs tracking-wide py-2 px-4 transition-colors">
        <div className="max-w-7xl mx-auto text-center font-medium truncate">
          <Link href="/products" className="hover:text-neutral-950 transition-colors">
            {ANNOUNCEMENTS[announcementIdx]}
          </Link>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16 gap-4">
            {/* Mobile Menu Toggle Button (Left on mobile) */}
            <div className="flex items-center md:hidden z-10">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 -ml-2 text-neutral-900 hover:text-neutral-700 active:scale-95 transition-transform"
                aria-label="Toggle navigation menu"
              >
                <div className="relative w-5 h-5">
                  <Menu
                    size={20}
                    className={`absolute inset-0 transition-all duration-200 ease-out ${
                      mobileMenuOpen
                        ? 'opacity-0 rotate-90 scale-75'
                        : 'opacity-100 rotate-0 scale-100'
                    }`}
                  />
                  <X
                    size={20}
                    className={`absolute inset-0 transition-all duration-200 ease-out ${
                      mobileMenuOpen
                        ? 'opacity-100 rotate-0 scale-100'
                        : 'opacity-0 -rotate-90 scale-75'
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* Brand Logo: Centered on mobile, Left on desktop */}
            <div className="flex items-center absolute left-1/2 -translate-x-1/2 md:static md:left-auto md:translate-x-0 z-10">
              <Link
                href="/"
                className="flex items-center group tracking-tight py-1"
                onClick={() => setIsAdmin?.(false)}
                aria-label={storeName}
              >
                <Image
                  src="/logo-black-new.jpeg"
                  alt={storeName}
                  width={140}
                  height={100}
                  priority
                  className="h-10 sm:h-11 w-auto object-contain group-hover:opacity-80 transition-opacity"
                />
              </Link>
            </div>

            {/* Desktop Center Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = link.href.startsWith('/#') ? false : pathname === link.href;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className={`text-xs font-semibold uppercase tracking-[0.14em] transition-colors py-1 relative ${
                      isActive
                        ? 'text-neutral-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-neutral-900'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions (Search pill, UK locale, User, Bag) */}
            <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 ml-auto md:ml-0 z-10">
              {/* Search Pill Input (Desktop) */}
              <div ref={desktopSearchRef} className="hidden lg:block relative">
                <form onSubmit={handleSearchSubmit} className="flex items-center relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => {
                      if (searchQuery.trim()) setDesktopSearchOpen(true);
                    }}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setDesktopSearchOpen(e.target.value.trim().length > 0);
                    }}
                    placeholder="Search products, categories, pages..."
                    className="w-48 xl:w-64 pl-9 pr-7 py-1.5 text-xs bg-neutral-100 hover:bg-neutral-200/80 focus:bg-white text-neutral-900 rounded-full border border-neutral-200 focus:border-neutral-400 focus:outline-none transition-all placeholder:text-neutral-500"
                  />
                  <Search size={14} className="absolute left-3 text-neutral-500 pointer-events-none" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setDesktopSearchOpen(false);
                      }}
                      className="absolute right-2.5 text-neutral-400 hover:text-neutral-700 p-0.5"
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </form>
                <SearchDropdown
                  query={searchQuery}
                  products={products}
                  isOpen={desktopSearchOpen && searchQuery.trim().length > 0}
                  onClose={() => setDesktopSearchOpen(false)}
                  className="top-full mt-2 right-0 w-[460px] xl:w-[520px]"
                />
              </div>

              {/* UK / GBP Region Indicator */}
              <Link
                href="/support"
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-950 px-2.5 py-1 rounded-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition-colors"
                title="United Kingdom (GBP) · Free Delivery Info"
              >
                <Globe size={13} className="text-neutral-500" />
                <span>United Kingdom (GBP)</span>
              </Link>

              {/* User Profile */}
              <Link
                href={isAuthenticated && user ? '/user/dashboard' : '/user'}
                className="p-2 text-neutral-900 hover:text-neutral-700 active:scale-95 transition-all"
                aria-label={isAuthenticated ? 'My Account' : 'Sign In'}
              >
                <UserIcon size={24} className="md:w-5 md:h-5" strokeWidth={1.9} />
              </Link>

              {/* Shopping Bag */}
              <button
                type="button"
                onClick={openCart}
                className="relative p-2 text-neutral-900 hover:text-neutral-700 active:scale-95 transition-all"
                aria-label="Shopping Bag"
              >
                <ShoppingBag size={24} className="md:w-5 md:h-5" strokeWidth={1.9} />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#D31336] text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center shadow-2xs">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Full-Width Search Bar */}
          <div ref={mobileSearchRef} className="md:hidden pb-3 pt-1 relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim()) setMobileSearchOpen(true);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setMobileSearchOpen(e.target.value.trim().length > 0);
                }}
                placeholder="Search products, categories, pages..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-neutral-100 focus:bg-white text-neutral-900 rounded-full border border-neutral-200 focus:border-neutral-400 focus:outline-none transition-all placeholder:text-neutral-500"
              />
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setMobileSearchOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </form>
            <SearchDropdown
              query={searchQuery}
              products={products}
              isOpen={mobileSearchOpen && searchQuery.trim().length > 0}
              onClose={() => setMobileSearchOpen(false)}
              className="top-full mt-1.5 left-0 right-0 w-full"
            />
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuRendered && (
        <div className="fixed inset-0 z-50 md:hidden flex overflow-hidden">
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200 ease-out ${
              mobileMenuAnim ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            className={`relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 will-change-transform transition-transform duration-250 ${
              mobileMenuAnim ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={storeName}
              >
                <Image
                  src="/logo-black-new.jpeg"
                  alt={storeName}
                  width={110}
                  height={80}
                  className="h-8 w-auto object-contain"
                />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-neutral-500 hover:text-neutral-900 transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-5 space-y-1">
              {navLinks.map((link, idx) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  style={{
                    transitionDelay: mobileMenuAnim ? `${idx * 25 + 40}ms` : '0ms',
                  }}
                  className={`block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-800 hover:text-neutral-950 py-3 border-b border-neutral-100/80 transition-all duration-200 ${
                    mobileMenuAnim ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Quick Categories in Mobile Drawer */}
              <div className="pt-4 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400 mb-2.5">
                  Browse by Pet &amp; Category
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/products?pet=dogs"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-950 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-lg transition-colors"
                  >
                    Dogs
                  </Link>
                  <Link
                    href="/products?pet=cats"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-950 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-lg transition-colors"
                  >
                    Cats
                  </Link>
                  <Link
                    href="/for-him"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-950 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-lg transition-colors"
                  >
                    Collars
                  </Link>
                  <Link
                    href="/for-her"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-950 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-lg transition-colors"
                  >
                    Harnesses
                  </Link>
                  <Link
                    href="/accessories"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-950 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-lg transition-colors"
                  >
                    Accessories
                  </Link>
                  <Link
                    href="/products"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-xs font-medium text-neutral-950 bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-300 rounded-lg transition-colors"
                  >
                    All Products
                  </Link>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Link
                  href={isAuthenticated && user ? '/user/dashboard' : '/user'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-xs font-medium text-neutral-700 hover:text-neutral-950 py-1 transition-colors"
                >
                  <UserIcon size={16} />
                  <span>{isAuthenticated ? 'My Account' : 'Sign In / Register'}</span>
                </Link>

                <Link
                  href="/support"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-xs text-neutral-600 hover:text-neutral-950 pt-2 border-t border-neutral-100 transition-colors"
                >
                  <Globe size={14} className="text-neutral-500" />
                  <span>United Kingdom (GBP) · Help &amp; Delivery</span>
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
