import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { WhatsAppFloater } from "@/components/WhatsAppFloater";
import { ProductCard } from "@/components/ProductCard";
import { ProductSearch } from "@/components/ProductSearch";
import { ProductFilters } from "@/components/ProductFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { T } from "@/components/T";
import { SafeHtmlContent } from "@/components/SafeHtmlContent";

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedGoldTypes, setSelectedGoldTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [excludePreOrder, setExcludePreOrder] = useState(false);
  const [excludeOutOfStock, setExcludeOutOfStock] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Load initial filters from URL
  useEffect(() => {
    const category = searchParams.get("category");
    if (category) {
      setSelectedCategories([category]);
    }
  }, [searchParams]);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch products
  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ["products", selectedCategories, selectedGoldTypes, priceRange, searchQuery, inStockOnly, excludePreOrder, excludeOutOfStock, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          product_images(image_url, display_order)
        `);

      // Apply filters
      if (selectedCategories.length > 0) {
        query = query.in("category_id", selectedCategories);
      }

      if (selectedGoldTypes.length > 0) {
        query = query.in("gold_type", selectedGoldTypes as ("916" | "999")[]);
      }

      if (inStockOnly) {
        query = query.gt("stock", 0);
      }

      if (excludePreOrder) {
        query = query.eq("is_preorder", false);
      }

      if (excludeOutOfStock) {
        query = query.gt("stock", 0);
      }

      // Price filter - include NULL prices OR prices in range
      query = query.or(`cached_current_price.is.null,and(cached_current_price.gte.${priceRange[0]},cached_current_price.lte.${priceRange[1]})`);

      // Apply search
      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      // Apply sorting
      switch (sortBy) {
        case "price-asc":
          query = query.order("cached_current_price", { ascending: true });
          break;
        case "price-desc":
          query = query.order("cached_current_price", { ascending: false });
          break;
        case "best-seller":
          query = query.eq("is_best_seller", true).order("created_at", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(product => ({
        ...product,
        product_images: product.product_images?.sort((a: any, b: any) => 
          (a.display_order || 0) - (b.display_order || 0)
        ),
      }));
    },
  });

  // Pagination
  const totalPages = Math.ceil((allProducts?.length || 0) / itemsPerPage);
  const products = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return allProducts?.slice(start, start + itemsPerPage) || [];
  }, [allProducts, currentPage, itemsPerPage]);

  // Get max price for slider
  const { data: priceData } = useQuery({
    queryKey: ["price-range"],
    queryFn: async () => {
      const { data: goldPrices } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["gold_price_916", "gold_price_999"]);

      const prices = { "916": 0, "999": 0 };
      goldPrices?.forEach(item => {
        if (item.key === "gold_price_916") prices["916"] = (item.value as any).price;
        else if (item.key === "gold_price_999") prices["999"] = (item.value as any).price;
      });

      const maxGoldPrice = Math.max(prices["916"], prices["999"]);
      return Math.ceil((maxGoldPrice * 50 + 1000) / 100) * 100; // Estimate max price
    },
  });

  // Shop page content (admin-editable)
  const { data: shopContent } = useQuery({
    queryKey: ["content", "shop_page_intro"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("content_pages")
          .select("title, content")
          .eq("key", "shop_page_intro")
          .single();
        if (error) throw error;
        return data as { title: string; content: string } | null;
      } catch {
        return null;
      }
    },
  });

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleGoldTypeToggle = (goldType: string) => {
    setSelectedGoldTypes(prev =>
      prev.includes(goldType)
        ? prev.filter(type => type !== goldType)
        : [...prev, goldType]
    );
  };

  const handleClearAll = () => {
    setSelectedCategories([]);
    setSelectedGoldTypes([]);
    setPriceRange([0, priceData || 10000]);
    setInStockOnly(false);
    setExcludePreOrder(false);
    setExcludeOutOfStock(false);
    setSortBy("newest");
    setSearchQuery("");
    setSearchParams({});
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategories, selectedGoldTypes, priceRange, searchQuery, inStockOnly, excludePreOrder, excludeOutOfStock, sortBy]);

  const FilterPanel = () => (
    <ProductFilters
      categories={categories}
      selectedCategories={selectedCategories}
      selectedGoldTypes={selectedGoldTypes}
      priceRange={priceRange}
      maxPrice={priceData || 10000}
      inStockOnly={inStockOnly}
      excludePreOrder={excludePreOrder}
      excludeOutOfStock={excludeOutOfStock}
      sortBy={sortBy}
      onCategoryChange={handleCategoryToggle}
      onGoldTypeChange={handleGoldTypeToggle}
      onPriceRangeChange={setPriceRange}
      onStockFilterChange={setInStockOnly}
      onPreOrderFilterChange={setExcludePreOrder}
      onOutOfStockFilterChange={setExcludeOutOfStock}
      onSortChange={setSortBy}
      onClearAll={handleClearAll}
    />
  );

  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          {shopContent?.title ? (
            <h1 className="text-4xl font-bold text-primary mb-2">{shopContent.title}</h1>
          ) : (
            <h1 className="text-4xl font-bold text-primary mb-2"><T zh="商店" en="Shop" /></h1>
          )}
          {shopContent?.content && (
            <SafeHtmlContent 
              content={shopContent.content}
              className="prose prose-sm max-w-none text-muted-foreground mb-4"
            />
          )}
          <ProductSearch value={searchQuery} onChange={setSearchQuery} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24">
              <FilterPanel />
            </div>
          </aside>

          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  <T zh="筛选与排序" en="Filters & Sort" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto">
                <FilterPanel />
              </SheetContent>
            </Sheet>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
          {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {[...Array(12)].map((_, i) => (
                    <Skeleton key={i} className="h-64 md:h-80" />
                  ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg"><T zh="未找到商品" en="No products found" /></p>
                <Button onClick={handleClearAll} variant="outline" className="mt-4">
                  <T zh="清除筛选" en="Clear Filters" />
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {products.map((product) => (
                    <div key={product.id} className="transition-transform hover:scale-[1.02]">
                      <ProductCard
                        product={product}
                        imageUrl={product.product_images?.[0]?.image_url}
                      />
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <T zh="上一页" en="Previous" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      <T zh="第" en="Page" /> {currentPage} <T zh="页，共" en="of" /> {totalPages} <T zh="页" en="" />
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <T zh="下一页" en="Next" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <WhatsAppFloater />
    </div>
  );
}
