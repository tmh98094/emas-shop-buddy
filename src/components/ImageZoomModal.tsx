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
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
        <div className="relative w-full h-full bg-black/95 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 z-50 text-white hover:bg-white/20"
              onClick={() => onNavigate('prev')}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {currentIndex < images.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 z-50 text-white hover:bg-white/20"
              onClick={() => onNavigate('next')}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {isVideo ? (
            <video
              src={currentImage.image_url}
              controls
              className="max-w-full max-h-full object-contain"
              autoPlay
            />
          ) : (
            <img
              src={currentImage?.image_url}
              alt="Product"
              className="max-w-full max-h-full object-contain"
            />
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
