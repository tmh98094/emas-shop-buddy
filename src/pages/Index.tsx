import { lazy, Suspense } from "react";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { WhatsAppFloater } from "@/components/WhatsAppFloater";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import FloatingGuestNotice from "@/components/FloatingGuestNotice";

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
        title="JJ Emas - 黄金饰品"
        description="探索精致的916和999黄金珠宝，提供项链、戒指、手镯和耳环，价格实惠，品质保证。"
        keywords="JJ Emas, 黄金饰品, 916黄金, 999黄金, 黄金项链, 黄金戒指, 黄金手镯, 黄金耳环"
      />
      <GoldPriceBanner />
      <Header />
      
      <main>
        <Suspense fallback={<SectionSkeleton />}>
          <ProductSection title="新品上架" filter="new_arrival" />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <ProductSection title="畅销商品" filter="best_seller" />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <CategorySection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <FeaturedSubCategorySection />
        </Suspense>
      </main>
      
      <WhatsAppFloater />
      <FloatingGuestNotice />
      <Footer />
    </div>
  );
};

export default Index;
