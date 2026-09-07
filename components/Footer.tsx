'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { PaymentBadgesRow } from './PaymentIcons';

export default function Footer() {
  const { settings } = useStoreSettings();
  const storeName = settings?.storename || 'MB-Paws';
  const currentYear = new Date().getFullYear();

  const footerNav = [
    { label: 'Shop', href: '/#product' },
    { label: 'Features', href: '/#features' },
    { label: 'Size Guide', href: '/size-guide' },
    { label: 'Customer Support', href: '/support' },
    { label: 'Verified Reviews', href: '/#reviews' },
  ];

  return (
    <footer className="bg-neutral-950 text-neutral-300 border-t border-neutral-800 transition-colors">
      {/* Top Value Props in Footer */}
      <div className="border-b border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <Truck size={22} className="text-neutral-400 shrink-0" strokeWidth={1.5} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Free Tracked Delivery</h4>
                <p className="text-xs text-neutral-400">On all orders over £30</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <RotateCcw size={22} className="text-neutral-400 shrink-0" strokeWidth={1.5} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">30-Day Hassle-Free Returns</h4>
                <p className="text-xs text-neutral-400">Simple 30-day exchanges and returns</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <ShieldCheck size={22} className="text-neutral-400 shrink-0" strokeWidth={1.5} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">2-Year Adventure Warranty</h4>
                <p className="text-xs text-neutral-400">Engineered to withstand all weather conditions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="md:col-span-6 space-y-4">
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
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              {footerNav.map((link) => (
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

          {/* Customer Care */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              Customer Support
            </h4>
            <div className="space-y-2 text-xs text-neutral-400">
              <p>
                <Link href="/support" className="text-neutral-300 hover:text-white font-medium transition-colors underline hover:no-underline">
                  Help Centre &amp; Contact &rarr;
                </Link>
              </p>
              <p>Email: support@mb-paws.co.uk</p>
              <p>Monday – Friday: 9am – 5pm GMT</p>
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
