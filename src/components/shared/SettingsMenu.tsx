import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '../../store';
import { useModalFocus } from '../../hooks/useModalFocus';
import { ViewOptions, AudioDevice } from '../../types/ui';
import { exportNotes, ExportFormat } from '../../utils/exportUtils';
import { FaXmark, FaEye, FaDesktop, FaMicrophone, FaVolumeHigh, FaDownload, FaChevronDown } from 'react-icons/fa6';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsMenu: React.FC<Props> = ({ isOpen, onClose }) => {
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  const viewOptions = useStore(state => state.viewOptions);
  const updateViewOptions = useStore(state => state.updateViewOptions);
  const micAudioDevices = useStore(state => state.micAudioDevices);
  const systemAudioDevices = useStore(state => state.systemAudioDevices);
  const selectedMicDeviceId = useStore(state => state.selectedMicDeviceId);
  const selectedSystemDeviceId = useStore(state => state.selectedSystemDeviceId);
  const setSelectedMicDevice = useStore(state => state.setSelectedMicDevice);
  const setSelectedSystemDevice = useStore(state => state.setSelectedSystemDevice);
  const setMicAudioDevices = useStore(state => state.setMicAudioDevices);
  const setSystemAudioDevices = useStore(state => state.setSystemAudioDevices);
  const notes = useStore(state => state.notes);

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
  };  const handleExport = (format: ExportFormat) => {
    console.log('Exporting notes as:', format, 'Total notes:', notes.length);
    exportNotes(notes, format);
    setShowExportOptions(false);
  };

  // Close export dropdown when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Don't close if clicking on the export button or dropdown
      if (target?.closest('.export-dropdown-container')) {
        return;
      }
      setShowExportOptions(false);
    };

    if (showExportOptions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showExportOptions]);

  const modalRef = useModalFocus({ isOpen, onClose });

  useEffect(() => {
    const electron = (window as any).electron;
    if (electron) {
      electron.listAudioDevices().then((devices: { devices: AudioDevice[], defaultInput: number | null, defaultOutput: number | null }) => {
        const micDevices = devices.devices.filter(d => d.inputChannels > 0);
        const systemDevices = devices.devices.filter(d => d.outputChannels > 0);

        setMicAudioDevices(micDevices.map(d => ({ ...d, isDefault: d.id === devices.defaultInput })));
        setSystemAudioDevices(systemDevices.map(d => ({ ...d, isDefault: d.id === devices.defaultOutput })));

        if (!selectedMicDeviceId && devices.defaultInput !== null) {
          setSelectedMicDevice(devices.defaultInput);
        }
        if (!selectedSystemDeviceId && devices.defaultOutput !== null) {
          setSelectedSystemDevice(devices.defaultOutput);
        }
      }).catch((error: Error) => {
        console.error('Failed to list audio devices:', error);
      });
    }
  }, [selectedMicDeviceId, selectedSystemDeviceId, setMicAudioDevices, setSystemAudioDevices, setSelectedMicDevice, setSelectedSystemDevice]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      style={{ zIndex: 9007199254740993 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >      <div
        className={clsx(
          "bg-gray-900/95 border border-gray-700/50 rounded-lg shadow-xl w-96 max-w-lg max-h-[80vh] overflow-y-auto p-6",
          "transform transition-all duration-200",
          "animate-in fade-in zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
        )}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="settings-title" className="text-lg font-semibold text-white">
            Settings
          </h2>          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800 cursor-pointer"
            aria-label="Close settings"
          >
            <FaXmark />
          </button>
        </div>

        <div className="space-y-4">          {/* Opacity Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
              <FaEye />
              <span>Window Opacity</span>
            </h3>
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
          </div>          {/* Window Behavior */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
              <FaDesktop />
              <span>Window Behavior</span>
            </h3>
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
          </div>          {/* Audio Input Device Selection */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
              <FaMicrophone />
              <span>Microphone Input</span>
            </h3>
            <select
              value={selectedMicDeviceId || ''}
              onChange={(e) => setSelectedMicDevice(Number(e.target.value))}
              className="w-full p-2 rounded-md bg-gray-800 text-gray-300 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Select microphone input device"
            >
              {micAudioDevices.length === 0 && (
                <option value="">No microphone devices found</option>
              )}
              {micAudioDevices.map(device => (
                <option key={device.id} value={device.id}>
                  {device.name} {device.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
            {micAudioDevices.length === 0 && (
              <p className="text-xs text-red-400">
                No microphone devices detected. Please check your system settings.
              </p>
            )}
          </div>          {/* System Audio Device Selection */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
              <FaVolumeHigh />
              <span>System Audio Input (Stereo Mix)</span>
            </h3>
            <select
              value={selectedSystemDeviceId || ''}
              onChange={(e) => setSelectedSystemDevice(Number(e.target.value))}
              className="w-full p-2 rounded-md bg-gray-800 text-gray-300 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Select system audio input device"
            >
              {systemAudioDevices.length === 0 && (
                <option value="">No system audio devices found</option>
              )}
              {systemAudioDevices.map(device => (
                <option key={device.id} value={device.id}>
                  {device.name} {device.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
            {systemAudioDevices.length === 0 && (
              <p className="text-xs text-red-400">
                No system audio devices detected. On Windows, ensure "Stereo Mix" is enabled in Sound Control Panel.                <button
                  onClick={() => (window as any).electron.openSettings('sound')}
                  className="text-blue-400 hover:underline ml-1 cursor-pointer"
                >
                  Open Sound Settings
                </button>
              </p>
            )}
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
          </p>        </div>

        {/* Export Notes Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
            <FaDownload />
            <span>Export Notes</span>
          </h3>          <p className="text-xs text-gray-500 mb-2">
            Export your {notes.length} note{notes.length !== 1 ? 's' : ''} in various formats
          </p>
            <div className="relative export-dropdown-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Export button clicked, current showExportOptions:', showExportOptions);
                setShowExportOptions(!showExportOptions);
              }}
              disabled={notes.length === 0}
              className={clsx(
                "w-full px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between",
                notes.length === 0
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              <div className="flex items-center space-x-2">
                <FaDownload />
                <span>Export Notes</span>
              </div>
              <FaChevronDown className={clsx(
                "transition-transform",
                showExportOptions && "rotate-180"
              )} />
            </button>
            
            {showExportOptions && notes.length > 0 && (              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
                <div className="p-1 space-y-0.5">                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport('json');
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    <strong>JSON</strong> - Structured data with metadata
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport('markdown');
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    <strong>Markdown</strong> - Formatted documentation
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport('text');
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    <strong>Plain Text</strong> - Simple text format
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport('csv');
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    <strong>CSV</strong> - Spreadsheet compatible
                  </button>
                </div>
              </div>
            )}          </div>
            {notes.length === 0 && (
            <p className="text-xs text-amber-400">
              Create some notes first to enable export
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;