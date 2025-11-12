import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { T } from "@/components/T";
import { Skeleton } from "@/components/ui/skeleton";

export const FeaturedSubCategorySection = () => {
  const navigate = useNavigate();

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
        
        <div className="relative overflow-hidden">
          <Carousel
            opts={{
              align: "start",
              loop: true,
              containScroll: "trimSnaps",
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {subCategories.map((subCategory) => (
                <CarouselItem key={subCategory.id} className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 lg:basis-1/6">
                  <Card
                    className="cursor-pointer group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary hover:scale-[1.02] h-full"
                    onClick={() => handleSubCategoryClick(subCategory.id)}
                  >
                    <CardContent className="p-6 md:p-8 flex flex-col h-full justify-center text-center bg-gradient-to-br from-background to-muted/20 min-h-[120px]">
                      <h3 className="font-bold text-base md:text-lg mb-2 group-hover:text-primary transition-colors leading-relaxed">
                        {subCategory.name}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {(subCategory.categories as any)?.name}
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2" />
            <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};