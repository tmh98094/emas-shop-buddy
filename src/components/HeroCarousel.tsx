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
    Autoplay({ delay: 5000, stopOnInteraction: false })
  );

  const slides = [
    {
      title: "999纯金项链",
      titleEn: "999 Pure Gold Necklace",
      description: "传统与现代的完美结合",
      descriptionEn: "Perfect blend of tradition and modernity",
      image: "https://images.unsplash.com/photo-1721807550942-a218261a4896?w=800&q=40&fm=webp&auto=format",
      srcset: "https://images.unsplash.com/photo-1721807550942-a218261a4896?w=400&q=40&fm=webp&auto=format 400w, https://images.unsplash.com/photo-1721807550942-a218261a4896?w=800&q=40&fm=webp&auto=format 800w, https://images.unsplash.com/photo-1721807550942-a218261a4896?w=1200&q=40&fm=webp&auto=format 1200w",
    },
    {
      title: "典雅黄金项链",
      titleEn: "Elegant Gold Necklaces",
      description: "匠心独运，打造永恒优雅",
      descriptionEn: "Timeless elegance crafted to perfection",
      image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80&fm=webp&auto=format",
      srcset: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80&fm=webp&auto=format 400w, https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80&fm=webp&auto=format 800w, https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&q=80&fm=webp&auto=format 1200w",
    },
  ];

  return (
    <div className="overflow-hidden">
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
                srcSet={slide.srcset}
                sizes="100vw"
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "low"}
                decoding="async"
                width="1200"
                height="600"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/60 to-transparent" />
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
      <CarouselPrevious className="left-2 md:left-4 bg-secondary/80 hover:bg-secondary text-primary border-primary h-10 w-10 md:h-12 md:w-12" />
      <CarouselNext className="right-2 md:right-4 bg-secondary/80 hover:bg-secondary text-primary border-primary h-10 w-10 md:h-12 md:w-12" />
    </Carousel>
    </div>
  );
};
