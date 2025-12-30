import { useEffect, useCallback, useState, useRef } from 'react';

interface UseBackGestureOptions {
  /** Whether to enable animation feedback */
  animated?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
}

interface UseBackGestureReturn {
  /** Whether the back gesture animation is playing */
  isClosingWithGesture: boolean;
  /** CSS class to apply for animation */
  gestureAnimationClass: string;
}

/**
 * Hook to handle OS back gesture for modal/sheet components.
 * When the modal opens, it pushes a history state. When the user
 * uses the OS back gesture (swipe from edge), it closes the modal
 * instead of exiting the app.
 * 
 * @param open - Whether the modal/sheet is open
 * @param onClose - Callback to close the modal/sheet
 * @param options - Optional configuration for animation
 * @returns Animation state for visual feedback
 */
export const useBackGesture = (
  open: boolean, 
  onClose: () => void,
  options: UseBackGestureOptions = {}
): UseBackGestureReturn => {
  const { animated = true, animationDuration = 200 } = options;
  const [isClosingWithGesture, setIsClosingWithGesture] = useState(false);
  const historyPushed = useRef(false);

  const handleClose = useCallback(() => {
    if (animated) {
      setIsClosingWithGesture(true);
      // Delay actual close to allow animation to play
      setTimeout(() => {
        onClose();
        setIsClosingWithGesture(false);
      }, animationDuration);
    } else {
      onClose();
    }
  }, [onClose, animated, animationDuration]);

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
        // Clean up history state if modal closes normally (not via back gesture)
        if (historyPushed.current) {
          // Don't go back if closed normally - just reset the flag
          historyPushed.current = false;
        }
      };
    } else if (!open) {
      historyPushed.current = false;
      setIsClosingWithGesture(false);
    }
  }, [open, handleClose]);

  const gestureAnimationClass = isClosingWithGesture 
    ? 'animate-slide-out-right' 
    : '';

  return {
    isClosingWithGesture,
    gestureAnimationClass,
  };
};
