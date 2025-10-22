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
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#20BA5A] shadow-lg"
      aria-label="Contact us on WhatsApp"
    >
      <MessageCircle className="h-6 w-6 text-white" />
    </Button>
  );
};
