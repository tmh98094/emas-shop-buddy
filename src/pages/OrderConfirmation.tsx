import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, MapPin, Clock } from "lucide-react";
import { T } from "@/components/T";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/price-utils";

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const [user, setUser] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
    refetchInterval: (query) => {
      return query.state.data?.payment_status === "pending" ? 3000 : false;
    },
  });

  // Verify payment status when page loads
  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId) return;
      
      setVerifying(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "verify-stripe-payment",
          { body: { orderId } }
        );

        if (error) {
          console.error("Verification error:", error);
        } else if (data?.status === "completed") {
          toast({
            title: "Payment Confirmed",
            description: "Your payment has been successfully verified.",
          });
          // Refetch order to update UI
          queryClient.invalidateQueries({ queryKey: ["order", orderId] });
        }
      } catch (error) {
        console.error("Failed to verify payment:", error);
      } finally {
        setVerifying(false);
      }
    };

    // Verify immediately when page loads
    const timer = setTimeout(verifyPayment, 1000);
    return () => clearTimeout(timer);
  }, [orderId, toast, queryClient]);

  // Manual refresh button for payment status
  const handleRefreshStatus = async () => {
    setVerifying(true);
    try {
      const { data } = await supabase.functions.invoke(
        "verify-stripe-payment",
        { body: { orderId } }
      );

      if (data?.status === "completed") {
        toast({
          title: "Payment Confirmed!",
          description: "Your payment has been successfully verified.",
        });
      } else {
        toast({
          title: "Payment Pending",
          description: "Payment verification is still in progress. Please wait a moment.",
        });
      }
      
      await refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify payment status.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Unable to load order details</p>
          <Button asChild>
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-primary mb-4">
              <T zh="订单确认！" en="Order Confirmed!" />
            </h1>
            <p className="text-muted-foreground mb-2">
              <T zh="感谢您的订购。我们将很快通过以下方式联系您：" en="Thank you for your order. We'll contact you shortly at:" />
            </p>
            <p className="font-semibold">{order.phone_number}</p>
          </div>

          {order.payment_method === "touch_n_go" && (
            <Card className="p-6 mb-6 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-4">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-amber-900 dark:text-amber-100">
                    <T zh="Touch'n'Go 付款处理时间" en="Touch'n'Go Payment Processing Time" />
                  </h3>
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <T 
                      zh="由于Touch'N'Go付款需要小助理手动确认，付款状态会在1-2小时能进行更新，若需加急请透过Whatsapp进行催单" 
                      en="Touch'n'Go payments require manual verification. Payment status will be updated within 1-2 hours. For urgent matters, please contact us via WhatsApp" 
                    />
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6 mb-6 bg-muted border-border">
            <div className="flex items-start gap-4">
              <Package className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  <T zh="如何跟踪您的订单" en="How to Track Your Order" />
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  {user ? (
                    <p>
                      <T 
                        zh="您可以在您的个人资料中查看订单状态。前往我的订单查看实时更新。" 
                        en="You can check your order status in your profile. Go to My Orders to see real-time updates." 
                      />
                    </p>
                  ) : (
                    <p>
                      <T 
                        zh="作为访客，您可以使用您的手机号码在线查看订单状态。前往[查询订单]页面输入您的电话号码。" 
                        en="As a guest, you can check your order status online using your mobile number. Go to Order Tracking and enter your phone number." 
                      />
                    </p>
                  )}
                  <p className="font-semibold text-primary">
                    <T 
                      zh="团队在包装完您的金饰后，会透过Whatsapp联系您，并附上运输的Tracking ID" 
                      en="Our team will contact you via WhatsApp after packaging your jewelry and provide the shipping Tracking ID" 
                    />
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 md:p-8 text-left space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-4">
                <T zh="订单详情" en="Order Details" />
              </h2>
              <div className="space-y-3 text-sm md:text-base">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground"><T zh="订单号" en="Order Number" />:</span>
                  <span className="font-semibold text-right">{order.order_number}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground"><T zh="总金额" en="Total Amount" />:</span>
                  <span className="font-semibold">RM {formatPrice(Number(order.total_amount))}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground"><T zh="付款方式" en="Payment Method" />:</span>
                  <span className="font-semibold capitalize text-right">{order.payment_method.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between gap-4 items-center">
                  <span className="text-muted-foreground"><T zh="付款状态" en="Payment Status" />:</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold capitalize ${
                      order.payment_status === "completed" ? "text-green-600" : "text-orange-600"
                    }`}>
                      {order.payment_status}
                    </span>
                    {order.payment_status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRefreshStatus}
                        disabled={verifying}
                        className="h-7 text-xs"
                      >
                        {verifying ? (
                          <>
                            <Clock className="h-3 w-3 mr-1 animate-spin" />
                            <T zh="检查中..." en="Checking..." />
                          </>
                        ) : (
                          <T zh="刷新状态" en="Refresh Status" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground"><T zh="订单状态" en="Order Status" />:</span>
                  <span className="font-semibold capitalize">{order.order_status}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-start gap-2 mb-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <h3 className="font-semibold text-base md:text-lg">
                  <T zh="配送地址" en="Shipping Address" />
                </h3>
              </div>
              <div className="text-sm md:text-base space-y-1 ml-0 md:ml-7">
                <p>{order.shipping_address_line1}</p>
                {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
                <p>{order.shipping_city}, {order.shipping_state} {order.shipping_postcode}</p>
                <p>{order.shipping_country}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 text-base md:text-lg">
                <T zh="订购商品" en="Items Ordered" />
              </h3>
              <div className="space-y-3">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between gap-4 text-sm md:text-base">
                    <span className="flex-1">{item.product_name} x {item.quantity}</span>
                    <span className="font-semibold">RM {formatPrice(parseFloat(item.subtotal))}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="mt-8 flex gap-3 justify-center flex-col md:flex-row">
            <Button asChild variant="outline" className="h-11 md:h-10 touch-manipulation">
              <Link to="/">
                <T zh="继续购物" en="Continue Shopping" />
              </Link>
            </Button>
            {user ? (
              <Button asChild className="h-11 md:h-10 touch-manipulation">
                <Link to="/dashboard">
                  <T zh="查看我的订单" en="View My Orders" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="h-11 md:h-10 touch-manipulation">
                <Link to="/order-tracking">
                  <T zh="跟踪订单" en="Track Order" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
