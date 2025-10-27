import { useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { T } from "./T";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";

export const HeroCarousel = () => {
  const [api, setApi] = useState<CarouselApi>();
  const autoplayPlugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  const slides = [
    {
      title: "精美916黄金珠宝",
      titleEn: "Exquisite 916 Gold Jewelry",
      description: "匠心独运，打造永恒优雅",
      descriptionEn: "Timeless elegance crafted to perfection",
      image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&q=80",
    },
    {
      title: "纯999黄金系列",
      titleEn: "Pure 999 Gold Collection",
      description: "为鉴赏家提供最高纯度",
      descriptionEn: "Highest purity for discerning collectors",
      image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&q=80",
    },
    {
      title: "婚礼珠宝系列",
      titleEn: "Wedding Collection",
      description: "用我们的独家设计庆祝您的特别时刻",
      descriptionEn: "Celebrate your special moments with our exclusive designs",
      image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200&q=80",
    },
  ];

  return (
    <Carousel 
      className="w-full" 
      opts={{ loop: true }}
      plugins={[autoplayPlugin.current]}
      setApi={setApi}
    >
      <CarouselContent>
        {slides.map((slide, index) => (
          <CarouselItem key={index}>
            <div className="relative h-[300px] md:h-[500px] lg:h-[600px]">
              <img
                src={slide.image}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover"
                fetchPriority={index === 0 ? "high" : undefined}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/60 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-4">
                  <div className="max-w-2xl space-y-3 md:space-y-6">
                    <h1 className="text-2xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg">
                      <T zh={slide.title} en={slide.titleEn} />
                    </h1>
                    <p className="text-sm md:text-xl text-primary drop-shadow-md font-medium">
                      <T zh={slide.description} en={slide.descriptionEn} />
                    </p>
                    <Link to="/products">
                      <Button size="lg" className="bg-primary text-primary-foreground hover:bg-gold-light font-semibold shadow-lg h-11 md:h-12 text-sm md:text-base touch-manipulation">
                        <T zh="立即选购" en="Shop Now" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2 md:left-4 bg-navy/80 hover:bg-navy text-primary border-primary h-10 w-10 md:h-12 md:w-12" />
      <CarouselNext className="right-2 md:right-4 bg-navy/80 hover:bg-navy text-primary border-primary h-10 w-10 md:h-12 md:w-12" />
    </Carousel>
  );
};
