import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { calculatePrice, formatPrice } from "@/lib/price-utils";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    gold_type: "916" | "999";
    weight_grams: number;
    labour_fee: number;
    stock: number;
  };
  imageUrl?: string;
}

export const ProductCard = ({ product, imageUrl }: ProductCardProps) => {
  const { addItem } = useCart();
  
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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addItem(product.id, 1);
  };

  return (
    <Link to={`/product/${product.slug}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={imageUrl || "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80"}
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-lg line-clamp-2 min-h-[3.5rem]">{product.name}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="px-2 py-1 bg-accent/10 text-accent-foreground rounded">
            {product.gold_type} Gold
          </span>
          <span>{product.weight_grams}g</span>
        </div>
          <p className="text-2xl font-bold text-primary">
            RM {formatPrice(totalPrice)}
          </p>
      </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button 
            className="w-full" 
            disabled={product.stock === 0}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
};
