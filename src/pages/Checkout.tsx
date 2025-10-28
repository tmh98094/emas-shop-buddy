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
import { normalizePhone } from "@/lib/phone-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhoneInput } from "@/components/PhoneInput";
import { Loader2 } from "lucide-react";

export default function Checkout() {
  const { items, clearCart, refreshPrices } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [priceChangeDetected, setPriceChangeDetected] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe_fpx" | "stripe_card" | "touch_n_go">("stripe_fpx");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [creditCardEnabled, setCreditCardEnabled] = useState(true);
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
  const [countryCodePhone, setCountryCodePhone] = useState<string>("+60");

  // Load user profile data for auto-fill
  useEffect(() => {
    const loadUserProfile = async () => {
      setProfileLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        
        if (profile) {
          // Parse phone number properly - extract country code and format number
          let extractedCountryCode = "+60";
          let extractedPhone = "";
          
          if (profile.phone_number) {
            // Try to match country code patterns
            const phoneMatch = profile.phone_number.match(/^(\+\d{2,3})(.+)$/);
            if (phoneMatch) {
              extractedCountryCode = phoneMatch[1];
              extractedPhone = phoneMatch[2].replace(/\D/g, "");
            } else if (profile.phone_number.startsWith("+")) {
              // Has + but couldn't parse normally, try to extract
              const plusIndex = profile.phone_number.indexOf("+");
              extractedCountryCode = profile.phone_number.substring(plusIndex, plusIndex + 3);
              extractedPhone = profile.phone_number.substring(plusIndex + 3).replace(/\D/g, "");
            } else {
              // Fallback: assume +60 and extract all digits
              extractedPhone = profile.phone_number.replace(/\D/g, "");
            }
          }
          
          setCountryCodePhone(extractedCountryCode);
          setFormData({
            full_name: profile.full_name || "",
            phone_number: extractedPhone,
            email: profile.email || "",
            notes: "",
            address_line1: profile.address_line1 || "",
            address_line2: profile.address_line2 || "",
            city: profile.city || "",
            state: profile.state || "",
            postcode: profile.postcode || "",
            country: profile.country || "Malaysia",
          });
        }
      }
      setProfileLoading(false);
    };
    loadUserProfile();
  }, []);

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

  // Check if credit card payment is enabled
  useEffect(() => {
    const checkCreditCardSetting = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "enable_credit_card")
        .single();
      
      if (!error && data) {
        const enabled = (data.value as any).enabled ?? true;
        setCreditCardEnabled(enabled);
        // If credit card is disabled and it's currently selected, switch to FPX
        if (!enabled && paymentMethod === "stripe_card") {
          setPaymentMethod("stripe_fpx");
        }
      }
    };
    checkCreditCardSetting();
  }, []);

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

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const proceedWithOrder = async () => {
    setShowConfirmDialog(false);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Validate stock before creating order
      const productIds = items.map(i => i.product_id);
      const { data: latestProducts, error: latestError } = await supabase
        .from('products')
        .select('id, name, stock')
        .in('id', productIds);
      if (latestError) throw latestError;
      const outOfStock = items.filter(i => {
        const p = latestProducts?.find(lp => lp.id === i.product_id);
        return !p || (p.stock ?? 0) < i.quantity;
      });
      if (outOfStock.length > 0) {
        const names = outOfStock.map(i => i.product.name).join(', ');
        throw new Error(`Some items are out of stock or insufficient quantity: ${names}. Please adjust your cart.`);
      }

      const totalAmount = calculateTotal();

      const orderId = crypto.randomUUID();
      const { data: seq, error: seqError } = await supabase.rpc('get_next_order_sequence');
      if (seqError) {
        console.warn('Sequence fetch failed, falling back:', seqError.message);
      }
      const sequence = (seq as number | null) ?? null;
      const orderNumber = sequence ? `JJ-${String(sequence).padStart(5, '0')}` : `JJ-${Date.now()}`;

      // Ensure phone number is clean digits only before normalizing
      const cleanPhoneNumber = formData.phone_number.replace(/\D/g, '');
      const normalizedPhone = normalizePhone(cleanPhoneNumber, countryCodePhone);

      const { error: orderError } = await supabase
        .from("orders")
        .insert([{
          id: orderId,
          ...(user?.id && { user_id: user.id }),
          order_number: orderNumber,
          full_name: formData.full_name,
          phone_number: normalizedPhone,
          email: formData.email || null,
          notes: formData.notes || null,
          shipping_address_line1: formData.address_line1,
          shipping_address_line2: formData.address_line2 || null,
          shipping_city: formData.city,
          shipping_state: formData.state,
          shipping_postcode: formData.postcode,
          shipping_country: formData.country,
          total_amount: totalAmount,
          payment_method: paymentMethod === "stripe_card" || paymentMethod === "stripe_fpx" ? "stripe_fpx" : "touch_n_go",
          payment_status: "pending",
          order_status: "pending",
        }]);

      if (orderError) throw orderError;

      // Save shipping address to user profile for logged in users
      if (user?.id) {
        await supabase
          .from("profiles")
          .update({
            address_line1: formData.address_line1,
            address_line2: formData.address_line2 || null,
            city: formData.city,
            state: formData.state,
            postcode: formData.postcode,
            country: formData.country,
          })
          .eq('id', user.id);
      }

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
              paymentMethod: paymentMethod === 'stripe_card' ? 'card' : 'fpx',
            },
          }
        );

        if (sessionError) throw sessionError;

        if (sessionData?.url) {
          // Redirect to Stripe checkout in same window (important for return URL to work)
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
                  <div className="relative">
                    <Label htmlFor="full_name"><T zh="全名" en="Full Name" /> *</Label>
                    <Input
                      id="full_name"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={profileLoading}
                    />
                    {profileLoading && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded mt-8">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div>
                    <PhoneInput
                      countryCode={countryCodePhone}
                      phoneNumber={formData.phone_number}
                      onCountryCodeChange={setCountryCodePhone}
                      onPhoneNumberChange={(value) => setFormData({ ...formData, phone_number: value })}
                      label="Phone Number"
                      required
                    />
                    {profileLoading && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Label htmlFor="email"><T zh="电子邮件" en="Email" /></Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={profileLoading}
                    />
                    {profileLoading && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded mt-8">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
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
                  <div className="relative">
                    <Label htmlFor="address_line1"><T zh="地址第一行" en="Address Line 1" /> *</Label>
                    <Input
                      id="address_line1"
                      required
                      value={formData.address_line1}
                      onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                      disabled={profileLoading}
                    />
                    {profileLoading && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded mt-8">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Label htmlFor="address_line2"><T zh="地址第二行" en="Address Line 2" /></Label>
                    <Input
                      id="address_line2"
                      value={formData.address_line2}
                      onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                      disabled={profileLoading}
                    />
                    {profileLoading && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded mt-8">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <Label htmlFor="city"><T zh="城市" en="City" /> *</Label>
                      <Input
                        id="city"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        disabled={profileLoading}
                      />
                      {profileLoading && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded mt-8">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <Label htmlFor="state"><T zh="州/省" en="State" /> *</Label>
                      <Input
                        id="state"
                        required
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        disabled={profileLoading}
                      />
                      {profileLoading && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded mt-8">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <Label htmlFor="postcode"><T zh="邮政编码" en="Postcode" /> *</Label>
                      <Input
                        id="postcode"
                        required
                        value={formData.postcode}
                        onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                        disabled={profileLoading}
                      />
                      {profileLoading && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded mt-8">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      )}
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
                      <T zh="FPX（通过 Stripe）" en="FPX (via Stripe)" />
                    </Label>
                  </div>
                  {creditCardEnabled && (
                    <div className="flex items-center space-x-2 p-4 border rounded mt-2">
                      <RadioGroupItem value="stripe_card" id="stripe_card" />
                      <Label htmlFor="stripe_card" className="flex-1 cursor-pointer">
                        <T zh="信用卡（通过 Stripe）" en="Credit Card (via Stripe)" />
                      </Label>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 p-4 border rounded mt-2">
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
                  className="w-full h-11 touch-manipulation"
                  size="lg"
                  disabled={loading || priceChangeDetected}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <T zh="处理中..." en="Processing..." />
                    </>
                  ) : (
                    <T zh="下订单" en="Place Order" />
                  )}
                </Button>
              </Card>
            </div>
          </div>
        </form>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                <T zh="确认订单" en="Confirm Order" />
              </DialogTitle>
              <DialogDescription className="space-y-3 text-left pt-4">
                <p className="text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️<T zh="请确保邮寄地址是正确的，若不正确请马上透过Whatsapp联系我们" en="Please ensure the shipping address is correct. If incorrect, contact us immediately via WhatsApp" />
                </p>
                <p className="text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️<T zh="下单前请先询问好洞口/尺寸适不适合" en="Please confirm the hole size/dimensions are suitable before ordering" />
                </p>
                <p className="text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️<T zh="下单后可以透过 【查询订单】，输入电话号码后查询你的订单详情" en="After ordering, you can track your order by entering your phone number in [Track Order]" />
                </p>
                <p className="text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️<T zh="小克重/空心款金饰一律不适合每天穿戴，不能拉扯/按压/敲到" en="Light weight/hollow gold jewelry is not suitable for daily wear and cannot be pulled/pressed/knocked" />
                </p>
                <p className="text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️<T zh="金饰是由手工制成，很难100%完美，完美主义者下单前请慎重考虑" en="Gold jewelry is handmade and may not be 100% perfect. Perfectionists please consider carefully before ordering" />
                </p>
                <div className="border-t pt-3 mt-3 space-y-2 text-sm">
                  <p>-<T zh="由于金价每天波动，价格需要当日汇款，否则隔日金价波动价格将会被影响☺️" en="Due to daily gold price fluctuations, payment must be made on the same day, otherwise the price will be affected by next day's gold price ☺️" /></p>
                  <p>-<T zh="付款后，需提供付款记录 我们才能确认订单哦☺️" en="After payment, please provide payment proof so we can confirm your order ☺️" /></p>
                  <p>-<T zh="如需分开单据，需提前注明🥰🙏🏻" en="If you need separate receipts, please inform us in advance 🥰🙏🏻" /></p>
                  <p>-<T zh="如果之前有保留任何金饰要全部一起发走的话，必须通知我们‼️" en="If you have any previously reserved jewelry to send together, you must notify us ‼️" /></p>
                  <p>-<T zh="如需透明塑胶stopper，付款后需自行备注哦☺️stopper是附送的，我们会尽量给，有时候小助理太忙会漏放，没收到也不会特别邮寄" en="If you need transparent plastic stoppers, please note after payment ☺️ Stoppers are complimentary, we'll try our best to include them, but if our assistant is busy and forgets, we won't mail them separately" /></p>
                  <p>-<T zh="基于环保理念♻️，每次下单将提供一个首饰盒子&一个袋子，如需要额外盒子，付款后需备注哦 ☺️" en="Based on environmental principles ♻️, each order comes with one jewelry box & one bag. If you need extra boxes, please note after payment ☺️" /></p>
                  <p className="text-center mt-2">🙏🏻💕🙏🏻💕</p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                <T zh="取消" en="Cancel" />
              </Button>
              <Button onClick={proceedWithOrder}>
                <T zh="我确认" en="I Confirm" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
