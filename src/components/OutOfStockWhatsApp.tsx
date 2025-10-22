import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { T } from "./T";

interface OutOfStockWhatsAppProps {
  productName: string;
  productSlug: string;
}

export function OutOfStockWhatsApp({ productName, productSlug }: OutOfStockWhatsAppProps) {
  const handleWhatsAppClick = () => {
    const phoneNumber = "60123456789"; // Replace with actual WhatsApp business number
    const message = encodeURIComponent(
      `Hi! I'm interested in the product "${productName}" which is currently out of stock. Can you let me know when it will be available?\n\nProduct link: ${window.location.origin}/product/${productSlug}`
    );
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
      <p className="text-sm text-amber-900 dark:text-amber-100 mb-3">
        <T 
          zh="此商品目前缺货。联系我们了解更多信息或询问何时有货。" 
          en="This item is currently out of stock. Contact us for more information or to inquire about availability." 
        />
      </p>
      <Button
        onClick={handleWhatsAppClick}
        variant="outline"
        className="w-full"
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        <T zh="通过 WhatsApp 联系我们" en="Contact us on WhatsApp" />
      </Button>
    </div>
  );
}
