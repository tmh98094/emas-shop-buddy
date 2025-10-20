import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    category: "Orders",
    questions: [
      {
        q: "How do I place an order?",
        a: "Browse our products, add items to cart, and proceed to checkout. You can pay via Stripe or Touch N Go.",
      },
      {
        q: "Can I modify my order after placing it?",
        a: "Please contact us immediately via WhatsApp or phone. We'll do our best to accommodate changes before shipping.",
      },
      {
        q: "How do I track my order?",
        a: "You'll receive an order confirmation via SMS/email with a tracking link. You can also check your order status in your dashboard.",
      },
    ],
  },
  {
    category: "Shipping",
    questions: [
      {
        q: "What are the shipping costs?",
        a: "West Malaysia: RM10, East Malaysia: RM15, Singapore: RM40. Free shipping on orders above RM5,000.",
      },
      {
        q: "How long does delivery take?",
        a: "West Malaysia: 2-3 business days, East Malaysia: 3-5 business days, Singapore: 4-7 business days.",
      },
      {
        q: "Do you ship internationally?",
        a: "Currently, we ship to Malaysia and Singapore only.",
      },
    ],
  },
  {
    category: "Payments",
    questions: [
      {
        q: "What payment methods do you accept?",
        a: "We accept credit/debit cards via Stripe and Touch N Go eWallet.",
      },
      {
        q: "Is my payment information secure?",
        a: "Yes, all payments are processed through secure, encrypted channels. We never store your card details.",
      },
      {
        q: "Can I pay cash on delivery?",
        a: "COD is not available at the moment. We accept online payments only.",
      },
    ],
  },
  {
    category: "Returns",
    questions: [
      {
        q: "What is your return policy?",
        a: "We accept returns within 7 days of delivery. Items must be unused, in original packaging with tags attached.",
      },
      {
        q: "How do I initiate a return?",
        a: "Contact our customer service via WhatsApp or email with your order number and reason for return.",
      },
      {
        q: "When will I receive my refund?",
        a: "Refunds are processed within 5-7 business days after we receive and inspect the returned item.",
      },
    ],
  },
  {
    category: "Gold Pricing",
    questions: [
      {
        q: "How is the gold price calculated?",
        a: "Our prices are based on current gold market rates plus labour fees. Prices update daily based on market fluctuations.",
      },
      {
        q: "What is the difference between 916 and 999 gold?",
        a: "916 gold is 22 karat (91.6% pure), ideal for jewelry. 999 gold is 24 karat (99.9% pure), softer and mainly for investment.",
      },
      {
        q: "Do you provide gold certificates?",
        a: "Yes, all our gold products come with authenticity certificates.",
      },
    ],
  },
  {
    category: "Products",
    questions: [
      {
        q: "Are all products in stock?",
        a: "Products shown as 'In Stock' are available for immediate purchase. You can sign up for notifications when out-of-stock items are restocked.",
      },
      {
        q: "Can I customize a design?",
        a: "Yes! Contact us via WhatsApp with your requirements and we'll provide a custom quote.",
      },
      {
        q: "Do you offer warranties?",
        a: "All our products come with a 1-year warranty against manufacturing defects.",
      },
    ],
  },
];

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.map((category) => ({
    ...category,
    questions: category.questions.filter(
      (faq) =>
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <GoldPriceBanner />
      <Header />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Find answers to common questions about our products and services
          </p>

          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-8">
          {filteredFaqs.map((category, idx) => (
            <div key={idx}>
              <h2 className="text-2xl font-bold mb-4">{category.category}</h2>
              <Accordion type="single" collapsible className="space-y-2">
                {category.questions.map((faq, faqIdx) => (
                  <AccordionItem key={faqIdx} value={`${idx}-${faqIdx}`}>
                    <AccordionTrigger className="text-left">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}

          {filteredFaqs.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No FAQs match your search</p>
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="mt-16 text-center p-8 bg-muted rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-4">
            Can't find the answer you're looking for? Contact our customer support team.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="https://wa.me/60123456789"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              WhatsApp Us
            </a>
            <span className="text-muted-foreground">•</span>
            <a href="tel:+60123456789" className="text-primary hover:underline">
              Call Us
            </a>
            <span className="text-muted-foreground">•</span>
            <a href="/contact" className="text-primary hover:underline">
              Contact Form
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
