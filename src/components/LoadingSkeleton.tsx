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
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
    <div className="space-y-4">
      <Skeleton className="w-full aspect-square" />
    </div>
    <div className="space-y-4 md:space-y-6">
      <Skeleton className="h-8 md:h-10 w-3/4" />
      <Skeleton className="h-6 md:h-8 w-1/4" />
      <Skeleton className="h-10 md:h-12 w-1/3" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-11 md:h-12 w-full" />
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="grid gap-6 md:grid-cols-4">
    <Card className="md:col-span-1 p-6">
      <Skeleton className="h-6 w-3/4 mb-4" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </Card>
    <div className="md:col-span-3 space-y-6">
      <Card className="p-6">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
      <Card className="p-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Card>
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
