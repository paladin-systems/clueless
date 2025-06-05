import React from 'react';
import clsx from 'clsx';
import { useModalFocus } from '../../hooks/useModalFocus';
import { FaXmark, FaPlay, FaStop, FaCamera, FaGear, FaTableCells, FaKeyboard, FaEye, FaTrash, FaNoteSticky, FaArrowsUpDownLeftRight } from 'react-icons/fa6';

interface Shortcut {
  keys: string[];
  description: string;
  category: 'recording' | 'layout' | 'notes';
  icon?: React.ReactElement;
}

const shortcuts: Shortcut[] = [
  // Recording controls
  { keys: ['Ctrl/⌘', 'R'], description: 'Start/Stop Recording', category: 'recording', icon: <FaPlay className="text-green-500 text-xs" /> },
  { keys: ['Ctrl/⌘', 'Shift', 'C'], description: 'Capture Screen', category: 'recording', icon: <FaCamera className="text-blue-500 text-xs" /> },
  
  // Layout controls
  { keys: ['?'], description: 'Toggle Keyboard Shortcuts', category: 'layout', icon: <FaKeyboard className="text-gray-400 text-xs" /> },
  { keys: ['Ctrl/⌘', ','], description: 'Open Settings', category: 'layout', icon: <FaGear className="text-gray-400 text-xs" /> },
  { keys: ['Ctrl/⌘', 'L'], description: 'Toggle Layout (Grid/Cascade)', category: 'layout', icon: <FaTableCells className="text-purple-500 text-xs" /> },
  { keys: ['Ctrl/⌘', 'T'], description: 'Toggle Always on Top', category: 'layout', icon: <FaEye className="text-indigo-500 text-xs" /> },
  { keys: ['Ctrl/⌘', '↑'], description: 'Increase Opacity', category: 'layout', icon: <FaEye className="text-gray-400 text-xs" /> },
  { keys: ['Ctrl/⌘', '↓'], description: 'Decrease Opacity', category: 'layout', icon: <FaEye className="text-gray-400 text-xs" /> },
  
  // Note management
  { keys: ['Ctrl/⌘', 'Shift', 'X'], description: 'Clear All Notes', category: 'notes', icon: <FaTrash className="text-red-500 text-xs" /> },
  { keys: ['Ctrl/⌘', 'Shift', 'I'], description: 'Toggle Instructions', category: 'notes', icon: <FaNoteSticky className="text-yellow-500 text-xs" /> },
  { keys: ['Tab'], description: 'Navigate Between Notes', category: 'notes', icon: <FaNoteSticky className="text-blue-400 text-xs" /> },
  
  // Selected Note Controls
  { keys: ['↑/↓/←/→'], description: 'Move Selected Note', category: 'notes', icon: <FaArrowsUpDownLeftRight className="text-green-400 text-xs" /> },
  { keys: ['Shift', '↑/↓/←/→'], description: 'Resize Selected Note', category: 'notes', icon: <FaArrowsUpDownLeftRight className="text-orange-400 text-xs" /> },
  { keys: ['Delete/Backspace'], description: 'Delete Selected Note', category: 'notes', icon: <FaTrash className="text-red-400 text-xs" /> },
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
      style={{ zIndex: 9007199254740993 }}
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
          </h2>          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800 cursor-pointer"
            aria-label="Close keyboard shortcuts"
          >
            <FaXmark />
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
                  .map((shortcut, index) => (                    <div
                      key={index}
                      className="flex justify-between items-center text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        {shortcut.icon && shortcut.icon}
                        <span className="text-gray-300">{shortcut.description}</span>
                      </div>
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