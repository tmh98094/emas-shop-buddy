import { lazy, Suspense } from "react";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { HeroCarousel } from "@/components/HeroCarousel";
import { WhatsAppFloater } from "@/components/WhatsAppFloater";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load below-the-fold components for better initial load
const ProductSection = lazy(() => import("@/components/ProductSection").then(m => ({ default: m.ProductSection })));
const CategorySection = lazy(() => import("@/components/CategorySection").then(m => ({ default: m.CategorySection })));
const FeaturedSubCategorySection = lazy(() => import("@/components/FeaturedSubCategorySection").then(m => ({ default: m.FeaturedSubCategorySection })));

const SectionSkeleton = () => (
  <div className="py-12">
    <div className="container mx-auto px-4">
      <Skeleton className="h-10 w-64 mb-8 mx-auto" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[400px]" />
        ))}
      </div>
    </div>
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEOHead 
        title="JJ Emas - 马来西亚与新加坡最受欢迎的黄金珠宝店"
        description="在JJ Emas探索精致的916和999黄金珠宝。马来西亚与新加坡信赖的黄金珠宝店，提供项链、戒指、手镯和耳环，价格竞争力强，品质保证。"
        keywords="JJ Emas, 马来西亚黄金珠宝, 新加坡黄金珠宝, 916黄金, 999黄金, 黄金项链, 黄金戒指, 黄金手镯, 黄金耳环, emas Malaysia, kedai emas"
      />
      <GoldPriceBanner />
      <Header />
      
      <main>
        <HeroCarousel />
        
        <Suspense fallback={<SectionSkeleton />}>
          <ProductSection title="精选系列" filter="featured" />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <CategorySection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <FeaturedSubCategorySection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <ProductSection title="畅销商品" filter="best_seller" />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <ProductSection title="新品上架" filter="new_arrival" />
        </Suspense>
      </main>
      
      <WhatsAppFloater />
      <Footer />
    </div>
  );
};

export default Index;
