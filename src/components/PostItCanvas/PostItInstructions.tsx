import clsx from "clsx";
import type React from "react";
import { FaKeyboard, FaXmark } from "react-icons/fa6";
import { useStore } from "../../store";

const PostItInstructions: React.FC = () => {
  const showInstructions = useStore((state) => state.viewOptions.showInstructions);
  const updateViewOptions = useStore((state) => state.updateViewOptions);

  const hideInstructions = () => {
    updateViewOptions({ showInstructions: false });
  };

  if (!showInstructions) return null;

  return (
    <div
      style={{ zIndex: 9007199254740991 }}
      className={clsx(
        "fixed right-4 bottom-4 bg-gray-900/95 backdrop-blur-sm",
        "rounded-lg border border-gray-700/50 p-4 shadow-lg",
        "max-w-xs text-gray-300 text-sm",
        "slide-in-from-right fade-in animate-in duration-300",
      )}
      role="tooltip"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="font-medium text-white">Keyboard Controls</h3>{" "}
        <button
          type="button"
          onClick={hideInstructions}
          className="cursor-pointer text-gray-400 transition-colors hover:text-white"
          aria-label="Close instructions"
        >
          <FaXmark />
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <div className="mb-1 text-gray-400">Move Note</div>
          <div className="flex items-center space-x-1">
            <kbd className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-xs">
              ↑
            </kbd>
            <kbd className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-xs">
              ↓
            </kbd>
            <kbd className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-xs">
              ←
            </kbd>
            <kbd className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-xs">
              →
            </kbd>
          </div>
        </div>

        <div>
          <div className="mb-1 text-gray-400">Resize Note</div>
          <div className="flex items-center space-x-1">
            <kbd className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-xs">
              Shift
            </kbd>
            <span>+</span>
            <kbd className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-xs">
              ↑↓←→
            </kbd>
          </div>
        </div>

        <div className="mt-3 space-y-1 text-gray-500 text-xs">
          <p>Tab through notes to select and use arrow keys to move them.</p>
          <p>
            Press ? for more shortcuts or click the <FaKeyboard className="inline" /> icon in the
            top menu.
          </p>{" "}
          <button
            type="button"
            onClick={hideInstructions}
            className="cursor-pointer text-blue-400 transition-colors hover:text-blue-300"
          >
            Got it, don't show again
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostItInstructions;
