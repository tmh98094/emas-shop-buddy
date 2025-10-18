import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { HeroCarousel } from "@/components/HeroCarousel";
import { AboutSection } from "@/components/AboutSection";
import { ProductSection } from "@/components/ProductSection";
import { CategorySection } from "@/components/CategorySection";
import { WhatsAppFloater } from "@/components/WhatsAppFloater";

const Index = () => {
  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      
      <main>
        <HeroCarousel />
        <AboutSection />
        <ProductSection title="Featured Collection" filter="featured" />
        <CategorySection />
        <ProductSection title="Best Sellers" filter="best_seller" />
        <ProductSection title="New Arrivals" filter="new_arrival" />
      </main>
      
      <WhatsAppFloater />
    </div>
  );
};

export default Index;
