import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Search } from "lucide-react";
import { generateInvoicePDF } from "@/lib/invoice-generator";
import { formatPrice } from "@/lib/price-utils";

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(`
          *,
          order_items(*)
        `);
      
      if (searchQuery) {
        query = query.or(`order_number.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`);
      }
      
      query = query.order("created_at", { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleExportInvoice = async (order: any) => {
    // Calculate shipping fee from total and order items
    const itemsTotal = order.order_items?.reduce((sum: number, item: any) => 
      sum + parseFloat(item.subtotal), 0) || 0;
    const shippingFee = parseFloat(order.total_amount) - itemsTotal;
    
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
      subtotal: itemsTotal,
      shippingFee: shippingFee,
      total: parseFloat(order.total_amount),
      paymentMethod: order.payment_method.replace("_", " ").toUpperCase(),
      paymentStatus: order.payment_status,
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-4xl font-bold text-primary mb-8">Orders</h1>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, customer name, or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

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
                <TableCell>RM {formatPrice(Number(order.total_amount))}</TableCell>
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
