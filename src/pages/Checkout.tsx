import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateItemTotal, formatPrice } from "@/lib/price-utils";
import { checkPriceChange } from "@/lib/price-staleness";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Checkout() {
  const { items, clearCart, refreshPrices } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [priceChangeDetected, setPriceChangeDetected] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe_fpx" | "touch_n_go">("stripe_fpx");
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    email: "",
    notes: "",
  });

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

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      // Use locked price if available
      if (item.calculated_price) {
        return sum + Math.round(item.calculated_price * item.quantity * 100) / 100;
      }
      
      // Fallback to dynamic calculation
      const product = item.product;
      const goldPrice = goldPrices?.[product.gold_type as "916" | "999"] || 0;
      const itemTotal = calculateItemTotal(goldPrice, parseFloat(product.weight_grams), parseFloat(product.labour_fee), item.quantity);
      return sum + itemTotal;
    }, 0);
  };

  // Check if any prices need updating before checkout
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent order placement if prices changed
    if (priceChangeDetected) {
      toast({
        title: "Price Update Required",
        description: "Gold prices have changed. Please refresh your cart prices before proceeding.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const totalAmount = calculateTotal();

      // Generate order number
      const orderNumber = `JJ${Date.now()}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([{
          ...(user?.id && { user_id: user.id }),
          order_number: orderNumber,
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          email: formData.email || null,
          notes: formData.notes || null,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          payment_status: "pending",
          order_status: "pending",
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items - use locked prices from cart
      const orderItems = items.map(item => {
        const product = item.product;
        const goldPrice = item.gold_price_snapshot || goldPrices?.[product.gold_type as "916" | "999"] || 0;
        const subtotal = item.calculated_price 
          ? Math.round(item.calculated_price * item.quantity * 100) / 100
          : calculateItemTotal(goldPrice, parseFloat(product.weight_grams as string), parseFloat(product.labour_fee as string), item.quantity);

        return {
          order_id: order.id,
          product_id: item.product_id,
          product_name: product.name,
          gold_type: product.gold_type,
          weight_grams: parseFloat(product.weight_grams as string),
          labour_fee: parseFloat(product.labour_fee as string),
          gold_price_at_purchase: goldPrice,
          quantity: item.quantity,
          subtotal: subtotal,
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      await clearCart();

      if (paymentMethod === "touch_n_go") {
        navigate(`/payment/touch-n-go/${order.id}`);
      } else {
        // Create Stripe checkout session
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
          "create-stripe-checkout",
          {
            body: {
              orderId: order.id,
              orderNumber: order.order_number,
              amount: totalAmount,
              successUrl: `${window.location.origin}/order-confirmation/${order.id}`,
              cancelUrl: `${window.location.origin}/checkout`,
            },
          }
        );

        if (sessionError) throw sessionError;

        // Redirect to Stripe checkout
        if (sessionData?.url) {
          window.location.href = sessionData.url;
        } else {
          throw new Error("Failed to create Stripe session");
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-primary mb-8">Checkout</h1>

        {priceChangeDetected && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Price Update Required</AlertTitle>
            <AlertDescription>
              The gold price has changed since you added items to your cart. You must refresh prices before placing your order.
              <Button 
                onClick={refreshPrices} 
                variant="outline" 
                size="sm" 
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Prices Now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone_number">Phone Number *</Label>
                    <Input
                      id="phone_number"
                      required
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Order Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Payment Method</h2>
                <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <div className="flex items-center space-x-2 p-4 border rounded">
                    <RadioGroupItem value="stripe_fpx" id="stripe_fpx" />
                    <Label htmlFor="stripe_fpx" className="flex-1 cursor-pointer">
                      FPX (Online Banking via Stripe)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded">
                    <RadioGroupItem value="touch_n_go" id="touch_n_go" />
                    <Label htmlFor="touch_n_go" className="flex-1 cursor-pointer">
                      Touch 'n Go e-Wallet
                    </Label>
                  </div>
                </RadioGroup>
              </Card>
            </div>

            <div>
              <Card className="p-6 sticky top-32">
                <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
                <div className="space-y-4 mb-6">
                  {items.map((item) => {
                    const product = item.product;
                    const itemTotal = item.calculated_price 
                      ? Math.round(item.calculated_price * item.quantity * 100) / 100
                      : (() => {
                          const goldPrice = goldPrices?.[product.gold_type as "916" | "999"] || 0;
                          return calculateItemTotal(goldPrice, parseFloat(product.weight_grams), parseFloat(product.labour_fee), item.quantity);
                        })();
                    
                    return (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{product.name} x {item.quantity}</span>
                        <span>RM {formatPrice(itemTotal)}</span>
                      </div>
                    );
                  })}
                  <div className="border-t pt-4 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">RM {formatPrice(calculateTotal())}</span>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading || priceChangeDetected}
                >
                  {loading ? "Processing..." : "Place Order"}
                </Button>
              </Card>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
