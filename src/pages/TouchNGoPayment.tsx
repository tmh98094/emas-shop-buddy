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
import { T } from "@/components/T";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function ReceiptPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useState(() => {
    (async () => {
      try {
        const { data, error } = await supabase.storage
          .from("payment-receipts")
          .createSignedUrl(path, 60);
        if (error) throw error;
        setUrl(data.signedUrl);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  });

  if (error) {
    return <p className="text-sm text-destructive">Failed to generate preview. You can still submit.</p>;
  }
  if (!url) return <p className="text-sm text-muted-foreground">Generating preview…</p>;
  return <img src={url} alt="Receipt preview" className="max-w-full max-h-96 mx-auto rounded border" loading="lazy" />;
}


export default function TouchNGoPayment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");

  const { data: qr } = useQuery({
    queryKey: ["settings", "touch_n_go_qr"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "touch_n_go_qr")
        .single();
      if (error) throw error;
      const url = (data?.value as any)?.qr_code_url || "";
      return { qrCode: url };
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || "guest";
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${orderId}-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("payment-receipts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store path instead of public URL for private bucket
      setReceiptUrl(fileName);
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
          <h1 className="text-4xl font-bold text-primary mb-8">Touch 'n Go 支付</h1>

          <Card className="p-4 md:p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-xl md:text-2xl font-bold mb-4"><T zh="扫描二维码支付" en="Scan QR Code to Pay" /></h2>
              <div className="bg-muted p-4 md:p-8 rounded-lg inline-block max-w-full">
                <div className="w-48 h-48 md:w-64 md:h-64 bg-background border flex items-center justify-center mx-auto overflow-hidden rounded">
                  {qr?.qrCode ? (
                    <img src={qr.qrCode} alt="Touch 'n Go QR" className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-muted-foreground text-sm"><T zh="后台尚未上传二维码" en="QR not uploaded yet" /></p>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  <T zh="使用 Touch 'n Go 应用扫描以支付" en="Scan with your Touch 'n Go app to make payment" />
                </p>
                <p className="text-xs text-primary font-medium bg-primary/10 py-2 px-4 rounded-lg inline-block">
                  <T zh="截屏 → Touch 'n Go → 扫描 → 相册" en="Take screenshot → Touch 'n Go → Scan → Gallery" />
                </p>
              </div>
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
                  <div className="mt-4 p-4 border rounded-lg bg-muted/20">
                    <p className="text-sm font-medium mb-2">Receipt Preview:</p>
                    {/* Generate a short-lived preview URL for private bucket */}
                    {/* In case preview fails, the admin can still view via signed link */}
                    {/* We'll attempt to create a signed URL on the fly */}
                    <ReceiptPreview path={receiptUrl} />
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
