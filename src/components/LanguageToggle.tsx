import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from './ui/button';

export const LanguageToggle = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2 text-foreground hover:text-primary transition-colors"
      aria-label="Toggle language"
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">{language === 'zh' ? '中文' : 'EN'}</span>
    </Button>
  );
};
