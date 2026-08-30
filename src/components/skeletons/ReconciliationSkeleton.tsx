import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ReconciliationSkeleton = () => {
  return (
    <div className="space-y-3.5 animate-in fade-in-50 duration-200">
      {/* Top Header Card */}
      <Card className="border-border/70 shadow-xs">
        <CardHeader className="p-3.5 pb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40 bg-muted/80" />
              <Skeleton className="h-3.5 w-28 bg-muted/60" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-lg bg-muted/70" />
              <Skeleton className="h-8 w-8 rounded-lg bg-muted/70" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3.5 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-2.5 rounded-xl bg-muted/40 border border-border/40 space-y-1.5">
                <Skeleton className="h-3 w-16 bg-muted/60" />
                <Skeleton className="h-6 w-24 bg-muted/80" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-9 flex-1 rounded-xl bg-muted/70" />
        <Skeleton className="h-9 w-28 rounded-xl bg-muted/70" />
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card shadow-xs"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl bg-primary/10" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-28 bg-muted/80" />
                  <Skeleton className="h-4 w-12 rounded-md bg-muted/60" />
                </div>
                <Skeleton className="h-3 w-36 bg-muted/50" />
              </div>
            </div>
            <div className="text-right space-y-1.5">
              <Skeleton className="h-5 w-20 ml-auto bg-muted/80" />
              <Skeleton className="h-3 w-14 ml-auto bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
