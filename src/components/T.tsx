import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';

interface TProps {
  zh: string;
  en?: string;
  children?: never;
}

export const T = ({ zh, en }: TProps) => {
  const { language, translate } = useLanguage();
  const [text, setText] = useState(zh);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTranslation = async () => {
      if (language === 'en' && !en) {
        setLoading(true);
        try {
          const translated = await translate(zh, en);
          setText(translated);
        } catch (error) {
          console.error('Translation error:', error);
          setText(zh);
        } finally {
          setLoading(false);
        }
      } else if (language === 'en' && en) {
        setText(en);
      } else {
        setText(zh);
      }
    };

    loadTranslation();
  }, [language, zh, en, translate]);

  if (loading) {
    return <span className="opacity-70 animate-pulse">{zh}</span>;
  }

  return <>{text}</>;
};
