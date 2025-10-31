import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Minus, Plus, ExternalLink, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { calculatePrice, formatPrice } from "@/lib/price-utils";
import { T } from "@/components/T";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateVariantSelection, SelectedVariantsMap } from "@/lib/cart-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
interface ProductQuickViewProps {
  product: any;
  goldPrice: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductQuickView({ product, goldPrice, open, onOpenChange }: ProductQuickViewProps) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariantsMap>({});
  const [variantError, setVariantError] = useState("");

  // Calculate price with variant weight adjustment if applicable
  const getEffectiveWeight = () => {
    const firstVariant = Object.values(selectedVariants)[0];
    return firstVariant?.weight_adjustment ?? Number(product.weight_grams);
  };

  const totalPrice = calculatePrice(goldPrice, getEffectiveWeight(), Number(product.labour_fee));
  
  const sortedImages = (product.product_images || []).sort((a: any, b: any) => 
    (a.display_order || 0) - (b.display_order || 0)
  );

  // Fetch variants if not present
  const [fetchedVariants, setFetchedVariants] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      if (!open) return;
      if (product?.id && (!product.product_variants || product.product_variants.length === 0)) {
        const { data, error } = await supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", product.id);
        if (!error) {
          setFetchedVariants(data || []);
        }
      }
    };
    load();
  }, [open, product?.id, product?.product_variants]);

  const variantsArray = (product.product_variants && product.product_variants.length > 0)
    ? product.product_variants
    : fetchedVariants;

  // Group variants by name
  const variantGroups = (variantsArray || []).reduce((acc: any, variant: any) => {
    if (!acc[variant.name]) {
      acc[variant.name] = [];
    }
    acc[variant.name].push(variant);
    return acc;
  }, {});

  const handleAddToCart = async () => {
    // Validate variant selection if product has variants
    if (Object.keys(variantGroups).length > 0) {
      const validation = validateVariantSelection(variantGroups, selectedVariants);
      if (!validation.isValid) {
        setVariantError(validation.message);
        return;
      }
    }
    
    await addItem(product.id, quantity, selectedVariants);
    onOpenChange(false);
    setSelectedVariants({});
    setVariantError("");
  };

  const handleViewFullDetails = () => {
    onOpenChange(false);
    navigate(`/product/${product.slug}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Quick View: {product.name}</DialogTitle>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left: Images */}
          <div className="space-y-3">
            <AspectRatio ratio={1} className="bg-muted rounded-lg overflow-hidden">
              <img 
                src={sortedImages[selectedImageIndex]?.image_url || "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80&fm=webp&auto=format"} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </AspectRatio>
            
            {sortedImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {sortedImages.slice(0, 4).map((img: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden transition-all ${
                      selectedImageIndex === index 
                        ? 'border-primary ring-2 ring-primary' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img 
                      src={img.image_url} 
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-2">{product.name}</h2>
              <Badge variant="secondary">{product.gold_type} Gold</Badge>
            </div>

            <div className="text-2xl font-bold text-primary">
              RM {formatPrice(totalPrice)}
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <p><T zh="重量" en="Weight" />: {product.weight_grams}g</p>
              <p><T zh="库存" en="Stock" />: {product.stock} <T zh="件可用" en="available" /></p>
            </div>

            {/* Variants */}
            {Object.keys(variantGroups).length > 0 && (
              <div className="space-y-3 border-t border-b py-4">
                <h3 className="font-semibold"><T zh="选择选项" en="Select Options" /></h3>
                {variantError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{variantError}</AlertDescription>
                  </Alert>
                )}
                {Object.keys(variantGroups).map((variantName) => (
                  <div key={variantName}>
                    <label className="text-sm font-medium mb-2 block">{variantName}</label>
                    <Select
                      value={selectedVariants[variantName]?.id || ""}
                      onValueChange={(value) => {
                        const variant = variantGroups[variantName].find((v: any) => v.id === value);
                        if (variant) {
                          setSelectedVariants(prev => ({
                            ...prev,
                            [variantName]: { 
                              name: variant.name, 
                              value: variant.value, 
                              id: variant.id,
                              weight_adjustment: variant.weight_adjustment 
                            }
                          }));
                          setVariantError(""); // Clear error on selection
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${variantName}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {variantGroups[variantName].map((variant: any) => (
                          <SelectItem key={variant.id} value={variant.id}>
                            {variant.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity */}
            <div>
              <h3 className="font-semibold mb-2"><T zh="数量" en="Quantity" /></h3>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="w-full"
              >
                {product.stock === 0 ? (
                  <T zh="缺货" en="Out of Stock" />
                ) : (
                  <T zh="加入购物车" en="Add to Cart" />
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleViewFullDetails}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                <T zh="查看完整详情" en="View Full Details" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
