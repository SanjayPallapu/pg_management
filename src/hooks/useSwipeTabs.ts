import { useRef, useCallback } from 'react';

interface UseSwipeTabsOptions {
  tabs: string[];
  currentTab: string;
  onTabChange: (tab: string) => void;
  threshold?: number;
}

/**
 * Hook to enable swipe left/right navigation between tabs.
 * Swipe left goes to next tab, swipe right goes to previous tab.
 * Accidental tab triggers during vertical scrolling are strictly prevented.
 */
export const useSwipeTabs = ({
  tabs,
  currentTab,
  onTabChange,
  threshold = 80,
}: UseSwipeTabsOptions) => {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = Math.abs(touchEndY - touchStartY.current);
    
    // Strictly cancel if user was scrolling vertically (deltaY > 35) or if vertical delta is noticeable
    if (deltaY > 35 || Math.abs(deltaX) < threshold || deltaY > Math.abs(deltaX) * 0.4) {
      return;
    }

    const currentIndex = tabs.indexOf(currentTab);
    
    if (deltaX < 0 && currentIndex < tabs.length - 1) {
      // Swipe left - go to next tab
      onTabChange(tabs[currentIndex + 1]);
    } else if (deltaX > 0 && currentIndex > 0) {
      // Swipe right - go to previous tab
      onTabChange(tabs[currentIndex - 1]);
    }
  }, [tabs, currentTab, onTabChange, threshold]);

  return {
    swipeHandlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    },
  };
};
