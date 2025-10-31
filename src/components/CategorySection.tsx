import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";

export const CategorySection = () => {
  const navigate = useNavigate();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
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
        <div className="relative overflow-hidden">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {displayedCategories.map((category) => (
                <CarouselItem key={category.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/6">
                  <Card
                    className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all"
                    onClick={() => navigate(`/products?category=${category.id}`)}
                  >
                    <div className="aspect-square relative bg-secondary">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          decoding="async"
                          width="400"
                          height="400"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl">💍</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 text-center">
                      <h3 className="font-semibold">{category.name}</h3>
                    </div>
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
