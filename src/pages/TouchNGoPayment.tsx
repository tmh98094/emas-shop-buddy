import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";

export default function TouchNGoPayment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // For now, just store a placeholder URL
      // In production, you'd upload to Supabase Storage
      setReceiptUrl(URL.createObjectURL(file));
      toast({ title: "Receipt uploaded successfully!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!receiptUrl) {
      toast({ title: "Please upload your receipt", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("touch_n_go_payments")
        .insert({
          order_id: orderId,
          receipt_image_url: receiptUrl,
          verified: false,
        });

      if (error) throw error;

      toast({ title: "Payment submitted for verification!" });
      navigate(`/order-confirmation/${orderId}`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-primary mb-8">Touch 'n Go Payment</h1>

          <Card className="p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Scan QR Code to Pay</h2>
              <div className="bg-muted p-8 rounded-lg inline-block">
                <div className="w-64 h-64 bg-background border-2 border-dashed flex items-center justify-center">
                  <p className="text-muted-foreground">QR Code Here</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Scan with your Touch 'n Go app to make payment
              </p>
            </div>

            <div className="border-t pt-6">
              <Label htmlFor="receipt">Upload Payment Receipt *</Label>
              <div className="mt-2">
                <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary transition-colors">
                  <Upload className="h-6 w-6" />
                  <span>Click to upload receipt</span>
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
                {receiptUrl && (
                  <div className="mt-4">
                    <img src={receiptUrl} alt="Receipt preview" className="max-w-xs mx-auto rounded" />
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={!receiptUrl || uploading}
            >
              Submit Payment
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
