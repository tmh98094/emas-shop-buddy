import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/price-utils";

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ["customers", searchQuery],
    queryFn: async () => {
      // Get all registered users from profiles
      let profileQuery = supabase
        .from("profiles")
        .select("*");

      if (searchQuery) {
        profileQuery = profileQuery.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`);
      }

      const { data: profiles, error: profileError } = await profileQuery.order("created_at", { ascending: false });
      if (profileError) throw profileError;

      // Fetch orders for registered users (only completed payments)
      const registeredCustomers = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: orders } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("user_id", profile.id)
            .eq("payment_status", "completed");

          return {
            id: profile.id,
            full_name: profile.full_name || "",
            email: profile.email || "",
            phone_number: profile.phone_number || "",
            created_at: profile.created_at,
            total_orders: orders?.length || 0,
            total_spent: orders?.reduce((sum, order) => 
              sum + parseFloat(order.total_amount.toString()), 0) || 0,
            is_guest: false,
          };
        })
      );

      // Get guest orders (orders without user_id)
      let guestOrdersQuery = supabase
        .from("orders")
        .select("*")
        .is("user_id", null);

      if (searchQuery) {
        guestOrdersQuery = guestOrdersQuery.or(`full_name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`);
      }

      const { data: guestOrders } = await guestOrdersQuery;

      // Group guest orders by phone number (only completed payments)
      const guestCustomersMap = new Map();
      guestOrders?.filter(order => order.payment_status === "completed").forEach(order => {
        const phone = order.phone_number;
        if (!guestCustomersMap.has(phone)) {
          guestCustomersMap.set(phone, {
            id: `guest-${phone}`,
            full_name: order.full_name || "",
            email: order.email || "",
            phone_number: phone,
            created_at: order.created_at,
            total_orders: 0,
            total_spent: 0,
            is_guest: true,
          });
        }
        const customer = guestCustomersMap.get(phone);
        customer.total_orders += 1;
        customer.total_spent += parseFloat(order.total_amount.toString());
      });

      const guestCustomers = Array.from(guestCustomersMap.values());

      // Combine and sort by total spent
      return [...registeredCustomers, ...guestCustomers].sort((a, b) => b.total_spent - a.total_spent);
    },
  });

  const handleExportCSV = () => {
    if (!customers.length) {
      toast({
        title: "No data to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Full Name", "Email", "Phone", "Total Orders", "Total Spent", "Joined Date"];
    const csvContent = [
      headers.join(","),
      ...customers.map(customer => [
        `"${customer.full_name || ''}"`,
        `"${customer.email || ''}"`,
        `"${customer.phone_number || ''}"`,
        customer.total_orders,
        formatPrice(customer.total_spent),
        new Date(customer.created_at).toLocaleDateString(),
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Export successful",
      description: `Exported ${customers.length} customers`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">客户管理</h1>
        <Button onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          导出 CSV
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="按姓名、邮箱或手机号搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div>加载中...</div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead className="text-right">总订单数</TableHead>
                <TableHead className="text-right">总消费</TableHead>
                <TableHead>加入时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    {customer.full_name || "-"}
                    {customer.is_guest && (
                      <Badge variant="outline" className="ml-2 text-xs">访客</Badge>
                    )}
                  </TableCell>
                  <TableCell>{customer.email || "-"}</TableCell>
                  <TableCell>{customer.phone_number}</TableCell>
                  <TableCell className="text-right">{customer.total_orders}</TableCell>
                  <TableCell className="text-right">RM {formatPrice(customer.total_spent)}</TableCell>
                  <TableCell>{new Date(customer.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
