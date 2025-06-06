import clsx from "clsx";
import type React from "react";
import { FaCamera, FaGear, FaKeyboard, FaPlay, FaStop } from "react-icons/fa6";
import type { AudioIndicator, SessionInfo } from "../../types/ui";
import { formatDuration } from "../../utils/timeUtils";
import LoadingSpinner from "../shared/LoadingSpinner";

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
}) => {
  // Audio level indicator styles
  const getAudioLevelStyle = (level: number): React.CSSProperties => {
    const isActive = level > 0.01;
    const size = isActive ? Math.max(8, 8 + Math.min(level * 15, 12)) : 8;
    const intensity = isActive ? Math.max(50, 75 + Math.min(Math.floor(level * 150), 25)) : 0;
    return {
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: isActive ? `rgba(76, 139, 245, ${intensity / 100})` : "#6b7280",
      borderRadius: "50%",
      transition: "all 0.1s ease-out",
      boxShadow: isActive ? `0 0 ${size * 0.8}px ${size * 0.3}px rgba(76, 139, 245, 0.4)` : "none",
    };
  };

  return (
    <header className="menu-bar">
      <div className="flex h-full items-center">
        {/* Left Section */}
        <div className="menu-section left">
          <span className="font-medium text-white">Clueless</span>
          {sessionInfo.startTime > 0 && (
            <span className="text-gray-400 text-sm">
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
                {sessionInfo.deviceInfo.mic?.isDefault && " (Default)"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div style={getAudioLevelStyle(audioLevels.system.level)} />
              <span className="text-gray-300 text-sm">
                {sessionInfo.deviceInfo.system?.name || "No System Audio"}
                {sessionInfo.deviceInfo.system?.isDefault && " (Default)"}
              </span>
            </div>
          </div>

          {/* Main Actions */}
          <div className="flex items-center space-x-2">
            {" "}
            <button
              type="button"
              onClick={onCapture}
              className="glass-button-secondary"
              disabled={sessionInfo.isRecording}
            >
              <FaCamera className="mr-2 inline-block" /> Capture
            </button>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={sessionInfo.isRecording ? onStopRecording : onStartRecording}
                className={clsx(
                  "glass-button",
                  sessionInfo.isRecording && "bg-red-600 hover:bg-red-700",
                )}
              >
                {sessionInfo.isRecording ? (
                  <>
                    <FaStop className="mr-2 inline-block" /> Stop
                  </>
                ) : (
                  <>
                    <FaPlay className="mr-2 inline-block" /> Record
                  </>
                )}
              </button>
              {sessionInfo.isRecording && (
                <div className="flex items-center space-x-2 rounded-md bg-gray-800/50 px-3 py-1.5">
                  <LoadingSpinner size="sm" />
                  <span className="text-gray-300 text-xs">Recording...</span>
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
                type="button"
                onClick={onKeyboardHelpClick}
                className={clsx(
                  "glass-button-secondary group",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-900",
                )}
                aria-label="Show Keyboard Shortcuts"
              >
                <FaKeyboard className="transition-transform group-hover:scale-110" />
                <div
                  className={clsx(
                    "absolute top-full right-0 mt-2 hidden p-2 group-hover:block",
                    "rounded-md bg-gray-900/95 backdrop-blur-sm",
                    "whitespace-nowrap text-gray-300 text-xs",
                    "border border-gray-700/50 shadow-lg",
                    "origin-top-right transform transition-all duration-200",
                    "z-50",
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <kbd className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-xs">
                      ?
                    </kbd>
                    <span>to view shortcuts</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Settings Button */}
            <div className="relative">
              <button
                type="button"
                onClick={onSettingsClick}
                className={clsx(
                  "glass-button-secondary group",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-900",
                )}
                aria-label="Open Settings"
              >
                <FaGear className="transition-transform duration-300 group-hover:rotate-90" />
                <div
                  className={clsx(
                    "absolute top-full right-0 mt-2 hidden p-2 group-hover:block",
                    "rounded-md bg-gray-900/95 backdrop-blur-sm",
                    "whitespace-nowrap text-gray-300 text-xs",
                    "border border-gray-700/50 shadow-lg",
                    "origin-top-right transform transition-all duration-200",
                    "z-50",
                  )}
                >
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
