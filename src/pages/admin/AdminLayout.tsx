import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Users, Wallet, Settings, LogOut, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { T } from "@/components/T";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: "产品", href: "/admin/products", icon: Package, en: "Products" },
    { name: "分类", href: "/admin/categories", icon: Package, en: "Categories" },
    { name: "订单", href: "/admin/orders", icon: ShoppingCart, en: "Orders" },
    { name: "客户", href: "/admin/customers", icon: Users, en: "Customers" },
    { name: "分析", href: "/admin/analytics", icon: LayoutDashboard, en: "Analytics" },
    { name: "库存", href: "/admin/stock", icon: AlertTriangle, en: "Stock" },
    { name: "Touch N Go", href: "/admin/touch-n-go", icon: Wallet, en: "Touch N Go" },
    { name: "设置", href: "/admin/settings", icon: Settings, en: "Settings" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-navy border-b md:border-r border-navy-700">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">JJ Emas <T zh="管理" en="Admin" /></h1>
        </div>
        <nav className="px-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
              (item.href !== "/admin" && location.pathname.startsWith(item.href));
            
            return (
              <Link key={item.name} to={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    isActive 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "text-navy-foreground hover:text-primary hover:bg-navy-800"
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
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-navy-800"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            <T zh="退出" en="Logout" />
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
