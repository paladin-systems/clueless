import React from 'react';
import clsx from 'clsx';
import { useStore } from '../../store';

const PostItInstructions: React.FC = () => {
  const showInstructions = useStore(state => state.viewOptions.showInstructions);
  const updateViewOptions = useStore(state => state.updateViewOptions);

  const hideInstructions = () => {
    updateViewOptions({ showInstructions: false });
  };

  if (!showInstructions) return null;

  return (
    <div
      className={clsx(
        "fixed bottom-4 right-4 bg-gray-900/95 backdrop-blur-sm",
        "p-4 rounded-lg border border-gray-700/50 shadow-lg",
        "text-sm text-gray-300 max-w-xs",
        "animate-in slide-in-from-right fade-in duration-300"
      )}
      role="tooltip"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium text-white">Keyboard Controls</h3>
        <button
          onClick={hideInstructions}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Close instructions"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <div className="text-gray-400 mb-1">Move Note</div>
          <div className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs border border-gray-700">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs border border-gray-700">↓</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs border border-gray-700">←</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs border border-gray-700">→</kbd>
          </div>
        </div>

        <div>
          <div className="text-gray-400 mb-1">Resize Note</div>
          <div className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs border border-gray-700">Shift</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs border border-gray-700">↑↓←→</kbd>
          </div>
        </div>


        <div className="text-xs text-gray-500 mt-3 space-y-1">
          <p>Tab through notes to select and use arrow keys to move them.</p>
          <p>Press ? for more shortcuts or click the ⌨️ icon in the top menu.</p>
          <button
            onClick={hideInstructions}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Got it, don't show again
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostItInstructions;