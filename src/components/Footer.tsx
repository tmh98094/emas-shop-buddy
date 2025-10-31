import { Link } from "react-router-dom";
import { Facebook, Instagram, MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "./ui/separator";
import { T } from "./T";

export const Footer = () => {
  return (
    <footer className="bg-secondary mt-16 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-primary"><T zh="快速链接" en="Quick Links" /></h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/products" className="text-foreground hover:text-primary transition-colors">
                  <T zh="商店" en="Shop" />
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-foreground hover:text-primary transition-colors">
                  <T zh="分类" en="Categories" />
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-foreground hover:text-primary transition-colors">
                  <T zh="联系我们" en="Contact" />
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-foreground hover:text-primary transition-colors">
                  <T zh="常见问题" en="FAQ" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold mb-4 text-primary"><T zh="客户服务" en="Customer Service" /></h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/shipping-policy" className="text-foreground hover:text-primary transition-colors">
                  <T zh="运输政策" en="Shipping Policy" />
                </Link>
              </li>
              <li>
                <Link to="/return-policy" className="text-foreground hover:text-primary transition-colors">
                  <T zh="退货政策" en="Return Policy" />
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-foreground hover:text-primary transition-colors">
                  <T zh="隐私政策" en="Privacy Policy" />
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-foreground hover:text-primary transition-colors">
                  <T zh="服务条款" en="Terms of Service" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4 text-primary"><T zh="联系我们" en="Contact Us" /></h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href="tel:+60122379178" className="text-foreground hover:text-primary transition-colors">
                  +6012-237 9178
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:info@jjemas.com" className="text-foreground hover:text-primary transition-colors">
                  info@jjemas.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <a
                  href="https://wa.me/60122379178"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  <T zh="WhatsApp 联系我们" en="WhatsApp Us" />
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media & Payment */}
          <div>
            <h4 className="font-semibold mb-4 text-primary"><T zh="关注我们" en="Follow Us" /></h4>
            <div className="flex gap-4 mb-6">
              <a
                href="https://www.facebook.com/152938891239226/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/jjemas_/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>

            <h4 className="font-semibold mb-4 text-primary"><T zh="支付方式" en="Payment Methods" /></h4>
            <div className="flex flex-wrap gap-2">
              <div className="bg-white px-3 py-1 rounded text-xs font-medium border border-border text-foreground">
                FPX
              </div>
              <div className="bg-white px-3 py-1 rounded text-xs font-medium border border-border text-foreground">
                Touch 'n Go
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-border" />

        <div className="text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} JJ Emas. <T zh="版权所有。" en="All rights reserved." /></p>
        </div>
      </div>
    </footer>
  );
};
