import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { DollarSign, Package, ShoppingCart, Users } from "lucide-react";
import { formatPrice } from "@/lib/price-utils";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [paidOrdersRes, productsRes, pendingOrdersRes] = await Promise.all([
        supabase.from("orders").select("total_amount", { count: "exact" }).eq("payment_status", "completed"),
        supabase.from("products").select("*", { count: "exact" }),
        supabase.from("orders").select("*", { count: "exact" }).eq("order_status", "pending"),
      ]);

      const totalRevenue = paidOrdersRes.data?.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      ) || 0;

      return {
        totalRevenue,
        totalOrders: paidOrdersRes.count || 0,
        totalProducts: productsRes.count || 0,
        pendingOrders: pendingOrdersRes.count || 0,
      };
    },
  });

  const statCards = [
    {
      title: "Total Revenue",
      value: `RM ${formatPrice(stats?.totalRevenue || 0)}`,
      icon: DollarSign,
      color: "text-green-500",
    },
    {
      title: "Paid Orders",
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: "text-primary",
    },
    {
      title: "Total Products",
      value: stats?.totalProducts || 0,
      icon: Package,
      color: "text-purple-500",
    },
    {
      title: "Pending Orders",
      value: stats?.pendingOrders || 0,
      icon: Users,
      color: "text-orange-500",
    },
  ];

  return (
    <div>
      <h1 className="text-4xl font-bold text-primary mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
