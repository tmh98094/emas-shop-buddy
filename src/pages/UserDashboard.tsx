import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, Settings, LogOut, User, Download } from "lucide-react";
import { T } from "@/components/T";
import { generateInvoicePDF, InvoiceData } from "@/lib/invoice-generator";
import { Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/price-utils";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Load orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setOrders(ordersData || []);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "processing":
        return "bg-primary";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "Not set";
    // Format phone number nicely (e.g., +60 12-345 6789)
    const match = phone.match(/^(\+\d{2})(\d{2,3})(\d{4})(\d{4})$/);
    if (match) {
      return `${match[1]} ${match[2]}-${match[3]} ${match[4]}`;
    }
    return phone;
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
      return;
    }

    setCancellingOrderId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ order_status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Order Cancelled",
        description: "Your order has been cancelled and stock has been restored.",
      });

      // Reload dashboard data
      await loadDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handlePayNow = async (orderId: string) => {
    setGeneratingPaymentLink(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-payment-link", {
        body: { orderId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Payment Page Opened",
          description: "Complete your payment in the new tab.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate payment link.",
        variant: "destructive",
      });
    } finally {
      setGeneratingPaymentLink(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <GoldPriceBanner />
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GoldPriceBanner />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-4">
          {/* Sidebar */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => navigate("/profile")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Profile Settings
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="md:col-span-3 space-y-6">
            {/* Welcome Card */}
            <Card>
              <CardHeader>
                <CardTitle>Welcome back, {profile?.full_name || "User"}!</CardTitle>
                <CardDescription>
                  Here's what's happening with your orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Total Orders</span>
                    <span className="text-2xl font-bold">{orders.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Phone</span>
                    <span className="text-base md:text-lg font-medium">{formatPhoneNumber(profile?.phone_number)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-base md:text-lg font-medium break-all">{profile?.email || "Not set"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Recent Orders
                </CardTitle>
                <CardDescription>
                  Track and manage your orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No orders yet</p>
                    <Button
                      variant="link"
                      onClick={() => navigate("/products")}
                      className="mt-2"
                    >
                      Start Shopping
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">
                              <T zh="订单" en="Order" /> #{order.order_number}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={getStatusColor(order.order_status)}>
                            {order.order_status}
                          </Badge>
                        </div>
                        
                        <Separator className="my-2" />
                        
                        <div className="space-y-2">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-sm">
                                  {item.quantity}x {item.product_name}
                                </p>
                                {item.variant_selection && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.variant_selection}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex flex-col md:flex-row justify-between md:items-center mt-3 pt-3 border-t gap-3 md:gap-2">
                          <span className="font-semibold text-base">
                            <T zh="总计" en="Total" />: RM {formatPrice(parseFloat(order.total_amount))}
                          </span>
                          <div className="flex gap-2 flex-wrap">
                            {order.payment_status === "pending" && order.order_status === "pending" && order.payment_method !== "touch_n_go" && (
                              <Button
                                variant="default"
                                size="sm"
                                className="flex-1 md:flex-none h-10 md:h-9 touch-manipulation"
                                onClick={() => handlePayNow(order.id)}
                                disabled={generatingPaymentLink === order.id}
                              >
                                {generatingPaymentLink === order.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    <T zh="生成中..." en="Loading..." />
                                  </>
                                ) : (
                                  <T zh="立即付款" en="Pay Now" />
                                )}
                              </Button>
                            )}
                            {order.payment_status === "pending" && order.order_status === "pending" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1 md:flex-none h-10 md:h-9 touch-manipulation"
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={cancellingOrderId === order.id}
                              >
                                {cancellingOrderId === order.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    <T zh="取消中..." en="Cancelling..." />
                                  </>
                                ) : (
                                  <T zh="取消订单" en="Cancel Order" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 md:flex-none h-10 md:h-9 touch-manipulation"
                              onClick={() => {
                                const itemsTotal = order.order_items.reduce((sum: number, item: any) => 
                                  sum + parseFloat(item.subtotal), 0);
                                const shippingFee = parseFloat(order.total_amount) - itemsTotal;
                                
                                const invoiceData: InvoiceData = {
                                  orderNumber: order.order_number,
                                  orderDate: order.created_at,
                                  customerName: order.full_name,
                                  customerPhone: order.phone_number,
                                  customerEmail: order.email,
                                  customerIC: order.ic_number || "N/A",
                                  shippingAddress: {
                                    line1: order.shipping_address_line1,
                                    line2: order.shipping_address_line2,
                                    city: order.shipping_city,
                                    state: order.shipping_state,
                                    postcode: order.shipping_postcode,
                                    country: order.shipping_country,
                                  },
                                  items: order.order_items.map((item: any) => ({
                                    name: item.product_name,
                                    quantity: item.quantity,
                                    goldType: item.gold_type,
                                    weight_grams: item.weight_grams,
                                    goldPrice: item.gold_price_at_purchase,
                                    labourFee: item.labour_fee,
                                    subtotal: parseFloat(item.subtotal),
                                    variant_selection: item.variant_selection,
                                  })),
                                  subtotal: itemsTotal,
                                  shippingFee: shippingFee,
                                  total: parseFloat(order.total_amount),
                                  paymentMethod: order.payment_method,
                                  paymentStatus: order.payment_status,
                                  notes: order.notes,
                                };
                                generateInvoicePDF(invoiceData);
                              }}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              <T zh="发票" en="Invoice" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 md:flex-none h-10 md:h-9 touch-manipulation"
                              onClick={() => navigate(`/order-confirmation/${order.id}`)}
                            >
                              <T zh="查看详情" en="View Details" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
