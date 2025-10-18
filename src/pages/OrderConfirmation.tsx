import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function OrderConfirmation() {
  const { orderId } = useParams();

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
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-primary mb-4">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for your order. We'll contact you shortly at {order.phone_number}
          </p>

          <Card className="p-8 text-left space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-4">Order Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Number:</span>
                  <span className="font-semibold">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-semibold">RM {Number(order.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-semibold capitalize">{order.payment_method.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-semibold capitalize">{order.order_status}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Items Ordered</h3>
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

          <div className="mt-8 flex gap-4 justify-center">
            <Button asChild variant="outline">
              <Link to="/">Continue Shopping</Link>
            </Button>
            <Button asChild>
              <Link to="/order-tracking">Track Order</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
