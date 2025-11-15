import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, MessageCircle } from "lucide-react";
import { T } from "@/components/T";
import { Button } from "@/components/ui/button";

export const GuestOnlyBanner = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("guest_banner_dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("guest_banner_dismissed", "true");
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20">
      <div className="container mx-auto px-4 py-3">
        <Alert className="border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-start justify-between gap-4">
            <AlertDescription className="text-sm flex-1">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <span className="font-medium">
                  <T 
                    zh="由于网站技术问题，客户目前只能以访客模式购买。" 
                    en="Due to website technical issues, customers can only purchase in guest mode."
                  />
                </span>
                <a 
                  href="https://wa.me/60123456789" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <MessageCircle className="h-4 w-4" />
                  <T zh="联系客服" en="Contact Support" />
                </a>
              </div>
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 -mt-1 -mr-1 hover:bg-yellow-500/20"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      </div>
    </div>
  );
};