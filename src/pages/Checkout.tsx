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
import { T } from "@/components/T";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postcode: "",
    country: "Malaysia",
  });
  const [shippingRegion, setShippingRegion] = useState<"west_malaysia" | "east_malaysia" | "singapore">("west_malaysia");

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

  const getShippingCost = () => {
    if (shippingRegion === "singapore") return 40;
    if (shippingRegion === "east_malaysia") return 15;
    return 10; // west_malaysia
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      if (item.calculated_price) {
        return sum + Math.round(item.calculated_price * item.quantity * 100) / 100;
      }
      
      const product = item.product;
      const goldPrice = goldPrices?.[product.gold_type as "916" | "999"] || 0;
      const itemTotal = calculateItemTotal(goldPrice, parseFloat(product.weight_grams), parseFloat(product.labour_fee), item.quantity);
      return sum + itemTotal;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + getShippingCost();
  };

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

    if (priceChangeDetected) {
      toast({
        title: "Price Update Required",
        description: "Gold prices have changed. Please refresh your cart prices before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.address_line1 || !formData.city || !formData.state || !formData.postcode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required shipping address fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const totalAmount = calculateTotal();

      const orderId = crypto.randomUUID();
      const orderNumber = `JJ${Date.now()}`;

      const { error: orderError } = await supabase
        .from("orders")
        .insert([{
          id: orderId,
          ...(user?.id && { user_id: user.id }),
          order_number: orderNumber,
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          email: formData.email || null,
          notes: formData.notes || null,
          shipping_address_line1: formData.address_line1,
          shipping_address_line2: formData.address_line2 || null,
          shipping_city: formData.city,
          shipping_state: formData.state,
          shipping_postcode: formData.postcode,
          shipping_country: formData.country,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          payment_status: "pending",
          order_status: "pending",
        }]);

      if (orderError) throw orderError;

      const orderItems = items.map(item => {
        const product = item.product;
        const goldPrice = item.gold_price_snapshot || goldPrices?.[product.gold_type as "916" | "999"] || 0;
        const subtotal = item.calculated_price 
          ? Math.round(item.calculated_price * item.quantity * 100) / 100
          : calculateItemTotal(goldPrice, parseFloat(product.weight_grams as string), parseFloat(product.labour_fee as string), item.quantity);

        return {
          order_id: orderId,
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
        navigate(`/payment/touch-n-go/${orderId}`);
      } else {
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
          "create-stripe-checkout",
          {
            body: {
              orderId: orderId,
              orderNumber: orderNumber,
              amount: totalAmount,
              successUrl: `${window.location.origin}/order-confirmation/${orderId}`,
              cancelUrl: `${window.location.origin}/checkout`,
            },
          }
        );

        if (sessionError) throw sessionError;

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
        <h1 className="text-4xl font-bold text-primary mb-8"><T zh="结账" en="Checkout" /></h1>

        {priceChangeDetected && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle><T zh="需要更新价格" en="Price Update Required" /></AlertTitle>
            <AlertDescription>
              <T zh="自您将商品添加到购物车以来，黄金价格已发生变化。您必须在下订单之前刷新价格。" en="The gold price has changed since you added items to your cart. You must refresh prices before placing your order." />
              <Button 
                onClick={refreshPrices} 
                variant="outline" 
                size="sm" 
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <T zh="立即刷新价格" en="Refresh Prices Now" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4"><T zh="联系信息" en="Contact Information" /></h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name"><T zh="全名" en="Full Name" /> *</Label>
                    <Input
                      id="full_name"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone_number"><T zh="电话号码" en="Phone Number" /> *</Label>
                    <Input
                      id="phone_number"
                      required
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email"><T zh="电子邮件" en="Email" /></Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes"><T zh="订单备注" en="Order Notes" /></Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4"><T zh="配送地址" en="Shipping Address" /></h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address_line1"><T zh="地址第一行" en="Address Line 1" /> *</Label>
                    <Input
                      id="address_line1"
                      required
                      value={formData.address_line1}
                      onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address_line2"><T zh="地址第二行" en="Address Line 2" /></Label>
                    <Input
                      id="address_line2"
                      value={formData.address_line2}
                      onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city"><T zh="城市" en="City" /> *</Label>
                      <Input
                        id="city"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state"><T zh="州/省" en="State" /> *</Label>
                      <Input
                        id="state"
                        required
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postcode"><T zh="邮政编码" en="Postcode" /> *</Label>
                      <Input
                        id="postcode"
                        required
                        value={formData.postcode}
                        onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="country"><T zh="国家" en="Country" /> *</Label>
                      <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Malaysia">Malaysia</SelectItem>
                          <SelectItem value="Singapore">Singapore</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="shipping_region"><T zh="配送区域" en="Shipping Region" /> *</Label>
                    <Select value={shippingRegion} onValueChange={(value: any) => setShippingRegion(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="west_malaysia"><T zh="西马 (RM10)" en="West Malaysia (RM10)" /></SelectItem>
                        <SelectItem value="east_malaysia"><T zh="东马 (RM15)" en="East Malaysia (RM15)" /></SelectItem>
                        <SelectItem value="singapore"><T zh="新加坡 (RM40)" en="Singapore (RM40)" /></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4"><T zh="付款方式" en="Payment Method" /></h2>
                <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <div className="flex items-center space-x-2 p-4 border rounded">
                    <RadioGroupItem value="stripe_fpx" id="stripe_fpx" />
                    <Label htmlFor="stripe_fpx" className="flex-1 cursor-pointer">
                      <T zh="FPX (在线银行通过 Stripe)" en="FPX (Online Banking via Stripe)" />
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
                <h2 className="text-xl font-semibold mb-4"><T zh="订单摘要" en="Order Summary" /></h2>
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
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span><T zh="小计" en="Subtotal" /></span>
                      <span>RM {formatPrice(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span><T zh="运费" en="Shipping" /></span>
                      <span>RM {formatPrice(getShippingCost())}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span><T zh="总计" en="Total" /></span>
                      <span className="text-primary">RM {formatPrice(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading || priceChangeDetected}
                >
                  {loading ? <T zh="处理中..." en="Processing..." /> : <T zh="下订单" en="Place Order" />}
                </Button>
              </Card>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
