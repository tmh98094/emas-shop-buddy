import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "./ui/skeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";

interface ProductSectionProps {
  title: string;
  filter: "featured" | "best_seller" | "new_arrival" | "all";
}

export const ProductSection = ({ title, filter }: ProductSectionProps) => {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", filter],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          product_images (
            image_url,
            display_order
          )
        `)
        .gt("stock", 0)
        .order("created_at", { ascending: false });

      if (filter === "featured") {
        query = query.eq("is_featured", true);
      } else if (filter === "best_seller") {
        query = query.eq("is_best_seller", true);
      } else if (filter === "new_arrival") {
        query = query.eq("is_new_arrival", true);
      }

      query = query.limit(8);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-primary mb-8">{title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[400px]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-primary mb-8">{title}</h2>
        <Carousel>
          <CarouselContent>
            {products.map((product) => (
              <CarouselItem key={product.id} className="basis-3/4 sm:basis-1/2 lg:basis-1/4">
                <ProductCard
                  product={product}
                  imageUrl={product.product_images?.[0]?.image_url}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex items-center justify-between mt-4">
            <CarouselPrevious />
            <CarouselNext />
          </div>
        </Carousel>
      </div>
    </section>
  );
};
