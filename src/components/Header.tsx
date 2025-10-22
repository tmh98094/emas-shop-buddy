import { ShoppingCart, User, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { useCart } from "@/hooks/useCart";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { LanguageToggle } from "./LanguageToggle";
import { T } from "./T";

export const Header = () => {
  const { items } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const navigation = [
    { name: "首页", href: "/", en: "Home" },
    { name: "产品", href: "/products", en: "Shop" },
    { name: "分类", href: "/categories", en: "Categories" },
    { name: "关于我们", href: "/about", en: "About" },
    { name: "联系我们", href: "/contact", en: "Contact" },
  ];

  return (
    <header className="bg-navy border-b border-navy-700 sticky top-[72px] z-40 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary hover:text-gold-light transition-colors">
            JJ Emas
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-navy-foreground hover:text-primary transition-colors font-medium"
              >
                <T zh={item.name} en={item.en} />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <LanguageToggle />

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative text-navy-foreground hover:text-primary hover:bg-navy-800">
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center font-semibold">
                    {cartItemCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="text-navy-foreground hover:text-primary hover:bg-navy-800">
                <User className="h-5 w-5" />
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-navy-foreground hover:text-primary hover:bg-navy-800">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <nav className="flex flex-col gap-4 mt-8">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg text-foreground hover:text-primary transition-colors font-medium"
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
