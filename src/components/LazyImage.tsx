import { useState, useEffect, useRef } from "react";
import { logImageLoadError } from "@/lib/error-logger";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  blurDataURL?: string;
  onError?: () => void;
}

export const LazyImage = ({ src, alt, placeholder = "/placeholder.svg", blurDataURL, className = "", onError, ...props }: LazyImageProps) => {
  const [imageSrc, setImageSrc] = useState(blurDataURL || placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "100px", // Increased preload distance
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src]);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    logImageLoadError(src);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <span className="text-xs text-muted-foreground">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`transition-opacity duration-150 ${isLoading ? "opacity-0" : "opacity-100"} ${className}`}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
};
