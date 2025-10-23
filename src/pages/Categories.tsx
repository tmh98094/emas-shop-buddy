import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Categories() {
  const navigate = useNavigate();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      // Fetch product counts for each category
      const categoriesWithCounts = await Promise.all(
        data.map(async (category) => {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("category_id", category.id);
          
          return {
            ...category,
            productCount: count || 0,
          };
        })
      );
      
      return categoriesWithCounts;
    },
  });

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/products?category=${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <GoldPriceBanner />
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Shop by Category</h1>
          <p className="text-lg text-muted-foreground">
            Explore our collection of fine gold jewelry
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories?.map((category) => {
              return (
                <Card
                  key={category.id}
                  className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        💍
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {category.productCount} {category.productCount === 1 ? 'product' : 'products'}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoading && (!categories || categories.length === 0) && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No categories available</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
