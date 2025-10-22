import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [goldPrice916, setGoldPrice916] = useState("");
  const [goldPrice999, setGoldPrice999] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data: goldPrices } = useQuery({
    queryKey: ["admin-gold-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["gold_price_916", "gold_price_999"]);
      if (error) throw error;
      
      const prices = { "916": 0, "999": 0 };
      data?.forEach(item => {
        if (item.key === "gold_price_916") {
          prices["916"] = (item.value as any).price;
        } else if (item.key === "gold_price_999") {
          prices["999"] = (item.value as any).price;
        }
      });
      return prices;
    },
  });

  // Initialize inputs once when data is loaded
  if (!initialized && goldPrices) {
    setGoldPrice916(goldPrices["916"].toString());
    setGoldPrice999(goldPrices["999"].toString());
    setInitialized(true);
  }

  const updatePrices = useMutation({
    mutationFn: async () => {
      const updates = [
        {
          key: "gold_price_916",
          value: { price: parseFloat(goldPrice916) },
        },
        {
          key: "gold_price_999",
          value: { price: parseFloat(goldPrice999) },
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("settings")
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq("key", update.key);
        if (error) throw error;
      }
      
      // Trigger update of cached product prices
      await supabase.rpc('update_product_cached_prices');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gold-prices"] });
      queryClient.invalidateQueries({ queryKey: ["gold-prices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Gold prices updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating prices", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div>
      <h1 className="text-4xl font-bold text-primary mb-8">Settings</h1>

      <Card className="p-6 max-w-2xl">
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

          <Button
            onClick={() => updatePrices.mutate()}
            disabled={updatePrices.isPending}
          >
            {updatePrices.isPending ? "Updating..." : "Update Prices"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
