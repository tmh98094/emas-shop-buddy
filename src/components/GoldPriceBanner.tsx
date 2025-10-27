import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";
import { T } from "./T";

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
    <div className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-8 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-2">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm md:text-base font-semibold whitespace-nowrap">
              <T zh="今日金价" en="Today's Gold Price" />
            </span>
          </div>
          <div className="flex gap-3 sm:gap-4 md:gap-6">
            <div className="flex flex-col items-center">
              <span className="text-[10px] sm:text-xs opacity-90 whitespace-nowrap"><T zh="916金" en="916 Gold" /></span>
              <p className="text-xs sm:text-sm md:text-base font-bold whitespace-nowrap">
                RM {goldPrices?.["916"]?.toFixed(2) || "0.00"}/g
              </p>
            </div>
            <div className="h-8 sm:h-10 w-px bg-primary-foreground/20" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] sm:text-xs opacity-90 whitespace-nowrap"><T zh="999金" en="999 Gold" /></span>
              <p className="text-xs sm:text-sm md:text-base font-bold whitespace-nowrap">
                RM {goldPrices?.["999"]?.toFixed(2) || "0.00"}/g
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
