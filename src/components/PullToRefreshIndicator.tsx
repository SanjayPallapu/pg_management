import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
  pullDistance: number;
  progress: number;
  threshold?: number;
}

export const PullToRefreshIndicator = ({ 
  isRefreshing, 
  pullDistance, 
  progress,
  threshold = 80 
}: PullToRefreshIndicatorProps) => {
  if (pullDistance <= 10 && !isRefreshing) {
    return null;
  }

  const isReady = progress >= 1;

  return (
    <div 
      className="flex items-center justify-center w-full overflow-hidden transition-all"
      style={{ 
        height: isRefreshing ? 48 : Math.min(pullDistance, threshold * 1.2),
        opacity: Math.min(progress * 1.5, 1)
      }}
    >
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20",
        "transition-all duration-200",
        isReady && !isRefreshing && "scale-110 bg-primary/20"
      )}>
        {isRefreshing ? (
          <>
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            <span className="text-sm font-medium text-primary">Refreshing...</span>
          </>
        ) : (
          <>
            <ArrowDown 
              className={cn(
                "h-4 w-4 text-primary transition-transform duration-200",
                isReady && "rotate-180"
              )} 
            />
            <span className="text-sm font-medium text-primary">
              {isReady ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
