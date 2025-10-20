import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Package, MapPin, Clock, Shield } from "lucide-react";

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <GoldPriceBanner />
      <Header />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Shipping Policy</h1>
        
        {/* Shipping Rates Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Shipping Rates
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <p className="font-semibold mb-1">West Malaysia</p>
                <p className="text-2xl font-bold text-primary mb-1">RM 10</p>
                <p className="text-sm text-muted-foreground">2-3 business days</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="font-semibold mb-1">East Malaysia</p>
                <p className="text-2xl font-bold text-primary mb-1">RM 15</p>
                <p className="text-sm text-muted-foreground">3-5 business days</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="font-semibold mb-1">Singapore</p>
                <p className="text-2xl font-bold text-primary mb-1">RM 40</p>
                <p className="text-sm text-muted-foreground">4-7 business days</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              🎁 <strong>Free Shipping</strong> on orders above RM 5,000
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8 prose prose-sm max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-6 w-6 text-primary" />
                Delivery Areas
              </h2>
              <p className="text-muted-foreground mb-4">
                We currently ship to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>West Malaysia:</strong> All states in Peninsular Malaysia</li>
                <li><strong>East Malaysia:</strong> Sabah and Sarawak</li>
                <li><strong>Singapore:</strong> All postal codes</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                We do not currently ship to other international destinations. Please contact us if you have special shipping requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" />
                Processing Time
              </h2>
              <p className="text-muted-foreground mb-4">
                Orders are typically processed within:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>In-Stock Items:</strong> 1-2 business days</li>
                <li><strong>Pre-Order Items:</strong> As specified on product page</li>
                <li><strong>Custom Orders:</strong> 7-14 business days</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                <strong>Note:</strong> Processing time does not include shipping time. Business days are Monday to Saturday, excluding public holidays.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Order Tracking</h2>
              <p className="text-muted-foreground mb-4">
                Once your order is shipped, you will receive:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>SMS notification with tracking number</li>
                <li>Email confirmation with tracking link</li>
                <li>Access to track order in your account dashboard</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                You can track your package status 24/7 using the tracking number provided.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Packaging & Insurance
              </h2>
              <p className="text-muted-foreground mb-4">
                Your jewelry is precious to us. We take extra care in packaging:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Secure bubble wrap and protective padding</li>
                <li>Discreet, unmarked packaging for security</li>
                <li>All shipments are fully insured</li>
                <li>Signature required upon delivery for orders above RM 1,000</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Delivery Issues</h2>
              <p className="text-muted-foreground mb-4">
                <strong>Package Not Received:</strong>
              </p>
              <p className="text-muted-foreground mb-4">
                If your tracking shows "delivered" but you haven't received your package:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Check with family members or neighbors</li>
                <li>Look for delivery notice or safe place</li>
                <li>Contact us within 48 hours</li>
              </ul>

              <p className="text-muted-foreground mb-4 mt-6">
                <strong>Delayed Delivery:</strong>
              </p>
              <p className="text-muted-foreground">
                While rare, delays can occur due to weather, customs, or carrier issues. If your order is significantly delayed, contact us and we'll investigate with the courier.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Address Changes</h2>
              <p className="text-muted-foreground">
                Please ensure your shipping address is correct before checkout. If you need to change your address after placing an order, contact us immediately:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                <li><strong>Before Shipping:</strong> We can update the address free of charge</li>
                <li><strong>After Shipping:</strong> Contact the courier directly or contact us for assistance (additional fees may apply)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Holidays & Peak Seasons</h2>
              <p className="text-muted-foreground">
                During peak shopping periods (festivals, sales events) or public holidays, processing and delivery times may be extended by 1-3 days. We'll notify you of any expected delays.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">PO Boxes & Forwarding Services</h2>
              <p className="text-muted-foreground">
                We cannot ship to PO boxes. If you use a mail forwarding service, please note that we are not responsible for packages once they reach the forwarding address.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                For shipping inquiries, please contact us:
              </p>
              <p className="text-muted-foreground">
                WhatsApp: +60 12-345 6789<br />
                Email: info@jjemas.com<br />
                Phone: +60 12-345 6789<br />
                Business Hours: Mon-Sat 10am-7pm, Sun 11am-5pm
              </p>
            </section>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
