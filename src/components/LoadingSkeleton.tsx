import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export const ProductCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="aspect-square w-full" />
    <CardContent className="p-4 space-y-2">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-1/3" />
    </CardContent>
    <CardFooter className="p-4 pt-0">
      <Skeleton className="h-10 w-full" />
    </CardFooter>
  </Card>
);

export const ProductDetailSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
    <div className="space-y-4">
      <Skeleton className="w-full h-[500px]" />
      <div className="flex gap-2">
        <Skeleton className="w-20 h-20" />
        <Skeleton className="w-20 h-20" />
        <Skeleton className="w-20 h-20" />
      </div>
    </div>
    <div className="space-y-6">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-12 w-1/3" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-12 w-full" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-12 flex-1" />
        ))}
      </div>
    ))}
  </div>
);
