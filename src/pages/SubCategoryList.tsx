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

export default function SubCategoryList() {
  const { categoryId } = useParams();
  const navigate = useNavigate();

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
              className="cursor-pointer hover:shadow-xl transition-all duration-300 group border-2 hover:border-primary hover:scale-[1.02]"
              onClick={() => navigate(`/products?category=${categoryId}`)}
            >
              <CardContent className="p-8 text-center bg-gradient-to-br from-primary/10 to-primary/5 min-h-[160px] flex flex-col items-center justify-center">
                <h3 className="font-bold text-2xl mb-3 group-hover:text-primary transition-colors leading-relaxed">
                  <T zh="全部商品" en="All Products" />
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  <T zh="浏览所有商品" en="Browse all items" />
                </p>
              </CardContent>
            </Card>

            {/* Then show all subcategories */}
            {subCategories?.map((subCategory) => (
              <Card
                key={subCategory.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 group border-2 hover:border-primary hover:scale-[1.02]"
                onClick={() => navigate(`/products?subCategory=${subCategory.id}`)}
              >
                <CardContent className="p-8 text-center bg-gradient-to-br from-background to-muted/20 min-h-[160px] flex flex-col items-center justify-center">
                  <h3 className="font-bold text-2xl mb-3 group-hover:text-primary transition-colors leading-relaxed">
                    {subCategory.name}
                  </h3>
                  {subCategory.description && (
                    <p className="text-base text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                      {subCategory.description}
                    </p>
                  )}
                  <Badge variant="secondary" className="text-sm">
                    {(subCategory as any).products?.[0]?.count || 0}{" "}
                    <T zh="产品" en="Products" />
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <WhatsAppFloater />
      <Footer />
    </div>
  );
}
