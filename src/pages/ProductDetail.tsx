import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ImageZoomModal } from "@/components/ImageZoomModal";
import { OutOfStockWhatsApp } from "@/components/OutOfStockWhatsApp";
import { SEOHead } from "@/components/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { WhatsAppFloater } from "@/components/WhatsAppFloater";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { calculatePrice, formatPrice } from "@/lib/price-utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Play } from "lucide-react";
import { T } from "@/components/T";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ProductDetailSkeleton } from "@/components/LoadingSkeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showZoom, setShowZoom] = useState(false);

  const { data: goldPrices } = useQuery({
    queryKey: ["gold-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["gold_price_916", "gold_price_999"]);
      if (error) throw error;
      const prices = { "916": 0, "999": 0 };
      data?.forEach(item => {
        if (item.key === "gold_price_916") prices["916"] = (item.value as any).price;
        else if (item.key === "gold_price_999") prices["999"] = (item.value as any).price;
      });
      return prices;
    },
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_images (*)
        `)
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <GoldPriceBanner />
        <Header />
        <main className="container mx-auto px-4 py-12">
          <ProductDetailSkeleton />
        </main>
      </div>
    );
  }
  
  if (!product) return <div>Product not found</div>;

  const goldPrice = goldPrices?.[product.gold_type as "916" | "999"] || 0;
  const totalPrice = calculatePrice(goldPrice, Number(product.weight_grams), Number(product.labour_fee));

  const handleAddToCart = async () => {
    await addItem(product.id, quantity);
    navigate("/cart");
  };

  const sortedImages = (product.product_images || []).sort((a: any, b: any) => 
    (a.display_order || 0) - (b.display_order || 0)
  );

  return (
    <div className="min-h-screen">
      <SEOHead
        title={product.name}
        description={product.description || `${product.gold_type} gold jewelry, ${product.weight_grams}g`}
        keywords={`${product.name}, ${product.gold_type} gold, gold jewelry, buy gold online`}
        ogImage={product.product_images?.[0]?.image_url}
        type="product"
      />
      <GoldPriceBanner />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center space-x-2">
            <li><a href="/categories" className="text-muted-foreground hover:text-primary">Categories</a></li>
            <li className="text-muted-foreground">/</li>
            <li className="text-foreground font-medium">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left side: Main image + Gallery */}
          <div className="space-y-4">
            {/* Main Image - Smaller */}
            <Card 
              className="overflow-hidden cursor-zoom-in" 
              onClick={() => {
                setShowZoom(true);
              }}
            >
              <AspectRatio ratio={1} className="bg-muted">
                {sortedImages[selectedImageIndex]?.media_type === 'video' ? (
                  <video 
                    src={sortedImages[selectedImageIndex]?.image_url} 
                    className="w-full h-full object-cover" 
                    controls 
                  />
                ) : (
                  <img 
                    src={sortedImages[selectedImageIndex]?.image_url || "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80&fm=webp&auto=format"} 
                    alt={`${product.name} - Main`} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </AspectRatio>
            </Card>

            {/* Product Image Gallery - Horizontal on mobile, Grid on desktop */}
            {sortedImages.length > 1 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  <T zh="产品图库" en="Product Image Gallery" />
                </h3>
                <ScrollArea className="w-full">
                  <div className="flex lg:grid lg:grid-cols-4 gap-2 pb-2">
                    {sortedImages.map((img: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative flex-shrink-0 w-20 h-20 lg:w-full lg:aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImageIndex === index 
                            ? 'border-primary ring-2 ring-primary' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {img.media_type === 'video' ? (
                          <div className="relative w-full h-full bg-muted flex items-center justify-center">
                            <Play className="h-6 w-6 text-primary" />
                            <video 
                              src={img.image_url} 
                              className="absolute inset-0 w-full h-full object-cover opacity-50"
                              preload="metadata"
                            />
                          </div>
                        ) : (
                          <img 
                            src={img.image_url} 
                            alt={`Thumbnail ${index + 1}`} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            <ImageZoomModal
              images={sortedImages || []}
              currentIndex={selectedImageIndex}
              open={showZoom}
              onOpenChange={setShowZoom}
              onNavigate={(dir) => setSelectedImageIndex(prev => dir === 'prev' ? Math.max(0, prev - 1) : Math.min(sortedImages.length - 1, prev + 1))}
            />
          </div>

          {/* Right side: Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-2">{product.name}</h1>
              <Badge variant="secondary">{product.gold_type} Gold</Badge>
            </div>

            <div className="text-2xl lg:text-3xl font-bold text-primary">
              RM {formatPrice(totalPrice)}
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p><T zh="重量" en="Weight" />: {product.weight_grams}g</p>
            </div>

            <div>
              <p className="text-sm">
                <T zh="库存" en="Stock" />: <span className="font-semibold">{product.stock} <T zh="件可用" en="available" /></span>
              </p>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="font-semibold mb-3"><T zh="数量" en="Quantity" /></h3>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-11 w-11 md:h-10 md:w-10"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
                <span className="text-xl md:text-lg font-semibold w-16 md:w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="h-11 w-11 md:h-10 md:w-10"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                size="lg"
                className="w-full h-12 text-base md:h-10"
                aria-label={product.stock === 0 ? "Out of stock" : "Add to cart"}
              >
                {product.stock === 0 ? (
                  <T zh="缺货" en="Out of Stock" />
                ) : (
                  <T zh="加入购物车" en="Add to Cart" />
                )}
              </Button>
              
              {product.stock <= 0 && (
                <OutOfStockWhatsApp
                  productName={product.name}
                  productSlug={product.slug}
                />
              )}
            </div>
          </div>
        </div>

        {/* Product Description */}
        <div className="mt-16">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">
              <T zh="产品详情" en="Product Description" />
            </h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {product.description || "No description available."}
            </p>
          </Card>
        </div>
      </main>

      <Footer />
      <WhatsAppFloater />
    </div>
  );
}
