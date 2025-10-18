import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

export const GoldPriceBanner = () => {
  const { data: goldPrices } = useQuery({
    queryKey: ["gold-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["gold_price_916", "gold_price_999"]);
      
      if (error) throw error;
      
      const prices = {
        "916": 0,
        "999": 0
      };
      
      data?.forEach(item => {
        if (item.key === "gold_price_916") {
          prices["916"] = (item.value as { price: number }).price;
        } else if (item.key === "gold_price_999") {
          prices["999"] = (item.value as { price: number }).price;
        }
      });
      
      return prices;
    },
  });

  return (
    <div className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="font-semibold">Today's Gold Price</span>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <span className="text-sm opacity-90">916 Gold</span>
              <p className="text-lg font-bold">
                RM {goldPrices?.["916"]?.toFixed(2) || "0.00"}/g
              </p>
            </div>
            <div className="h-10 w-px bg-primary-foreground/20" />
            <div className="text-center">
              <span className="text-sm opacity-90">999 Gold</span>
              <p className="text-lg font-bold">
                RM {goldPrices?.["999"]?.toFixed(2) || "0.00"}/g
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
