'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { CheckCircle2, Loader2 } from 'lucide-react';

function XIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.891 2.891 2.896 2.896 0 0 1-2.891-2.891 2.896 2.896 0 0 1 2.891-2.891c.365 0 .714.067 1.037.19V9.453a6.326 6.326 0 0 0-1.037-.085 6.342 6.342 0 0 0-6.336 6.342 6.342 6.342 0 0 0 6.336 6.342 6.342 6.342 0 0 0 6.336-6.342V9.07a8.214 8.214 0 0 0 4.77 1.517v-3.46c-.378-.014-.741-.157-1.07-.441z" />
    </svg>
  );
}

function InstagramIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export default function Footer() {
  const { settings } = useStoreSettings();
  const storeName = settings?.storename || 'MB-Paws';
  const pathname = usePathname();

  const handleFaqClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      e.preventDefault();
      const el = document.getElementById('faq');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.pushState(null, '', '#faq');
      }
    }
  };

  // Newsletter state
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          source: 'footer',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg(data.message || "We've sent your 10% welcome discount code to your inbox!");
        setEmail('');
      } else {
        setErrorMsg(data.error || 'Failed to sign up. Please try again.');
      }
    } catch {
      setErrorMsg('Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="w-full bg-black text-white border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* =====================================================================
            1. MOBILE LAYOUT
        ====================================================================== */}
        <div className="block md:hidden space-y-8">
          {/* 1. Brand Logo */}
          <div>
            <Link href="/" className="inline-block group" aria-label={storeName}>
              <Image
                src="/logo-white-new.jpeg"
                alt={storeName}
                width={130}
                height={95}
                className="h-9 w-auto object-contain shrink-0 group-hover:opacity-85 transition-opacity"
              />
            </Link>
          </div>

          {/* 2. Copyright & Legal (Directly below the Logo on mobile) */}
          <div className="text-xs text-neutral-400 space-y-1.5 leading-relaxed">
            <p>© 2026 • {storeName}</p>
            <div className="flex items-center gap-3 text-neutral-400 pt-0.5">
              <Link href="/privacy-policy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/terms-of-service" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>

          {/* 3. NAVIGATION */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white mb-3">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm font-medium text-neutral-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  Product
                </Link>
              </li>
              <li>
                <Link href="/#stories" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  onClick={handleFaqClick}
                  className="hover:text-white transition-colors"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* 4. SOCIALS */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white mb-3">
              Socials
            </h4>
            <div className="flex items-center gap-5 text-neutral-400">
              <a
                href={settings?.xurl || 'https://x.com'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="hover:text-white transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </a>
              <a
                href={settings?.tiktokurl || 'https://tiktok.com'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="hover:text-white transition-colors"
              >
                <TikTokIcon className="w-4 h-4" />
              </a>
              <a
                href={settings?.instagramurl || 'https://instagram.com'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:text-white transition-colors"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* 5. GET UPDATES */}
          <div className="space-y-2.5 pt-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
                Get Updates
              </h4>
              <p className="text-xs text-neutral-400 mt-1">
                Enjoy 10% off your first adventure. Subscribe for exclusive colourway drops and tips.
              </p>
            </div>

            {successMsg ? (
              <div className="p-3.5 px-5 rounded-full bg-neutral-900 border border-neutral-700 text-white flex items-center gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="text-xs text-neutral-200 font-medium">
                  {successMsg}
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-1.5">
                <div className="w-full rounded-full border border-neutral-700 bg-neutral-900/90 p-1 pl-5 flex items-center justify-between transition-all focus-within:border-white shadow-inner">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-MAIL"
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-neutral-500 font-medium uppercase tracking-wider focus:outline-none pr-3"
                  />
                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="px-5 py-2.5 rounded-full bg-white text-neutral-950 font-semibold text-xs uppercase tracking-[0.14em] hover:bg-neutral-100 active:scale-95 transition-all disabled:opacity-50 shrink-0 flex items-center gap-1.5 shadow-sm"
                  >
                    {loading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <span>Get Updates</span>
                    )}
                  </button>
                </div>
                {errorMsg && (
                  <p className="text-[11px] text-red-400 px-4 pt-1 animate-in fade-in duration-150">
                    {errorMsg}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        {/* =====================================================================
            2. DESKTOP & TABLET LAYOUT
        ====================================================================== */}
        <div className="hidden md:block">
          {/* Top Row: Brand on Left, Columns on Right */}
          <div className="grid grid-cols-12 gap-12 lg:gap-16 items-start pb-12 sm:pb-16">
            {/* Left: Brand Mark */}
            <div className="col-span-5 space-y-3">
              <Link href="/" className="inline-block group" aria-label={storeName}>
                <Image
                  src="/logo-white-new.jpeg"
                  alt={storeName}
                  width={140}
                  height={100}
                  className="h-10 w-auto object-contain shrink-0 group-hover:opacity-85 transition-opacity"
                />
              </Link>
              <p className="text-xs leading-relaxed text-neutral-400 max-w-sm">
                Minimalist, high-performance canine gear engineered for durability, comfort, and everyday adventure across British trails and city walks.
              </p>
            </div>

            {/* Right: 2 Columns (NAVIGATION, SOCIALS) */}
            <div className="col-span-7 grid grid-cols-2 gap-8">
              {/* 1. NAVIGATION */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white mb-4">
                  Navigation
                </h4>
                <ul className="space-y-2.5 text-xs sm:text-sm font-medium text-neutral-400">
                  <li>
                    <Link href="/" className="hover:text-white transition-colors">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link href="/products" className="hover:text-white transition-colors">
                      Product
                    </Link>
                  </li>
                  <li>
                    <Link href="/#stories" className="hover:text-white transition-colors">
                      Blog
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/#faq"
                      onClick={handleFaqClick}
                      className="hover:text-white transition-colors"
                    >
                      FAQ
                    </Link>
                  </li>
                </ul>
              </div>

              {/* 2. SOCIALS */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white mb-4">
                  Socials
                </h4>
                <div className="flex items-center gap-5 text-neutral-400">
                  <a
                    href={settings?.xurl || 'https://x.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter / X"
                    className="hover:text-white transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </a>
                  <a
                    href={settings?.tiktokurl || 'https://tiktok.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="hover:text-white transition-colors"
                  >
                    <TikTokIcon className="w-4 h-4" />
                  </a>
                  <a
                    href={settings?.instagramurl || 'https://instagram.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="hover:text-white transition-colors"
                  >
                    <InstagramIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Copyright/Legal on Left, GET UPDATES Pill Input on Right */}
          <div className="grid grid-cols-12 gap-12 lg:gap-16 items-end pt-8 sm:pt-10 border-t border-neutral-800/80">
            {/* Left: Copyright and Legal */}
            <div className="col-span-5 text-xs text-neutral-400 space-y-1.5 leading-relaxed">
              <p>
                © 2026 • {storeName}
              </p>
              <div className="flex items-center gap-3 text-neutral-400 pt-1">
                <Link href="/privacy-policy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link href="/terms-of-service" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>

            {/* Right: GET UPDATES Pill Form */}
            <div className="col-span-7 space-y-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
                  Get Updates
                </h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Enjoy 10% off your first adventure. Subscribe for exclusive colourway drops and tips.
                </p>
              </div>

              {successMsg ? (
                <div className="p-3.5 px-5 rounded-full bg-neutral-900 border border-neutral-700 text-white flex items-center gap-2.5 animate-in fade-in duration-200">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span className="text-xs text-neutral-200 font-medium">
                    {successMsg}
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-1.5">
                  <div className="w-full max-w-md rounded-full border border-neutral-700 bg-neutral-900/90 p-1 pl-5 flex items-center justify-between transition-all focus-within:border-white shadow-inner">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-MAIL"
                      className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-neutral-500 font-medium uppercase tracking-wider focus:outline-none pr-3"
                    />
                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="px-6 py-2.5 rounded-full bg-white text-neutral-950 font-semibold text-xs uppercase tracking-[0.14em] hover:bg-neutral-100 active:scale-95 transition-all disabled:opacity-50 shrink-0 flex items-center gap-1.5 shadow-sm"
                    >
                      {loading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <span>Get Updates</span>
                      )}
                    </button>
                  </div>
                  {errorMsg && (
                    <p className="text-[11px] text-red-400 px-4 pt-1 animate-in fade-in duration-150">
                      {errorMsg}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
