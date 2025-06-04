import { useEffect, useRef } from 'react';

interface UseModalFocusProps {
  isOpen: boolean;
  onClose: () => void;
}

export const useModalFocus = ({ isOpen, onClose }: UseModalFocusProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Get all focusable elements in the modal
    const getFocusableElements = () => {
      if (!modalRef.current) return [];
      
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
    };

    // Focus the first element when modal opens
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle keyboard events
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const { activeElement } = document;

        if (event.shiftKey && activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return modalRef;
};