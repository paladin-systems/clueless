import { useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { useStore } from '../store';

type StoreSelector = {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  capture: () => Promise<void>;
  isRecording: boolean;
  clearResponses: () => void;
  viewOptions: any;
  updateViewOptions: (options: any) => void;
};

export const useKeyboardShortcuts = (
  setShowKeyboardHelp: Dispatch<SetStateAction<boolean>>,
  setShowSettings: Dispatch<SetStateAction<boolean>>
) => {
  // Use stable selectors to prevent infinite loops
  const startRecording = useStore(state => state.startRecording);
  const stopRecording = useStore(state => state.stopRecording);
  const capture = useStore(state => state.capture);
  const isRecording = useStore(state => state.isRecording);
  const clearResponses = useStore(state => state.clearResponses);
  const viewOptions = useStore(state => state.viewOptions);
  const updateViewOptions = useStore(state => state.updateViewOptions);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Prevent default for our shortcuts
    const shouldPreventDefault = () => {
      event.preventDefault();
      event.stopPropagation();
    };

    // Handle key combinations
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;

    // Show keyboard shortcuts help (?)
    if (event.key === '?' || (isShift && event.key === '/')) {
      shouldPreventDefault();
      setShowKeyboardHelp(prev => !prev);
      setShowSettings(false); // Close settings if open
      return;
    }

    // Show settings menu (Ctrl/Cmd + ,)
    if (isCtrlOrCmd && event.key === ',') {
      shouldPreventDefault();
      setShowSettings(prev => !prev);
      setShowKeyboardHelp(false); // Close keyboard help if open
      return;
    }

    switch (true) {
      // Start/Stop Recording (Ctrl/Cmd + R)
      case isCtrlOrCmd && event.key === 'r':
        shouldPreventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
        break;

      // Capture Screen (Ctrl/Cmd + Shift + C)
      case isCtrlOrCmd && isShift && event.key === 'C':
        shouldPreventDefault();
        if (!isRecording) {
          capture();
        }
        break;

      // Clear All Responses (Ctrl/Cmd + Shift + X)
      case isCtrlOrCmd && isShift && event.key === 'X':
        shouldPreventDefault();
        clearResponses();
        break;

      // Toggle Layout (Ctrl/Cmd + L)
      case isCtrlOrCmd && event.key === 'l':
        shouldPreventDefault();
        updateViewOptions({
          layout: viewOptions.layout === 'grid' ? 'cascade' : 'grid'
        });
        break;

      // Toggle Always on Top (Ctrl/Cmd + T)
      case isCtrlOrCmd && event.key === 't':
        shouldPreventDefault();
        updateViewOptions({
          alwaysOnTop: !viewOptions.alwaysOnTop
        });
        break;

      // Toggle Instructions (Ctrl/Cmd + Shift + I)
      case isCtrlOrCmd && isShift && event.key === 'I':
        shouldPreventDefault();
        updateViewOptions({
          showInstructions: !viewOptions.showInstructions
        });
        break;

      // Adjust Opacity (Ctrl/Cmd + Up/Down)
      case isCtrlOrCmd && event.key === 'ArrowUp':
        shouldPreventDefault();
        updateViewOptions({
          opacity: Math.min(1, viewOptions.opacity + 0.1)
        });
        break;

      case isCtrlOrCmd && event.key === 'ArrowDown':
        shouldPreventDefault();
        updateViewOptions({
          opacity: Math.max(0.3, viewOptions.opacity - 0.1)
        });
        break;
    }
  }, [
    isRecording,
    startRecording,
    stopRecording,
    capture,
    clearResponses,
    viewOptions,
    updateViewOptions,
    setShowKeyboardHelp,
    setShowSettings
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
};