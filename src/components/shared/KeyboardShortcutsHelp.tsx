import React from 'react';
import clsx from 'clsx';
import { useModalFocus } from '../../hooks/useModalFocus';

interface Shortcut {
  keys: string[];
  description: string;
  category: 'recording' | 'layout' | 'notes';
}

const shortcuts: Shortcut[] = [
  // Recording controls
  { keys: ['Ctrl/⌘', 'R'], description: 'Start/Stop Recording', category: 'recording' },
  { keys: ['Ctrl/⌘', 'Shift', 'C'], description: 'Capture Screen', category: 'recording' },
  
  // Layout controls
  { keys: ['?'], description: 'Toggle Keyboard Shortcuts', category: 'layout' },
  { keys: ['Ctrl/⌘', ','], description: 'Open Settings', category: 'layout' },
  { keys: ['Ctrl/⌘', 'L'], description: 'Toggle Layout (Grid/Cascade)', category: 'layout' },
  { keys: ['Ctrl/⌘', 'T'], description: 'Toggle Always on Top', category: 'layout' },
  { keys: ['Ctrl/⌘', '↑'], description: 'Increase Opacity', category: 'layout' },
  { keys: ['Ctrl/⌘', '↓'], description: 'Decrease Opacity', category: 'layout' },
  
  // Note management
  { keys: ['Ctrl/⌘', 'Shift', 'X'], description: 'Clear All Notes', category: 'notes' },
  { keys: ['Ctrl/⌘', 'Shift', 'I'], description: 'Toggle Instructions', category: 'notes' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const modalRef = useModalFocus({ isOpen, onClose });

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
    >
      <div
        className={clsx(
          "bg-gray-900/95 border border-gray-700/50 rounded-lg shadow-xl w-96 max-w-lg p-6",
          "transform transition-all duration-200",
          "animate-in fade-in zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
        )}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="keyboard-shortcuts-title" className="text-lg font-semibold text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800"
            aria-label="Close keyboard shortcuts"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {(['recording', 'layout', 'notes'] as const).map(category => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-300 mb-2 capitalize">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-300">{shortcut.description}</span>
                      <div className="flex items-center space-x-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className={clsx(
                              "px-2 py-1 bg-gray-800 rounded text-gray-300 text-xs min-w-[24px] text-center",
                              "border border-gray-700 shadow-inner",
                              "transition-transform active:scale-95"
                            )}>
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-gray-600">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <div className="flex justify-center space-x-2">
            <button
              onClick={onClose}
              className={clsx(
                "px-4 py-2 bg-blue-600 text-white rounded-md text-sm",
                "hover:bg-blue-700 transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              )}
            >
              Got it
            </button>
            <button
              onClick={onClose}
              className={clsx(
                "px-4 py-2 text-gray-300 rounded-md text-sm",
                "hover:bg-gray-800 transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              )}
            >
              Press ? to open again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;