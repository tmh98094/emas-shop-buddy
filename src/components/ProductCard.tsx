import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Eye, Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { calculatePrice, formatPrice } from "@/lib/price-utils";
import { T } from "./T";
import { Badge } from "./ui/badge";
import { useState } from "react";
import { ProductQuickView } from "./ProductQuickView";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    gold_type: "916" | "999";
    weight_grams: number;
    labour_fee: number;
    stock: number;
    description?: string;
    is_preorder?: boolean | null;
    preorder_deposit?: number | null;
    is_best_seller?: boolean | null;
    is_new_arrival?: boolean | null;
    product_images?: Array<{ image_url: string; media_type?: string; display_order?: number }>;
  };
  imageUrl?: string;
}

export const ProductCard = ({ product, imageUrl }: ProductCardProps) => {
  const { addItem } = useCart();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  
  const { data: goldPrices } = useQuery({
    queryKey: ["gold-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["gold_price_916", "gold_price_999"]);
      
      if (error) throw error;
      
      const prices = { "916": 0, "999": 0 };
      data?.forEach(item => {
        if (item.key === "gold_price_916") prices["916"] = (item.value as { price: number }).price;
        else if (item.key === "gold_price_999") prices["999"] = (item.value as { price: number }).price;
      });
      
      return prices;
    },
  });

  const goldPrice = goldPrices?.[product.gold_type] || 0;
  const totalPrice = calculatePrice(goldPrice, product.weight_grams, product.labour_fee);

  const displayImage = imageUrl || product.product_images?.find(img => img.display_order === 0)?.image_url || product.product_images?.[0]?.image_url || "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80&fm=webp&auto=format";

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addItem(product.id, 1);
  };

  const handleWhatsAppContact = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const phoneNumber = "60122379178";
    const message = encodeURIComponent(
      `Hi! I'm interested in the product "${product.name}" which is currently out of stock. Can you let me know when it will be available?\n\nProduct link: ${window.location.origin}/product/${product.slug}`
    );
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  return (
    <>
      <Link to={`/product/${product.slug}`}>
        <Card className="group overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
          <div className="relative">
            {/* Quick View Button */}
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              onClick={handleQuickView}
            >
              <Eye className="h-4 w-4 mr-1" />
              <T zh="快速查看" en="Quick View" />
            </Button>
            
            <div className="aspect-square overflow-hidden bg-muted">
            <img
              src={displayImage}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              decoding="async"
              width="400"
              height="400"
            />
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-semibold text-sm"><T zh="缺货" en="Out of Stock" /></span>
              </div>
            )}
            {/* Hot label for best sellers */}
            {product.is_best_seller && product.stock > 0 && (
              <div className="absolute top-2 right-2">
                <Badge variant="destructive" className="bg-red-600 text-white font-bold shadow-lg flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" />
                  <T zh="热" en="Hot" />
                </Badge>
              </div>
            )}
            {/* New label for new arrivals */}
            {product.is_new_arrival && product.stock > 0 && !product.is_best_seller && (
              <div className="absolute top-2 right-2">
                <Badge variant="default" className="bg-green-600 text-white font-bold shadow-lg">
                  <T zh="新" en="New" />
                </Badge>
              </div>
            )}
          </div>
        </div>
      <CardContent className="p-3 md:p-4 space-y-2 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm md:text-base line-clamp-2 min-h-[2.5rem] md:min-h-[3rem] text-foreground">{product.name}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 bg-secondary text-foreground rounded text-xs">
            {product.gold_type}
          </span>
          <span className="text-xs">{product.weight_grams}g</span>
        </div>
        <div className="flex justify-between items-center mt-auto pt-2">
          <p className="text-base md:text-xl font-bold text-primary">
            RM {formatPrice(totalPrice)}
          </p>
        </div>
      </CardContent>
        <CardFooter className="p-3 md:p-4 pt-0">
          {product.stock === 0 ? (
            <Button 
              className="w-full text-xs md:text-sm h-9 md:h-10 touch-manipulation" 
              size="sm"
              onClick={handleWhatsAppContact}
              aria-label={`Contact WhatsApp about ${product.name}`}
            >
              <ShoppingCart className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              <T zh="联系 WhatsApp" en="Contact WhatsApp" />
            </Button>
          ) : product.is_preorder ? (
            <Button 
              className="w-full text-xs md:text-sm h-9 md:h-10 touch-manipulation bg-amber-600 hover:bg-amber-700" 
              size="sm"
              onClick={handleAddToCart}
              aria-label={`Pre-order ${product.name}`}
            >
              <ShoppingCart className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              <T zh="预购" en="Pre-order" />
            </Button>
          ) : (
            <Button 
              className="w-full text-xs md:text-sm h-9 md:h-10 touch-manipulation" 
              size="sm"
              onClick={handleAddToCart}
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingCart className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              <T zh="加入购物车" en="Add to Cart" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </Link>
    
    <ProductQuickView
      product={product}
      goldPrice={goldPrice}
      open={quickViewOpen}
      onOpenChange={setQuickViewOpen}
    />
    </>
  );
};
