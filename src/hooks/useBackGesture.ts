import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook to handle OS back gesture for modal/sheet components.
 * When the modal opens, it pushes a history state. When the user
 * uses the OS back gesture (swipe from edge), it closes the modal
 * instead of exiting the app.
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
    if (open && !historyPushed.current) {
      // Push a state to history when modal opens
      window.history.pushState({ modalOpen: true, timestamp: Date.now() }, '');
      historyPushed.current = true;
      
      const handlePopState = () => {
        // When back is pressed, close the modal
        handleClose();
        historyPushed.current = false;
      };
      
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
        historyPushed.current = false;
      };
    } else if (!open) {
      historyPushed.current = false;
    }
  }, [open, handleClose]);
};
