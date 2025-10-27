import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { WhatsAppFloater } from "@/components/WhatsAppFloater";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Minus, Plus, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkPriceChange, getTimeSinceLocked } from "@/lib/price-staleness";
import { useState, useEffect } from "react";
import { ProductCardSkeleton } from "@/components/LoadingSkeleton";
import { Loader2 } from "lucide-react";

export default function Cart() {
  const { items, updateQuantity, removeItem, refreshPrices, loading } = useCart();
  const navigate = useNavigate();
  const [priceChangeDetected, setPriceChangeDetected] = useState(false);

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
        if (item.key === "gold_price_916") prices["916"] = (item.value as any).price;
        else if (item.key === "gold_price_999") prices["999"] = (item.value as any).price;
      });
      return prices;
    },
  });

  const calculateItemPrice = (item: any) => {
    // Use locked price if available (Phase 1: Price Locking)
    if (item.calculated_price) {
      return Math.round(item.calculated_price * item.quantity * 100) / 100;
    }
    
    // Fallback to dynamic calculation for old cart items
    const product = item.product;
    if (!product || !goldPrices) return 0;
    const goldPrice = goldPrices[product.gold_type as "916" | "999"] || 0;
    return Math.round((goldPrice * parseFloat(product.weight_grams) + parseFloat(product.labour_fee)) * item.quantity * 100) / 100;
  };

  const totalAmount = items.reduce((sum, item) => sum + calculateItemPrice(item), 0);

  // Check if any prices need updating
  useEffect(() => {
    if (!goldPrices || items.length === 0) return;

    const hasSignificantChange = items.some(item => {
      if (!item.gold_price_snapshot || !item.product) return false;
      
      const currentGoldPrice = goldPrices[item.product.gold_type as "916" | "999"];
      if (!currentGoldPrice) return false;

      const priceChange = checkPriceChange(item.gold_price_snapshot, currentGoldPrice);
      return priceChange.hasChanged;
    });

    setPriceChangeDetected(hasSignificantChange);
  }, [goldPrices, items]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <GoldPriceBanner />
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-primary mb-8">Shopping Cart</h1>

        {priceChangeDetected && (
          <Alert variant="default" className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">Gold Price Changed</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              The gold price has changed since you added items to your cart. Click "Refresh Prices" to update your cart with current prices.
              <Button 
                onClick={refreshPrices} 
                variant="outline" 
                size="sm" 
                className="ml-4 border-amber-600 text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Prices
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Your cart is empty</p>
            <Button onClick={() => navigate("/products")}>Continue Shopping</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const product = item.product;
                const itemPrice = calculateItemPrice(item);
                
                return (
                  <Card key={item.id} className="p-4 md:p-6">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 md:w-28 md:h-28 flex-shrink-0">
                        <img
                          src={product.product_images?.[0]?.image_url || "/placeholder.svg"}
                          alt={product.name}
                          className="w-full h-full object-cover rounded"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-base md:text-lg">{product.name}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground">{product.gold_type} Gold</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-9 w-9 md:h-8 md:w-8 flex-shrink-0 ml-2"
                            onClick={() => removeItem(item.id)}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-end justify-between mt-auto">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 md:h-8 md:w-8"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-10 text-center font-medium text-base">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 md:h-8 md:w-8"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-primary font-bold text-lg">
                            RM {itemPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div>
              <Card className="p-6 sticky top-4 md:top-32">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-base">
                    <span>Subtotal</span>
                    <span className="font-semibold">RM {totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span className="text-muted-foreground">Calculated at checkout</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-lg md:text-xl">
                    <span>Total</span>
                    <span className="text-primary">RM {totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <Button
                  className="w-full h-12 text-base"
                  size="lg"
                  onClick={() => navigate("/checkout")}
                  aria-label="Proceed to checkout"
                >
                  Proceed to Checkout
                </Button>
              </Card>
            </div>
          </div>
        )}
      </main>

      <WhatsAppFloater />
    </div>
  );
}
