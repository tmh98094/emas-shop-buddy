import { useState } from "react";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WhatsAppFloater } from "@/components/WhatsAppFloater";
import { generatePhoneVariants, normalizePhone, formatDisplayPhone } from "@/lib/phone-utils";
import { T } from "@/components/T";
import { formatPrice } from "@/lib/price-utils";

export default function OrderTracking() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState<string>("+60");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Normalize the phone number first
      const normalizedPhone = normalizePhone(phoneNumber, countryCode);
      const variants = generatePhoneVariants(phoneNumber, countryCode);
      
      // Add extra variant to catch wrongly stored numbers with just +digits
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      const plusDigitsVariant = `+${digitsOnly}`;
      const allVariants = [...new Set([...variants, plusDigitsVariant])];
      
      const orFilter = allVariants.map((v) => `phone_number.eq.${v}`).join(",");

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*),
          touch_n_go_payments (*)
        `)
        .or(orFilter)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ title: "No orders found for this phone number" });
      }

      setOrders(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "processing": return "bg-primary";
      case "pending": return "bg-yellow-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const handlePayNow = async (orderId: string) => {
    setGeneratingPaymentLink(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-payment-link", {
        body: { orderId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Payment Page Opened",
          description: "Complete your payment in the new tab.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate payment link.",
        variant: "destructive",
      });
    } finally {
      setGeneratingPaymentLink(null);
    }
  };

  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6 md:mb-8">
            <T zh="查询订单" en="Track Your Order" />
          </h1>

          <Card className="p-4 md:p-6 mb-6 md:mb-8">
            <form onSubmit={handleSearch}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone" className="text-base">
                    <T zh="输入您的电话号码" en="Enter Your Phone Number" />
                  </Label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+60">+60</SelectItem>
                        <SelectItem value="+65">+65</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="11-1234 5678"
                      value={phoneNumber}
                      onChange={(e) => {
                        // Only allow numbers and spaces
                        const value = e.target.value.replace(/[^\d\s]/g, '');
                        setPhoneNumber(value);
                      }}
                      onBlur={(e) => {
                        // Format with spaces on blur
                        const digits = e.target.value.replace(/\D/g, '');
                        if (digits.length >= 9) {
                          const formatted = formatDisplayPhone(`${countryCode}${digits}`, countryCode as any);
                          // Remove country code from display
                          const withoutCode = formatted.replace(countryCode, '').trim();
                          setPhoneNumber(withoutCode);
                        }
                      }}
                      required
                      className="col-span-2 h-11"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 touch-manipulation" disabled={loading}>
                  {loading ? <T zh="搜索中..." en="Searching..." /> : <T zh="查询订单" en="Track Orders" />}
                </Button>
              </div>
            </form>
          </Card>

          {orders.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold mb-4">
                <T zh="您的订单" en="Your Orders" />
              </h2>
              {orders.map((order) => (
                <Card key={order.id} className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row justify-between md:items-start mb-4 gap-2">
                    <div>
                      <h3 className="font-bold text-base md:text-lg">{order.order_number}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(order.order_status)} w-fit`}>
                      {order.order_status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between gap-4 text-sm md:text-base">
                        <span className="flex-1">{item.product_name} x {item.quantity}</span>
                        <span className="font-semibold">RM {formatPrice(parseFloat(item.subtotal))}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 flex justify-between font-bold text-base md:text-lg">
                    <span><T zh="总计" en="Total" /></span>
                    <span className="text-primary">RM {formatPrice(parseFloat(order.total_amount))}</span>
                  </div>

                  <div className="mt-4 text-sm md:text-base space-y-2">
                    <p><strong><T zh="付款方式" en="Payment" />:</strong> {order.payment_method.replace("_", " ")}</p>
                    <p><strong><T zh="付款状态" en="Payment Status" />:</strong> {order.payment_status}</p>
                    {order.payment_method === 'touch_n_go' && order.touch_n_go_payments?.[0] && (
                      <p>
                        <strong><T zh="TNG 验证" en="TNG Verification" />:</strong>{" "}
                        {order.touch_n_go_payments[0].verified ? (
                          <span className="text-green-600">✓ <T zh="已验证" en="Verified" /></span>
                        ) : (
                          <span className="text-yellow-600">⏳ <T zh="等待验证" en="Pending Verification" /></span>
                        )}
                      </p>
                    )}
                    {order.postage_delivery_id && (
                      <p className="break-all"><strong><T zh="物流追踪" en="Tracking" />:</strong> {order.postage_delivery_id}</p>
                    )}
                  </div>

                  {order.payment_status === "pending" && order.payment_method !== "touch_n_go" && order.order_status !== "cancelled" && (
                    <div className="mt-4">
                      <Button
                        onClick={() => handlePayNow(order.id)}
                        disabled={generatingPaymentLink === order.id}
                        className="w-full h-11 touch-manipulation"
                      >
                        {generatingPaymentLink === order.id ? (
                          <>
                            <T zh="生成中..." en="Loading..." />
                          </>
                        ) : (
                          <T zh="立即付款" en="Pay Now" />
                        )}
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <WhatsAppFloater />
    </div>
  );
}
