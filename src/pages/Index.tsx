import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { HeroCarousel } from "@/components/HeroCarousel";
import { AboutSection } from "@/components/AboutSection";
import { ProductSection } from "@/components/ProductSection";
import { CategorySection } from "@/components/CategorySection";
import { WhatsAppFloater } from "@/components/WhatsAppFloater";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";

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
        <AboutSection />
        <ProductSection title="Featured Collection" filter="featured" />
        <CategorySection />
        <ProductSection title="Best Sellers" filter="best_seller" />
        <ProductSection title="New Arrivals" filter="new_arrival" />
      </main>
      
      <WhatsAppFloater />
      <Footer />
    </div>
  );
};

export default Index;
