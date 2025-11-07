import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/hooks/useCart";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import TouchNGoPayment from "./pages/TouchNGoPayment";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrderTracking from "./pages/OrderTracking";
import Auth from "./pages/Auth";
import UserProfile from "./pages/UserProfile";
import UserDashboard from "./pages/UserDashboard";

import Contact from "./pages/Contact";
import CategoriesPage from "./pages/Categories";
import SubCategoryList from "./pages/SubCategoryList";
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ReturnPolicy from "./pages/ReturnPolicy";
import ShippingPolicy from "./pages/ShippingPolicy";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminCustomers from "./pages/admin/Customers";
import AdminTouchNGo from "./pages/admin/TouchNGo";
import AdminSettings from "./pages/admin/Settings";
import StockManagement from "./pages/admin/StockManagement";
import ProductForm from "./pages/admin/ProductForm";
import Categories from "./pages/admin/Categories";
import CategoryDetail from "./pages/admin/CategoryDetail";
import OrderDetail from "./pages/admin/OrderDetail";
import AdminNotifications from "./pages/admin/Notifications";
import CustomerDetail from "./pages/admin/CustomerDetail";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminContent from "./pages/admin/Content";
import PreOrders from "./pages/admin/PreOrders";
import ErrorLogs from "./pages/admin/ErrorLogs";
import ImageOptimizer from "./pages/admin/ImageOptimizer";
import NotFound from "./pages/NotFound";
import { WhatsAppFloater } from "./components/WhatsAppFloater";
import { MaintenanceOverlay } from "./components/MaintenanceOverlay";
import { ScrollToTop } from "./components/ScrollToTop";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PerformanceMonitor } from "./components/PerformanceMonitor";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - cache static data longer
      gcTime: 10 * 60 * 1000, // 10 minutes cache time
      refetchOnWindowFocus: false,
      retry: 3, // Increased retry for network resilience
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Protected Route Component for Admin
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (roleData) {
        setIsAdmin(true);
      } else {
        navigate("/");
      }
    };

    checkAdminStatus();
  }, [navigate]);

  if (isAdmin === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return isAdmin ? <>{children}</> : null;
};

const App = () => {
  const AppContent = () => {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isMobile = useIsMobile();

    return (
      <>
        <MaintenanceOverlay isAdminRoute={isAdminRoute} />
        <ScrollToTop />
        {isMobile && <MobileBottomNav />}
        <ErrorBoundary>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment/touch-n-go/:orderId" element={<TouchNGoPayment />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="/order-tracking" element={<OrderTracking />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          
          <Route path="/contact" element={<Contact />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/categories/:categoryId/subcategories" element={<SubCategoryList />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/return-policy" element={<ReturnPolicy />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          
          {/* Admin Routes - Protected */}
          <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id" element={<ProductForm />} />
            <Route path="categories" element={<Categories />} />
            <Route path="categories/:id" element={<CategoryDetail />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="pre-orders" element={<PreOrders />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="customers/:customerId" element={<CustomerDetail />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="stock" element={<StockManagement />} />
            <Route path="touch-n-go" element={<AdminTouchNGo />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="error-logs" element={<ErrorLogs />} />
            <Route path="image-optimizer" element={<ImageOptimizer />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
        
        {/* Show WhatsApp floater everywhere except admin routes */}
        {!isAdminRoute && <WhatsAppFloater />}
      </>
    );
  };

  return (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="light">
        <LanguageProvider>
          <CartProvider>
            <TooltipProvider>
              <PerformanceMonitor />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <AppContent />
              </BrowserRouter>
            </TooltipProvider>
          </CartProvider>
        </LanguageProvider>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
  );
};

export default App;
