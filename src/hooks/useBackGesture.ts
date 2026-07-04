import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook to handle OS back gesture for modal/sheet components.
 * When the modal opens, it pushes a history state. When the user
 * uses the OS back gesture (swipe from edge), it closes the modal
 * instead of exiting the app.
 * 
 * If closed manually (e.g. clicking Cancel/Close button), it automatically
 * pops the history state to keep the navigation stack in sync.
 * 
 * @param open - Whether the modal/sheet is open
 * @param onClose - Callback to close the modal/sheet
 */
export const useBackGesture = (open: boolean, onClose: () => void) => {
  const historyPushed = useRef(false);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      if (!historyPushed.current) {
        window.history.pushState({ modalOpen: true, timestamp: Date.now() }, '');
        historyPushed.current = true;
      }
      
      const handlePopState = () => {
        // Closed via browser back gesture, history state is already popped by browser
        historyPushed.current = false;
        handleClose();
      };
      
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
        // If the component unmounts while open, pop the state we pushed
        if (historyPushed.current) {
          window.history.back();
          historyPushed.current = false;
        }
      };
    } else {
      // If closed manually by state change, pop the history state to clean up stack
      if (historyPushed.current) {
        window.history.back();
        historyPushed.current = false;
      }
    }
  }, [open, handleClose]);
};
