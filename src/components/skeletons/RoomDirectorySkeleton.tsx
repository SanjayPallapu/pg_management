import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const RoomDirectorySkeleton = () => {
  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* Top Banner Skeleton */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-36 bg-muted/80" />
            <Skeleton className="h-4 w-52 bg-muted/60" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-xl bg-muted/70" />
            <Skeleton className="h-9 w-24 rounded-xl bg-muted/70" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 flex-1 rounded-xl bg-muted/70" />
        <Skeleton className="h-10 w-24 rounded-xl bg-muted/70" />
      </div>

      {/* Floor Section 1 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-5 w-24 bg-muted/80" />
          <Skeleton className="h-4 w-16 bg-muted/60" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden border border-border/70 bg-card shadow-xs">
              <CardContent className="p-3.5 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-12 rounded-lg bg-primary/15" />
                    <Skeleton className="h-4 w-20 bg-muted/80" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full bg-muted/70" />
                </div>

                {/* Bed Slots Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Skeleton className="h-12 rounded-xl bg-muted/50" />
                  <Skeleton className="h-12 rounded-xl bg-muted/50" />
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <Skeleton className="h-3.5 w-20 bg-muted/60" />
                  <Skeleton className="h-3.5 w-16 bg-muted/60" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
