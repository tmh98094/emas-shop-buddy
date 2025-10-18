import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Wallet, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Touch N Go", href: "/admin/touch-n-go", icon: Wallet },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">JJ Emas Admin</h1>
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
                  className="w-full justify-start"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
