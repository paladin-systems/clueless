import clsx from "clsx";
import React from "react";
import {
  FaArrowsUpDownLeftRight,
  FaCamera,
  FaEye,
  FaGear,
  FaKeyboard,
  FaNoteSticky,
  FaPlay,
  FaTableCells,
  FaTrash,
  FaXmark,
} from "react-icons/fa6";
import { useModalFocus } from "../../hooks/useModalFocus";

interface Shortcut {
  keys: string[];
  description: string;
  category: "recording" | "layout" | "notes";
  icon?: React.ReactElement;
}

const shortcuts: Shortcut[] = [
  // Recording controls
  {
    keys: ["Ctrl/⌘", "R"],
    description: "Start/Stop Recording",
    category: "recording",
    icon: <FaPlay className="text-green-500 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", "Shift", "C"],
    description: "Capture Screen",
    category: "recording",
    icon: <FaCamera className="text-blue-500 text-xs" />,
  },

  // Layout controls
  {
    keys: ["?"],
    description: "Toggle Keyboard Shortcuts",
    category: "layout",
    icon: <FaKeyboard className="text-gray-400 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", ","],
    description: "Open Settings",
    category: "layout",
    icon: <FaGear className="text-gray-400 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", "L"],
    description: "Toggle Layout (Grid/Cascade)",
    category: "layout",
    icon: <FaTableCells className="text-purple-500 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", "T"],
    description: "Toggle Always on Top",
    category: "layout",
    icon: <FaEye className="text-indigo-500 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", "↑"],
    description: "Increase Opacity",
    category: "layout",
    icon: <FaEye className="text-gray-400 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", "↓"],
    description: "Decrease Opacity",
    category: "layout",
    icon: <FaEye className="text-gray-400 text-xs" />,
  },

  // Note management
  {
    keys: ["Ctrl/⌘", "Shift", "X"],
    description: "Clear All Notes",
    category: "notes",
    icon: <FaTrash className="text-red-500 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", "Shift", "I"],
    description: "Toggle Instructions",
    category: "notes",
    icon: <FaNoteSticky className="text-xs text-yellow-500" />,
  },
  {
    keys: ["Tab"],
    description: "Navigate Between Notes",
    category: "notes",
    icon: <FaNoteSticky className="text-blue-400 text-xs" />,
  },

  // Selected Note Controls
  {
    keys: ["↑/↓/←/→"],
    description: "Move Selected Note",
    category: "notes",
    icon: <FaArrowsUpDownLeftRight className="text-green-400 text-xs" />,
  },
  {
    keys: ["Shift", "↑/↓/←/→"],
    description: "Resize Selected Note",
    category: "notes",
    icon: <FaArrowsUpDownLeftRight className="text-orange-400 text-xs" />,
  },
  {
    keys: ["Delete/Backspace"],
    description: "Delete Selected Note",
    category: "notes",
    icon: <FaTrash className="text-red-400 text-xs" />,
  },
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
      style={{ zIndex: Number.MAX_SAFE_INTEGER }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
    >
      {" "}
      <div
        className={clsx(
          "w-[800px] max-w-6xl rounded-lg border border-gray-700/50 bg-gray-900/95 p-6 pb-8 shadow-xl",
          "transform transition-all duration-200",
          "fade-in zoom-in-95 animate-in",
          "data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="keyboard-shortcuts-title" className="font-semibold text-lg text-white">
            Keyboard Shortcuts
          </h2>{" "}
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Close keyboard shortcuts"
          >
            <FaXmark />
          </button>
        </div>{" "}
        <div className="grid grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Recording Controls */}
            <div>
              <h3 className="mb-2 font-medium text-gray-300 text-sm">Recording</h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === "recording")
                  .map((shortcut) => (
                    <div
                      key={`${shortcut.category}-${shortcut.keys.join("-")}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        {shortcut.icon && shortcut.icon}
                        <span className="text-gray-300">{shortcut.description}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={`${shortcut.keys.join("-")}-${keyIndex}`}>
                            <kbd
                              className={clsx(
                                "min-w-[24px] rounded bg-gray-800 px-2 py-1 text-center text-gray-300 text-xs",
                                "border border-gray-700 shadow-inner",
                                "transition-transform active:scale-95",
                              )}
                            >
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

            {/* Layout Controls */}
            <div>
              <h3 className="mb-2 font-medium text-gray-300 text-sm">Layout</h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === "layout")
                  .map((shortcut) => (
                    <div
                      key={`${shortcut.category}-${shortcut.keys.join("-")}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        {shortcut.icon && shortcut.icon}
                        <span className="text-gray-300">{shortcut.description}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={`${shortcut.keys.join("-")}-${keyIndex}`}>
                            <kbd
                              className={clsx(
                                "min-w-[24px] rounded bg-gray-800 px-2 py-1 text-center text-gray-300 text-xs",
                                "border border-gray-700 shadow-inner",
                                "transition-transform active:scale-95",
                              )}
                            >
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
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 w-px bg-gray-700" />
            <div className="pl-8">
              {/* Note Management */}
              <div>
                <h3 className="mb-2 font-medium text-gray-300 text-sm">Notes</h3>
                <div className="space-y-2">
                  {shortcuts
                    .filter((s) => s.category === "notes")
                    .map((shortcut) => (
                      <div
                        key={`${shortcut.category}-${shortcut.keys.join("-")}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center space-x-2">
                          {shortcut.icon && shortcut.icon}
                          <span className="text-gray-300">{shortcut.description}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <React.Fragment key={`${shortcut.keys.join("-")}-${keyIndex}`}>
                              <kbd
                                className={clsx(
                                  "min-w-[24px] rounded bg-gray-800 px-2 py-1 text-center text-gray-300 text-xs",
                                  "border border-gray-700 shadow-inner",
                                  "transition-transform active:scale-95",
                                )}
                              >
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
