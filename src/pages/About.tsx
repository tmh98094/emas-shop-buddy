import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Clock, MapPin, Star } from "lucide-react";
import { T } from "@/components/T";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <GoldPriceBanner />
      <Header />

      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">About JJ Emas</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your trusted gold jewelry destination in Malaysia, offering quality craftsmanship and exceptional service.
          </p>
        </div>

        {/* Story Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center"><T zh="我们的故事" en="Our Story" /></h2>
          <Card>
            <CardContent className="p-8">
              <p className="text-muted-foreground leading-relaxed mb-4">
                <T 
                  zh="JJ Emas 以对精美金饰的热情创立，已成为马来西亚黄金行业的信任之选。我们专注于正宗的916和999黄金产品，将传统工艺与现代设计相结合。" 
                  en="Founded with a passion for fine gold jewelry, JJ Emas has become a trusted name in Malaysia's gold industry. We specialize in authentic 916 and 999 gold pieces, combining traditional craftsmanship with modern designs."
                />
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <T 
                  zh="我们对质量和客户满意度的承诺使我们成为寻求正品黄金珠宝的首选。我们系列中的每一件作品都经过精心制作和纯度验证。" 
                  en="Our commitment to quality and customer satisfaction has made us the preferred choice for those seeking genuine gold jewelry. Every piece in our collection is carefully crafted and verified for purity."
                />
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <T 
                  zh="我们相信黄金珠宝应该让每个人都能拥有，这就是为什么我们提供广泛的产品以适应不同的偏好和预算，所有产品都有真实性保证。" 
                  en="We believe that gold jewelry should be accessible to everyone, which is why we offer a wide range of products to suit different preferences and budgets, all backed by our guarantee of authenticity."
                />
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Values Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center"><T zh="为什么选择我们" en="Why Choose Us" /></h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Star className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2"><T zh="正品黄金" en="Authentic Gold" /></h3>
                <p className="text-sm text-muted-foreground">
                  <T zh="100% 正品 916 和 999 黄金" en="100% genuine 916 & 999 gold" />
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Award className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2"><T zh="优质工艺" en="Quality Craftsmanship" /></h3>
                <p className="text-sm text-muted-foreground">
                  <T zh="现代设计与精湛工艺" en="Modern design with expert craftsmanship" />
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2"><T zh="快速配送" en="Fast Delivery" /></h3>
                <p className="text-sm text-muted-foreground">
                  <T zh="马来西亚快速安全送货" en="Quick and secure shipping across Malaysia" />
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2"><T zh="可信服务" en="Trusted Service" /></h3>
                <p className="text-sm text-muted-foreground">
                  <T zh="优秀的客户支持和售后服务" en="Excellent customer support and after-sales service" />
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      <Footer />
    </div>
  );
}
