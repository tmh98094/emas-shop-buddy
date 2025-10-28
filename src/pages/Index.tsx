import { lazy, Suspense } from "react";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { HeroCarousel } from "@/components/HeroCarousel";
import { WhatsAppFloater } from "@/components/WhatsAppFloater";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load below-the-fold components for better initial load
const AboutSection = lazy(() => import("@/components/AboutSection").then(m => ({ default: m.AboutSection })));
const ProductSection = lazy(() => import("@/components/ProductSection").then(m => ({ default: m.ProductSection })));
const CategorySection = lazy(() => import("@/components/CategorySection").then(m => ({ default: m.CategorySection })));

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
        title="JJ Emas - Malaysia & Singapore's Favorite Gold Jewelry Store"
        description="Discover exquisite 916 and 999 gold jewelry at JJ Emas. Malaysia & Singapore's trusted gold jewelry store offering necklaces, rings, bracelets, and earrings with competitive pricing and authentic quality."
        keywords="JJ Emas, gold jewelry Malaysia, gold jewelry Singapore, 916 gold, 999 gold, gold necklace, gold ring, gold bracelet, gold earrings, emas Malaysia, kedai emas, Malaysian gold jewelry, Singapore gold jewelry"
      />
      <GoldPriceBanner />
      <Header />
      
      <main>
        <HeroCarousel />
        
        <Suspense fallback={<SectionSkeleton />}>
          <AboutSection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <ProductSection title="Featured Collection" filter="featured" />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <CategorySection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <ProductSection title="Best Sellers" filter="best_seller" />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <ProductSection title="New Arrivals" filter="new_arrival" />
        </Suspense>
      </main>
      
      <WhatsAppFloater />
      <Footer />
    </div>
  );
};

export default Index;
