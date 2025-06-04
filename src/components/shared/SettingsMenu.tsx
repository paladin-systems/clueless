import React from 'react';
import clsx from 'clsx';
import { useStore } from '../../store';
import { useModalFocus } from '../../hooks/useModalFocus';
import { ViewOptions } from '../../types/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsMenu: React.FC<Props> = ({ isOpen, onClose }) => {
  const { viewOptions, updateViewOptions } = useStore(state => ({
    viewOptions: state.viewOptions,
    updateViewOptions: state.updateViewOptions
  }));

  const handleOpacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateViewOptions({
      opacity: Number(event.target.value)
    });
  };

  const handleLayoutChange = (layout: ViewOptions['layout']) => {
    updateViewOptions({ layout });
  };

  const handleAlwaysOnTopChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateViewOptions({
      alwaysOnTop: event.target.checked
    });
  };

  if (!isOpen) return null;

  const modalRef = useModalFocus({ isOpen, onClose });

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        className={clsx(
          "bg-gray-900/95 border border-gray-700/50 rounded-lg shadow-xl w-96 max-w-lg p-6",
          "transform transition-all duration-200",
          "animate-in fade-in zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
        )}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="settings-title" className="text-lg font-semibold text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Layout Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Layout</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => handleLayoutChange('grid')}
                className={clsx(
                  "px-3 py-1.5 rounded text-sm",
                  viewOptions.layout === 'grid'
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                )}
              >
                Grid
              </button>
              <button
                onClick={() => handleLayoutChange('cascade')}
                className={clsx(
                  "px-3 py-1.5 rounded text-sm",
                  viewOptions.layout === 'cascade'
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                )}
              >
                Cascade
              </button>
            </div>
          </div>

          {/* Opacity Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Window Opacity</h3>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.1"
                value={viewOptions.opacity}
                onChange={handleOpacityChange}
                className="flex-grow"
                aria-label="Window opacity"
              />
              <span className="text-sm text-gray-300 w-12">
                {Math.round(viewOptions.opacity * 100)}%
              </span>
            </div>
          </div>

          {/* Window Behavior */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Window Behavior</h3>
            <label className="flex items-center space-x-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={viewOptions.alwaysOnTop}
                onChange={handleAlwaysOnTopChange}
                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                aria-label="Always on top"
              />
              <span>Always on Top</span>
            </label>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Help & Instructions</h3>
          <label className="flex items-center space-x-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={viewOptions.showInstructions}
              onChange={(e) => updateViewOptions({ showInstructions: e.target.checked })}
              className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
              aria-label="Show keyboard instructions"
            />
            <span>Show Keyboard Instructions</span>
          </label>
          <p className="text-xs text-gray-500">
            Display helpful keyboard shortcuts for moving and managing post-it notes
          </p>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => {
              updateViewOptions({ showInstructions: true });
              onClose();
            }}
            className={clsx(
              "px-4 py-2 text-gray-300 rounded-md text-sm",
              "hover:bg-gray-800 transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            )}
          >
            Show Instructions
          </button>
          <button
            onClick={onClose}
            className={clsx(
              "px-4 py-2 bg-blue-600 text-white rounded-md text-sm",
              "hover:bg-blue-700 transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            )}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;