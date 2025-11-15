import { ShoppingCart, User, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { useCart } from "@/hooks/useCart";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { LanguageToggle } from "./LanguageToggle";
import { T } from "./T";
import logo from "@/assets/jj-emas-logo.png";
import { supabase } from "@/integrations/supabase/client";

export const Header = () => {
  const { items } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guestModeOnly, setGuestModeOnly] = useState(false);
  
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    // Check if guest mode is enabled
    const checkGuestMode = async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'guest_mode_only')
        .single();
      
      if (data?.value && typeof data.value === 'object' && 'enabled' in data.value) {
        setGuestModeOnly(data.value.enabled as boolean);
      }
    };
    
    checkGuestMode();
  }, []);

  const navigation = [
    { name: "首页", href: "/", en: "Home" },
    { name: "产品", href: "/products", en: "Shop" },
    { name: "分类", href: "/categories", en: "Categories" },
    { name: "联系我们", href: "/contact", en: "Contact" },
    { name: "查询订单", href: "/order-tracking", en: "Track Order" },
  ];

  return (
    <header className="bg-secondary border-b border-border sticky top-[44px] md:top-[52px] z-40 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={logo} alt="JJ Emas Logo" className="h-16 md:h-20 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                <T zh={item.name} en={item.en} />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <LanguageToggle />

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative text-foreground hover:text-primary hover:bg-secondary/60">
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center font-semibold">
                    {cartItemCount}
                  </span>
                )}
              </Button>
            </Link>
            {!guestModeOnly && (
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="text-foreground hover:text-primary hover:bg-secondary/60">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-foreground hover:text-primary hover:bg-secondary/60">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <nav className="flex flex-col gap-2 mt-8">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg text-foreground hover:text-primary hover:bg-primary/10 transition-colors font-medium py-3 px-4 -mx-4 rounded-md touch-manipulation"
                      aria-label={`Navigate to ${item.en}`}
                    >
                      <T zh={item.name} en={item.en} />
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};
