import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function StockManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-stock-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("stock", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(stockUpdates).map(([id, stock]) => 
        supabase.from("products").update({ stock }).eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stock-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setStockUpdates({});
      toast({ title: "Stock updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (categoriesLoading || productsLoading) return <div>Loading...</div>;

  // Group products by category
  const productsByCategory = categories?.reduce((acc, category) => {
    const categoryProducts = products?.filter(p => p.category_id === category.id) || [];
    const lowStockCount = categoryProducts.filter(p => p.stock <= (p.low_stock_threshold || 10)).length;
    acc[category.id] = { products: categoryProducts, lowStockCount };
    return acc;
  }, {} as Record<string, { products: any[], lowStockCount: number }>);

  const uncategorizedProducts = products?.filter(p => !p.category_id) || [];
  const uncategorizedLowStock = uncategorizedProducts.filter(p => p.stock <= (p.low_stock_threshold || 10)).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-4xl font-bold text-primary mb-8">Stock Management</h1>

      <Accordion type="multiple" className="space-y-4">
        {categories?.map((category) => {
          const { products: categoryProducts, lowStockCount } = productsByCategory?.[category.id] || { products: [], lowStockCount: 0 };
          
          return (
            <AccordionItem key={category.id} value={category.id}>
              <Card className={lowStockCount > 0 ? "border-amber-500" : ""}>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      {lowStockCount > 0 && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                      <span className="text-lg font-semibold">{category.name}</span>
                    </div>
                    <div className="flex gap-2">
                      {lowStockCount > 0 && (
                        <Badge variant="destructive">{lowStockCount} low stock</Badge>
                      )}
                      <Badge variant="secondary">{categoryProducts.length} total</Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-6 pb-4">
                    {categoryProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">No products in this category</p>
                    ) : (
                      <div className="space-y-4">
                        {categoryProducts.map((product) => (
                          <div key={product.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b pb-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Current Stock: {product.stock} | Gold Type: {product.gold_type}
                              </p>
                              {product.stock <= (product.low_stock_threshold || 10) && (
                                <Badge variant="destructive" className="mt-1">Low Stock Alert</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Input
                                type="number"
                                placeholder="New stock"
                                value={stockUpdates[product.id] ?? ""}
                                onChange={(e) => setStockUpdates({
                                  ...stockUpdates,
                                  [product.id]: parseInt(e.target.value) || 0
                                })}
                                className="w-full sm:w-32"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          );
        })}

        {uncategorizedProducts.length > 0 && (
          <AccordionItem value="uncategorized">
            <Card className={uncategorizedLowStock > 0 ? "border-amber-500" : ""}>
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    {uncategorizedLowStock > 0 && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                    <span className="text-lg font-semibold">Uncategorized</span>
                  </div>
                  <div className="flex gap-2">
                    {uncategorizedLowStock > 0 && (
                      <Badge variant="destructive">{uncategorizedLowStock} low stock</Badge>
                    )}
                    <Badge variant="secondary">{uncategorizedProducts.length} total</Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-6 pb-4">
                  <div className="space-y-4">
                    {uncategorizedProducts.map((product) => (
                      <div key={product.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b pb-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Current Stock: {product.stock} | Gold Type: {product.gold_type}
                          </p>
                          {product.stock <= (product.low_stock_threshold || 10) && (
                            <Badge variant="destructive" className="mt-1">Low Stock Alert</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Input
                            type="number"
                            placeholder="New stock"
                            value={stockUpdates[product.id] ?? ""}
                            onChange={(e) => setStockUpdates({
                              ...stockUpdates,
                              [product.id]: parseInt(e.target.value) || 0
                            })}
                            className="w-full sm:w-32"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}
      </Accordion>

      <div className="flex justify-end">
        <Button
          onClick={() => updateStockMutation.mutate()}
          disabled={Object.keys(stockUpdates).length === 0 || updateStockMutation.isPending}
          size="lg"
        >
          {updateStockMutation.isPending ? "Updating..." : "Update All Stock"}
        </Button>
      </div>
    </div>
  );
}
