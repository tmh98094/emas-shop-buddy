import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { T } from "./T";
import { format } from "date-fns";

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="animate-pulse">Loading reviews...</div>;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <T zh="暂无评论" en="No reviews yet" />
      </div>
    );
  }

  const averageRating = (
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
  ).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="text-4xl font-bold">{averageRating}</div>
        <div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(Number(averageRating))
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            {reviews.length} <T zh="条评论" en="reviews" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold">
                  {(review.profiles as any)?.full_name || "Anonymous"}
                </div>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(review.created_at), "MMM d, yyyy")}
              </div>
            </div>
            {review.review_text && (
              <p className="text-sm text-muted-foreground mt-2">
                {review.review_text}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
