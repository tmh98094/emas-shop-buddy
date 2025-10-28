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
      // Validate all stock values are non-negative
      const invalidStocks = Object.entries(stockUpdates).filter(([_, stock]) => stock < 0);
      if (invalidStocks.length > 0) {
        throw new Error("库存数量不能为负数");
      }
      
      const updates = Object.entries(stockUpdates).map(([id, stock]) => 
        supabase.from("products").update({ stock }).eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stock-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setStockUpdates({});
      toast({ title: "库存更新成功" });
    },
    onError: (error: any) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  if (categoriesLoading || productsLoading) return <div>加载中...</div>;

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
      <h1 className="text-2xl md:text-4xl font-bold text-primary mb-8">库存管理</h1>

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
                        <Badge variant="destructive">{lowStockCount} 低库存</Badge>
                      )}
                      <Badge variant="secondary">{categoryProducts.length} 总计</Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-6 pb-4">
                    {categoryProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">此分类暂无产品</p>
                    ) : (
                      <div className="space-y-4">
                        {categoryProducts.map((product) => (
                          <div key={product.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b pb-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                当前库存：{product.stock} | 黄金类型：{product.gold_type}
                              </p>
                              {product.stock <= (product.low_stock_threshold || 10) && (
                                <Badge variant="destructive" className="mt-1">低库存提醒</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Input
                                type="number"
                                placeholder="新库存数量"
                                min={0}
                                value={stockUpdates[product.id] ?? ""}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setStockUpdates({
                                    ...stockUpdates,
                                    [product.id]: val
                                  });
                                }}
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
                    <span className="text-lg font-semibold">未分类</span>
                  </div>
                  <div className="flex gap-2">
                    {uncategorizedLowStock > 0 && (
                      <Badge variant="destructive">{uncategorizedLowStock} 低库存</Badge>
                    )}
                    <Badge variant="secondary">{uncategorizedProducts.length} 总计</Badge>
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
                            当前库存：{product.stock} | 黄金类型：{product.gold_type}
                          </p>
                          {product.stock <= (product.low_stock_threshold || 10) && (
                            <Badge variant="destructive" className="mt-1">低库存提醒</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Input
                            type="number"
                            placeholder="新库存数量"
                            min={0}
                            value={stockUpdates[product.id] ?? ""}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setStockUpdates({
                                ...stockUpdates,
                                [product.id]: val
                              });
                            }}
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
          {updateStockMutation.isPending ? "更新中..." : "更新所有库存"}
        </Button>
      </div>
    </div>
  );
}
