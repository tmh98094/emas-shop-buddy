import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Calendar, ShoppingBag } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/price-utils";

export default function CustomerDetail() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", customerId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["customer-orders", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(*)
        `)
        .eq("user_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (customerLoading || ordersLoading) return <div>Loading...</div>;
  if (!customer) return <div>Customer not found</div>;

  const totalSpent = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/admin/customers")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Customers
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Customer Information</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Full Name</div>
              <div className="font-medium">{customer.full_name || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <div className="font-medium">{customer.email || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </div>
              <div className="font-medium">{customer.phone_number}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Joined
              </div>
              <div className="font-medium">{new Date(customer.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Total Orders</h3>
          </div>
          <div className="text-3xl font-bold">{orders?.length || 0}</div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-2">Total Spent</h3>
          <div className="text-3xl font-bold text-primary">RM {formatPrice(totalSpent)}</div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Order History</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.order_number}</TableCell>
                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{order.order_items?.length || 0} items</TableCell>
                <TableCell>RM {formatPrice(Number(order.total_amount))}</TableCell>
                <TableCell>
                  <Badge>{order.order_status}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
