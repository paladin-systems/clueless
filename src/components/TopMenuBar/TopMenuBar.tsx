import React from 'react';
import clsx from 'clsx';
import { formatDuration } from '../../utils/timeUtils';
import { SessionInfo, AudioIndicator } from '../../types/ui';
import LoadingSpinner from '../shared/LoadingSpinner';

interface TopMenuBarProps {
  sessionInfo: SessionInfo;
  audioLevels: {
    mic: AudioIndicator;
    system: AudioIndicator;
  };
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCapture: () => void;
  onSettingsClick: () => void;
  onKeyboardHelpClick: () => void;
  className?: string;
}

const TopMenuBar: React.FC<TopMenuBarProps> = ({
  sessionInfo,
  audioLevels,
  onStartRecording,
  onStopRecording,
  onCapture,
  onSettingsClick,
  onKeyboardHelpClick,
  className
}) => {
  // Audio level indicator styles
  const getAudioLevelStyle = (level: number): React.CSSProperties => {
    const isActive = level > 0.01;
    const size = isActive ? Math.max(8, 8 + Math.min(level * 15, 12)) : 8;
    const intensity = isActive ? Math.max(50, 75 + Math.min(Math.floor(level * 150), 25)) : 0;
    return {
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: isActive ? `rgba(76, 139, 245, ${intensity / 100})` : '#6b7280',
      borderRadius: '50%',
      transition: 'all 0.1s ease-out',
      boxShadow: isActive ? `0 0 ${size * 0.8}px ${size * 0.3}px rgba(76, 139, 245, 0.4)` : 'none',
    };
  };

  return (
    <header className="menu-bar">
      <div className="flex items-center h-full">
        {/* Left Section */}
        <div className="menu-section left">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            CL
          </div>
          <span className="text-white font-medium">Clueless AI</span>
          {sessionInfo.startTime > 0 && (
            <span className="text-sm text-gray-400">
              Session: {formatDuration(sessionInfo.duration)}
            </span>
          )}
        </div>

        {/* Center Section */}
        <div className="menu-section center flex-grow">
          {/* Device Status */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div style={getAudioLevelStyle(audioLevels.mic.level)} />
              <span className="text-gray-300 text-sm">
                {sessionInfo.deviceInfo.mic?.name || "No Mic"}
                {sessionInfo.deviceInfo.mic?.isDefault && ' (Default)'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div style={getAudioLevelStyle(audioLevels.system.level)} />
              <span className="text-gray-300 text-sm">
                {sessionInfo.deviceInfo.system?.name || "No System Audio"}
                {sessionInfo.deviceInfo.system?.isDefault && ' (Default)'}
              </span>
            </div>
          </div>

          {/* Main Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onCapture}
              className="glass-button-secondary"
              disabled={sessionInfo.isRecording}
            >
              📸 Capture
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={sessionInfo.isRecording ? onStopRecording : onStartRecording}
                className={clsx(
                  "glass-button",
                  sessionInfo.isRecording && "bg-red-600 hover:bg-red-700"
                )}
              >
                {sessionInfo.isRecording ? "⏹️ Stop" : "⏺️ Record"}
              </button>
              {sessionInfo.isRecording && (
                <div className="flex items-center space-x-2 bg-gray-800/50 px-3 py-1.5 rounded-md">
                  <LoadingSpinner size="sm" />
                  <span className="text-xs text-gray-300">Recording...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="menu-section right">
          <div className="flex items-center space-x-2">
            {/* Keyboard Shortcuts Button */}
            <div className="relative">
              <button
                onClick={onKeyboardHelpClick}
                className={clsx(
                  "glass-button-secondary group",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-900"
                )}
                aria-label="Show Keyboard Shortcuts"
              >
                <span className="group-hover:scale-110 transition-transform inline-block">⌨️</span>
                <div className={clsx(
                  "absolute hidden group-hover:block right-0 top-full mt-2 p-2",
                  "bg-gray-900/95 backdrop-blur-sm rounded-md",
                  "text-xs text-gray-300 whitespace-nowrap",
                  "border border-gray-700/50 shadow-lg",
                  "transform origin-top-right transition-all duration-200",
                  "z-50"
                )}>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs border border-gray-700">?</kbd>
                    <span>to view shortcuts</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Settings Button */}
            <div className="relative">
              <button
                onClick={onSettingsClick}
                className={clsx(
                  "glass-button-secondary group",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-900"
                )}
                aria-label="Open Settings"
              >
                <span className="group-hover:rotate-90 transition-transform inline-block duration-300">⚙️</span>
                <div className={clsx(
                  "absolute hidden group-hover:block right-0 top-full mt-2 p-2",
                  "bg-gray-900/95 backdrop-blur-sm rounded-md",
                  "text-xs text-gray-300 whitespace-nowrap",
                  "border border-gray-700/50 shadow-lg",
                  "transform origin-top-right transition-all duration-200",
                  "z-50"
                )}>
                  Application Settings
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopMenuBar;