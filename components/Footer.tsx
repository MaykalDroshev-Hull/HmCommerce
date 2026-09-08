'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { ShieldCheck, Truck, RotateCcw, Instagram, Facebook, Youtube, Twitter } from 'lucide-react';
import { PaymentBadgesRow } from './PaymentIcons';
import NewsletterSignup from './NewsletterSignup';

function TikTokIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.891 2.891 2.896 2.896 0 0 1-2.891-2.891 2.896 2.896 0 0 1 2.891-2.891c.365 0 .714.067 1.037.19V9.453a6.326 6.326 0 0 0-1.037-.085 6.342 6.342 0 0 0-6.336 6.342 6.342 6.342 0 0 0 6.336 6.342 6.342 6.342 0 0 0 6.336-6.342V9.07a8.214 8.214 0 0 0 4.77 1.517v-3.46c-.378-.014-.741-.157-1.07-.441z" />
    </svg>
  );
}

export default function Footer() {
  const { settings } = useStoreSettings();
  const storeName = settings?.storename || 'MB-Paws';
  const currentYear = new Date().getFullYear();

  const shopLinks = [
    { label: 'All Products', href: '/products' },
    { label: 'Collars', href: '/for-him' },
    { label: 'Harnesses', href: '/for-her' },
    { label: 'Accessories', href: '/accessories' },
    { label: 'Size Guide', href: '/size-guide' },
  ];

  const companyLinks = [
    { label: 'About Us', href: '/about' },
    { label: 'My Account', href: '/user' },
    { label: 'Order History', href: '/user/dashboard' },
  ];

  const supportLinks = [
    { label: 'Customer Support', href: '/support' },
    { label: 'FAQs & Delivery', href: '/support' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms-of-service' },
  ];

  return (
    <footer className="bg-neutral-950 text-neutral-300 border-t border-neutral-800 transition-colors">
      {/* Top Value Props in Footer */}
      <div className="border-b border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <Link
              href="/support"
              className="group flex items-center justify-center md:justify-start gap-3 transition-opacity hover:opacity-90"
            >
              <Truck size={22} className="text-neutral-400 group-hover:text-white shrink-0 transition-colors" strokeWidth={1.5} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Free Tracked Delivery</h4>
                <p className="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">On all UK orders over £50</p>
              </div>
            </Link>
            <Link
              href="/support"
              className="group flex items-center justify-center md:justify-start gap-3 transition-opacity hover:opacity-90"
            >
              <RotateCcw size={22} className="text-neutral-400 group-hover:text-white shrink-0 transition-colors" strokeWidth={1.5} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">30-Day Hassle-Free Returns</h4>
                <p className="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">Simple 30-day exchanges and returns</p>
              </div>
            </Link>
            <Link
              href="/support"
              className="group flex items-center justify-center md:justify-start gap-3 transition-opacity hover:opacity-90"
            >
              <ShieldCheck size={22} className="text-neutral-400 group-hover:text-white shrink-0 transition-colors" strokeWidth={1.5} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">2-Year Adventure Warranty</h4>
                <p className="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">Engineered to withstand all weather conditions</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Newsletter Signup Row */}
      <div className="border-b border-neutral-800/80 bg-neutral-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 text-center space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            Join The Pet Parent Club
          </p>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Enjoy 10% off your first adventure
          </h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed font-light">
            Subscribe to our newsletter for exclusive colourway drops, seasonal pet wellness tips, and an instant welcome discount code.
          </p>
          <div className="pt-2">
            <NewsletterSignup source="footer" />
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="sm:col-span-2 md:col-span-5 space-y-4">
            <Link href="/" className="inline-block group" aria-label={storeName}>
              <Image
                src={settings?.logourl || '/Logo.jpg'}
                alt={storeName}
                width={120}
                height={47}
                className="h-9 sm:h-10 w-auto object-contain invert brightness-100 mix-blend-screen group-hover:opacity-85 transition-opacity"
              />
            </Link>
            <p className="text-xs leading-relaxed text-neutral-400 max-w-md">
              Minimalist, high-performance canine gear engineered for durability, comfort, and everyday adventure across trails and city walks.
            </p>
            <div className="pt-2">
              <p className="text-[11px] text-neutral-400">
                Pay in 3 interest-free installments with Klarna. 18+, UK residents only. Credit subject to status.
              </p>
            </div>

            {/* Social Media Links (Dynamically revealed when configured in Admin Settings) */}
            {(settings?.tiktokurl || settings?.instagramurl || settings?.facebookurl || settings?.youtubeurl || settings?.xurl) && (
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 mb-2.5">
                  Follow Our Journey
                </p>
                <div className="flex items-center gap-2">
                  {settings?.tiktokurl && (
                    <a
                      href={settings.tiktokurl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${storeName} on TikTok`}
                      title="TikTok"
                      className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900/60 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-600 hover:bg-neutral-800 transition-all"
                    >
                      <TikTokIcon className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {settings?.instagramurl && (
                    <a
                      href={settings.instagramurl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${storeName} on Instagram`}
                      title="Instagram"
                      className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900/60 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-600 hover:bg-neutral-800 transition-all"
                    >
                      <Instagram size={14} />
                    </a>
                  )}
                  {settings?.facebookurl && (
                    <a
                      href={settings.facebookurl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${storeName} on Facebook`}
                      title="Facebook"
                      className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900/60 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-600 hover:bg-neutral-800 transition-all"
                    >
                      <Facebook size={14} />
                    </a>
                  )}
                  {settings?.youtubeurl && (
                    <a
                      href={settings.youtubeurl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${storeName} on YouTube`}
                      title="YouTube"
                      className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900/60 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-600 hover:bg-neutral-800 transition-all"
                    >
                      <Youtube size={14} />
                    </a>
                  )}
                  {settings?.xurl && (
                    <a
                      href={settings.xurl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${storeName} on X`}
                      title="X"
                      className="w-8 h-8 rounded-full border border-neutral-800 bg-neutral-900/60 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-600 hover:bg-neutral-800 transition-all"
                    >
                      <Twitter size={14} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Shop Column */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              Shop &amp; Gear
            </h4>
            <ul className="space-y-2 text-xs">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About & Account Column */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              About &amp; Account
            </h4>
            <ul className="space-y-2 text-xs">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Care Column */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              Customer Support
            </h4>
            <ul className="space-y-2 text-xs">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="pt-2 text-xs text-neutral-400 space-y-1">
              <p className="text-[11px] text-neutral-500">support@mb-paws.co.uk</p>
              <p className="text-[11px] text-neutral-500">Mon – Fri: 9am – 5pm GMT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal / Copyright Bar */}
      <div className="border-t border-neutral-800/80 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-neutral-400">
          <div>
            © {currentYear} {storeName}. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <PaymentBadgesRow theme="dark" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link href="/support" className="hover:text-white transition-colors">
              Support
            </Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
