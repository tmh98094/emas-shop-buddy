import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, MapPin } from "lucide-react";
import { T } from "@/components/T";
import { useEffect, useState } from "react";

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("id", orderId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (!order) return <div>Loading...</div>;

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

          <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-4">
              <Package className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  <T zh="如何跟踪您的订单" en="How to Track Your Order" />
                </h3>
                {user ? (
                  <p className="text-sm text-muted-foreground">
                    <T 
                      zh="您可以在您的个人资料中查看订单状态。前往我的订单查看实时更新。" 
                      en="You can check your order status in your profile. Go to My Orders to see real-time updates." 
                    />
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <T 
                      zh="作为访客，您可以使用您的手机号码在线查看订单状态。前往订单跟踪页面输入您的电话号码。" 
                      en="As a guest, you can check your order status online using your mobile number. Go to Order Tracking and enter your phone number." 
                    />
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-8 text-left space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">
                <T zh="订单详情" en="Order Details" />
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground"><T zh="订单号" en="Order Number" />:</span>
                  <span className="font-semibold">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground"><T zh="总金额" en="Total Amount" />:</span>
                  <span className="font-semibold">RM {Number(order.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground"><T zh="付款方式" en="Payment Method" />:</span>
                  <span className="font-semibold capitalize">{order.payment_method.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground"><T zh="状态" en="Status" />:</span>
                  <span className="font-semibold capitalize">{order.order_status}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-start gap-2 mb-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <h3 className="font-semibold text-lg">
                  <T zh="配送地址" en="Shipping Address" />
                </h3>
              </div>
              <div className="text-sm space-y-1 ml-7">
                <p>{order.shipping_address_line1}</p>
                {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
                <p>{order.shipping_city}, {order.shipping_state} {order.shipping_postcode}</p>
                <p>{order.shipping_country}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">
                <T zh="订购商品" en="Items Ordered" />
              </h3>
              <div className="space-y-2">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.product_name} x {item.quantity}</span>
                    <span>RM {parseFloat(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="mt-8 flex gap-4 justify-center flex-wrap">
            <Button asChild variant="outline">
              <Link to="/">
                <T zh="继续购物" en="Continue Shopping" />
              </Link>
            </Button>
            {user ? (
              <Button asChild>
                <Link to="/dashboard">
                  <T zh="查看我的订单" en="View My Orders" />
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/order-tracking">
                  <T zh="跟踪订单" en="Track Order" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
