import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/price-utils";

export default function Products() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (name),
          product_images (image_url, is_thumbnail)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Delete product images from storage
      const { data: images } = await supabase
        .from("product_images")
        .select("image_url")
        .eq("product_id", productId);
      
      if (images) {
        for (const img of images) {
          const path = img.image_url.split("/product-images/")[1];
          if (path) {
            await supabase.storage.from("product-images").remove([path]);
          }
        }
      }
      
      // Delete product images records
      await supabase.from("product_images").delete().eq("product_id", productId);
      
      // Delete product
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Product deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (categoriesLoading || productsLoading) return <div>Loading...</div>;

  // Group products by category
  const productsByCategory = categories?.reduce((acc, category) => {
    acc[category.id] = products?.filter(p => p.category_id === category.id) || [];
    return acc;
  }, {} as Record<string, any[]>);

  const uncategorizedProducts = products?.filter(p => !p.category_id) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-primary">Products</h1>
        <Button onClick={() => navigate("/admin/products/new")} size="sm" className="w-full sm:w-auto text-sm h-9">
          <Plus className="h-4 w-4 mr-1" />
          Add Product
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-4">
        {categories?.map((category) => {
          const categoryProducts = productsByCategory?.[category.id] || [];
          return (
            <AccordionItem key={category.id} value={category.id}>
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="text-lg font-semibold">{category.name}</span>
                    <Badge variant="secondary">{categoryProducts.length} products</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-6 pb-4">
                    {categoryProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">No products in this category</p>
                    ) : (
                      <div className="overflow-x-auto -mx-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12 text-xs">Image</TableHead>
                              <TableHead className="text-xs">Name</TableHead>
                              <TableHead className="hidden sm:table-cell text-xs">Type</TableHead>
                              <TableHead className="hidden md:table-cell text-xs">Weight</TableHead>
                              <TableHead className="hidden lg:table-cell text-xs">Labour</TableHead>
                              <TableHead className="text-xs">Stock</TableHead>
                              <TableHead className="text-right text-xs">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryProducts.map((product) => {
                              const thumbnailImage = product.product_images?.find((img: any) => img.is_thumbnail)?.image_url 
                                || product.product_images?.[0]?.image_url;
                              
                              return (
                                <TableRow key={product.id}>
                                   <TableCell>
                                     {thumbnailImage ? (
                                       <img 
                                         src={thumbnailImage} 
                                         alt={product.name}
                                         className="w-10 h-10 object-cover rounded"
                                       />
                                     ) : (
                                       <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center text-xs">
                                         💍
                                       </div>
                                     )}
                                   </TableCell>
                                   <TableCell className="font-medium text-xs md:text-sm">{product.name}</TableCell>
                                   <TableCell className="hidden sm:table-cell text-xs">{product.gold_type}</TableCell>
                                   <TableCell className="hidden md:table-cell text-xs">{product.weight_grams}g</TableCell>
                                   <TableCell className="hidden lg:table-cell text-xs">RM {formatPrice(Number(product.labour_fee))}</TableCell>
                                  <TableCell>
                                    <Badge variant={product.stock <= (product.low_stock_threshold || 10) ? "destructive" : "default"}>
                                      {product.stock}
                                    </Badge>
                                  </TableCell>
                                   <TableCell>
                                     <div className="flex gap-1 justify-end">
                                       <Button 
                                         variant="ghost" 
                                         size="sm" 
                                         onClick={() => navigate(`/admin/products/${product.id}`)}
                                         className="text-xs h-8 px-2"
                                       >
                                         Edit
                                       </Button>
                                       <AlertDialog>
                                         <AlertDialogTrigger asChild>
                                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                             <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                           </Button>
                                         </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteProductMutation.mutate(product.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
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
            <Card>
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="text-lg font-semibold">Uncategorized</span>
                  <Badge variant="secondary">{uncategorizedProducts.length} products</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-6 pb-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Image</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden sm:table-cell">Gold Type</TableHead>
                          <TableHead className="hidden md:table-cell">Weight</TableHead>
                          <TableHead className="hidden lg:table-cell">Labour Fee</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uncategorizedProducts.map((product) => {
                          const thumbnailImage = product.product_images?.find((img: any) => img.is_thumbnail)?.image_url 
                            || product.product_images?.[0]?.image_url;
                          
                          return (
                            <TableRow key={product.id}>
                              <TableCell>
                                {thumbnailImage ? (
                                  <img 
                                    src={thumbnailImage} 
                                    alt={product.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center">
                                    💍
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="hidden sm:table-cell">{product.gold_type}</TableCell>
                              <TableCell className="hidden md:table-cell">{product.weight_grams}g</TableCell>
                              <TableCell className="hidden lg:table-cell">RM {formatPrice(Number(product.labour_fee))}</TableCell>
                              <TableCell>
                                <Badge variant={product.stock <= (product.low_stock_threshold || 10) ? "destructive" : "default"}>
                                  {product.stock}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2 justify-end">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => navigate(`/admin/products/${product.id}`)}
                                  >
                                    Edit
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteProductMutation.mutate(product.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
