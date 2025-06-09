import { Button, Navbar, NavbarContent } from "@heroui/react"; // Added Navbar and NavbarContent
import type React from "react";
import { memo } from "react";
import {
  PiCamera,
  PiGearSix,
  PiKeyboard,
  PiMicrophone,
  PiPauseCircle,
  PiRecord,
  PiSpeakerSimpleHigh,
} from "react-icons/pi";
import type { AudioLevels, SessionInfo } from "../../types/ui";
import AnimatedLogo from "../shared/AnimatedLogo";
import Tooltip from "../shared/Tooltip";

interface TopMenuBarProps {
  sessionInfo: SessionInfo;
  audioLevels: AudioLevels;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCapture: () => void;
  onSettingsClick: () => void;
  onKeyboardHelpClick: () => void;
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
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 60000) % 60;
    const hours = Math.floor(ms / 3600000);
    return hours > 0
      ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      : `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    // Use HeroUI Navbar as the main container
    <Navbar
      isBlurred={false} // To allow our custom blur and background
      maxWidth="full"
      className="sticky inset-x-0 top-0 z-40 h-auto bg-transparent py-2 backdrop-blur-lg backdrop-saturate-150"
      classNames={{
        wrapper: "px-0 max-w-[1024px] justify-center h-[var(--navbar-height)]", // Centering the wrapper
        base: "h-[var(--navbar-height)]",
      }}
      style={{ "--navbar-height": "54px" } as React.CSSProperties}
    >
      {/* Main floating pill container using NavbarContent */}
      <NavbarContent
        justify="center"
        className="flex h-full flex-row flex-nowrap items-center gap-4 rounded-full border-default-200/20 border-small bg-background/60 px-4 shadow-medium backdrop-blur-md backdrop-saturate-150 data-[justify=center]:justify-center dark:bg-default-100/50"
      >
        {/* Left section - App Logo */}
        <div className="mr-4 flex items-center gap-2">
          <AnimatedLogo
            isRecording={sessionInfo.isRecording}
            size={20}
            className="text-foreground"
          />
          <span className="hidden font-medium text-foreground text-sm md:block">Clueless</span>
        </div>

        {/* Recording Controls */}
        {sessionInfo.isRecording ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-default-600 text-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="font-mono">{formatDuration(sessionInfo.duration)}</span>
            </div>
            <Button
              size="sm"
              color="danger"
              variant="flat"
              onPress={onStopRecording}
              className="h-8 px-3 text-xs"
              startContent={<PiPauseCircle size={14} />}
            >
              Stop
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            color="primary"
            variant="flat"
            onPress={onStartRecording}
            className="h-8 px-3 text-xs"
            startContent={<PiRecord size={14} />}
          >
            Start Recording
          </Button>
        )}

        {/* Audio Level Indicators */}
        <div className="flex items-center gap-3 border-default-200/30 border-l px-3">
          <Tooltip content="Microphone Level" placement="bottom">
            <div className="flex items-center gap-1">
              <PiMicrophone size={16} className="text-default-500" />
              <div
                className={`h-2 w-2 rounded-full transition-all duration-200 ${
                  audioLevels.mic.level > 0.1
                    ? `bg-green-500 shadow-green-500/50 shadow-lg ${audioLevels.mic.level > 0.5 ? "animate-pulse" : ""}`
                    : "bg-default-300"
                }`}
              />
            </div>
          </Tooltip>
          <Tooltip content="System Audio Level" placement="bottom">
            <div className="flex items-center gap-1">
              <PiSpeakerSimpleHigh size={16} className="text-default-500" />
              <div
                className={`h-2 w-2 rounded-full transition-all duration-200 ${
                  audioLevels.system.level > 0.1
                    ? `bg-blue-500 shadow-blue-500/50 shadow-lg ${audioLevels.system.level > 0.5 ? "animate-pulse" : ""}`
                    : "bg-default-300"
                }`}
              />
            </div>
          </Tooltip>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 border-default-200/30 border-l px-3">
          <Tooltip content="Capture Screen (Ctrl+Shift+S)" placement="bottom">
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onPress={onCapture}
              className="h-8 w-8 text-xs"
            >
              <PiCamera size={18} />
            </Button>
          </Tooltip>
          <Tooltip content="Keyboard Shortcuts (?)" placement="bottom">
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onPress={onKeyboardHelpClick}
              className="h-8 w-8 text-xs"
            >
              <PiKeyboard size={18} />
            </Button>
          </Tooltip>
          <Tooltip content="Settings (Ctrl+,)" placement="bottom">
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onPress={onSettingsClick}
              className="h-8 w-8 text-xs"
            >
              <PiGearSix size={18} />
            </Button>
          </Tooltip>
        </div>
      </NavbarContent>
    </Navbar>
  );
};

export default memo(TopMenuBar);
