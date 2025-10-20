import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Clock, MapPin, Star } from "lucide-react";

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
          <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
          <Card>
            <CardContent className="p-8">
              <p className="text-muted-foreground leading-relaxed mb-4">
                Founded with a passion for fine gold jewelry, JJ Emas has become a trusted name in Malaysia's gold industry. 
                We specialize in authentic 916 and 999 gold pieces, combining traditional craftsmanship with modern designs.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Our commitment to quality and customer satisfaction has made us the preferred choice for those seeking 
                genuine gold jewelry at competitive prices. Every piece in our collection is carefully crafted and 
                verified for purity.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We believe that gold jewelry should be accessible to everyone, which is why we offer a wide range of 
                products to suit different preferences and budgets, all backed by our guarantee of authenticity.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Values Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">Why Choose Us</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Star className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Authentic Gold</h3>
                <p className="text-sm text-muted-foreground">
                  100% genuine 916 & 999 gold with certificates of authenticity
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Award className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Quality Craftsmanship</h3>
                <p className="text-sm text-muted-foreground">
                  Expert artisans creating beautiful, durable jewelry
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Fast Delivery</h3>
                <p className="text-sm text-muted-foreground">
                  Quick and secure shipping across Malaysia
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Trusted Service</h3>
                <p className="text-sm text-muted-foreground">
                  Excellent customer support and after-sales service
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Location Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">Visit Our Store</h2>
          <Card>
            <CardContent className="p-8">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">JJ Emas Headquarters</p>
                    <p className="text-muted-foreground">123 Gold Street</p>
                    <p className="text-muted-foreground">Kuala Lumpur 50000</p>
                    <p className="text-muted-foreground">Malaysia</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">Business Hours</p>
                    <p className="text-muted-foreground">Monday - Saturday: 10:00 AM - 7:00 PM</p>
                    <p className="text-muted-foreground">Sunday: 11:00 AM - 5:00 PM</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Certificates Section */}
        <div>
          <h2 className="text-3xl font-bold mb-6 text-center">Awards & Certifications</h2>
          <Card>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <Award className="h-16 w-16 mx-auto mb-3 text-primary" />
                  <h4 className="font-semibold mb-2">Certified Gold Dealer</h4>
                  <p className="text-sm text-muted-foreground">
                    Officially certified by gold authorities
                  </p>
                </div>
                <div>
                  <Award className="h-16 w-16 mx-auto mb-3 text-primary" />
                  <h4 className="font-semibold mb-2">Quality Assurance</h4>
                  <p className="text-sm text-muted-foreground">
                    ISO certified quality standards
                  </p>
                </div>
                <div>
                  <Award className="h-16 w-16 mx-auto mb-3 text-primary" />
                  <h4 className="font-semibold mb-2">Customer Choice Award</h4>
                  <p className="text-sm text-muted-foreground">
                    Recognized for excellent service
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
