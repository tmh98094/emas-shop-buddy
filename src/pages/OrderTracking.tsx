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

export default function OrderTracking() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*),
          touch_n_go_payments (*)
        `)
        .eq("phone_number", phoneNumber)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data.length === 0) {
        toast({ title: "No orders found for this phone number" });
      }

      setOrders(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "processing": return "bg-blue-500";
      case "pending": return "bg-yellow-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-primary mb-8">Track Your Order</h1>

          <Card className="p-6 mb-8">
            <form onSubmit={handleSearch}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Enter Your Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+60123456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Searching..." : "Track Orders"}
                </Button>
              </div>
            </form>
          </Card>

          {orders.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">Your Orders</h2>
              {orders.map((order) => (
                <Card key={order.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{order.order_number}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.order_status)}>
                      {order.order_status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.product_name} x {item.quantity}</span>
                        <span>RM {parseFloat(item.subtotal).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">RM {parseFloat(order.total_amount).toFixed(2)}</span>
                  </div>

                  <div className="mt-4 text-sm space-y-1">
                    <p><strong>Payment:</strong> {order.payment_method.replace("_", " ")}</p>
                    <p><strong>Payment Status:</strong> {order.payment_status}</p>
                    {order.payment_method === 'touch_n_go' && order.touch_n_go_payments?.[0] && (
                      <p>
                        <strong>TNG Verification:</strong>{" "}
                        {order.touch_n_go_payments[0].verified ? (
                          <span className="text-green-600">✓ Verified</span>
                        ) : (
                          <span className="text-yellow-600">⏳ Pending Verification</span>
                        )}
                      </p>
                    )}
                    {order.postage_delivery_id && (
                      <p><strong>Tracking:</strong> {order.postage_delivery_id}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
