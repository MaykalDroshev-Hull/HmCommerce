'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface StoreSettings {
  storesettingsid: string;
  storename: string;
  logourl: string | null;
  themeid: string;
  language: 'en' | 'bg';
  bannertext: string | null;
  bannerduration: number | null;
  heroimageurl: string | null;
  heroimagefocusx: number | null;
  heroimagefocusy: number | null;
  discordurl: string | null;
  facebookurl: string | null;
  pinteresturl: string | null;
  youtubeurl: string | null;
  instagramurl: string | null;
  xurl: string | null;
  tiktokurl: string | null;
  email: string | null;
  yearofcreation: number | null;
  telephonenumber: string | null;
  closingremarks: string | null;
  aboutusphoto: string | null;
  aboutustext: string | null;
  delivery_standard_price?: number | string | null;
  free_delivery_threshold?: number | string | null;
  createdat: string;
  updatedat: string;
}

interface StoreSettingsContextType {
  settings: StoreSettings | null;
  isLoading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setError(null);

      // Fetch settings via API route
      const response = await fetch('/api/store-settings');
      const result = await response.json();

      if (!response.ok) {
        setError('Failed to load store settings');
        return;
      }

      if (result.settings) {
        setSettings(result.settings);
      } else {
        setError('Store settings not found in database');
      }
    } catch (err) {
      setError('Failed to load store settings');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <StoreSettingsContext.Provider value={{ settings, isLoading, error, refreshSettings }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext);
  if (context === undefined) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
}
