import { useEffect, useCallback } from 'react';

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
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      // Push a state to history when modal opens
      window.history.pushState({ modalOpen: true }, '');
      
      const handlePopState = () => {
        // When back is pressed, close the modal
        handleClose();
      };
      
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [open, handleClose]);
};
