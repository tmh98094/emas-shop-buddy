import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Users, Wallet, Settings, LogOut, AlertTriangle, Menu, Bug, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { T } from "@/components/T";
import { useState } from "react";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "产品", href: "/admin/products", icon: Package, en: "Products" },
    { name: "分类", href: "/admin/categories", icon: Package, en: "Categories" },
    { name: "订单", href: "/admin/orders", icon: ShoppingCart, en: "Orders" },
    { name: "预订", href: "/admin/pre-orders", icon: ShoppingCart, en: "Pre-orders" },
    { name: "客户", href: "/admin/customers", icon: Users, en: "Customers" },
    { name: "分析", href: "/admin/analytics", icon: LayoutDashboard, en: "Analytics" },
    { name: "库存", href: "/admin/stock", icon: AlertTriangle, en: "Stock" },
    { name: "Touch N Go", href: "/admin/touch-n-go", icon: Wallet, en: "Touch N Go" },
    { name: "图像优化", href: "/admin/image-optimizer", icon: Image, en: "Image Optimizer" },
    { name: "错误日志", href: "/admin/error-logs", icon: Bug, en: "Error Logs" },
    { name: "设置", href: "/admin/settings", icon: Settings, en: "Settings" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const NavigationMenu = () => (
    <nav className="space-y-2">
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href || 
          (item.href !== "/admin" && location.pathname.startsWith(item.href));
        
        return (
          <Link key={item.name} to={item.href} onClick={() => setMobileMenuOpen(false)}>
            <Button
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start ${
                isActive 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "text-foreground hover:text-primary hover:bg-secondary/60"
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              <T zh={item.name} en={item.en} />
            </Button>
          </Link>
        );
      })}
      <Button
        variant="ghost"
        className="w-full justify-start text-destructive hover:text-destructive hover:bg-secondary/60"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        <T zh="退出" en="Logout" />
      </Button>
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-secondary border-b border-border p-2 flex items-center justify-between">
        <h1 className="text-base font-bold text-primary">JJ Emas <T zh="管理" en="Admin" /></h1>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-foreground hover:text-primary h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-secondary w-64 p-0">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-primary">Menu</h2>
            </div>
            <div className="px-4">
              <NavigationMenu />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block md:w-64 bg-secondary border-r border-border">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">JJ Emas <T zh="管理" en="Admin" /></h1>
        </div>
        <div className="px-4">
          <NavigationMenu />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-2 md:p-6 lg:p-8 overflow-auto bg-white">
        <Outlet />
      </main>
    </div>
  );
}
