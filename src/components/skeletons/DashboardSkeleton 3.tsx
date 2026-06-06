import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Capacity & Occupancy Card */}
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-4" />
                </div>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-4" />
                </div>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Status Card */}
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-4" />
                </div>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-4" />
                </div>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Cards Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Payment Mode Card */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Collected Card */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Skeleton className="h-8 w-28 mb-2" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-3/4" />
          </CardContent>
        </Card>

        {/* Potential Revenue Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="text-right">
                <Skeleton className="h-6 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Cards */}
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-4 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Day Guest Card */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
          <Skeleton className="h-3 w-full mt-2" />
        </CardContent>
      </Card>
    </div>
  );
};
