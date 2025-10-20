import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function ReturnPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <GoldPriceBanner />
      <Header />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Return & Exchange Policy</h1>
        
        <Card className="mb-6">
          <CardContent className="p-6 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold mb-2">Important Notice</p>
              <p className="text-sm text-muted-foreground">
                We want you to be completely satisfied with your purchase. Please read our return policy carefully before making a purchase.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8 prose prose-sm max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Return Period</h2>
              <p className="text-muted-foreground">
                You may return eligible items within <strong>7 days</strong> of receiving your order. The return period starts from the date of delivery confirmation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Eligibility Criteria</h2>
              <p className="text-muted-foreground mb-4">
                To be eligible for a return, items must meet ALL of the following conditions:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Item must be unused and in the same condition as received</li>
                <li>Item must be in original packaging with all tags attached</li>
                <li>Certificate of authenticity must be included</li>
                <li>No signs of wear, damage, or alterations</li>
                <li>Protective seals (if any) must be intact</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Non-Returnable Items</h2>
              <p className="text-muted-foreground mb-4">
                The following items cannot be returned:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Customized or engraved jewelry</li>
                <li>Items on sale or clearance (unless defective)</li>
                <li>Items damaged by customer misuse</li>
                <li>Items without original packaging or certificate</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">How to Initiate a Return</h2>
              <p className="text-muted-foreground mb-4">
                To initiate a return:
              </p>
              <ol className="list-decimal pl-6 text-muted-foreground space-y-3">
                <li>
                  <strong>Contact Us:</strong> Reach out to our customer service via WhatsApp (+60 12-345 6789) or email (info@jjemas.com) with your order number and reason for return.
                </li>
                <li>
                  <strong>Receive Authorization:</strong> Wait for our team to approve your return request and provide a Return Authorization Number (RAN).
                </li>
                <li>
                  <strong>Pack Securely:</strong> Pack the item securely in its original packaging. Include all accessories and documentation.
                </li>
                <li>
                  <strong>Ship Back:</strong> Send the item to the address provided by our customer service team. We recommend using insured shipping with tracking.
                </li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Inspection & Refund Process</h2>
              <p className="text-muted-foreground mb-4">
                Once we receive your returned item:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Our quality team will inspect the item (1-2 business days)</li>
                <li>You'll receive an email notification once inspection is complete</li>
                <li>If approved, refund will be processed within 5-7 business days</li>
                <li>Refund will be credited to your original payment method</li>
                <li>If return is rejected, item will be shipped back to you at your expense</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Exchanges</h2>
              <p className="text-muted-foreground">
                We currently do not offer direct exchanges. If you'd like a different item, please return the original item and place a new order for the desired product.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Shipping Costs</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Customer's Responsibility:</strong> Return shipping costs are borne by the customer unless the item is defective or incorrect.</li>
                <li><strong>Defective Items:</strong> If you receive a defective or incorrect item, we'll cover the return shipping cost.</li>
                <li><strong>Original Shipping:</strong> Original shipping fees are non-refundable except in cases of defective items.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Damaged or Defective Items</h2>
              <p className="text-muted-foreground mb-4">
                If you receive a damaged or defective item:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Contact us within 48 hours of delivery</li>
                <li>Provide photos of the damage/defect</li>
                <li>We'll arrange a free return and send a replacement or process a full refund</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Cancellations</h2>
              <p className="text-muted-foreground">
                Orders can be cancelled before shipping. Once an order has been shipped, our return policy applies. Please contact us immediately if you wish to cancel an order.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Questions?</h2>
              <p className="text-muted-foreground mb-4">
                If you have any questions about our return policy, please contact us:
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
