import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const SettingsSkeleton = () => {
  return (
    <div className="space-y-2.5 pb-4 animate-in fade-in-50 duration-200">
      {/* Profile & Subscription 2-Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-blue-600/80 to-indigo-700/80 p-3.5 text-white shadow-md">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl bg-white/20 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-32 bg-white/30" />
              <Skeleton className="h-3 w-44 bg-white/20" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/70 p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-xl bg-violet-500/20 shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 bg-muted/80" />
                <Skeleton className="h-3 w-36 bg-muted/50" />
              </div>
            </div>
            <Skeleton className="h-7 w-16 rounded-xl bg-muted/70" />
          </div>
        </Card>
      </div>

      {/* Quick Action 4-Col Grid */}
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-2.5 rounded-2xl border border-border/70 bg-card text-center space-y-1.5 shadow-xs">
            <Skeleton className="h-5 w-5 mx-auto rounded-md bg-muted/70" />
            <Skeleton className="h-3 w-12 mx-auto bg-muted/60" />
          </div>
        ))}
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
        {[1, 2, 3].map((section) => (
          <Card key={section} className="rounded-2xl border-border/70 shadow-xs">
            <div className="px-3 pb-1 pt-3">
              <Skeleton className="h-3 w-20 bg-muted/60" />
            </div>
            <CardContent className="p-1 sm:p-1.5 space-y-1">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-3 px-2.5 py-2">
                  <Skeleton className="h-8 w-8 rounded-xl bg-muted/70 shrink-0" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3.5 w-24 bg-muted/80" />
                    <Skeleton className="h-2.5 w-36 bg-muted/50" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
