'use client';

import React from 'react';

interface KlarnaWidgetProps {
  price: number;
  currencySymbol?: string;
  className?: string;
}

export default function KlarnaWidget({
  price,
  currencySymbol = '£',
  className = '',
}: KlarnaWidgetProps) {
  const installmentAmount = (price / 3).toFixed(2);

  return (
    <div className={`text-xs text-neutral-600 space-y-1 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 leading-tight text-[13px]">
        <span>3 payments of</span>
        <span className="font-semibold text-neutral-900">
          {currencySymbol}{installmentAmount}
        </span>
        <span>at 0% interest with</span>
        <span className="inline-flex items-center font-bold px-1.5 py-0.5 rounded bg-[#FFB3C7] text-neutral-900 text-[11px] tracking-tight">
          Klarna
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            alert('Klarna Pay in 3: Spread the cost of your purchase into 3 interest-free instalments. 18+, UK residents only. Subject to status. Terms & conditions apply.');
          }}
          className="underline hover:text-neutral-900 transition-colors"
        >
          Check purchase power
        </button>
        <span>•</span>
        <span>18+, T&C apply, Credit subject to status.</span>
      </div>
    </div>
  );
}
