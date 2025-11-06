import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logImageLoadError } from "@/lib/error-logger";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  blurDataURL?: string;
  showRetry?: boolean;
}

export const OptimizedImage = ({ 
  src, 
  alt, 
  fallback = "/placeholder.svg",
  blurDataURL,
  className = "",
  showRetry = false,
  ...props 
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    logImageLoadError(src);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setRetryCount(prev => prev + 1);
  };

  if (hasError && !showRetry) {
    return (
      <img
        src={fallback}
        alt={alt}
        className={className}
        {...props}
      />
    );
  }

  if (hasError && showRetry) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-muted ${className}`}>
        <p className="text-xs text-muted-foreground">Failed to load</p>
        <Button size="sm" variant="outline" onClick={handleRetry}>
          <RefreshCw className="h-3 w-3 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      {isLoading && <Skeleton className={className} />}
      <img
        key={`${src}-${retryCount}`}
        src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoading ? "opacity-0 absolute" : "opacity-100"} ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        style={blurDataURL && isLoading ? {
          backgroundImage: `url(${blurDataURL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : undefined}
        {...props}
      />
    </>
  );
};
