import { useState, useCallback, useRef, TouchEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UsePullToRefreshOptions {
  threshold?: number;
  onRefresh?: () => Promise<void>;
}

export const usePullToRefresh = (options: UsePullToRefreshOptions = {}) => {
  const { threshold = 80, onRefresh } = options;
  const queryClient = useQueryClient();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number>(0);
  const isAtTop = useRef<boolean>(true);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Check if we're at the top of the page
    isAtTop.current = window.scrollY === 0;
    if (isAtTop.current) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isAtTop.current || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Apply resistance to pull
      const resistance = 0.5;
      setPullDistance(Math.min(diff * resistance, threshold * 1.5));
    }
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          // Default: invalidate all queries
          await queryClient.invalidateQueries();
        }
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh, queryClient]);

  const pullToRefreshHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return {
    isRefreshing,
    pullDistance,
    pullToRefreshHandlers,
    shouldShowIndicator: pullDistance > 20 || isRefreshing,
    progress: Math.min(pullDistance / threshold, 1),
  };
};
