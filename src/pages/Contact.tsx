import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { T } from "@/components/T";

export default function Contact() {

  return (
    <div className="min-h-screen bg-background">
      <GoldPriceBanner />
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <T zh="联系我们" en="Contact Us" />
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            <T 
              zh="有任何疑问吗？我们很乐意听取您的意见。给我们发送消息，我们会尽快回复。"
              en="Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible."
            />
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                <T zh="电话" en="Phone" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href="tel:+60122379178"
                className="text-primary hover:underline"
              >
                +6012-237 9178
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href="https://wa.me/60122379178"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                <T zh="与我们聊天" en="Chat with us" />
              </a>
              <p className="text-sm text-muted-foreground mt-2">
                <T zh="通过WhatsApp快速响应" en="Quick response via WhatsApp" />
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <T zh="电子邮件" en="Email" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href="mailto:info@jjemas.com"
                className="text-primary hover:underline"
              >
                info@jjemas.com
              </a>
              <p className="text-sm text-muted-foreground mt-2">
                <T zh="我们将在24小时内回复" en="We'll respond within 24 hours" />
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
