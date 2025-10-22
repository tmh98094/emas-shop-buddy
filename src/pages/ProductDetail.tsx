import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ImageZoomModal } from "@/components/ImageZoomModal";
import { ProductReviews } from "@/components/ProductReviews";
import { OutOfStockWhatsApp } from "@/components/OutOfStockWhatsApp";
import { SEOHead } from "@/components/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { WhatsAppFloater } from "@/components/WhatsAppFloater";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { calculatePrice, formatPrice } from "@/lib/price-utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, Plus } from "lucide-react";
import { T } from "@/components/T";

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

  if (isLoading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  const goldPrice = goldPrices?.[product.gold_type as "916" | "999"] || 0;
  const totalPrice = calculatePrice(goldPrice, Number(product.weight_grams), Number(product.labour_fee));

  const handleAddToCart = async () => {
    await addItem(product.id, quantity);
    navigate("/cart");
  };

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Carousel */}
          <div>
            <Carousel className="w-full">
              <CarouselContent>
                {product.product_images?.map((img: any, index: number) => (
                  <CarouselItem key={index}>
                    <Card 
                      className="overflow-hidden cursor-zoom-in" 
                      onClick={() => {
                        setSelectedImageIndex(index);
                        setShowZoom(true);
                      }}
                    >
                      {img.media_type === 'video' ? (
                        <video src={img.image_url} className="w-full h-[500px] object-cover" controls />
                      ) : (
                        <img src={img.image_url} alt={`${product.name} - Image ${index + 1}`} className="w-full h-[500px] object-cover" />
                      )}
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
            <ImageZoomModal
              images={product.product_images || []}
              currentIndex={selectedImageIndex}
              open={showZoom}
              onOpenChange={setShowZoom}
              onNavigate={(dir) => setSelectedImageIndex(prev => dir === 'prev' ? Math.max(0, prev - 1) : Math.min(product.product_images.length - 1, prev + 1))}
            />
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2">{product.name}</h1>
              <Badge variant="secondary">{product.gold_type} Gold</Badge>
            </div>

            <div className="text-3xl font-bold text-primary">
              RM {formatPrice(totalPrice)}
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p><T zh="金价" en="Gold Price" /> ({product.gold_type}): RM {formatPrice(goldPrice)}/g</p>
              <p><T zh="重量" en="Weight" />: {product.weight_grams}g</p>
              <p><T zh="工费" en="Labour Fee" />: RM {formatPrice(Number(product.labour_fee))}</p>
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

            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                size="lg"
                className="w-full"
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

        {/* Product Details and Reviews Tabs */}
        <div className="mt-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="description">
                <T zh="产品详情" en="Description" />
              </TabsTrigger>
              <TabsTrigger value="reviews">
                <T zh="客户评论" en="Reviews" />
              </TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-6">
              <Card className="p-6">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {product.description || "No description available."}
                </p>
              </Card>
            </TabsContent>
            <TabsContent value="reviews" className="mt-6">
              <Card className="p-6">
                <ProductReviews productId={product.id} />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <WhatsAppFloater />
    </div>
  );
}
