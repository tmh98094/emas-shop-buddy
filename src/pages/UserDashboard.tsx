import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { ProductReviewForm } from "@/components/ProductReviewForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, Settings, LogOut, User, Star, Download } from "lucide-react";
import { T } from "@/components/T";
import { generateInvoicePDF, InvoiceData } from "@/lib/invoice-generator";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Load orders with review status
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            quantity,
            subtotal,
            gold_type,
            weight_grams,
            gold_price_at_purchase,
            labour_fee,
            review_rating,
            review_text,
            reviewed_at
          )
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
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <GoldPriceBanner />
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p>Loading...</p>
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
                    <span className="text-lg font-medium">{profile?.phone_number}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-lg font-medium">{profile?.email || "Not set"}</span>
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
                            <div key={item.id} className="flex justify-between items-center">
                              <p className="text-sm">
                                {item.quantity}x {item.product_name}
                              </p>
                              {order.order_status === "completed" && !item.reviewed_at && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Star className="h-4 w-4 mr-1" />
                                      <T zh="评论" en="Review" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        <T zh="评论产品" en="Review Product" />
                                      </DialogTitle>
                                    </DialogHeader>
                                    <ProductReviewForm
                                      orderItemId={item.id}
                                      productId={item.product_id}
                                      onSuccess={loadDashboardData}
                                    />
                                  </DialogContent>
                                </Dialog>
                              )}
                              {item.reviewed_at && (
                                <Badge variant="secondary">
                                  <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                                  <T zh="已评论" en="Reviewed" />
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-between items-center mt-3 pt-3 border-t gap-2">
                          <span className="font-semibold">
                            <T zh="总计" en="Total" />: RM {parseFloat(order.total_amount).toFixed(2)}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const invoiceData: InvoiceData = {
                                  orderNumber: order.order_number,
                                  orderDate: order.created_at,
                                  customerName: order.full_name,
                                  customerPhone: order.phone_number,
                                  customerEmail: order.email,
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
                                    weight: item.weight_grams,
                                    goldPrice: item.gold_price_at_purchase,
                                    labourFee: item.labour_fee,
                                    subtotal: parseFloat(item.subtotal),
                                  })),
                                  subtotal: parseFloat(order.total_amount),
                                  shippingFee: 0,
                                  total: parseFloat(order.total_amount),
                                  paymentMethod: order.payment_method,
                                  paymentStatus: order.payment_status,
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
    </div>
  );
}
