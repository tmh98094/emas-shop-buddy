import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { T } from "./T";

interface ProductReviewFormProps {
  orderItemId: string;
  productId: string;
  onSuccess: () => void;
}

export function ProductReviewForm({ orderItemId, productId, onSuccess }: ProductReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert review
      const { error: reviewError } = await supabase
        .from("product_reviews")
        .insert({
          product_id: productId,
          user_id: user.id,
          rating,
          review_text: reviewText,
        });

      if (reviewError) throw reviewError;

      // Update order item with review
      const { error: orderItemError } = await supabase
        .from("order_items")
        .update({
          review_rating: rating,
          review_text: reviewText,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", orderItemId);

      if (orderItemError) throw orderItemError;

      toast({
        title: "Review submitted successfully!",
      });
      onSuccess();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">
        <T zh="撰写评论" en="Write a Review" />
      </h3>
      
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-colors"
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hoveredRating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>

      <Textarea
        placeholder="Share your experience with this product..."
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        rows={4}
      />

      <Button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? (
          <T zh="提交中..." en="Submitting..." />
        ) : (
          <T zh="提交评论" en="Submit Review" />
        )}
      </Button>
    </div>
  );
}
