import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { T } from "@/components/T";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeHtmlContent } from "@/components/SafeHtmlContent";

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
          const { count, error } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("category_id", category.id);
          
          if (error) {
            console.error("Error fetching count for category:", category.name, error);
          }
          
          return {
            ...category,
            productCount: count || 0,
          };
        })
      );
      
      return categoriesWithCounts;
    },
  });

  const { data: content } = useQuery({
    queryKey: ["content-pages", "categories_page_intro"],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_pages")
        .select("*")
        .eq("key", "categories_page_intro")
        .maybeSingle();
      return data;
    },
  });

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/categories/${categoryId}/subcategories`);
  };

  return (
    <div className="min-h-screen bg-background">
      <GoldPriceBanner />
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4"><T zh="按类别选购" en="Shop by Category" /></h1>
          {/* Admin-editable intro */}
          {content?.content && (
            <SafeHtmlContent content={content.content} className="prose prose-sm max-w-none text-muted-foreground mb-6" />
          )}
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
                  className="overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary hover:scale-[1.02]"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <CardContent className="p-8 text-center bg-gradient-to-br from-background to-muted/20">
                    <h3 className="font-bold text-2xl mb-3 group-hover:text-primary transition-colors leading-relaxed">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-base text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                        {category.description}
                      </p>
                    )}
                    <p className="text-base text-muted-foreground font-semibold">
                      {(category as any).productCount || 0}{" "}
                      <T zh="件商品" en="Products" />
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
