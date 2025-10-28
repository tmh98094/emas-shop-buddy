import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, TrendingUp } from "lucide-react";
import { T } from "./T";
import { formatPrice } from "@/lib/price-utils";

export function SearchAutocomplete() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch search suggestions
  const { data: suggestions } = useQuery({
    queryKey: ["search-suggestions", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, cached_current_price")
        .ilike("name", `%${searchQuery}%`)
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  // Fetch trending/recent searches
  const { data: trendingSearches } = useQuery({
    queryKey: ["trending-searches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("search_history")
        .select("search_query")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // Get unique searches
      const unique = Array.from(
        new Set(data.map(item => item.search_query))
      ).slice(0, 5);
      
      return unique;
    },
  });

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    // Save to search history
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionId = user?.id || `guest-${Date.now()}`;

      await supabase.from("search_history").insert({
        search_query: query,
        user_id: user?.id || null,
        session_id: sessionId,
      });
    } catch (error) {
      console.error("Error saving search history:", error);
    }

    navigate(`/products?search=${encodeURIComponent(query)}`);
    setShowSuggestions(false);
  };

  const handleProductClick = (slug: string) => {
    navigate(`/product/${slug}`);
    setShowSuggestions(false);
    setSearchQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜索产品..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch(searchQuery);
            }
          }}
          className="pl-10"
        />
      </div>

      {showSuggestions && (searchQuery.length >= 2 || trendingSearches) && (
        <Card className="absolute top-full mt-2 w-full z-50 max-h-96 overflow-y-auto">
          {searchQuery.length >= 2 && suggestions && suggestions.length > 0 ? (
            <div className="p-2">
              <div className="text-xs text-muted-foreground px-2 py-1 font-semibold">
                <T zh="产品" en="Products" />
              </div>
              {suggestions.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product.slug)}
                  className="w-full text-left px-3 py-2 hover:bg-accent rounded-md transition-colors"
                >
                  <div className="font-medium text-sm">{product.name}</div>
                  {product.cached_current_price && (
                    <div className="text-xs text-muted-foreground">
                      RM {formatPrice(Number(product.cached_current_price))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : searchQuery.length < 2 && trendingSearches && trendingSearches.length > 0 ? (
            <div className="p-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 font-semibold">
                <TrendingUp className="h-3 w-3" />
                <T zh="热门搜索" en="Trending Searches" />
              </div>
              {trendingSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(search);
                    handleSearch(search);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-accent rounded-md transition-colors text-sm"
                >
                  {search}
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <T zh="未找到产品" en="No products found" />
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
