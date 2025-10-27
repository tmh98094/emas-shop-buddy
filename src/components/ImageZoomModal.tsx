import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageZoomModalProps {
  images: Array<{ image_url: string; media_type?: string }>;
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export const ImageZoomModal = ({ images, currentIndex, open, onOpenChange, onNavigate }: ImageZoomModalProps) => {
  const currentImage = images[currentIndex];
  const isVideo = currentImage?.media_type === 'video';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] h-[85vh] md:h-[90vh] p-0">
        <div className="relative w-full h-full bg-black/95 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 md:top-4 md:right-4 z-50 text-white hover:bg-white/20 h-11 w-11 md:h-10 md:w-10"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-6 w-6 md:h-6 md:w-6" />
          </Button>

          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 md:left-4 z-50 text-white hover:bg-white/20 h-12 w-12 md:h-10 md:w-10"
              onClick={() => onNavigate('prev')}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-8 w-8 md:h-8 md:w-8" />
            </Button>
          )}

          {currentIndex < images.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 md:right-4 z-50 text-white hover:bg-white/20 h-12 w-12 md:h-10 md:w-10"
              onClick={() => onNavigate('next')}
              aria-label="Next image"
            >
              <ChevronRight className="h-8 w-8 md:h-8 md:w-8" />
            </Button>
          )}

          {isVideo ? (
            <video
              src={currentImage.image_url}
              controls
              className="max-w-full max-h-full object-contain px-2 md:px-0"
              autoPlay
            />
          ) : (
            <img
              src={currentImage?.image_url}
              alt={`Product image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain px-2 md:px-0"
            />
          )}

          <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 text-white text-sm md:text-base bg-black/50 px-3 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
