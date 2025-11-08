import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Package, AlertTriangle, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/price-utils";

export default function AdminAnalytics() {
  const { data: salesData } = useQuery({
    queryKey: ["sales-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("created_at, total_amount, order_status, payment_status")
        .eq("payment_status", "completed")
        .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;

      // Group by day
      const dailySales: { [key: string]: number } = {};
      const weeklySales: { [key: string]: number } = {};
      const monthlySales: { [key: string]: number } = {};

      data.forEach(order => {
        const date = new Date(order.created_at);
        const dayKey = date.toISOString().split('T')[0];
        const weekKey = `Week ${Math.ceil(date.getDate() / 7)} ${date.toLocaleString('default', { month: 'short' })}`;
        const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });

        dailySales[dayKey] = (dailySales[dayKey] || 0) + Number(order.total_amount);
        weeklySales[weekKey] = (weeklySales[weekKey] || 0) + Number(order.total_amount);
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + Number(order.total_amount);
      });

      return {
        daily: Object.entries(dailySales).map(([date, amount]) => ({ date, amount })).slice(-30),
        weekly: Object.entries(weeklySales).map(([week, amount]) => ({ week, amount })),
        monthly: Object.entries(monthlySales).map(([month, amount]) => ({ month, amount })),
      };
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          product_name, 
          quantity, 
          subtotal,
          order:orders!inner(payment_status)
        `)
        .eq("order.payment_status", "completed")
        .order("quantity", { ascending: false });

      if (error) throw error;

      const productMap: { [key: string]: { quantity: number; revenue: number } } = {};
      data.forEach(item => {
        if (!productMap[item.product_name]) {
          productMap[item.product_name] = { quantity: 0, revenue: 0 };
        }
        productMap[item.product_name].quantity += item.quantity;
        productMap[item.product_name].revenue += Number(item.subtotal);
      });

      return Object.entries(productMap)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    },
  });

  const { data: categoryPerformance } = useQuery({
    queryKey: ["category-performance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          subtotal,
          order:orders!inner(payment_status),
          product:products(
            category:categories(name)
          )
        `)
        .eq("order.payment_status", "completed");

      if (error) throw error;

      const categoryMap: { [key: string]: number } = {};
      data.forEach(item => {
        const categoryName = item.product?.category?.name || "Uncategorized";
        categoryMap[categoryName] = (categoryMap[categoryName] || 0) + Number(item.subtotal);
      });

      return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ["low-stock-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("name, stock, low_stock_threshold")
        .order("stock", { ascending: true });

      if (error) throw error;
      return data?.filter(p => p.stock <= p.low_stock_threshold);
    },
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Track your business performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
              <div className="text-2xl font-bold">
                RM {formatPrice(salesData?.monthly.reduce((sum, m) => sum + m.amount, 0) || 0)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Best Seller</div>
              <div className="text-lg font-bold">{topProducts?.[0]?.name.slice(0, 20) || "N/A"}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-muted rounded-full">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Products Sold</div>
              <div className="text-2xl font-bold">
                {topProducts?.reduce((sum, p) => sum + p.quantity, 0) || 0}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Low Stock Alerts</div>
              <div className="text-2xl font-bold">{lowStockItems?.length || 0}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Sales Overview</h2>
        <Tabs defaultValue="daily">
          <TabsList>
            <TabsTrigger value="daily">Daily (Last 30 Days)</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData?.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" name="Revenue (RM)" />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="weekly" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData?.weekly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" name="Revenue (RM)" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="monthly" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData?.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" name="Revenue (RM)" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Top Selling Products</h2>
          <div className="space-y-3">
            {topProducts?.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">{product.quantity} units sold</div>
                  </div>
                </div>
                <div className="font-bold text-primary">RM {formatPrice(product.revenue)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Category Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryPerformance}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryPerformance?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Low Stock Alerts
        </h2>
        <div className="space-y-2">
          {lowStockItems?.map((product) => (
            <div key={product.name} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
              <div>
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-muted-foreground">
                  Threshold: {product.low_stock_threshold} units
                </div>
              </div>
              <Badge variant="destructive">{product.stock} left</Badge>
            </div>
          ))}
          {(!lowStockItems || lowStockItems.length === 0) && (
            <p className="text-muted-foreground text-center py-4">All products are well stocked!</p>
          )}
        </div>
      </Card>
    </div>
  );
}
