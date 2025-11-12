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
import { getDynamicFontSize } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Categories() {
  const navigate = useNavigate();
  const { language } = useLanguage();

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
              const displayName = language === "zh" ? category.name_zh || category.name : category.name;
              const displayDesc = language === "zh" ? category.description_zh || category.description : category.description;
              
              return (
                <Card
                  key={category.id}
                  className="overflow-hidden cursor-pointer group hover:shadow-2xl transition-all duration-300 border-2 border-l-4 border-primary/20 hover:border-primary hover:scale-[1.03] h-full"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <CardContent className="p-8 md:p-10 flex flex-col h-full justify-between bg-gradient-to-br from-primary/5 via-secondary/10 to-background group-hover:from-primary/10 group-hover:via-secondary/15 transition-all duration-300 min-h-[180px]">
                    <div className="flex-1 flex flex-col justify-center text-center mb-4">
                      <h3 className={`font-extrabold ${getDynamicFontSize(displayName)} mb-3 group-hover:text-primary transition-colors leading-tight tracking-tight line-clamp-3 drop-shadow-sm`}>
                        {displayName}
                      </h3>
                      {displayDesc && (
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed line-clamp-2">
                          {displayDesc}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="secondary" className="bg-gradient-to-r from-primary/20 to-accent/20 text-foreground font-bold px-4 py-1 group-hover:from-primary/30 group-hover:to-accent/30 transition-all">
                        {(category as any).productCount || 0} <T zh="件商品" en="Products" />
                      </Badge>
                    </div>
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
