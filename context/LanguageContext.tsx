'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '@/lib/translations';
import { useStoreSettings } from './StoreSettingsContext';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { settings } = useStoreSettings();
  
  // MB-Paws is strictly en-GB for the British market
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Clear any previous Bulgarian setting from legacy sessions
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage === 'bg') {
      localStorage.setItem('language', 'en');
      localStorage.removeItem('language-user-preference');
    }
    setLanguageState('en');
  }, [settings?.language]);

  const setLanguage = (lang: Language) => {
    // Force English site-wide
    setLanguageState('en');
    localStorage.setItem('language', 'en');
  };

  return (
    <LanguageContext.Provider value={{ language: 'en', setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
