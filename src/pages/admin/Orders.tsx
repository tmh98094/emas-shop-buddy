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
import { FileText, Search, RefreshCw } from "lucide-react";
import { generateInvoicePDF } from "@/lib/invoice-generator";
import { formatPrice } from "@/lib/price-utils";
import { useToast } from "@/hooks/use-toast";

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);
  const { data: orders, isLoading, refetch } = useQuery({
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

  const handleSyncStripePayments = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-stripe-payments");
      
      if (error) throw error;
      
      const { results } = data;
      const summary = `✓ ${results.updated} 已更新, ✗ ${results.failed} 失败, ⊘ ${results.skipped} 跳过 (共 ${results.total} 个订单)`;
      
      toast({
        title: "同步完成",
        description: summary,
        variant: results.updated > 0 ? "default" : results.failed > 0 ? "destructive" : "default",
      });
      
      // Refetch orders to show updated status
      await refetch();
    } catch (error: any) {
      toast({
        title: "同步失败",
        description: error.message || "无法同步 Stripe 支付状态",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

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
      customerIC: order.ic_number || "N/A",
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
        weight_grams: parseFloat(item.weight_grams),
        goldPrice: parseFloat(item.gold_price_at_purchase),
        labourFee: parseFloat(item.labour_fee),
        subtotal: parseFloat(item.subtotal),
        variant_selection: item.variant_selection,
      })) || [],
      subtotal: itemsTotal,
      shippingFee: shippingFee,
      total: parseFloat(order.total_amount),
      paymentMethod: order.payment_method.replace("_", " ").toUpperCase(),
      paymentStatus: order.payment_status,
      notes: order.notes,
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-4xl font-bold text-primary">订单管理</h1>
        <Button
          onClick={handleSyncStripePayments}
          disabled={syncing}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {syncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              同步中...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              同步 Stripe 支付状态
            </>
          )}
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="按订单号、客户姓名或手机号搜索..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 md:pl-9 text-sm h-9"
          />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">订单号</TableHead>
              <TableHead className="text-xs">客户</TableHead>
              <TableHead className="hidden md:table-cell text-xs">手机号</TableHead>
              <TableHead className="text-xs">总计</TableHead>
              <TableHead className="hidden sm:table-cell text-xs">付款方式</TableHead>
              <TableHead className="text-xs">付款状态</TableHead>
              <TableHead className="hidden lg:table-cell text-xs">订单状态</TableHead>
              <TableHead className="hidden md:table-cell text-xs">日期</TableHead>
              <TableHead className="text-xs">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order) => {
              const getPaymentStatusBadge = (status: string) => {
                const variants: Record<string, "default" | "secondary" | "destructive"> = {
                  pending: "secondary",
                  completed: "default",
                  failed: "destructive"
                };
                const colors: Record<string, string> = {
                  pending: "bg-amber-100 text-amber-800 border-amber-300",
                  completed: "bg-green-100 text-green-800 border-green-300",
                  failed: "bg-red-100 text-red-800 border-red-300"
                };
                return <Badge className={colors[status] || ""}>{status}</Badge>;
              };
              
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-xs">{order.order_number}</TableCell>
                  <TableCell className="text-xs">{order.full_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{order.phone_number}</TableCell>
                  <TableCell className="text-xs">RM {formatPrice(Number(order.total_amount))}</TableCell>
                  <TableCell className="hidden sm:table-cell capitalize text-xs">
                    {order.payment_method.replace("_", " ")}
                  </TableCell>
                  <TableCell>
                    {getPaymentStatusBadge(order.payment_status)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge className="text-xs">{order.order_status}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" asChild className="text-xs h-8 px-2">
                        <Link to={`/admin/orders/${order.id}`}>查看</Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleExportInvoice(order)}
                        title="导出发票"
                        className="h-8 w-8 p-0"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
}
