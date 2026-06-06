import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const RentSheetSkeleton = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 px-3 pt-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <div className="flex gap-1 items-center">
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          {/* Stats Grid */}
          <div className="grid gap-3 md:grid-cols-2 mb-4">
            <div className="p-3 bg-paid-muted rounded-lg">
              <Skeleton className="h-8 w-28 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="p-3 bg-pending-muted rounded-lg">
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Tenant Cards */}
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <TenantCardSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const TenantCardSkeleton = () => {
  return (
    <div className="p-3 rounded-xl bg-muted/50 border-l-4 border-muted">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-3 w-16 mb-2" />
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-7 w-20" />
      </div>
    </div>
  );
};

export { TenantCardSkeleton };
