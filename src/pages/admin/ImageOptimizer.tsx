import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import imageCompression from "browser-image-compression";

export default function ImageOptimizer() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const { data: images, isLoading } = useQuery({
    queryKey: ['product-images-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1500,
      useWebWorker: true,
      fileType: 'image/webp',
      quality: 0.90
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error('Error compressing image:', error);
      return file;
    }
  };

  const generateBlurPlaceholder = async (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 20;
          canvas.height = 20;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.filter = 'blur(10px)';
            ctx.drawImage(img, 0, 0, 20, 20);
            resolve(canvas.toDataURL('image/jpeg', 0.5));
          }
        };
      };
      
      reader.readAsDataURL(blob);
    });
  };

  const handleOptimizeAll = async () => {
    if (!images || images.length === 0) return;
    
    setIsProcessing(true);
    setProgress({ current: 0, total: images.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      setProgress({ current: i + 1, total: images.length });

      try {
        // Download existing image
        const response = await fetch(image.image_url);
        const blob = await response.blob();
        const file = new File([blob], `image-${image.id}.jpg`, { type: blob.type });

        // Compress the image
        const compressedFile = await compressImage(file);
        
        // Generate blur placeholder
        const blurPlaceholder = await generateBlurPlaceholder(compressedFile);

        // Upload compressed image
        const fileName = `${image.product_id}/${Date.now()}-optimized.webp`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, compressedFile, {
            upsert: false,
            contentType: 'image/webp'
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(uploadData.path);

        // Update database with new URL and blur placeholder
        const { error: updateError } = await supabase
          .from('product_images')
          .update({ 
            image_url: publicUrl,
            blur_placeholder: blurPlaceholder
          })
          .eq('id', image.id);

        if (updateError) throw updateError;

        // Delete old image if different
        if (image.image_url !== publicUrl) {
          const oldPath = image.image_url.split('/product-images/')[1];
          if (oldPath) {
            await supabase.storage.from('product-images').remove([oldPath]);
          }
        }

        successCount++;
      } catch (error) {
        console.error(`Error optimizing image ${image.id}:`, error);
        errorCount++;
      }
    }

    setIsProcessing(false);
    toast({
      title: "Optimization Complete",
      description: `${successCount} images optimized successfully. ${errorCount} errors.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Image Optimizer</h1>
        <p className="text-muted-foreground mt-2">
          Optimize all product images to reduce file size while maintaining quality
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Total Images</h3>
              <p className="text-sm text-muted-foreground">
                {images?.length || 0} product images in database
              </p>
            </div>
            <Button
              onClick={handleOptimizeAll}
              disabled={isProcessing || !images || images.length === 0}
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Optimize All Images
                </>
              )}
            </Button>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={(progress.current / progress.total) * 100} />
              <p className="text-sm text-muted-foreground text-center">
                Processing {progress.current} of {progress.total} images...
              </p>
            </div>
          )}
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-medium">Optimization Settings:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Max file size: 1.5 MB (preserves quality)</li>
            <li>• Max resolution: 1500px (high detail)</li>
            <li>• Format: WebP (90% quality)</li>
            <li>• Generates blur placeholders for fast loading</li>
          </ul>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>Warning:</strong> This process will replace all existing product images with optimized versions. 
            The original images will be deleted. This action cannot be undone.
          </p>
        </div>
      </Card>
    </div>
  );
}
