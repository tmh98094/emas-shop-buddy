import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, Users, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { useIsMobile } from "@/hooks/use-mobile";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const AdminAnalytics = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date()),
  });
  const isMobile = useIsMobile();

  // Check admin authorization
  const { data: isAuthorized, isLoading: authLoading } = useQuery({
    queryKey: ["admin-check"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (error) {
        const { data: directCheck } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        return !!directCheck;
      }

      return data;
    },
  });

  // Fixed 7-day visitor analytics (unaffected by date filter)
  const { data: last7DaysData, isLoading: last7DaysLoading } = useQuery({
    queryKey: ["last-7-days-visitors"],
    queryFn: async () => {
      const startDate = startOfDay(subDays(new Date(), 6)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();

      let allSessions: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: sessions, error } = await supabase
          .from("visitor_analytics")
          .select("*")
          .gte("first_visit", startDate)
          .lte("first_visit", endDate)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!sessions || sessions.length === 0) {
          hasMore = false;
        } else {
          allSessions = [...allSessions, ...sessions];
          if (sessions.length < pageSize) {
            hasMore = false;
          }
          page++;
        }
      }

      const dailyData: Record<string, { date: string; visitors: number; pageViews: number }> = {};

      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "MMM dd");
        dailyData[date] = { date, visitors: 0, pageViews: 0 };
      }

      allSessions.forEach((session) => {
        const date = format(new Date(session.first_visit), "MMM dd");
        if (dailyData[date]) {
          if (!session.is_bot) {
            dailyData[date].visitors++;
          }
          dailyData[date].pageViews += session.page_views || 0;
        }
      });

      return Object.values(dailyData);
    },
    enabled: isAuthorized,
    staleTime: 5 * 60 * 1000,
  });

  // Main visitor analytics (filtered by date range)
  const { data: visitorData, isLoading: visitorLoading } = useQuery({
    queryKey: ["visitor-analytics", dateRange],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return null;

      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      let allSessions: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: sessions, error } = await supabase
          .from("visitor_analytics")
          .select("*")
          .gte("first_visit", startDate)
          .lte("first_visit", endDate)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!sessions || sessions.length === 0) {
          hasMore = false;
        } else {
          allSessions = [...allSessions, ...sessions];
          if (sessions.length < pageSize) {
            hasMore = false;
          }
          page++;
        }
      }

      const realVisitors = allSessions.filter((s) => !s.is_bot).length;
      const botTraffic = allSessions.filter((s) => s.is_bot).length;
      const totalPageViews = allSessions.reduce((sum, s) => sum + (s.page_views || 0), 0);

      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      const conversionRate =
        realVisitors > 0 ? ((orders?.length || 0) / realVisitors) * 100 : 0;

      const trafficSources: Record<string, number> = {};
      allSessions.forEach((session) => {
        const source = parseTrafficSource(session);
        trafficSources[source] = (trafficSources[source] || 0) + 1;
      });

      const locationData: Record<string, number> = {};
      allSessions.forEach((session) => {
        const country = session.country || "Unknown";
        locationData[country] = (locationData[country] || 0) + 1;
      });

      const deviceBreakdown: Record<string, number> = {};
      allSessions.forEach((session) => {
        const device = session.device_type || "Unknown";
        deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;
      });

      const dailyTrends: Record<string, { date: string; visitors: number; pageViews: number }> = {};
      allSessions.forEach((session) => {
        const date = format(new Date(session.first_visit), "MMM dd");
        if (!dailyTrends[date]) {
          dailyTrends[date] = { date, visitors: 0, pageViews: 0 };
        }
        if (!session.is_bot) {
          dailyTrends[date].visitors++;
        }
        dailyTrends[date].pageViews += session.page_views || 0;
      });

      const pagePerformance: Record<string, number> = {};
      allSessions.forEach((session) => {
        const pages = Array.isArray(session.pages_visited) ? session.pages_visited : [];
        pages.forEach((page: string) => {
          pagePerformance[page] = (pagePerformance[page] || 0) + 1;
        });
      });

      return {
        realVisitors,
        botTraffic,
        totalPageViews,
        conversionRate: conversionRate.toFixed(2),
        trafficSources: Object.entries(trafficSources).map(([name, value]) => ({
          name,
          value,
        })),
        locationData: Object.entries(locationData)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10),
        deviceBreakdown: Object.entries(deviceBreakdown).map(([name, value]) => ({
          name,
          value,
        })),
        dailyTrends: Object.values(dailyTrends).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
        topPages: Object.entries(pagePerformance)
          .map(([page, views]) => ({ page, views }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10),
      };
    },
    enabled: isAuthorized && !!dateRange?.from && !!dateRange?.to,
    staleTime: 5 * 60 * 1000,
  });

  // Sales analytics
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["sales-analytics"],
    queryFn: async () => {
      const { data: completedOrders } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("payment_status", "completed");

      if (!completedOrders) return null;

      const dailySales: Record<string, number> = {};
      const weeklySales: Record<string, number> = {};
      const monthlySales: Record<string, number> = {};

      completedOrders.forEach((order) => {
        const date = new Date(order.created_at);
        const day = format(date, "MMM dd");
        const week = format(date, "MMM ww");
        const month = format(date, "MMM yyyy");

        dailySales[day] = (dailySales[day] || 0) + Number(order.total_amount);
        weeklySales[week] = (weeklySales[week] || 0) + Number(order.total_amount);
        monthlySales[month] = (monthlySales[month] || 0) + Number(order.total_amount);
      });

      return {
        daily: Object.entries(dailySales)
          .map(([date, revenue]) => ({ date, revenue }))
          .slice(-30),
        weekly: Object.entries(weeklySales)
          .map(([date, revenue]) => ({ date, revenue }))
          .slice(-12),
        monthly: Object.entries(monthlySales)
          .map(([date, revenue]) => ({ date, revenue }))
          .slice(-12),
      };
    },
    enabled: isAuthorized,
  });

  // Top products
  const { data: topProducts, isLoading: topProductsLoading } = useQuery({
    queryKey: ["top-products"],
    queryFn: async () => {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_name, subtotal, quantity");

      if (!orderItems) return [];

      const productStats: Record<string, { revenue: number; quantity: number }> = {};
      orderItems.forEach((item) => {
        const name = item.product_name;
        if (!productStats[name]) {
          productStats[name] = { revenue: 0, quantity: 0 };
        }
        productStats[name].revenue += Number(item.subtotal);
        productStats[name].quantity += item.quantity;
      });

      return Object.entries(productStats)
        .map(([name, stats]) => ({
          name: name.length > 20 ? name.substring(0, 20) + "..." : name,
          revenue: stats.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
    enabled: isAuthorized,
  });

  // Top spenders
  const { data: topSpenders, isLoading: topSpendersLoading } = useQuery({
    queryKey: ["top-spenders", dateRange],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];
      
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();
      
      const { data: orders } = await supabase
        .from("orders")
        .select("full_name, email, phone_number, total_amount")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .eq("payment_status", "completed");
      
      if (!orders) return [];
      
      const spenderStats: Record<string, {
        name: string;
        email: string | null;
        phone: string;
        totalSpent: number;
        orderCount: number;
      }> = {};
      
      orders.forEach((order) => {
        const phone = order.phone_number;
        if (!spenderStats[phone]) {
          spenderStats[phone] = {
            name: order.full_name,
            email: order.email,
            phone: phone,
            totalSpent: 0,
            orderCount: 0,
          };
        }
        spenderStats[phone].totalSpent += Number(order.total_amount);
        spenderStats[phone].orderCount++;
      });
      
      return Object.values(spenderStats)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);
    },
    enabled: isAuthorized && !!dateRange?.from && !!dateRange?.to,
  });

  // Category performance
  const { data: categoryPerformance, isLoading: categoryLoading } = useQuery({
    queryKey: ["category-performance"],
    queryFn: async () => {
      const { data: products } = await supabase
        .from("products")
        .select("*, categories(name), order_items(subtotal, quantity)");

      if (!products) return [];

      const categoryStats: Record<string, number> = {};
      products.forEach((product: any) => {
        const categoryName = product.categories?.name || "Uncategorized";
        const orderItems = product.order_items || [];
        const revenue = orderItems.reduce(
          (sum: number, item: any) => sum + Number(item.subtotal),
          0
        );
        categoryStats[categoryName] = (categoryStats[categoryName] || 0) + revenue;
      });

      return Object.entries(categoryStats)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    },
    enabled: isAuthorized,
  });

  if (authLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[300px] w-full" />
        ))}
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You do not have permission to view analytics. Admin access required.
        </AlertDescription>
      </Alert>
    );
  }

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const clearDateFilter = () => {
    setDateRange({
      from: startOfDay(subDays(new Date(), 30)),
      to: endOfDay(new Date()),
    });
  };

  const parseTrafficSource = (session: any) => {
    // Check UTM source first (most reliable)
    if (session.utm_source) {
      return session.utm_source;
    }
    
    // Parse referrer URL
    if (session.referrer) {
      const referrer = session.referrer.toLowerCase();
      if (referrer.includes('instagram.com')) return 'Instagram';
      if (referrer.includes('facebook.com') || referrer.includes('fb.com')) return 'Facebook';
      if (referrer.includes('google.com')) return 'Google';
      if (referrer.includes('twitter.com') || referrer.includes('x.com')) return 'Twitter';
      if (referrer.includes('linkedin.com')) return 'LinkedIn';
      if (referrer.includes('tiktok.com')) return 'TikTok';
      if (referrer.includes('youtube.com')) return 'YouTube';
      if (referrer.includes('whatsapp.com')) return 'WhatsApp';
      return 'Referral'; // Other websites
    }
    
    return 'Direct'; // No UTM or referrer
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track visitor behavior and sales performance
          </p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full md:w-[300px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from && dateRange?.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                <span>Select date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={isMobile ? 1 : 2}
              className="pointer-events-auto"
            />
            <div className="p-3 border-t flex items-center justify-between gap-2">
              {(!dateRange?.from || !dateRange?.to) ? (
                <p className="text-xs text-muted-foreground">
                  Please select both start and end dates
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                </p>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearDateFilter}
                className="text-xs h-7"
              >
                Clear
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Fixed Last 7 Days Visitor Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Visitor Activity</CardTitle>
              <CardDescription>Last 7 days (unaffected by filter)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {last7DaysLoading ? (
            <Skeleton className="h-[250px] md:h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <LineChart
                data={last7DaysData}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 60 : 30}
                />
                <YAxis
                  domain={[0, 'dataMax + 10']}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  width={40}
                />
                <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  name="Visitors"
                />
                <Line
                  type="monotone"
                  dataKey="pageViews"
                  stroke={CHART_COLORS[1]}
                  strokeWidth={2}
                  name="Page Views"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Visitor Analytics Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Visitor Analytics</h2>

        {/* Key Metrics */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Real Visitors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {visitorLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{visitorData?.realVisitors || 0}</div>
                  <p className="text-xs text-muted-foreground">Human visitors only</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bot Traffic</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {visitorLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{visitorData?.botTraffic || 0}</div>
                  <p className="text-xs text-muted-foreground">Automated visits</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {visitorLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{visitorData?.totalPageViews || 0}</div>
                  <p className="text-xs text-muted-foreground">Total page views</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {visitorLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{visitorData?.conversionRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">Visitors to orders</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Daily Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Visitor Trends</CardTitle>
            <CardDescription>Daily visitor and page view trends</CardDescription>
          </CardHeader>
          <CardContent>
            {visitorLoading ? (
              <Skeleton className="h-[250px] md:h-[300px] w-full" />
            ) : visitorData?.dailyTrends.length ? (
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <LineChart
                  data={visitorData.dailyTrends}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                    height={isMobile ? 60 : 30}
                  />
                  <YAxis
                    domain={[0, 'dataMax + 10']}
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    width={40}
                  />
                  <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    stroke={CHART_COLORS[0]}
                    strokeWidth={2}
                    name="Visitors"
                  />
                  <Line
                    type="monotone"
                    dataKey="pageViews"
                    stroke={CHART_COLORS[1]}
                    strokeWidth={2}
                    name="Page Views"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] md:h-[300px]">
                <p className="text-muted-foreground">No visitor data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Traffic Sources and Device Breakdown */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>Where visitors come from</CardDescription>
            </CardHeader>
            <CardContent>
              {visitorLoading ? (
                <Skeleton className="h-[250px] md:h-[300px] w-full" />
              ) : visitorData?.trafficSources.length ? (
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <PieChart>
                    <Pie
                      data={visitorData.trafficSources}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={!isMobile ? (entry) => `${entry.name}: ${entry.value}` : undefined}
                      outerRadius={isMobile ? 60 : 80}
                      dataKey="value"
                    >
                      {visitorData.trafficSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] md:h-[300px]">
                  <p className="text-muted-foreground">No traffic data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device Breakdown</CardTitle>
              <CardDescription>Visitor device types</CardDescription>
            </CardHeader>
            <CardContent>
              {visitorLoading ? (
                <Skeleton className="h-[250px] md:h-[300px] w-full" />
              ) : visitorData?.deviceBreakdown.length ? (
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <PieChart>
                    <Pie
                      data={visitorData.deviceBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={!isMobile ? (entry) => `${entry.name}: ${entry.value}` : undefined}
                      outerRadius={isMobile ? 60 : 80}
                      dataKey="value"
                    >
                      {visitorData.deviceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] md:h-[300px]">
                  <p className="text-muted-foreground">No device data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visitor Locations</CardTitle>
              <CardDescription>Top 10 countries</CardDescription>
            </CardHeader>
            <CardContent>
              {visitorLoading ? (
                <Skeleton className="h-[250px] md:h-[300px] w-full" />
              ) : visitorData?.locationData?.length ? (
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <BarChart
                    data={visitorData.locationData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: isMobile ? 9 : 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={isMobile ? 80 : 70}
                    />
                    <YAxis
                      domain={[0, 'dataMax + 5']}
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      width={40}
                    />
                    <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="value" fill={CHART_COLORS[2]} name="Visitors" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] md:h-[300px]">
                  <p className="text-muted-foreground">No location data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most visited pages</CardDescription>
          </CardHeader>
          <CardContent>
            {visitorLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : visitorData?.topPages.length ? (
              <div className="space-y-2">
                {visitorData.topPages.map((page, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                    <span className="text-sm truncate flex-1">{page.page}</span>
                    <span className="text-sm font-medium ml-2">{page.views} views</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-muted-foreground">No page data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Analytics Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Sales Analytics</h2>

        {/* Sales Overview Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Revenue trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="daily" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="daily" className="text-xs sm:text-sm">Daily</TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs sm:text-sm">Weekly</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs sm:text-sm">Monthly</TabsTrigger>
              </TabsList>

              <TabsContent value="daily">
                {salesLoading ? (
                  <Skeleton className="h-[250px] md:h-[300px] w-full" />
                ) : salesData?.daily.length ? (
                  <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                    <LineChart
                      data={salesData.daily}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        angle={isMobile ? -45 : 0}
                        textAnchor={isMobile ? "end" : "middle"}
                        height={isMobile ? 60 : 30}
                      />
                      <YAxis
                        domain={[0, 'dataMax + 100']}
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        width={40}
                      />
                      <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke={CHART_COLORS[2]}
                        strokeWidth={2}
                        name="Revenue (RM)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] md:h-[300px]">
                    <p className="text-muted-foreground">No sales data available</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="weekly">
                {salesLoading ? (
                  <Skeleton className="h-[250px] md:h-[300px] w-full" />
                ) : salesData?.weekly.length ? (
                  <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                    <BarChart
                      data={salesData.weekly}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        angle={isMobile ? -45 : 0}
                        textAnchor={isMobile ? "end" : "middle"}
                        height={isMobile ? 60 : 30}
                      />
                      <YAxis
                        domain={[0, 'dataMax + 100']}
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        width={40}
                      />
                      <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="revenue" fill={CHART_COLORS[2]} name="Revenue (RM)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] md:h-[300px]">
                    <p className="text-muted-foreground">No sales data available</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="monthly">
                {salesLoading ? (
                  <Skeleton className="h-[250px] md:h-[300px] w-full" />
                ) : salesData?.monthly.length ? (
                  <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                    <BarChart
                      data={salesData.monthly}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        angle={isMobile ? -45 : 0}
                        textAnchor={isMobile ? "end" : "middle"}
                        height={isMobile ? 60 : 30}
                      />
                      <YAxis
                        domain={[0, 'dataMax + 100']}
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        width={40}
                      />
                      <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="revenue" fill={CHART_COLORS[2]} name="Revenue (RM)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] md:h-[300px]">
                    <p className="text-muted-foreground">No sales data available</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Selling Products</CardTitle>
            <CardDescription>Best performing products by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {topProductsLoading ? (
              <Skeleton className="h-[250px] md:h-[300px] w-full" />
            ) : topProducts && topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <PieChart>
                  <Pie
                    data={topProducts}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={!isMobile ? (entry) => `${entry.name}` : undefined}
                    outerRadius={isMobile ? 60 : 80}
                    dataKey="revenue"
                  >
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] md:h-[300px]">
                <p className="text-muted-foreground">No product data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Spenders */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Spenders</CardTitle>
            <CardDescription>Highest spending customers in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {topSpendersLoading ? (
              <Skeleton className="h-[250px] md:h-[300px] w-full" />
            ) : topSpenders && topSpenders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Name</th>
                      <th className="text-left p-2 font-medium hidden sm:table-cell">Email</th>
                      <th className="text-left p-2 font-medium">Phone</th>
                      <th className="text-right p-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSpenders.map((spender, index) => (
                      <tr key={spender.phone} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-2 font-medium text-muted-foreground">#{index + 1}</td>
                        <td className="p-2 truncate max-w-[120px]">{spender.name}</td>
                        <td className="p-2 hidden sm:table-cell truncate max-w-[150px]">
                          {spender.email || '-'}
                        </td>
                        <td className="p-2 text-xs">{spender.phone}</td>
                        <td className="p-2 text-right font-semibold">
                          RM {spender.totalSpent.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] md:h-[300px]">
                <p className="text-muted-foreground">No customer data for this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Revenue by category</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryLoading ? (
              <Skeleton className="h-[250px] md:h-[300px] w-full" />
            ) : categoryPerformance && categoryPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <PieChart>
                  <Pie
                    data={categoryPerformance}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={!isMobile ? (entry) => `${entry.name}` : undefined}
                    outerRadius={isMobile ? 60 : 80}
                    dataKey="revenue"
                  >
                    {categoryPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] md:h-[300px]">
                <p className="text-muted-foreground">No category data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
