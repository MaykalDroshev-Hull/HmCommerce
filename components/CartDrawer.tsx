// components/CartDrawer.tsx
'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { X, Plus, Minus, ShoppingCart, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { translations } from '@/lib/translations';
import Link from 'next/link';
import { ExpressCheckoutButtons, PaymentBadgesRow } from './PaymentIcons';

function unlockBodyScroll(savedScrollY: number) {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.overflow = '';
  window.scrollTo(0, savedScrollY);
}

const CartDrawer: React.FC = () => {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const {
    items,
    isCartOpen,
    totalItems,
    totalPrice,
    removeItem,
    updateQuantity,
    clearCart,
    closeCart
  } = useCart();

  const t = translations[language || 'en'];
  const scrollYRef = useRef(0);

  const formatPrice = (price: number | undefined | null) => {
    const n = Number(price);
    return `£${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
  };

  const handleCheckout = useCallback(() => {
    unlockBodyScroll(scrollYRef.current);
    closeCart();
    router.push('/checkout');
  }, [closeCart, router]);

  const handleApplePayCheckout = useCallback(() => {
    unlockBodyScroll(scrollYRef.current);
    closeCart();
    router.push('/checkout?paymentMethod=applepay');
  }, [closeCart, router]);

  const handlePayPalCheckout = useCallback(() => {
    unlockBodyScroll(scrollYRef.current);
    closeCart();
    router.push('/checkout?paymentMethod=paypal');
  }, [closeCart, router]);

  useEffect(() => {
    if (isCartOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        unlockBodyScroll(scrollYRef.current);
      };
    }
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={closeCart}
      />

      <div
        className="absolute right-0 top-0 h-full w-full max-w-md shadow-xl transform transition-transform flex flex-col"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <div
          className="flex items-center justify-between p-5 sm:p-6 border-b"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center gap-3">
            <ShoppingCart size={22} style={{ color: theme.colors.text }} />
            <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>
              {t.shoppingCart}
            </h2>
            {totalItems > 0 && (
              <span
                className="text-white text-xs px-2.5 py-1 rounded-full font-semibold min-w-[24px] text-center"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {totalItems}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="p-2 rounded-full transition-opacity hover:opacity-70"
            style={{ color: theme.colors.text }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <ShoppingCart size={48} className="mb-4" style={{ color: theme.colors.border }} />
              <p className="text-lg" style={{ color: theme.colors.textSecondary }}>
                {t.yourCartIsEmpty}
              </p>
              <Link
                href="/"
                onClick={closeCart}
                className="mt-4 px-5 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: '#ffffff',
                }}
              >
                {t.continueShopping}
              </Link>
            </div>
          ) : (
            <div className="p-4 sm:p-5 space-y-3">
              {items.map((item, index) => (
                <div
                  key={`${item.id}-${item.size}-${index}`}
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: theme.colors.secondary,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        quality={90}
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-medium truncate text-sm sm:text-base"
                        style={{ color: theme.colors.text }}
                      >
                        {item.brand} {item.model}
                      </h3>
                      <div className="text-xs sm:text-sm space-y-1 mt-1" style={{ color: theme.colors.textSecondary }}>
                        {item.propertyValues && Object.keys(item.propertyValues).length > 0 ? (
                          <div className="space-y-0.5">
                            {Object.entries(item.propertyValues).map(([propertyName, propertyValue]) => {
                              const formattedName = propertyName
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, l => l.toUpperCase());
                              return (
                                <div key={propertyName}>
                                  <span className="font-medium">{formattedName}:</span> {propertyValue}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <>
                            {item.color && (
                              <div>
                                <span className="font-medium">{t.color}:</span> {item.color}
                              </div>
                            )}
                            {item.size && (
                              <div>
                                <span className="font-medium">{t.size}:</span> {item.size}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <p className="text-sm mt-2" style={{ color: theme.colors.textSecondary }}>
                        {formatPrice(item.price)} {t.each}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id, item.size)}
                      className="p-1.5 rounded-lg transition-opacity hover:opacity-70 shrink-0"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: theme.colors.border }}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                        className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                        style={{ backgroundColor: theme.colors.surface, color: theme.colors.text }}
                      >
                        <Minus size={16} />
                      </button>
                      <span
                        className="w-10 text-center font-medium text-sm"
                        style={{ color: theme.colors.text }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                        className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                        style={{ backgroundColor: theme.colors.surface, color: theme.colors.text }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: theme.colors.text }}>
                        {formatPrice(item.quantity * item.price)}
                      </p>
                      <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                        {t.subtotal}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div
            className="border-t p-5 sm:p-6 space-y-4"
            style={{ borderColor: theme.colors.border }}
          >
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium" style={{ color: theme.colors.text }}>
                {t.total}:
              </span>
              <span className="text-xl font-bold" style={{ color: theme.colors.text }}>
                {formatPrice(totalPrice)}
              </span>
            </div>

            {/* Express Checkout (Apple Pay & PayPal) */}
            <ExpressCheckoutButtons
              onApplePay={handleApplePayCheckout}
              onPayPal={handlePayPalCheckout}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={clearCart}
                className="flex-1 px-4 py-3 rounded-xl font-medium transition-opacity hover:opacity-80"
                style={{
                  border: `1px solid ${theme.colors.border}`,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                }}
              >
                {t.clearCart}
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                className="flex-1 px-4 py-3 rounded-xl font-medium transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: '#ffffff',
                }}
              >
                {t.checkout}
              </button>
            </div>

            <div className="pt-1 flex justify-center">
              <PaymentBadgesRow />
            </div>

            <button
              type="button"
              onClick={closeCart}
              className="w-full px-4 py-3 rounded-xl font-medium transition-opacity hover:opacity-80"
              style={{
                border: `1px solid ${theme.colors.text}`,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              }}
            >
              {t.continueShopping}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
