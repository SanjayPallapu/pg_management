import { useState, useEffect } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { Wifi, WifiOff, Loader2, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NetworkStatusIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineToast, setShowOfflineToast] = useState(false);
  const pendingMutations = useIsMutating();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineToast(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show indicator when offline or has pending mutations
  if (isOnline && pendingMutations === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Offline Badge */}
      {!isOnline && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/10 border border-destructive/30 rounded-full animate-pulse">
          <WifiOff className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs font-medium text-destructive">Offline</span>
        </div>
      )}

      {/* Pending Mutations Badge */}
      {pendingMutations > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-warning/10 border border-warning/30 rounded-full">
          <Loader2 className="h-3.5 w-3.5 text-warning animate-spin" />
          <span className="text-xs font-medium text-warning">
            {pendingMutations} syncing
          </span>
        </div>
      )}

      {/* Queued indicator when offline with pending mutations */}
      {!isOnline && pendingMutations > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
          <CloudOff className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium text-amber-500">
            {pendingMutations} queued
          </span>
        </div>
      )}
    </div>
  );
};
