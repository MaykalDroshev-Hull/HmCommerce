'use client';

import { useEffect, useState } from 'react';
import PublicPageLayout from '@/components/PublicPageLayout';
import LoadingScreen from '@/components/LoadingScreen';
import SuperPromoCard from '@/components/SuperPromoCard';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { translations } from '@/lib/translations';
import type { SuperPromoDisplayItem } from '@/lib/super-promo';
import { Sparkles } from 'lucide-react';

export default function SuperPromoPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<SuperPromoDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { settings, isLoading: settingsLoading } = useStoreSettings();
  const t = translations[language];

  useEffect(() => {
    const pageTitle = t.superPromo || 'SUPER PROMO';
    const storeName = settings?.storename || '';
    document.title = storeName ? `${pageTitle} - ${storeName}` : pageTitle;
  }, [language, t, settings?.storename]);

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/super-promo');
        const data = await res.json();
        setItems(data.success ? data.items || [] : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  const handleSetIsAdmin = (value: boolean) => {
    setIsAdmin(value);
    localStorage.setItem('isAdmin', value.toString());
  };

  if (settingsLoading) {
    return <LoadingScreen />;
  }

  return (
    <PublicPageLayout isAdmin={isAdmin} setIsAdmin={handleSetIsAdmin}>
      <section className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-10">
        <div
          className="rounded-2xl sm:rounded-3xl px-5 sm:px-8 py-8 sm:py-10 mb-8 sm:mb-10 text-center"
          style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fee2e2 55%, #fff7ed 100%)',
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-white/80 text-xs font-bold uppercase tracking-widest text-amber-700">
            <Sparkles size={14} />
            SUPER PROMO
          </div>
          <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-5xl mb-3 text-[#1a1a1a]">
            {t.superPromoTitle || 'SUPER PROMO'}
          </h1>
          <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: theme.colors.textSecondary }}>
            {t.superPromoDescription || 'Selected products and sizes with exclusive promo prices – for a limited time only.'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: theme.colors.primary }}
            />
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {items.map((item) => (
              <SuperPromoCard key={item.superpromoid} item={item} />
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl border px-6 py-16 text-center"
            style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}
          >
            {t.superPromoEmpty || 'There are no active SUPER PROMO offers at the moment.'}
          </div>
        )}
      </section>
    </PublicPageLayout>
  );
}
