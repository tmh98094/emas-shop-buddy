import { MessageCircle } from "lucide-react";
import { Button } from "./ui/button";

export const WhatsAppFloater = () => {
  const handleWhatsAppClick = () => {
    window.open("https://wa.me/60122379178", "_blank");
  };

  return (
    <Button
      onClick={handleWhatsAppClick}
      size="lg"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#20BA5A] shadow-lg touch-manipulation"
      aria-label="Contact us on WhatsApp"
    >
      <MessageCircle className="h-6 w-6 text-white" />
    </Button>
  );
};
