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
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const AdminAnalytics = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 14),
    to: new Date(),
  });

  // Check authorization
  const { isLoading: isCheckingAuth, error: authError } = useQuery({
    queryKey: ["admin-auth-check"],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('[Analytics] User error:', userError);
        return false;
      }

      console.log('[Analytics] Checking admin role for user:', user.id);

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error) {
        console.error('[Analytics] RPC error:', error);
        // Fallback: Check user_roles table directly
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleError) {
          console.error('[Analytics] Role check error:', roleError);
        }

        const authorized = !roleError && !!roleData;
        console.log('[Analytics] Fallback authorization:', authorized);
        setIsAuthorized(authorized);
        return authorized;
      }

      const authorized = data === true;
      console.log('[Analytics] Authorization result:', authorized);
      setIsAuthorized(authorized);
      return authorized;
    },
    retry: false,
  });

  // Fetch sales data
  const { data: salesData, isLoading: isLoadingSales } = useQuery({
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
  const { data: topProducts, isLoading: isLoadingProducts } = useQuery({
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
  const { data: categoryPerformance, isLoading: isLoadingCategories } = useQuery({
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
  const { data: lowStockItems, isLoading: isLoadingStock } = useQuery({
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
  const { data: visitorData, isLoading: isLoadingVisitors } = useQuery({
    queryKey: ["visitor-analytics", dateRange],
    enabled: isAuthorized,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!dateRange?.from) return null;

      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = dateRange.to ? endOfDay(dateRange.to).toISOString() : endOfDay(new Date()).toISOString();

      const { data: sessions, error } = await supabase
        .from("visitor_analytics")
        .select("*")
        .gte("first_visit", startDate)
        .lte("first_visit", endDate)
        .order("first_visit", { ascending: true })
        .limit(200000);

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

  const totalRevenue = (topProducts as any[])?.reduce((sum: number, p: any) => sum + p.revenue, 0) || 0;

  if (isCheckingAuth) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {authError ? (
              <div className="space-y-2">
                <p>An error occurred while checking authorization.</p>
                <p className="text-sm opacity-80">Error: {authError.message}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              'You are not authorized to view this page. Please ensure you have admin role assigned.'
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-[300px] justify-start text-left font-normal">
              <Calendar className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-screen sm:w-auto p-0" align="end">
            <div className="flex flex-col sm:flex-row">
              <div className="border-b sm:border-b-0 sm:border-r p-3 space-y-2">
                <p className="text-sm font-medium mb-3">Quick Presets</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setDateRange({ from: new Date(), to: new Date() })}
                >
                  Today
                </Button>
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
              </div>
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
                className="pointer-events-auto"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Visitor Analytics Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Visitor Analytics</h2>
        
        {/* Visitor Metrics */}
        {isLoadingVisitors ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : visitorData ? (
          <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -mr-16 -mt-16" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Real Visitors</CardTitle>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {visitorData?.realVisitors || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Human visitors tracked
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-destructive/10 to-transparent rounded-full -mr-16 -mt-16" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bot Traffic</CardTitle>
                  <div className="p-2 bg-destructive/10 rounded-full">
                    <Bot className="h-5 w-5 text-destructive" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">
                    {visitorData?.botTraffic || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Filtered automated traffic
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-16 -mt-16" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <Eye className="h-5 w-5 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-500">
                    {visitorData?.totalPageViews || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total pages viewed
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full -mr-16 -mt-16" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">
                    {visitorData?.conversionRate?.toFixed(2) || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Visitors to orders
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Visitor Trends Chart */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Visitor Trends</CardTitle>
                <CardDescription>Daily visitor and page view statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {visitorData?.dailyTrends && visitorData.dailyTrends.length > 0 ? (
                  <ChartContainer config={{}} className="h-[250px] sm:h-[300px] md:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={visitorData.dailyTrends}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="monotone" dataKey="visitors" stroke="hsl(var(--chart-1))" name="Visitors" strokeWidth={2} />
                        <Line type="monotone" dataKey="pageViews" stroke="hsl(var(--chart-2))" name="Page Views" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 bg-muted/50 rounded-full mb-4">
                      <Eye className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mb-1">No visitor trends data</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Data will appear as visitors browse your site over time.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted/50 rounded-full mb-4">
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No visitor data yet</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Analytics tracking is active. Data will appear as visitors browse your site.
            </p>
          </div>
        )}
      </div>

      {/* Traffic Sources & Device Breakdown */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Where your visitors come from</CardDescription>
          </CardHeader>
          <CardContent>
            {visitorData?.trafficSources && visitorData.trafficSources.length > 0 ? (
              <div className="space-y-3">
                {visitorData.trafficSources.map((source: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="font-medium">{source.source}</div>
                      <div className="text-sm text-muted-foreground">{source.pageViews} page views</div>
                    </div>
                    <Badge variant="secondary">{source.sessions} sessions</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">No traffic source data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>Devices used by visitors</CardDescription>
          </CardHeader>
          <CardContent>
            {visitorData?.deviceBreakdown && visitorData.deviceBreakdown.length > 0 ? (
              <ChartContainer config={{}} className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={visitorData.deviceBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="hsl(var(--chart-1))"
                      dataKey="value"
                    >
                      {visitorData.deviceBreakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">No device data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Top Visited Pages</CardTitle>
          <CardDescription>Most popular pages on your site</CardDescription>
        </CardHeader>
        <CardContent>
          {visitorData?.pagePerformance && visitorData.pagePerformance.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="space-y-2 px-4 sm:px-0">
                  {visitorData.pagePerformance.map((page: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Badge variant="outline" className="shrink-0">{index + 1}</Badge>
                        <div className="font-mono text-sm truncate">{page.page}</div>
                      </div>
                      <Badge className="shrink-0 ml-2">{page.views} views</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No page view data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Analytics Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Sales Analytics</h2>
        
        {/* Revenue Metrics */}
        {isLoadingSales ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full -mr-16 -mt-16" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <div className="p-2 bg-green-500/10 rounded-full">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-green-500">
                  RM {formatPrice(totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From all completed orders
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -mr-16 -mt-16" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Seller</CardTitle>
                <div className="p-2 bg-primary/10 rounded-full">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-base sm:text-lg font-bold truncate">
                  {(topProducts as any)?.[0]?.name?.slice(0, 30) || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Top revenue generator
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-16 -mt-16" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products Sold</CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-full">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">
                  {(topProducts as any[])?.reduce((sum: number, p: any) => sum + p.quantity, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total units sold
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full -mr-16 -mt-16" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                <div className="p-2 bg-orange-500/10 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500">
                  {lowStockItems?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Products need restocking
                </p>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Sales Overview */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>Revenue trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSales ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <Tabs defaultValue="daily">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
              <TabsContent value="daily" className="space-y-4">
                <ChartContainer config={{}} className="h-[250px] sm:h-[300px] md:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData?.dailySales || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" name="Revenue (RM)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </TabsContent>
              <TabsContent value="weekly" className="space-y-4">
                <ChartContainer config={{}} className="h-[250px] sm:h-[300px] md:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData?.weeklySales || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Revenue (RM)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </TabsContent>
              <TabsContent value="monthly" className="space-y-4">
                <ChartContainer config={{}} className="h-[250px] sm:h-[300px] md:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData?.monthlySales || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Revenue (RM)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Top Products & Category Performance */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performers by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProducts ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (topProducts as any[])?.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="space-y-3 px-4 sm:px-0">
                    {(topProducts as any[])?.map((product: any, index: number) => (
                      <div key={product.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all duration-300">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Badge variant="outline" className="shrink-0">{index + 1}</Badge>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{product.quantity} units sold</div>
                          </div>
                        </div>
                        <div className="font-bold text-primary shrink-0 ml-2">RM {formatPrice(product.revenue)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">No sales data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Revenue by category</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCategories ? (
              <Skeleton className="h-[300px]" />
            ) : (categoryPerformance as any[])?.length > 0 ? (
              <ChartContainer config={{}} className="h-[250px] sm:h-[300px]">
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
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">No category data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems && lowStockItems.length > 0 && (
        <Alert className="mt-4 border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-900 dark:text-orange-200">
            <strong>{lowStockItems.length} products</strong> are running low on stock and need restocking
          </AlertDescription>
        </Alert>
      )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
