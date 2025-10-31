import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ImageZoomModal } from "@/components/ImageZoomModal";
import { OutOfStockWhatsApp } from "@/components/OutOfStockWhatsApp";
import { SEOHead } from "@/components/SEOHead";
import { Breadcrumbs } from "@/components/Breadcrumbs";
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
import { Minus, Plus, Play, ShoppingCart } from "lucide-react";
import { T } from "@/components/T";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ProductDetailSkeleton } from "@/components/LoadingSkeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateProductSchema, generateBreadcrumbSchema } from "@/lib/structured-data";
import { Helmet } from "react-helmet-async";

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { name: string; value: string; id: string; weight_adjustment?: number }>>({});
  const [showStickyCart, setShowStickyCart] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [showMagnifier, setShowMagnifier] = useState(false);

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
          product_images (*),
          product_variants (*)
        `)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Sticky cart bar visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCart(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
  
  // Calculate price with variant weight adjustment if applicable
  const getEffectiveWeight = () => {
    const firstVariant = Object.values(selectedVariants)[0];
    return firstVariant?.weight_adjustment ?? Number(product.weight_grams);
  };
  
  const totalPrice = calculatePrice(goldPrice, getEffectiveWeight(), Number(product.labour_fee));

  // Group variants by name
  const variantGroups = (product.product_variants || []).reduce((acc: any, variant: any) => {
    if (!acc[variant.name]) {
      acc[variant.name] = [];
    }
    acc[variant.name].push(variant);
    return acc;
  }, {});

  const handleAddToCart = async () => {
    await addItem(product.id, quantity, selectedVariants);
    navigate("/cart");
  };

  const sortedImages = (product.product_images || []).sort((a: any, b: any) => 
    (a.display_order || 0) - (b.display_order || 0)
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setHoverPos({ x, y });
  };

  // Structured data for SEO
  const productSchema = generateProductSchema(product, goldPrice);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: window.location.origin },
    { name: "Categories", url: `${window.location.origin}/categories` },
    { name: product.name, url: window.location.href }
  ]);

  // Selected variants display
  const selectedVariantsDisplay = Object.values(selectedVariants).length > 0 && (
    <div className="text-sm text-muted-foreground">
      <span className="font-medium">Selected: </span>
      {Object.values(selectedVariants).map((v, i) => (
        <span key={i}>
          {v.value}{i < Object.values(selectedVariants).length - 1 ? ' • ' : ''}
        </span>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

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
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Categories", href: "/categories" },
          { label: product.name, href: `/product/${product.slug}` }
        ]} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left side: Main image + Gallery */}
          <div className="space-y-4">
            {/* Main Image with hover zoom on desktop */}
            <Card 
              className="overflow-hidden cursor-zoom-in relative" 
              onClick={() => {
                setShowZoom(true);
              }}
              onMouseEnter={() => setShowMagnifier(true)}
              onMouseLeave={() => setShowMagnifier(false)}
              onMouseMove={handleMouseMove}
            >
              <AspectRatio ratio={1} className="bg-muted">
                {sortedImages[selectedImageIndex]?.media_type === 'video' ? (
                  <video 
                    src={sortedImages[selectedImageIndex]?.image_url} 
                    className="w-full h-full object-cover" 
                    controls 
                  />
                ) : (
                  <>
                    <img 
                      src={sortedImages[selectedImageIndex]?.image_url || "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80&fm=webp&auto=format"} 
                      alt={`${product.name} - Main`} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Hover zoom overlay - desktop only */}
                    {showMagnifier && sortedImages[selectedImageIndex]?.media_type !== 'video' && (
                      <div 
                        className="hidden lg:block absolute inset-0 pointer-events-none bg-no-repeat"
                        style={{
                          backgroundImage: `url(${sortedImages[selectedImageIndex]?.image_url})`,
                          backgroundSize: '200%',
                          backgroundPosition: `${hoverPos.x}% ${hoverPos.y}%`,
                          opacity: 0.8,
                        }}
                      />
                    )}
                  </>
                )}
              </AspectRatio>
            </Card>

            {/* Product Image Gallery */}
            {sortedImages.length > 1 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  <T zh="产品图库" en="Product Image Gallery" />
                </h3>
                
                {/* Mobile Carousel */}
                <div className="lg:hidden">
                  <Carousel className="w-full">
                    <CarouselContent className="-ml-2">
                      {sortedImages.map((img: any, index: number) => (
                        <CarouselItem key={index} className="pl-2 basis-1/4">
                          <button
                            onClick={() => setSelectedImageIndex(index)}
                            className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
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
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </Carousel>
                </div>

                {/* Desktop - Use carousel if more than 4 images, else grid */}
                {sortedImages.length <= 4 ? (
                  <div className="hidden lg:grid lg:grid-cols-4 gap-2">
                    {sortedImages.map((img: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
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
                ) : (
                  <div className="hidden lg:block">
                    <Carousel className="w-full">
                      <CarouselContent className="-ml-2">
                        {sortedImages.map((img: any, index: number) => (
                          <CarouselItem key={index} className="pl-2 basis-1/4">
                            <button
                              onClick={() => setSelectedImageIndex(index)}
                              className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
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
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </Carousel>
                  </div>
                )}
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
              {selectedVariantsDisplay}
            </div>

            <div className="text-2xl lg:text-3xl font-bold text-primary">
              RM {formatPrice(totalPrice)}
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p><T zh="重量" en="Weight" />: {product.weight_grams}g</p>
            </div>


            {/* Variants Selection */}
            {Object.keys(variantGroups).length > 0 && (
              <div className="space-y-4 border-t border-b py-4">
                <h3 className="font-semibold"><T zh="选择选项" en="Select Options" /></h3>
                {Object.keys(variantGroups).map((variantName) => (
                  <div key={variantName} className="space-y-2">
                    <label className="text-sm font-medium">{variantName}</label>
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

      {/* Mobile Sticky Add to Cart Bar - Optimized to 2 rows */}
      {showStickyCart && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t shadow-lg z-40 p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-primary">
              RM {formatPrice(totalPrice)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 touch-manipulation"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold text-sm">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 touch-manipulation"
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button 
            className="w-full h-11 text-base touch-manipulation" 
            onClick={handleAddToCart}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? (
              <T zh="缺货" en="Out of Stock" />
            ) : product.is_preorder ? (
              <>
                <ShoppingCart className="mr-2 h-5 w-5" />
                <T zh="预购" en="Pre-order" />
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-5 w-5" />
                <T zh="加入购物车" en="Add to Cart" />
              </>
            )}
          </Button>
        </div>
      )}

      <Footer />
      <WhatsAppFloater />
    </div>
  );
}