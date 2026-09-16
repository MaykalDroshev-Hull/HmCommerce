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


