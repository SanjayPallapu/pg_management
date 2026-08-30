import { useEffect, useRef } from 'react';

// Global stack of active close callbacks
const activeModals: (() => void)[] = [];
let globalHistoryPushed = false;
let isHandlingPopState = false;
// Timestamp of last modal registration — used to suppress stale popstate events
let lastModalRegisteredAt = 0;
const POPSTATE_SUPPRESS_MS = 350;

const handleGlobalPopState = () => {
  // Suppress popstate events that fire within POPSTATE_SUPPRESS_MS of a modal opening.
  // This prevents the Radix dropdown "close" popstate from consuming the dialog's history entry.
  if (Date.now() - lastModalRegisteredAt < POPSTATE_SUPPRESS_MS) {
    // Re-push the state so the next back gesture still works
    if (activeModals.length > 0) {
      window.history.pushState({ modalOpen: true }, '');
    }
    return;
  }

  // Back gesture detected: ask the most recently opened modal to close.
  // Peek instead of pop — the owning component removes itself from the stack in its
  // cleanup only if it actually closed. A handler that just closes a nested dialog
  // (while its sheet stays open) must keep its history entry alive.
  if (activeModals.length > 0) {
    const onClose = activeModals[activeModals.length - 1];
    isHandlingPopState = true;
    try {
      onClose();
    } finally {
      isHandlingPopState = false;
    }
  }

  // Keep a history entry alive while any modal is still registered
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
export const useBackGesture = (
  open: boolean,
  onClose: () => void,
  options?: { keepHistoryOnClose?: boolean }
) => {
  const onCloseRef = useRef(onClose);

  // Keep the close callback ref up to date
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const initialPath = window.location.pathname + window.location.search;

    const stableClose = () => {
      onCloseRef.current();
    };

    // Record when this modal was registered so we can suppress stale popstate events
    lastModalRegisteredAt = Date.now();

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
        // Cleanly remove modalOpen state marker without triggering browser history back
        const currentPath = window.location.pathname + window.location.search;
        const isSameRoute = currentPath === initialPath;
        if (!isHandlingPopState && isSameRoute && window.history.state?.modalOpen) {
          try {
            window.history.replaceState(null, '');
          } catch {
            // Ignore replaceState errors
          }
        }
        globalHistoryPushed = false;
      }
    };
  }, [open, options?.keepHistoryOnClose]);
};
