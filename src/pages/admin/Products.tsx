import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
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

export default function Products() {
  const navigate = useNavigate();
  
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

  if (categoriesLoading || productsLoading) return <div>Loading...</div>;

  // Group products by category
  const productsByCategory = categories?.reduce((acc, category) => {
    acc[category.id] = products?.filter(p => p.category_id === category.id) || [];
    return acc;
  }, {} as Record<string, any[]>);

  const uncategorizedProducts = products?.filter(p => !p.category_id) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl md:text-4xl font-bold text-primary">Products</h1>
        <Button onClick={() => navigate("/admin/products/new")} size="sm" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
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
                              <TableHead>Actions</TableHead>
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
                                  <TableCell className="hidden lg:table-cell">RM {Number(product.labour_fee).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Badge variant={product.stock <= (product.low_stock_threshold || 10) ? "destructive" : "default"}>
                                      {product.stock}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => navigate(`/admin/products/${product.id}`)}
                                    >
                                      Edit
                                    </Button>
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
                          <TableHead>Actions</TableHead>
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
                              <TableCell className="hidden lg:table-cell">RM {Number(product.labour_fee).toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={product.stock <= (product.low_stock_threshold || 10) ? "destructive" : "default"}>
                                  {product.stock}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => navigate(`/admin/products/${product.id}`)}
                                >
                                  Edit
                                </Button>
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
