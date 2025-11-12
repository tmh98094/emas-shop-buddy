import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { T } from "@/components/T";
import { Skeleton } from "@/components/ui/skeleton";
import { getDynamicFontSize } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import Autoplay from "embla-carousel-autoplay";

export const FeaturedSubCategorySection = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isMobile = useIsMobile();

  const plugins = React.useMemo(
    () => isMobile ? [Autoplay({ delay: 3500, stopOnInteraction: true, stopOnMouseEnter: true })] : [],
    [isMobile]
  );

  const { data: subCategories, isLoading } = useQuery({
    queryKey: ["featured-sub-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_categories")
        .select("*, categories(name)")
        .eq("featured_on_homepage", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-64 mb-8 mx-auto" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!subCategories || subCategories.length === 0) return null;

  const handleSubCategoryClick = (subCategoryId: string) => {
    navigate(`/products?subCategory=${subCategoryId}`);
  };

  return (
    <section className="py-12 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8 text-primary">
          <T zh="精选系列" en="Featured Series" />
        </h2>
        
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-secondary to-transparent z-10 md:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-secondary to-transparent z-10 md:hidden" />
          <Carousel
            opts={{
              align: "start",
              loop: true,
              containScroll: "trimSnaps",
            }}
            plugins={plugins}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {subCategories.map((subCategory) => {
                const displayName = language === "zh" ? subCategory.name_zh || subCategory.name : subCategory.name;
                const categoryName = language === "zh" 
                  ? (subCategory.categories as any)?.name_zh || (subCategory.categories as any)?.name 
                  : (subCategory.categories as any)?.name;
                return (
                  <CarouselItem key={subCategory.id} className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 lg:basis-1/6">
                    <Card
                      className="cursor-pointer group hover:shadow-2xl transition-all duration-300 border-2 border-l-4 border-accent/20 hover:border-accent hover:scale-[1.03] h-full overflow-hidden"
                      onClick={() => handleSubCategoryClick(subCategory.id)}
                    >
                      <CardContent className="p-6 md:p-8 flex flex-col h-full justify-center text-center bg-gradient-to-br from-accent/5 via-muted/10 to-background group-hover:from-accent/10 group-hover:via-muted/15 transition-all duration-300 min-h-[140px]">
                        <h3 className={`font-extrabold ${getDynamicFontSize(displayName)} mb-2 group-hover:text-accent transition-colors leading-tight tracking-tight line-clamp-2 drop-shadow-sm`}>
                          {displayName}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-semibold line-clamp-1">
                          {categoryName}
                        </p>
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