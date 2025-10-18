import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { WhatsAppFloater } from "@/components/WhatsAppFloater";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Products() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [goldTypeFilter, setGoldTypeFilter] = useState<string>("all");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", categoryFilter, goldTypeFilter],
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

      if (categoryFilter !== "all") {
        query = query.eq("category_id", categoryFilter);
      }

      if (goldTypeFilter !== "all") {
        query = query.eq("gold_type", goldTypeFilter as "916" | "999");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-primary mb-8">All Products</h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={goldTypeFilter} onValueChange={setGoldTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Gold Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="916">916 Gold</SelectItem>
              <SelectItem value="999">999 Gold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-[400px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products?.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                imageUrl={product.product_images?.[0]?.image_url}
              />
            ))}
          </div>
        )}

        {!isLoading && products?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found</p>
          </div>
        )}
      </main>

      <WhatsAppFloater />
    </div>
  );
}
