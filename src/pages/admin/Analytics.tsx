import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Users, Bot, Eye, TrendingUp, Calendar, DollarSign, Package, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { formatPrice } from "@/lib/price-utils";
import { Badge } from "@/components/ui/badge";

const AdminAnalytics = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 14),
    to: new Date(),
  });

  // Check authorization
  useQuery({
    queryKey: ["admin-auth-check"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", user.id)
        .single();

      const authorized = profile?.phone_number === "+6580565123";
      setIsAuthorized(authorized);
      return authorized;
    },
  });

  // Fetch sales data
  const { data: salesData } = useQuery({
    queryKey: ["sales-analytics"],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_status", "completed")
        .neq("phone_number", "+6580565123");

      if (!orders) return null;

      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);
      const sevenDaysAgo = subDays(today, 7);

      const dailySales = orders
        .filter(order => new Date(order.created_at) >= sevenDaysAgo)
        .reduce((acc: any[], order) => {
          const date = format(new Date(order.created_at), 'MMM dd');
          const existing = acc.find(item => item.date === date);
          if (existing) {
            existing.revenue += Number(order.total_amount);
          } else {
            acc.push({ date, revenue: Number(order.total_amount) });
          }
          return acc;
        }, []);

      const weeklySales = orders
        .filter(order => new Date(order.created_at) >= thirtyDaysAgo)
        .reduce((acc: any[], order) => {
          const weekStart = format(startOfDay(new Date(order.created_at)), 'MMM dd');
          const existing = acc.find(item => item.week === weekStart);
          if (existing) {
            existing.revenue += Number(order.total_amount);
          } else {
            acc.push({ week: weekStart, revenue: Number(order.total_amount) });
          }
          return acc;
        }, []);

      const monthlySales = orders.reduce((acc: any[], order) => {
        const month = format(new Date(order.created_at), 'MMM yyyy');
        const existing = acc.find(item => item.month === month);
        if (existing) {
          existing.revenue += Number(order.total_amount);
        } else {
          acc.push({ month, revenue: Number(order.total_amount) });
        }
        return acc;
      }, []);

      return { dailySales, weeklySales, monthlySales };
    },
  });

  // Fetch top products
  const { data: topProducts } = useQuery({
    queryKey: ["top-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select(`
          product_name,
          quantity,
          subtotal,
          order_id,
          orders!inner(payment_status, phone_number)
        `)
        .eq("orders.payment_status", "completed")
        .neq("orders.phone_number", "+6580565123");

      if (!data) return [];

      const productMap = data.reduce((acc: any, item) => {
        if (!acc[item.product_name]) {
          acc[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
        }
        acc[item.product_name].quantity += item.quantity;
        acc[item.product_name].revenue += Number(item.subtotal);
        return acc;
      }, {});

      return Object.values(productMap)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10);
    },
  });

  // Fetch category performance
  const { data: categoryPerformance } = useQuery({
    queryKey: ["category-performance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select(`
          subtotal,
          products!inner(category_id, categories!inner(name)),
          orders!inner(payment_status, phone_number)
        `)
        .eq("orders.payment_status", "completed")
        .neq("orders.phone_number", "+6580565123");

      if (!data) return [];

      const categoryMap = data.reduce((acc: any, item: any) => {
        const categoryName = item.products?.categories?.name || 'Unknown';
        if (!acc[categoryName]) {
          acc[categoryName] = { name: categoryName, value: 0 };
        }
        acc[categoryName].value += Number(item.subtotal);
        return acc;
      }, {});

      return Object.values(categoryMap);
    },
  });

  // Fetch low stock items
  const { data: lowStockItems } = useQuery({
    queryKey: ["low-stock-items"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("name, stock, low_stock_threshold")
        .order("stock", { ascending: true });

      return data?.filter(p => p.stock <= (p.low_stock_threshold || 10)) || [];
    },
  });

  // Fetch visitor analytics
  const { data: visitorData } = useQuery({
    queryKey: ["visitor-analytics", dateRange],
    enabled: isAuthorized,
    queryFn: async () => {
      if (!dateRange?.from) return null;

      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = dateRange.to ? endOfDay(dateRange.to).toISOString() : endOfDay(new Date()).toISOString();

      const { data: sessions, error } = await supabase
        .from("visitor_analytics")
        .select("*")
        .gte("first_visit", startDate)
        .lte("first_visit", endDate)
        .order("first_visit", { ascending: true });

      if (error) {
        console.error('[Analytics] Error fetching visitor data:', error);
        return null;
      }

      console.log('[Analytics] Fetched sessions:', sessions?.length || 0);

      const realSessions = sessions?.filter(s => !s.is_bot) || [];
      const botSessions = sessions?.filter(s => s.is_bot) || [];

      // Traffic sources
      const trafficSources = realSessions.reduce((acc: any, session) => {
        let source = 'Direct';
        if (session.utm_source) {
          source = session.utm_source;
        } else if (session.referrer) {
          if (session.referrer.includes('facebook')) source = 'Facebook';
          else if (session.referrer.includes('instagram')) source = 'Instagram';
          else if (session.referrer.includes('google')) source = 'Google';
          else if (session.referrer.includes('twitter')) source = 'Twitter';
          else source = 'Referral';
        }

        if (!acc[source]) {
          acc[source] = { source, sessions: 0, pageViews: 0 };
        }
        acc[source].sessions += 1;
        acc[source].pageViews += session.page_views || 0;
        return acc;
      }, {});

      // Device breakdown
      const deviceBreakdown = realSessions.reduce((acc: any, session) => {
        const device = session.device_type || 'Unknown';
        if (!acc[device]) {
          acc[device] = { name: device, value: 0 };
        }
        acc[device].value += 1;
        return acc;
      }, {});

      // Browser breakdown
      const browserBreakdown = realSessions.reduce((acc: any, session) => {
        const browser = session.browser || 'Unknown';
        if (!acc[browser]) {
          acc[browser] = { name: browser, value: 0 };
        }
        acc[browser].value += 1;
        return acc;
      }, {});

      // Daily trends
      const dailyTrends = realSessions.reduce((acc: any[], session) => {
        const date = format(new Date(session.first_visit), 'MMM dd');
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.visitors += 1;
          existing.pageViews += session.page_views || 0;
        } else {
          acc.push({ 
            date, 
            visitors: 1, 
            pageViews: session.page_views || 0 
          });
        }
        return acc;
      }, []);

      // Page performance
      const pagePerformance = realSessions.reduce((acc: any, session) => {
        const pages = Array.isArray(session.pages_visited) ? session.pages_visited : [];
        pages.forEach((page: string) => {
          if (!acc[page]) {
            acc[page] = { page, views: 0, sessions: new Set() };
          }
          acc[page].views += 1;
          acc[page].sessions.add(session.session_id);
        });
        return acc;
      }, {});

      const pagePerformanceArray = Object.values(pagePerformance).map((p: any) => ({
        page: p.page,
        views: p.views,
        sessions: p.sessions.size,
      }));

      // Calculate conversion rate
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("payment_status", "completed")
        .neq("phone_number", "+6580565123")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      const conversionRate = realSessions.length > 0 
        ? ((orders?.length || 0) / realSessions.length) * 100 
        : 0;

      return {
        totalSessions: sessions?.length || 0,
        realVisitors: realSessions.length,
        botTraffic: botSessions.length,
        totalPageViews: realSessions.reduce((sum, s) => sum + (s.page_views || 0), 0),
        conversionRate,
        trafficSources: Object.values(trafficSources),
        deviceBreakdown: Object.values(deviceBreakdown),
        browserBreakdown: Object.values(browserBreakdown),
        dailyTrends,
        pagePerformance: pagePerformanceArray.sort((a: any, b: any) => b.views - a.views).slice(0, 10),
      };
    },
  });

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (!isAuthorized) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this analytics dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[300px] justify-start text-left font-normal">
              <Calendar className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 space-y-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
              >
                Last 7 days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setDateRange({ from: subDays(new Date(), 14), to: new Date() })}
              >
                Last 14 days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
              >
                Last 30 days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
              >
                Last 90 days
              </Button>
            </div>
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Visitor Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitorData?.realVisitors || 0}</div>
            <p className="text-xs text-muted-foreground">
              Human visitors tracked
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bot Traffic</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitorData?.botTraffic || 0}</div>
            <p className="text-xs text-muted-foreground">
              Filtered out from analytics
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitorData?.totalPageViews || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total pages viewed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {visitorData?.conversionRate?.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Visitors to purchases
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Visitor Trends</CardTitle>
          <CardDescription>Daily visitors and page views</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitorData?.dailyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="visitors" stroke="hsl(var(--chart-1))" name="Visitors" />
                <Line type="monotone" dataKey="pageViews" stroke="hsl(var(--chart-2))" name="Page Views" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Traffic Sources & Device Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Where your visitors come from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visitorData?.trafficSources && visitorData.trafficSources.length > 0 ? (
                <div className="space-y-2">
                  {(visitorData.trafficSources as any[]).map((source: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{source.source}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{source.sessions} sessions</span>
                        <span className="text-sm text-muted-foreground">({source.pageViews} views)</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No traffic data available yet. Tracking is active - data will appear as visitors arrive.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>Visitor device types</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visitorData?.deviceBreakdown || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="hsl(var(--chart-1))"
                    dataKey="value"
                  >
                    {(visitorData?.deviceBreakdown || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Page Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
          <CardDescription>Most visited pages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {visitorData?.pagePerformance && visitorData.pagePerformance.length > 0 ? (
              (visitorData.pagePerformance as any[]).map((page: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm font-medium">{page.page}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{page.views} views</span>
                    <span className="text-sm text-muted-foreground">{page.sessions} sessions</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No page data available yet. Tracking is active - data will appear as visitors browse.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Original Revenue Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RM {formatPrice(salesData?.dailySales.reduce((sum: number, day: any) => sum + day.revenue, 0) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Seller</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{(topProducts as any)?.[0]?.name?.slice(0, 20) || "N/A"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(topProducts as any[])?.reduce((sum: number, p: any) => sum + p.quantity, 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>Revenue trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily">
            <TabsList>
              <TabsTrigger value="daily">Daily (7 days)</TabsTrigger>
              <TabsTrigger value="weekly">Weekly (30 days)</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="space-y-4">
              <ChartContainer config={{}} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData?.dailySales || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" name="Revenue (RM)" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="weekly" className="space-y-4">
              <ChartContainer config={{}} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData?.weeklySales || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Revenue (RM)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="monthly" className="space-y-4">
              <ChartContainer config={{}} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData?.monthlySales || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Revenue (RM)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Top Products & Category Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performers by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(topProducts as any[])?.map((product: any, index: number) => (
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Revenue by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPerformance || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="hsl(var(--chart-3))"
                    dataKey="value"
                  >
                    {(categoryPerformance || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems && lowStockItems.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{lowStockItems.length} products</strong> are running low on stock
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AdminAnalytics;
