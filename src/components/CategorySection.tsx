import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { getDynamicFontSize } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import Autoplay from "embla-carousel-autoplay";

export const CategorySection = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isMobile = useIsMobile();

  const plugins = React.useMemo(
    () => isMobile ? [Autoplay({ delay: 3500, stopOnInteraction: true, stopOnMouseEnter: true })] : [],
    [isMobile]
  );

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories:list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="py-12 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-primary mb-8 text-center">金饰类型</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  // Limit to 6 categories on homepage
  const displayedCategories = categories?.slice(0, 6) || [];

  return (
    <section className="py-12 bg-muted">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-primary mb-8 text-center">金饰类型</h2>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-muted to-transparent z-10 md:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-muted to-transparent z-10 md:hidden" />
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={plugins}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {displayedCategories.map((category) => {
                const displayName = language === "zh" ? category.name_zh || category.name : category.name;
                return (
                  <CarouselItem key={category.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/6">
                    <Card
                      className="group cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-l-4 border-primary/20 hover:border-primary hover:scale-[1.03] h-full overflow-hidden"
                      onClick={() => navigate(`/categories/${category.id}/subcategories`)}
                    >
                      <CardContent className="p-6 md:p-8 flex flex-col h-full justify-center text-center bg-gradient-to-br from-primary/5 via-secondary/10 to-background group-hover:from-primary/10 group-hover:via-secondary/15 transition-all duration-300 min-h-[140px]">
                        <h3 className={`font-extrabold ${getDynamicFontSize(displayName)} group-hover:text-primary transition-colors leading-tight tracking-tight line-clamp-3 drop-shadow-sm`}>
                          {displayName}
                        </h3>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 hidden md:flex" />
            <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:flex" />
          </Carousel>
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-center md:hidden animate-fade-in">
          左右滑动查看更多 · Swipe to explore
        </p>
      </div>
    </section>
  );
};
