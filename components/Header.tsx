'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Search, User as UserIcon, ShoppingBag, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';

interface HeaderProps {
  isAdmin?: boolean;
  setIsAdmin?: (value: boolean) => void;
}

const ANNOUNCEMENTS = [
  'Free UK delivery on orders over £50 · Free 30-day returns',
  'Spread the cost in 3 interest-free payments with Klarna',
  'Engineered for durability in all British weather conditions',
];

export default function Header({ isAdmin = false, setIsAdmin }: HeaderProps) {
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems, openCart } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const { settings } = useStoreSettings();

  const storeName = settings?.storename || 'M-B Something';

  // Rotate announcement bar every 6s
  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementIdx((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const prevAnnouncement = () => {
    setAnnouncementIdx((prev) => (prev - 1 + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length);
  };

  const nextAnnouncement = () => {
    setAnnouncementIdx((prev) => (prev + 1) % ANNOUNCEMENTS.length);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: 'Shop', href: '/#product' },
    { label: 'Features', href: '/#features' },
    { label: 'Size Guide', href: '/#size-guide' },
    { label: 'Reviews', href: '/#reviews' },
    { label: 'FAQ', href: '/#faq' },
  ];

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="bg-neutral-100 border-b border-neutral-200 text-neutral-800 text-[11px] sm:text-xs tracking-wide py-2 px-4 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={prevAnnouncement}
            className="p-1 text-neutral-500 hover:text-neutral-900 transition-colors"
            aria-label="Previous announcement"
          >
            <ChevronLeft size={14} />
          </button>
          <div className="text-center font-medium truncate px-2">
            {ANNOUNCEMENTS[announcementIdx]}
          </div>
          <button
            type="button"
            onClick={nextAnnouncement}
            className="p-1 text-neutral-500 hover:text-neutral-900 transition-colors"
            aria-label="Next announcement"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Mobile Menu Toggle & Brand */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 -ml-2 text-neutral-900 hover:opacity-75 transition-opacity"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

              <Link
                href="/"
                className="flex items-center gap-2 group tracking-tight"
                onClick={() => setIsAdmin?.(false)}
              >
                <span className="text-lg sm:text-xl font-bold tracking-[0.14em] uppercase text-neutral-900 group-hover:opacity-80 transition-opacity">
                  {storeName}
                </span>
              </Link>
            </div>

            {/* Desktop Center Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
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
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Search Pill Input (Desktop) */}
              <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-44 xl:w-56 pl-9 pr-3 py-1.5 text-xs bg-neutral-100 hover:bg-neutral-200/80 focus:bg-white text-neutral-900 rounded-full border border-neutral-200 focus:border-neutral-400 focus:outline-none transition-all placeholder:text-neutral-500"
                />
                <Search size={14} className="absolute left-3 text-neutral-500 pointer-events-none" />
              </form>

              {/* UK / GBP Region Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-neutral-700 px-2.5 py-1 rounded-full bg-neutral-50 border border-neutral-200">
                <Globe size={13} className="text-neutral-500" />
                <span>United Kingdom (GBP)</span>
              </div>

              {/* User Profile */}
              <Link
                href={isAuthenticated && user ? '/user/dashboard' : '/user'}
                className="p-2 text-neutral-800 hover:text-neutral-950 transition-colors"
                aria-label={isAuthenticated ? 'My Account' : 'Sign In'}
              >
                <UserIcon size={20} />
              </Link>

              {/* Shopping Bag */}
              <button
                type="button"
                onClick={openCart}
                className="relative p-2 text-neutral-800 hover:text-neutral-950 transition-colors"
                aria-label="Shopping Bag"
              >
                <ShoppingBag size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#D31336] text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Full-Width Search Bar */}
          <div className="md:hidden pb-3 pt-1">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-100 focus:bg-white text-neutral-900 rounded-full border border-neutral-200 focus:border-neutral-400 focus:outline-none transition-all placeholder:text-neutral-500"
              />
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            </form>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
              <span className="text-base font-bold tracking-[0.14em] uppercase text-neutral-900">
                {storeName}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-neutral-500 hover:text-neutral-900"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-5 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm font-semibold uppercase tracking-wider text-neutral-800 hover:text-neutral-950 py-2 border-b border-neutral-100"
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-4 space-y-3">
                <Link
                  href={isAuthenticated && user ? '/user/dashboard' : '/user'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-xs font-medium text-neutral-700 py-1"
                >
                  <UserIcon size={16} />
                  <span>{isAuthenticated ? 'My Account' : 'Sign In / Register'}</span>
                </Link>

                <div className="flex items-center gap-2 text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                  <Globe size={14} className="text-neutral-500" />
                  <span>United Kingdom (GBP)</span>
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
