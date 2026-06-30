import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// A skeleton representing a list of items (e.g., tenants, transactions, or logs)
export const ListSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-3 rounded-lg border border-border bg-card animate-pulse"
        >
          <div className="flex items-center gap-3">
            {/* Avatar skeleton */}
            <Skeleton className="h-10 w-10 rounded-full bg-muted/70" />
            <div className="space-y-2">
              {/* Primary title */}
              <Skeleton className="h-4 w-32 bg-muted/70" />
              {/* Subtitle */}
              <Skeleton className="h-3 w-20 bg-muted/70" />
            </div>
          </div>
          <div className="text-right space-y-2">
            {/* Value/Amount */}
            <Skeleton className="h-4 w-16 ml-auto bg-muted/70" />
            {/* Status badge */}
            <Skeleton className="h-3 w-12 ml-auto bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
};

// A skeleton representing a grid or list of cards (e.g., rooms or buildings)
export const CardSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx} className="overflow-hidden border border-border bg-card animate-pulse">
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                {/* Card Title */}
                <Skeleton className="h-5 w-24 bg-muted/70" />
                {/* Sub-label */}
                <Skeleton className="h-3.5 w-16 bg-muted/70" />
              </div>
              {/* Top-right Action/Icon */}
              <Skeleton className="h-8 w-8 rounded-full bg-muted/70" />
            </div>
            
            {/* Mid section stats / details */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
              <div>
                <Skeleton className="h-3 w-12 mb-1.5 bg-muted/70" />
                <Skeleton className="h-4 w-20 bg-muted/70" />
              </div>
              <div>
                <Skeleton className="h-3 w-12 mb-1.5 bg-muted/70" />
                <Skeleton className="h-4 w-16 bg-muted/70" />
              </div>
            </div>

            {/* Bottom progress bar or tag */}
            <div className="pt-2">
              <Skeleton className="h-2 w-full rounded-full bg-muted/70" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
