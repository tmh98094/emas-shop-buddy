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
import { formatPrice } from "@/lib/price-utils";
import { T } from "@/components/T";

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
    const product = item.product;
    
    // For pre-order items, use deposit amount
    if (product?.is_preorder && product?.preorder_deposit) {
      return Math.round(product.preorder_deposit * item.quantity * 100) / 100;
    }
    
    // Use locked price if available (Phase 1: Price Locking)
    if (item.calculated_price) {
      return Math.round(item.calculated_price * item.quantity * 100) / 100;
    }
    
    // Fallback to dynamic calculation for old cart items
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

  // Check for out of stock items
  const outOfStockItems = items.filter(item => {
    const product = item.product;
    return !product || (product.stock ?? 0) < item.quantity;
  });

  const hasOutOfStock = outOfStockItems.length > 0;

  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-primary mb-8"><T zh="购物车" en="Shopping Cart" /></h1>

        {hasOutOfStock && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle><T zh="商品缺货" en="Items Out of Stock" /></AlertTitle>
            <AlertDescription>
              <T zh="以下商品已缺货或库存不足：" en="The following items are out of stock or have insufficient quantity:" />
              <ul className="list-disc ml-6 mt-2">
                {outOfStockItems.map(item => (
                  <li key={item.id}>
                    {item.product.name} - <T zh="需要" en="Need" /> {item.quantity}, <T zh="可用" en="Available" /> {item.product.stock ?? 0}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {priceChangeDetected && (
          <Alert variant="default" className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-900 dark:text-amber-100"><T zh="黄金价格变动" en="Gold Price Changed" /></AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <T zh="自您将商品添加到购物车以来，黄金价格已发生变化。点击『刷新价格』以更新当前价格。" en="The gold price has changed since you added items to your cart. Click 'Refresh Prices' to update your cart with current prices." />
              <Button 
                onClick={refreshPrices} 
                variant="outline" 
                size="sm" 
                className="ml-4 border-amber-600 text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <T zh="刷新价格" en="Refresh Prices" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4"><T zh="您的购物车是空的" en="Your cart is empty" /></p>
            <Button onClick={() => navigate("/products")}><T zh="继续购物" en="Continue Shopping" /></Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const product = item.product;
                const itemPrice = calculateItemPrice(item);
                const isPreorder = product?.is_preorder;
                
                return (
                  <Card key={item.id} className="p-4 md:p-6">
                    <div className="flex gap-4 md:gap-6">
                      <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
                        <img
                          src={product.product_images?.[0]?.image_url || "/placeholder.svg"}
                          alt={product.name}
                          className="w-full h-full object-cover rounded"
                          loading="lazy"
                        />
                        {isPreorder && (
                          <div className="mt-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 px-2 py-1 rounded text-center font-medium">
                            <T zh="预购" en="Pre-order" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 pr-2">
                            <h3 className="font-semibold text-base md:text-lg mb-1">{product.name}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground">{product.gold_type} Gold</p>
                            {isPreorder && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                <T zh="定金：RM" en="Deposit: RM" /> {formatPrice(product.preorder_deposit || 100)}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-9 w-9 flex-shrink-0"
                            onClick={() => removeItem(item.id)}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-2 border-t">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-medium text-base">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-xs text-muted-foreground mb-1">
                              {isPreorder ? <T zh="定金小计" en="Deposit Subtotal" /> : <T zh="小计" en="Subtotal" />}
                            </p>
                            <p className="text-primary font-bold text-lg md:text-xl">
                              RM {formatPrice(itemPrice)}
                            </p>
                            {item.product && (item.product.stock ?? 0) < item.quantity && (
                              <p className="text-xs text-destructive mt-1"><T zh="库存不足" en="Out of Stock" /></p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div>
              <Card className="p-6 sticky top-4 md:top-32">
                <h2 className="text-xl md:text-2xl font-bold mb-4"><T zh="订单摘要" en="Order Summary" /></h2>
                {items.some(item => item.product?.is_preorder) && (
                  <Alert className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                    <AlertDescription className="text-sm text-amber-900 dark:text-amber-100">
                      <T 
                        zh="此订单包含预购商品。您只需支付定金，商品到货后客服会通过 WhatsApp 联系您支付余款。" 
                        en="This order contains pre-order items. You only pay the deposit now. Our team will contact you via WhatsApp for the balance when items arrive." 
                      />
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-base">
                    <span><T zh="小计" en="Subtotal" /></span>
                    <span className="font-semibold">RM {formatPrice(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span><T zh="运费" en="Shipping" /></span>
                    <span className="text-muted-foreground"><T zh="结账时计算" en="Calculated at checkout" /></span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-lg md:text-xl">
                    <span><T zh="总计" en="Total" /></span>
                    <span className="text-primary">RM {formatPrice(totalAmount)}</span>
                  </div>
                </div>
                <Button
                  className="w-full h-12 text-base"
                  size="lg"
                  onClick={() => navigate("/checkout")}
                  disabled={hasOutOfStock}
                  aria-label="Proceed to checkout"
                >
                  <T zh="前往结账" en="Proceed to Checkout" />
                </Button>
                {hasOutOfStock && (
                  <p className="text-xs text-destructive text-center mt-2">
                    <T zh="请移除缺货商品后再继续" en="Please remove out of stock items to continue" />
                  </p>
                )}
              </Card>
            </div>
          </div>
        )}
      </main>

      <WhatsAppFloater />
    </div>
  );
}
