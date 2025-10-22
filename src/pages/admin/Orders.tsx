import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText } from "lucide-react";
import { generateInvoicePDF } from "@/lib/invoice-generator";

export default function Orders() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(*)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleExportInvoice = async (order: any) => {
    await generateInvoicePDF({
      orderNumber: order.order_number,
      orderDate: order.created_at,
      customerName: order.full_name,
      customerPhone: order.phone_number,
      customerEmail: order.email,
      shippingAddress: {
        line1: order.shipping_address_line1 || "",
        line2: order.shipping_address_line2,
        city: order.shipping_city || "",
        state: order.shipping_state || "",
        postcode: order.shipping_postcode || "",
        country: order.shipping_country || "Malaysia",
      },
      items: order.order_items?.map((item: any) => ({
        name: item.product_name,
        quantity: item.quantity,
        goldType: item.gold_type,
        weight: parseFloat(item.weight_grams),
        goldPrice: parseFloat(item.gold_price_at_purchase),
        labourFee: parseFloat(item.labour_fee),
        subtotal: parseFloat(item.subtotal),
      })) || [],
      subtotal: parseFloat(order.total_amount),
      shippingFee: 0,
      total: parseFloat(order.total_amount),
      paymentMethod: order.payment_method.replace("_", " ").toUpperCase(),
      paymentStatus: order.payment_status,
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-4xl font-bold text-primary mb-8">Orders</h1>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.order_number}</TableCell>
                <TableCell>{order.full_name}</TableCell>
                <TableCell>{order.phone_number}</TableCell>
                <TableCell>RM {Number(order.total_amount).toFixed(2)}</TableCell>
                <TableCell className="capitalize">
                  {order.payment_method.replace("_", " ")}
                </TableCell>
                <TableCell>
                  <Badge>{order.order_status}</Badge>
                </TableCell>
                <TableCell>
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/orders/${order.id}`}>View</Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleExportInvoice(order)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
