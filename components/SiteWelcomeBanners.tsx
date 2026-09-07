'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, Cookie } from 'lucide-react';
import { useCookieConsent } from '@/context/CookieConsentContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

const SUPER_PROMO_REMINDER_MS = 60_000;
const INITIAL_SHOW_DELAY_MS = 1_000;

export default function SiteWelcomeBanners() {
  const { consentStatus, acceptConsent, rejectConsent } = useCookieConsent();
  const { language } = useLanguage();
  const t = translations[language || 'en'];

  const [isVisible, setIsVisible] = useState(false);
  const [askedThisSession, setAskedThisSession] = useState(false);
  const [showSuperPromoWelcome, setShowSuperPromoWelcome] = useState(false);
  const hasSuperPromoItemsRef = useRef(false);
  const superPromoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCookieBanner = consentStatus === 'not-asked' && !askedThisSession;
  const showAnyBanner = isVisible && (showCookieBanner || showSuperPromoWelcome);

  const clearSuperPromoTimer = useCallback(() => {
    if (superPromoTimerRef.current) {
      clearTimeout(superPromoTimerRef.current);
      superPromoTimerRef.current = null;
    }
  }, []);

  const openSuperPromoBanner = useCallback(() => {
    if (!hasSuperPromoItemsRef.current) return;
    setShowSuperPromoWelcome(true);
    setIsVisible(true);
  }, []);

  const scheduleSuperPromoReminder = useCallback(() => {
    clearSuperPromoTimer();
    superPromoTimerRef.current = setTimeout(() => {
      openSuperPromoBanner();
    }, SUPER_PROMO_REMINDER_MS);
  }, [clearSuperPromoTimer, openSuperPromoBanner]);

  useEffect(() => {
    let cancelled = false;
    let initialTimer: ReturnType<typeof setTimeout> | null = null;

    const init = async () => {
      const sessionAsked = sessionStorage.getItem('consent_asked_this_session');

      if (consentStatus === 'rejected' && sessionAsked) {
        setAskedThisSession(true);
      }

      let hasItems = false;
      try {
        const res = await fetch('/api/super-promo');
        const data = await res.json();
        hasItems = Boolean(data.success && Array.isArray(data.items) && data.items.length > 0);
      } catch {
        hasItems = false;
      }

      if (cancelled) return;

      hasSuperPromoItemsRef.current = hasItems;

      const shouldShowCookie = consentStatus === 'not-asked' && !sessionAsked;
      if (hasItems || shouldShowCookie) {
        initialTimer = setTimeout(() => {
          if (cancelled) return;
          if (hasItems) {
            setShowSuperPromoWelcome(true);
          }
          if (hasItems || shouldShowCookie) {
            setIsVisible(true);
          }
        }, INITIAL_SHOW_DELAY_MS);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (initialTimer) clearTimeout(initialTimer);
      clearSuperPromoTimer();
    };
  }, [consentStatus, clearSuperPromoTimer]);

  const dismissSuperPromoWelcome = () => {
    setShowSuperPromoWelcome(false);
    if (!showCookieBanner) {
      setIsVisible(false);
    }
    scheduleSuperPromoReminder();
  };

  const handleAccept = () => {
    acceptConsent();
  };

  const handleReject = () => {
    rejectConsent();
    setAskedThisSession(true);
  };

  useEffect(() => {
    if (!showCookieBanner && !showSuperPromoWelcome) {
      setIsVisible(false);
    }
  }, [showCookieBanner, showSuperPromoWelcome]);

  if (!showAnyBanner) {
    return null;
  }

  return (
    <>
      {isVisible && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={() => {
            if (showCookieBanner) {
              handleReject();
            }
          }}
        />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-500 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white dark:bg-gray-800 shadow-2xl border-t border-gray-200 dark:border-gray-700">
          {showSuperPromoWelcome && (
            <div
              className="border-b border-amber-200/80 dark:border-amber-900/40"
              style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fee2e2 55%, #fff7ed 100%)',
              }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                <div className="flex items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-amber-700">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold tracking-wide text-[#1a1a1a] uppercase">
                        {t.superPromoWelcomeTitle}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#6b6b6b] mt-1">
                        Special offers on selected products and sizes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href="/super-promo"
                      onClick={dismissSuperPromoWelcome}
                      className="px-4 sm:px-5 py-2.5 text-sm font-semibold text-white rounded-lg shadow-md transition-opacity hover:opacity-90"
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
                      }}
                    >
                      {t.superPromoWelcomeCta}
                    </Link>
                    <button
                      type="button"
                      onClick={dismissSuperPromoWelcome}
                      className="p-2 rounded-lg bg-white/70 hover:bg-white text-gray-700 transition-colors"
                      aria-label={t.superPromoWelcomeClose}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showCookieBanner && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Cookie size={20} className="text-gray-700 dark:text-gray-200" />
                    <span>{t.cookieConsentTitle}</span>
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 max-w-3xl">
                    {t.cookieConsentMessage}
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleReject}
                    className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
                  >
                    {t.cookieConsentReject}
                  </button>
                  <button
                    type="button"
                    onClick={handleAccept}
                    className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                  >
                    {t.cookieConsentAccept}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
