'use client';

import React from 'react';

const PAYMENT_BADGES = [
  { name: 'Apple Pay', src: '/payments/apple_pay.svg' },
  { name: 'PayPal', src: '/payments/paypal.svg' },
  { name: 'Klarna', src: '/payments/klarna.svg' },
  { name: 'Visa', src: '/payments/visa.svg' },
  { name: 'Mastercard', src: '/payments/master.svg' },
  { name: 'American Express', src: '/payments/american_express.svg' },
];

export function ApplePayIcon({ className = 'h-6 w-auto', variant = 'light' }: { className?: string; variant?: 'light' | 'dark' }) {
  return (
    <img
      src="/payments/apple_pay_logo.svg"
      alt="Apple Pay"
      className={`${className} object-contain inline-block ${variant === 'light' ? 'brightness-0 invert' : ''}`}
    />
  );
}

export function PayPalIcon({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <img
      src="/payments/paypal_logo.svg"
      alt="PayPal"
      className={`${className} object-contain inline-block`}
    />
  );
}

export function KlarnaBadgeIcon({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <img
      src="/payments/klarna.svg"
      alt="Klarna"
      className={`h-5 w-auto object-contain rounded ${className}`}
    />
  );
}

interface PaymentBadgesRowProps {
  className?: string;
  theme?: 'light' | 'dark';
}

export function PaymentBadgesRow({ className = '' }: PaymentBadgesRowProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {PAYMENT_BADGES.map((badge) => (
        <img
          key={badge.name}
          src={badge.src}
          alt={badge.name}
          title={badge.name}
          className="h-6 w-auto object-contain rounded drop-shadow-xs transition-transform hover:scale-105"
        />
      ))}
    </div>
  );
}

interface ExpressButtonsProps {
  onApplePay: () => void;
  onPayPal: () => void;
  isLoading?: boolean;
}

export function ExpressCheckoutButtons({ onApplePay, onPayPal, isLoading = false }: ExpressButtonsProps) {
  return (
    <div className="space-y-2.5">
      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-neutral-200"></div>
        <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          Instant Express Checkout
        </span>
        <div className="flex-grow border-t border-neutral-200"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Apple Pay Button */}
        <button
          type="button"
          onClick={onApplePay}
          disabled={isLoading}
          className="w-full h-12 bg-black hover:bg-neutral-900 text-white rounded-[6px] flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          aria-label="Buy with Apple Pay"
        >
          <span className="text-xs font-semibold mr-0.5">Buy with</span>
          <ApplePayIcon className="h-6 w-auto" variant="light" />
        </button>

        {/* PayPal Button */}
        <button
          type="button"
          onClick={onPayPal}
          disabled={isLoading}
          className="w-full h-12 bg-[#FFC439] hover:bg-[#F2BA36] rounded-[6px] flex items-center justify-center transition-all shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          aria-label="Buy with PayPal"
        >
          <PayPalIcon className="h-6 w-auto" />
        </button>
      </div>
    </div>
  );
}
