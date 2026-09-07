'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePayPalScript } from './PayPalScriptLoader';
import { PayPalIcon } from './PaymentIcons';

interface PayPalButtonsProps {
  /** 'product' for 1-click express on PDP, 'checkout' for full cart on checkout page */
  mode: 'product' | 'checkout';
  /** Only for mode === 'product' */
  productData?: {
    productId?: string | number;
    variantId?: string;
    price: number;
    quantity: number;
    title: string;
    colour?: string;
    size?: string;
  };
  /** Pre-order validation (e.g. checking size selection) */
  onValidate?: () => boolean | string;
  /** Only for mode === 'checkout' */
  checkoutData?: {
    items: any[];
    totals: {
      subtotal: number;
      delivery: number;
      discount?: number;
      total: number;
    };
    discount?: any;
    providedShippingAddress?: any;
  };
  onSuccess?: (orderId: string) => void;
  onError?: (errorMessage: string) => void;
  className?: string;
}

export default function PayPalButtons({
  mode,
  productData,
  onValidate,
  checkoutData,
  onSuccess,
  onError,
  className = '',
}: PayPalButtonsProps) {
  const router = useRouter();
  const { isLoaded, loadError } = usePayPalScript();
  const containerRef = useRef<HTMLDivElement>(null);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [containerId] = useState(() => `paypal-btn-${mode}-${Math.random().toString(36).slice(2, 7)}`);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || typeof window === 'undefined' || !window.paypal) {
      return;
    }

    // Clear previous buttons to avoid duplicate instances
    containerRef.current.innerHTML = '';

    const buttonConfig: any = {
      style: {
        shape: 'rect',
        color: 'gold',
        layout: 'vertical',
        label: 'paypal',
      },

      async createOrder() {
        setLocalError(null);

        // Run pre-validation (e.g. check if size was selected)
        if (onValidate) {
          const validationResult = onValidate();
          if (validationResult !== true) {
            const msg = typeof validationResult === 'string' ? validationResult : 'Please complete the required options';
            setLocalError(msg);
            if (onError) onError(msg);
            throw new Error(msg);
          }
        }

        try {
          let payload: any;
          if (mode === 'product') {
            payload = {
              type: 'product',
              ...productData,
            };
          } else {
            payload = {
              type: 'cart',
              ...checkoutData,
            };
          }

          const response = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const data = await response.json();
          if (!response.ok || !data.id) {
            throw new Error(data.error || 'Failed to initiate PayPal Checkout');
          }

          return data.id;
        } catch (err: any) {
          const msg = err?.message || 'Could not initiate PayPal Checkout';
          setLocalError(msg);
          if (onError) onError(msg);
          throw err;
        }
      },

      async onApprove(data: any, actions: any) {
        setProcessing(true);
        setLocalError(null);

        try {
          const capturePayload: any = {
            orderID: data.orderID,
            type: mode,
          };

          if (mode === 'product') {
            capturePayload.productData = productData;
          } else {
            capturePayload.cartItems = checkoutData?.items;
            capturePayload.discount = checkoutData?.discount;
          }

          const response = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(capturePayload),
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            // Handle recoverable instrument decline
            if (result?.details?.[0]?.issue === 'INSTRUMENT_DECLINED') {
              setProcessing(false);
              return actions.restart();
            }
            throw new Error(result.error || 'Payment capture failed');
          }

          if (onSuccess) {
            onSuccess(result.orderId);
          } else {
            window.location.href = `/checkout/success?orderId=${result.orderId}`;
          }
        } catch (err: any) {
          setProcessing(false);
          const msg = err?.message || 'Payment could not be processed';
          setLocalError(msg);
          if (onError) onError(msg);
        }
      },

      onError(err: any) {
        setProcessing(false);
        const msg = err?.message || 'An error occurred during PayPal Checkout';
        setLocalError(msg);
        if (onError) onError(msg);
      },

      onCancel() {
        setProcessing(false);
      },
    };

    // On Product Page, strictly render ONLY PayPal (no Pay Later or debit/credit cards)
    if (mode === 'product' && window.paypal.FUNDING?.PAYPAL) {
      buttonConfig.fundingSource = window.paypal.FUNDING.PAYPAL;
    }

    try {
      window.paypal.Buttons(buttonConfig).render(containerRef.current);
    } catch (e: any) {
      setLocalError(e?.message || 'Failed to render PayPal buttons');
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [isLoaded, mode, JSON.stringify(productData), JSON.stringify(checkoutData)]);

  return (
    <div className={`w-full ${className}`}>
      {/* Loading Skeleton */}
      {!isLoaded && !loadError && (
        <div className="w-full h-12 bg-[#FFC439]/30 animate-pulse rounded flex items-center justify-center gap-2 text-neutral-600 text-xs font-medium">
          <PayPalIcon className="h-5 w-auto opacity-70" />
          <span>Loading PayPal...</span>
        </div>
      )}

      {/* Load Error */}
      {loadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {loadError}
        </div>
      )}

      {/* PayPal Button Container */}
      <div
        ref={containerRef}
        id={containerId}
        className={`w-full min-h-[48px] ${processing ? 'opacity-50 pointer-events-none' : ''}`}
      />

      {/* Processing State */}
      {processing && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-neutral-600 font-medium">
          <svg className="animate-spin h-4 w-4 text-neutral-900" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Securing order with PayPal...</span>
        </div>
      )}

      {/* Local Error Message */}
      {localError && (
        <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {localError}
        </div>
      )}
    </div>
  );
}
