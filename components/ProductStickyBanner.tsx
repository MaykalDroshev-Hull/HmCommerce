'use client';

import React from 'react';

interface ProductStickyBannerProps {
  isVisible: boolean;
  productName: string;
  price: number;
  currencySymbol?: string;
  selectedColour?: string;
  selectedColourHex?: string;
  selectedSize?: string;
  onAddToCart: () => void;
  isAdding?: boolean;
  isOutOfStock?: boolean;
}

export default function ProductStickyBanner({
  isVisible,
  productName,
  price,
  currencySymbol = '£',
  selectedColour,
  selectedColourHex,
  selectedSize,
  onAddToCart,
  isAdding = false,
  isOutOfStock = false,
}: ProductStickyBannerProps) {
  if (!isVisible) return null;

  return (
    <>
      {/* Desktop Sticky Top Banner */}
      <aside
        aria-label="Quick add product to bag"
        className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm transition-transform duration-300 animate-in slide-in-from-top-full"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Left: Product Title */}
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-bold text-neutral-900 truncate tracking-tight">
              {productName}
            </h2>
          </div>

          {/* Right: Selected Options & CTA */}
          <div className="flex items-center gap-6 shrink-0">
            {selectedColour && (
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                <span className="text-neutral-500">Colour:</span>
                {selectedColourHex && (
                  <span
                    className="w-4 h-4 rounded-full border border-neutral-300 shadow-inner inline-block"
                    style={{ backgroundColor: selectedColourHex }}
                  />
                )}
                <span className="font-semibold text-neutral-900">{selectedColour}</span>
              </div>
            )}

            {selectedSize && (
              <div className="text-xs font-medium text-neutral-700">
                <span className="text-neutral-500">Size: </span>
                <span className="font-semibold text-neutral-900">{selectedSize}</span>
              </div>
            )}

            <button
              type="button"
              onClick={onAddToCart}
              disabled={isAdding || isOutOfStock}
              className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-colors duration-200 shadow-sm ${
                isOutOfStock
                  ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed border border-neutral-300'
                  : 'bg-[#D31336] hover:bg-[#B70F2D] text-white active:scale-[0.98] disabled:opacity-50'
              }`}
            >
              {isAdding ? 'Adding...' : isOutOfStock ? 'OUT OF STOCK' : `ADD TO BAG - ${currencySymbol}${price.toFixed(2)}`}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sticky Bottom Bar */}
      <aside
        aria-label="Quick add product to bag (mobile)"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-transform duration-300 animate-in slide-in-from-bottom-full pb-[calc(12px+env(safe-area-inset-bottom,0px))]"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onAddToCart}
            disabled={isAdding || isOutOfStock}
            className={`w-full py-3.5 text-sm font-bold uppercase tracking-wider rounded transition-colors duration-200 shadow text-center ${
              isOutOfStock
                ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed border border-neutral-300'
                : 'bg-[#D31336] hover:bg-[#B70F2D] text-white active:scale-[0.99] disabled:opacity-50'
            }`}
          >
            {isAdding ? 'ADDING...' : isOutOfStock ? 'OUT OF STOCK' : `ADD TO BAG - ${currencySymbol}${price.toFixed(2)}`}
          </button>
        </div>
      </aside>
    </>
  );
}
