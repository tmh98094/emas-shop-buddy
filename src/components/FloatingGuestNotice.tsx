import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const DISMISS_KEY = "floating_guest_notice_dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export default function FloatingGuestNotice() {
  const [isDismissed, setIsDismissed] = useState(true);
  const { language } = useLanguage();

  useEffect(() => {
    const dismissedData = localStorage.getItem(DISMISS_KEY);
    if (dismissedData) {
      const { timestamp } = JSON.parse(dismissedData);
      const now = Date.now();
      if (now - timestamp < DISMISS_DURATION) {
        setIsDismissed(true);
        return;
      }
    }
    setIsDismissed(false);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(
      DISMISS_KEY,
      JSON.stringify({ timestamp: Date.now() })
    );
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 transform -translate-x-1/2 w-[92%] max-w-md z-50 animate-in slide-in-from-bottom-4 duration-300">
      <Alert className="bg-yellow-50 border-yellow-200 shadow-lg relative pr-12">
        <AlertDescription className="text-sm text-yellow-800">
          {language === "en" ? (
            <>
              Due to technical issues, login is temporarily disabled. You can
              still purchase as a guest.{" "}
              <a
                href="https://wa.me/60169881880"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium hover:text-yellow-900"
              >
                Contact support
              </a>
            </>
          ) : (
            <>
              由于技术问题，登录功能暂时关闭。您仍可以访客身份购买。{" "}
              <a
                href="https://wa.me/60169881880"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium hover:text-yellow-900"
              >
                联系客服
              </a>
            </>
          )}
        </AlertDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 hover:bg-yellow-100"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4 text-yellow-800" />
        </Button>
      </Alert>
    </div>
  );
}
