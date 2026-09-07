'use client';

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: any) => {
        render: (element: string | HTMLElement) => Promise<void>;
      };
      FUNDING?: {
        PAYPAL: any;
        PAYLATER: any;
        CARD: any;
        CREDIT: any;
        VENMO: any;
      };
    };
  }
}

export function usePayPalScript() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.paypal) {
      setIsLoaded(true);
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'test';
    const scriptId = 'paypal-js-sdk';

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.paypal) {
        setIsLoaded(true);
      } else {
        existingScript.addEventListener('load', () => setIsLoaded(true));
        existingScript.addEventListener('error', () => setLoadError('Failed to load PayPal SDK'));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=GBP&buyer-country=GB&components=buttons,messages&enable-funding=paylater`;
    script.async = true;

    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      setLoadError('Failed to load PayPal SDK');
    };

    document.head.appendChild(script);
  }, []);

  return { isLoaded, loadError };
}
