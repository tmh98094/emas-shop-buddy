import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { formatPrice } from "@/lib/price-utils";

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

  // Set initial status when order loads - use useEffect to avoid infinite loops
  useEffect(() => {
    if (order) {
      setOrderStatus(order.order_status as OrderStatus);
      setPaymentStatus(order.payment_status as PaymentStatus);
      setPostageDeliveryId(order.postage_delivery_id || "");
    }
  }, [order]);

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
    <div className="p-2 md:p-6">
      <h1 className="text-lg md:text-2xl font-bold mb-4">Order #{order.order_number}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-3">Customer Information</h2>
          <div className="space-y-1.5 text-sm">
            <div><strong>Name:</strong> {order.full_name}</div>
            <div><strong>Phone:</strong> {order.phone_number}</div>
            <div><strong>Email:</strong> {order.email || "N/A"}</div>
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-3">Order Details</h2>
          <div className="space-y-1.5 text-sm">
            <div><strong>Order Date:</strong> {new Date(order.created_at).toLocaleDateString()}</div>
            <div><strong>Total Amount:</strong> RM {formatPrice(Number(order.total_amount))}</div>
            <div><strong>Payment Method:</strong> {order.payment_method.replace("_", " ").toUpperCase()}</div>
          </div>
        </Card>
      </div>

      <Card className="p-4 md:p-6 mt-4">
        <h2 className="text-base md:text-lg font-semibold mb-3">Order Items</h2>
        <div className="space-y-3">
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="border-b pb-3">
              <div className="flex justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{item.product_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.gold_type} • {item.weight_grams}g • Qty: {item.quantity}
                  </div>
                  {item.variant_name && (
                    <div className="text-xs">{item.variant_name}: {item.variant_value}</div>
                  )}
                  {item.color_name && (
                    <div className="text-xs">Color: {item.color_name}</div>
                  )}
                </div>
                <div className="font-semibold text-sm whitespace-nowrap">RM {formatPrice(parseFloat(item.subtotal))}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 md:p-6 mt-4">
        <h2 className="text-base md:text-lg font-semibold mb-3">Update Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs md:text-sm font-medium mb-1.5">Order Status</label>
            <Select value={orderStatus} onValueChange={(value: OrderStatus) => setOrderStatus(value)}>
              <SelectTrigger className="h-9 text-sm">
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
            <label className="block text-xs md:text-sm font-medium mb-1.5">Payment Status</label>
            <Select value={paymentStatus} onValueChange={(value: PaymentStatus) => setPaymentStatus(value)}>
              <SelectTrigger className="h-9 text-sm">
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
            <Label htmlFor="postage" className="text-xs md:text-sm">Postage Delivery ID</Label>
            <Input
              id="postage"
              value={postageDeliveryId}
              onChange={(e) => setPostageDeliveryId(e.target.value)}
              placeholder="Enter tracking number"
              className="h-9 text-sm"
            />
          </div>
        </div>
        <Button className="mt-3 w-full md:w-auto text-sm h-9" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
          Update Order
        </Button>
      </Card>

      {order.notes && (
        <Card className="p-4 md:p-6 mt-4">
          <h2 className="text-base md:text-lg font-semibold mb-3">Notes</h2>
          <p className="text-sm">{order.notes}</p>
        </Card>
      )}
    </div>
  );
}
