import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [goldPrice916, setGoldPrice916] = useState("");
  const [goldPrice999, setGoldPrice999] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["gold_price_916", "gold_price_999", "touch_n_go_qr"]);
      if (error) throw error;
      
      const result: any = { goldPrices: { "916": 0, "999": 0 }, qrCode: "" };
      data?.forEach(item => {
        if (item.key === "gold_price_916") {
          result.goldPrices["916"] = (item.value as any).price;
        } else if (item.key === "gold_price_999") {
          result.goldPrices["999"] = (item.value as any).price;
        } else if (item.key === "touch_n_go_qr") {
          result.qrCode = (item.value as any).qr_code_url || "";
        }
      });
      return result;
    },
  });

  // Initialize inputs once when data is loaded
  useEffect(() => {
    if (!initialized && settings) {
      setGoldPrice916(settings.goldPrices["916"].toString());
      setGoldPrice999(settings.goldPrices["999"].toString());
      setQrCodeUrl(settings.qrCode);
      setQrPreview(settings.qrCode);
      setInitialized(true);
    }
  }, [settings, initialized]);

  const updatePrices = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Upload QR code if new file selected
      let qrUrl = qrCodeUrl;
      if (qrCodeFile) {
        const fileExt = qrCodeFile.name.split(".").pop();
        const fileName = `touch-n-go-qr.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, qrCodeFile, { upsert: true });
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);
        
        qrUrl = publicUrl;
      }

      // Validate inputs
      const price916 = Number(goldPrice916);
      const price999 = Number(goldPrice999);
      if (!Number.isFinite(price916) || price916 < 0 || !Number.isFinite(price999) || price999 < 0) {
        throw new Error("Please enter valid non-negative numbers for gold prices.");
      }

      // Upsert settings by unique key to avoid WHERE clause issues
      const { error: upsertError } = await supabase
        .from("settings")
        .upsert(
          [
            { key: "gold_price_916", value: { price: price916 }, updated_by: user?.id },
            { key: "gold_price_999", value: { price: price999 }, updated_by: user?.id },
            { key: "touch_n_go_qr", value: { qr_code_url: qrUrl }, updated_by: user?.id },
          ],
          { onConflict: "key" }
        );

      if (upsertError) throw upsertError;

      // Trigger update of cached product prices
      await supabase.rpc('update_product_cached_prices');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["gold-prices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setQrCodeFile(null);
      toast({ title: "Settings updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating settings", description: error.message, variant: "destructive" });
    },
  });

  const handleQrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrCodeFile(file);
      const reader = new FileReader();
      reader.onload = () => setQrPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold text-primary mb-8">Settings</h1>

      <div className="space-y-6 max-w-2xl">
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Gold Prices (per gram)</h2>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="price_916">916 Gold Price (RM)</Label>
              <Input
                id="price_916"
                type="number"
                step="0.01"
                value={goldPrice916}
                onChange={(e) => setGoldPrice916(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="price_999">999 Gold Price (RM)</Label>
              <Input
                id="price_999"
                type="number"
                step="0.01"
                value={goldPrice999}
                onChange={(e) => setGoldPrice999(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Touch 'n Go QR Code</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="qr-upload" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  {qrPreview ? (
                    <div className="relative inline-block">
                      <img src={qrPreview} alt="QR Code" className="max-w-xs mx-auto rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrCodeFile(null);
                          setQrPreview(qrCodeUrl);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-2 font-medium">Click to upload QR code</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG or JPG format</p>
                    </>
                  )}
                </div>
                <Input
                  id="qr-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleQrFileChange}
                />
              </Label>
            </div>
          </div>
        </Card>

        <Button
          onClick={() => updatePrices.mutate()}
          disabled={updatePrices.isPending}
          size="lg"
        >
          {updatePrices.isPending ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}
