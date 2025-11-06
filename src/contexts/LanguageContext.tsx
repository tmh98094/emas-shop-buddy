import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  translate: (zhText: string, enText?: string, entityType?: string, entityId?: string) => Promise<string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const CACHE_KEY = 'translation_cache';
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

interface TranslationCache {
  [key: string]: {
    en: string;
    timestamp: number;
  };
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'en' ? 'en' : 'zh') as Language;
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  const translate = async (zhText: string, enText?: string, entityType?: string, entityId?: string): Promise<string> => {
    // If current language is Chinese, return Chinese text
    if (language === 'zh') {
      return zhText;
    }

    // If English translation is provided, return it
    if (enText) {
      return enText;
    }

    // Check cache
    try {
      const cacheStr = localStorage.getItem(CACHE_KEY);
      if (cacheStr) {
        const cache: TranslationCache = JSON.parse(cacheStr);
        const cached = cache[zhText];
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
          return cached.en;
        }
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    // Translate using edge function with optional cache info
    try {
      const { data, error } = await supabase.functions.invoke('translate', {
        body: { 
          text: zhText, 
          targetLang: 'en',
          entityType,
          entityId
        }
      });

      if (error) throw error;

      const translated = data.translated || zhText;

      // Save to cache if not from database cache
      if (!data.cached) {
        try {
          const cacheStr = localStorage.getItem(CACHE_KEY) || '{}';
          const cache: TranslationCache = JSON.parse(cacheStr);
          cache[zhText] = {
            en: translated,
            timestamp: Date.now()
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (error) {
          console.error('Cache write error:', error);
        }
      }

      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      return zhText; // Fallback to Chinese text
    }
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, translate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
