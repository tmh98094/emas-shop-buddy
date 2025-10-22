import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type OrderStatus = "pending" | "processing" | "completed" | "cancelled";
type PaymentStatus = "pending" | "completed" | "failed";

export default function OrderDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [postageDeliveryId, setPostageDeliveryId] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Set initial status when order loads
  if (order && orderStatus === "pending" && order.order_status !== orderStatus) {
    setOrderStatus(order.order_status as OrderStatus);
    setPaymentStatus(order.payment_status as PaymentStatus);
    setPostageDeliveryId(order.postage_delivery_id || "");
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("orders")
        .update({
          order_status: orderStatus,
          payment_status: paymentStatus,
          postage_delivery_id: postageDeliveryId || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Order updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Order #{order.order_number}</h1>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
          <div className="space-y-2">
            <div><strong>Name:</strong> {order.full_name}</div>
            <div><strong>Phone:</strong> {order.phone_number}</div>
            <div><strong>Email:</strong> {order.email || "N/A"}</div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Order Details</h2>
          <div className="space-y-2">
            <div><strong>Order Date:</strong> {new Date(order.created_at).toLocaleDateString()}</div>
            <div><strong>Total Amount:</strong> RM {Number(order.total_amount).toFixed(2)}</div>
            <div><strong>Payment Method:</strong> {order.payment_method.replace("_", " ").toUpperCase()}</div>
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Order Items</h2>
        <div className="space-y-4">
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="border-b pb-4">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{item.product_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.gold_type} • {item.weight_grams}g • Qty: {item.quantity}
                  </div>
                  {item.variant_name && (
                    <div className="text-sm">{item.variant_name}: {item.variant_value}</div>
                  )}
                  {item.color_name && (
                    <div className="text-sm">Color: {item.color_name}</div>
                  )}
                </div>
                <div className="font-semibold">RM {parseFloat(item.subtotal).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Update Status</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Order Status</label>
            <Select value={orderStatus} onValueChange={(value: OrderStatus) => setOrderStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Payment Status</label>
            <Select value={paymentStatus} onValueChange={(value: PaymentStatus) => setPaymentStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="postage">Postage Delivery ID</Label>
            <Input
              id="postage"
              value={postageDeliveryId}
              onChange={(e) => setPostageDeliveryId(e.target.value)}
              placeholder="Enter tracking number"
            />
          </div>
        </div>
        <Button className="mt-4" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
          Update Order
        </Button>
      </Card>

      {order.notes && (
        <Card className="p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Notes</h2>
          <p>{order.notes}</p>
        </Card>
      )}
    </div>
  );
}
