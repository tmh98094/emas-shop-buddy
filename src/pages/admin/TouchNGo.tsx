import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/price-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TouchNGo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-touch-n-go"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("touch_n_go_payments")
        .select(`
          *,
          order:orders(*)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const verifyPayment = useMutation({
    mutationFn: async ({ paymentId, orderId }: { paymentId: string; orderId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update payment verification
      const { error: paymentError } = await supabase
        .from("touch_n_go_payments")
        .update({ 
          verified: true, 
          verified_at: new Date().toISOString(),
          verified_by: user?.id 
        })
        .eq("id", paymentId);
      if (paymentError) throw paymentError;

      // Update order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          payment_status: "completed",
          order_status: "processing"
        })
        .eq("id", orderId);
      if (orderError) throw orderError;
    },
    onMutate: async ({ paymentId }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-touch-n-go"] });
      const previous = queryClient.getQueryData<any[]>(["admin-touch-n-go"]);
      queryClient.setQueryData<any[]>(["admin-touch-n-go"], (old) =>
        (old || []).map((p) => p.id === paymentId ? { ...p, verified: true, verified_at: new Date().toISOString() } : p)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["admin-touch-n-go"], context.previous);
      toast({ title: "Failed to verify payment", variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-touch-n-go"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Payment verified successfully" });
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-4xl font-bold text-primary mb-8">Touch 'n Go Payments</h1>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments?.map((payment) => {
              const order = payment.order as any;
              return (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{order?.order_number}</TableCell>
                  <TableCell>{order?.full_name}</TableCell>
                  <TableCell>RM {formatPrice(parseFloat(order?.total_amount))}</TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="text-primary px-0"
                      onClick={async () => {
                        try {
                          const url = payment.receipt_image_url as string;
                          const marker = "/payment-receipts/";
                          let path = url;
                          const idx = url.indexOf(marker);
                          if (idx !== -1) path = url.slice(idx + marker.length);
                          const { data, error } = await supabase.storage
                            .from("payment-receipts")
                            .createSignedUrl(path, 60);
                          if (error) throw error;
                          window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                        } catch (err: any) {
                          toast({ title: "Failed to open receipt", description: err.message, variant: "destructive" });
                        }
                      }}
                    >
                      View Receipt
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.verified ? "default" : "secondary"}>
                      {payment.verified ? "Verified" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(payment.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => verifyPayment.mutate({ 
                        paymentId: payment.id, 
                        orderId: payment.order_id 
                      })}
                      disabled={payment.verified || verifyPayment.isPending}
                      variant={payment.verified ? "secondary" : "default"}
                    >
                      {payment.verified ? "Verified" : (verifyPayment.isPending ? "Verifying..." : "Verify")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
