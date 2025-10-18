import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

export const HeroCarousel = () => {
  const plugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  const slides = [
    {
      title: "Exquisite 916 Gold Jewelry",
      description: "Timeless elegance crafted to perfection",
      image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&q=80",
    },
    {
      title: "Pure 999 Gold Collection",
      description: "Highest purity for discerning collectors",
      image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&q=80",
    },
    {
      title: "Wedding Collection",
      description: "Celebrate your special moments with our exclusive designs",
      image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200&q=80",
    },
  ];

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
    >
      <CarouselContent>
        {slides.map((slide, index) => (
          <CarouselItem key={index}>
            <div className="relative h-[400px] md:h-[500px] lg:h-[600px]">
              <img
                src={slide.image}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-navy/80 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-4">
                  <div className="max-w-2xl space-y-4">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">
                      {slide.title}
                    </h1>
                    <p className="text-lg md:text-xl text-white/90">
                      {slide.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-4" />
      <CarouselNext className="right-4" />
    </Carousel>
  );
};
