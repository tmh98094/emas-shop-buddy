import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { WhatsAppFloater } from "@/components/WhatsAppFloater";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { T } from "@/components/T";
import { getDynamicFontSize } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SubCategoryList() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const { data: category } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: subCategories, isLoading } = useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_categories")
        .select("*, products(count)")
        .eq("category_id", categoryId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <SEOHead
        title={`${category?.name || "Sub-Categories"} - JJ Emas`}
        description={category?.description || "Browse our sub-categories"}
        keywords={`${category?.name}, gold jewelry, sub-categories`}
      />
      <GoldPriceBanner />
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
            {category?.name}
          </h1>
          {category?.description && (
            <p className="text-muted-foreground">{category.description}</p>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Always show "View All Items" card first */}
            <Card
              className="cursor-pointer hover:shadow-2xl transition-all duration-300 group border-2 border-l-4 border-primary/30 hover:border-primary hover:scale-[1.03] h-full overflow-hidden"
              onClick={() => navigate(`/products?category=${categoryId}`)}
            >
              <CardContent className="p-8 md:p-10 flex flex-col h-full justify-center text-center bg-gradient-to-br from-primary/15 via-secondary/15 to-accent/10 group-hover:from-primary/20 group-hover:via-secondary/20 group-hover:to-accent/15 transition-all duration-300 min-h-[180px]">
                <h3 className={`font-extrabold ${getDynamicFontSize("All Products")} mb-3 group-hover:text-primary transition-colors leading-tight tracking-tight drop-shadow-sm`}>
                  <T zh="全部商品" en="All Products" />
                </h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-semibold line-clamp-2">
                  <T zh="浏览所有商品" en="Browse all items" />
                </p>
              </CardContent>
            </Card>

            {/* Then show all subcategories */}
            {subCategories?.map((subCategory) => {
              const displayName = language === "zh" ? subCategory.name_zh || subCategory.name : subCategory.name;
              const displayDesc = language === "zh" ? subCategory.description_zh || subCategory.description : subCategory.description;
              
              return (
                <Card
                  key={subCategory.id}
                  className="cursor-pointer hover:shadow-2xl transition-all duration-300 group border-2 border-l-4 border-accent/20 hover:border-accent hover:scale-[1.03] h-full overflow-hidden"
                  onClick={() => navigate(`/products?subCategory=${subCategory.id}`)}
                >
                  <CardContent className="p-8 md:p-10 flex flex-col h-full justify-between bg-gradient-to-br from-accent/5 via-muted/10 to-background group-hover:from-accent/10 group-hover:via-muted/15 transition-all duration-300 min-h-[180px]">
                    <div className="flex-1 flex flex-col justify-center text-center mb-4">
                      <h3 className={`font-extrabold ${getDynamicFontSize(displayName)} mb-3 group-hover:text-accent transition-colors leading-tight tracking-tight line-clamp-3 drop-shadow-sm`}>
                        {displayName}
                      </h3>
                      {displayDesc && (
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed line-clamp-2">
                          {displayDesc}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="secondary" className="bg-gradient-to-r from-accent/20 to-primary/20 text-foreground font-bold px-4 py-1 group-hover:from-accent/30 group-hover:to-primary/30 transition-all">
                        {(subCategory as any).products?.[0]?.count || 0} <T zh="产品" en="Products" />
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <WhatsAppFloater />
      <Footer />
    </div>
  );
}
