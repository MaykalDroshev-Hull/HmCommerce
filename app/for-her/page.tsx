'use client';

import { useState, useEffect } from 'react';
import PublicPageLayout from '@/components/PublicPageLayout';
import StorePage from '@/components/StorePage';
import LoadingScreen from '@/components/LoadingScreen';
import { Product } from '@/lib/data';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export default function ForHerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isLoading: settingsLoading, settings } = useStoreSettings();
  const { language } = useLanguage();
  const { theme } = useTheme();

  useEffect(() => {
    const pageTitle = 'Harnesses';
    const storeName = settings?.storename || '';
    document.title = storeName ? `${pageTitle} - ${storeName}` : pageTitle;
  }, [settings?.storename]);

  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin');
    if (adminState === 'true') {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products?rfproducttypeid=2');
        const result = await response.json();
        if (result.success) {
          setProducts(result.products);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
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
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-24">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: theme.colors.primary }}
          />
        </div>
      ) : (
        <StorePage products={products} currentPage="for-her" />
      )}
    </PublicPageLayout>
  );
}
