import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export default function StockManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});

  const { data: products, isLoading } = useQuery({
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

  const lowStockProducts = products?.filter(p => p.stock <= (p.low_stock_threshold || 10)) || [];

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-4xl font-bold text-primary mb-8">Stock Management</h1>

      {lowStockProducts.length > 0 && (
        <Card className="p-6 mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100">Low Stock Alerts</h2>
          </div>
          <div className="space-y-2">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="flex justify-between items-center">
                <span className="text-amber-900 dark:text-amber-100">{product.name}</span>
                <Badge variant="destructive">
                  {product.stock} units left
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Bulk Stock Update</h2>
        <div className="space-y-4">
          {products?.map((product) => (
            <div key={product.id} className="flex items-center gap-4 border-b pb-4">
              <div className="flex-1">
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  Current Stock: {product.stock} | Gold Type: {product.gold_type}
                </p>
              </div>
              <Input
                type="number"
                placeholder="New stock"
                value={stockUpdates[product.id] ?? ""}
                onChange={(e) => setStockUpdates({
                  ...stockUpdates,
                  [product.id]: parseInt(e.target.value) || 0
                })}
                className="w-32"
              />
            </div>
          ))}
        </div>
        <Button
          className="mt-6"
          onClick={() => updateStockMutation.mutate()}
          disabled={Object.keys(stockUpdates).length === 0 || updateStockMutation.isPending}
        >
          {updateStockMutation.isPending ? "Updating..." : "Update All Stock"}
        </Button>
      </Card>
    </div>
  );
}
