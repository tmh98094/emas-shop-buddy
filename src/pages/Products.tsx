import { useState, useEffect } from "react";
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

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedGoldTypes, setSelectedGoldTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

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
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", selectedCategories, selectedGoldTypes, searchQuery, inStockOnly, sortBy],
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

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply sorting
      switch (sortBy) {
        case "price-asc":
          query = query.order("labour_fee", { ascending: true });
          break;
        case "price-desc":
          query = query.order("labour_fee", { ascending: false });
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
    setSortBy("newest");
    setSearchQuery("");
    setSearchParams({});
  };

  const FilterPanel = () => (
    <ProductFilters
      categories={categories}
      selectedCategories={selectedCategories}
      selectedGoldTypes={selectedGoldTypes}
      priceRange={priceRange}
      maxPrice={priceData || 10000}
      inStockOnly={inStockOnly}
      sortBy={sortBy}
      onCategoryChange={handleCategoryToggle}
      onGoldTypeChange={handleGoldTypeToggle}
      onPriceRangeChange={setPriceRange}
      onStockFilterChange={setInStockOnly}
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
          <h1 className="text-4xl font-bold text-primary mb-4">Shop</h1>
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
                  Filters & Sort
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-96" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No products found</p>
                <Button onClick={handleClearAll} variant="outline" className="mt-4">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    imageUrl={product.product_images?.[0]?.image_url}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <WhatsAppFloater />
    </div>
  );
}
