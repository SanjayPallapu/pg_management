import { useEffect, useCallback } from 'react';

// Global stack of active close callbacks
const activeModals: (() => void)[] = [];
let globalHistoryPushed = false;

const handleGlobalPopState = () => {
  // Back gesture detected: close the most recently opened modal (top of stack)
  if (activeModals.length > 0) {
    const onClose = activeModals.pop();
    if (onClose) {
      onClose();
    }
  }

  // If there are still active modals, push the state back so the next swipe-back works
  if (activeModals.length > 0) {
    window.history.pushState({ modalOpen: true }, '');
  } else {
    globalHistoryPushed = false;
  }
};

/**
 * Hook to handle OS back gesture for modal/sheet components.
 * Manages modal closures using a global stack to handle nested dialogs/sheets
 * correctly without conflicting with browser history.
 */
export const useBackGesture = (open: boolean, onClose: () => void) => {
  const onCloseRef = useRef(onClose);

  // Keep the close callback ref up to date
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const stableClose = () => {
      onCloseRef.current();
    };

    // Add to stack
    activeModals.push(stableClose);

    if (!globalHistoryPushed) {
      window.history.pushState({ modalOpen: true }, '');
      globalHistoryPushed = true;
      window.addEventListener('popstate', handleGlobalPopState);
    }

    return () => {
      // Remove from stack when unmounting or when dialog closes
      const index = activeModals.indexOf(stableClose);
      if (index > -1) {
        activeModals.splice(index, 1);
      }

      // If no more modals are active, clean up listeners and history
      if (activeModals.length === 0 && globalHistoryPushed) {
        window.removeEventListener('popstate', handleGlobalPopState);
        window.history.back();
        globalHistoryPushed = false;
      }
    };
  }, [open]);
};
