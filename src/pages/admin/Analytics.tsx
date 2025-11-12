import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Package, AlertTriangle, DollarSign, Users, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/price-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";

export default function AdminAnalytics() {
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Check if current admin is authorized (+6580565123)
  useQuery({
    queryKey: ['admin-authorization'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', user.id)
        .single();

      const authorized = profile?.phone_number === '+6580565123';
      setIsAuthorized(authorized);
      return authorized;
    },
  });

  const { data: salesData } = useQuery({
    queryKey: ["sales-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("created_at, total_amount, order_status, payment_status, phone_number")
        .eq("payment_status", "completed")
        .neq("phone_number", "+6580565123")
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
          order:orders!inner(payment_status, phone_number)
        `)
        .eq("order.payment_status", "completed")
        .neq("order.phone_number", "+6580565123")
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
          order:orders!inner(payment_status, phone_number),
          product:products(
            category:categories(name)
          )
        `)
        .eq("order.payment_status", "completed")
        .neq("order.phone_number", "+6580565123");

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

  // Fetch visitor analytics data (bot-filtered)
  const { data: visitorData, isLoading: loadingVisitors } = useQuery({
    queryKey: ['visitor-analytics', isAuthorized],
    enabled: isAuthorized,
    queryFn: async () => {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data, error } = await supabase
        .from('visitor_analytics')
        .select('*')
        .gte('first_visit', fourteenDaysAgo.toISOString())
        .order('first_visit', { ascending: true });

      if (error) throw error;

      const totalSessions = data.length;
      const realVisitors = data.filter(v => !v.is_bot).length;
      const botTraffic = data.filter(v => v.is_bot).length;
      const totalPageViews = data.reduce((sum, v) => sum + (v.page_views || 0), 0);

      // Traffic sources
      const sources = data.reduce((acc, v) => {
        const source = v.utm_source || v.referrer || 'Direct';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Device breakdown
      const devices = data.reduce((acc, v) => {
        acc[v.device_type || 'unknown'] = (acc[v.device_type || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalSessions,
        realVisitors,
        botTraffic,
        totalPageViews,
        sources: Object.entries(sources).map(([name, value]) => ({ name, value })),
        devices: Object.entries(devices).map(([name, value]) => ({ name, value })),
        avgSessionDuration: data.reduce((sum, v) => sum + (v.session_duration || 0), 0) / realVisitors,
      };
    },
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Show unauthorized message if not authorized
  if (!isAuthorized) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">Track your store's performance</p>
        </div>
        
        <Alert>
          <AlertDescription>
            This analytics dashboard is currently in testing phase and only available to the primary administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard (Beta)</h1>
        <p className="text-muted-foreground">Bot-filtered visitor analytics for accurate insights</p>
      </div>

      {/* Visitor Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Real Visitors (14d)</div>
              <div className="text-2xl font-bold">
                {loadingVisitors ? "..." : visitorData?.realVisitors.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Bot-filtered sessions</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <Bot className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Bot Traffic</div>
              <div className="text-2xl font-bold">
                {loadingVisitors ? "..." : visitorData?.botTraffic.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Filtered crawlers</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Page Views</div>
              <div className="text-2xl font-bold">
                {loadingVisitors ? "..." : visitorData?.totalPageViews.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total pages</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Conversion Rate</div>
              <div className="text-2xl font-bold">
                {loadingVisitors || !topProducts
                  ? "..."
                  : `${((topProducts.reduce((sum, p) => sum + p.quantity, 0) / (visitorData?.realVisitors || 1)) * 100).toFixed(2)}%`}
              </div>
              <p className="text-xs text-muted-foreground">Orders / Visitors</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Original Revenue Cards */}
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
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {categoryPerformance?.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Traffic Sources & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Traffic Sources</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={visitorData?.sources || []}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {(visitorData?.sources || []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Device Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={visitorData?.devices || []}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {(visitorData?.devices || []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Low Stock Items</h2>
        <div className="space-y-3">
          {lowStockItems && lowStockItems.length > 0 ? (
            lowStockItems.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Stock: {item.stock} (Threshold: {item.low_stock_threshold})
                  </div>
                </div>
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">All items well stocked</p>
          )}
        </div>
      </Card>
    </div>
  );
}
