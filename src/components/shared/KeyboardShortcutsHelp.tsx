import { Divider, Kbd, Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import React from "react";
import {
  PiArrowsOutCardinal,
  PiCamera,
  PiEye,
  PiGearSix,
  PiKeyboard,
  PiNotePencil,
  PiPlay,
  PiSquaresFour,
  PiTrash,
} from "react-icons/pi";

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
    icon: <PiPlay className="text-green-500 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", "Shift", "C"],
    description: "Capture Screen",
    category: "recording",
    icon: <PiCamera className="text-blue-500 text-xs" />,
  },

  // Layout controls
  {
    keys: ["?"],
    description: "Toggle Keyboard Shortcuts",
    category: "layout",
    icon: <PiKeyboard className="text-gray-400 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", ","],
    description: "Open Settings",
    category: "layout",
    icon: <PiGearSix className="text-gray-400 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", "L"],
    description: "Toggle Layout (Grid/Cascade)",
    category: "layout",
    icon: <PiSquaresFour className="text-purple-500 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", "T"],
    description: "Toggle Always on Top",
    category: "layout",
    icon: <PiEye className="text-indigo-500 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", "↑"],
    description: "Increase Opacity",
    category: "layout",
    icon: <PiEye className="text-gray-400 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", "↓"],
    description: "Decrease Opacity",
    category: "layout",
    icon: <PiEye className="text-gray-400 text-xs" />,
  },

  // Note management
  {
    keys: ["Ctrl/⌘", "Shift", "X"],
    description: "Clear All Notes",
    category: "notes",
    icon: <PiTrash className="text-red-500 text-xs" />,
  },
  {
    keys: ["Ctrl/⌘", "Shift", "I"],
    description: "Toggle Instructions",
    category: "notes",
    icon: <PiNotePencil className="text-xs text-yellow-500" />,
  },
  {
    keys: ["Tab"],
    description: "Navigate Between Notes",
    category: "notes",
    icon: <PiNotePencil className="text-blue-400 text-xs" />,
  },

  // Selected Note Controls
  {
    keys: ["↑/↓/←/→"],
    description: "Move Selected Note",
    category: "notes",
    icon: <PiArrowsOutCardinal className="text-green-400 text-xs" />,
  },
  {
    keys: ["Shift", "↑/↓/←/→"],
    description: "Resize Selected Note",
    category: "notes",
    icon: <PiArrowsOutCardinal className="text-orange-400 text-xs" />,
  },
  {
    keys: ["Delete/Backspace"],
    description: "Delete Selected Note",
    category: "notes",
    icon: <PiTrash className="text-red-400 text-xs" />,
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<Props> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
      placement="center"
      backdrop="opaque"
      isDismissable={true}
      hideCloseButton={false}
    >
      <ModalContent>
        {(_onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="font-semibold text-xl">Keyboard Shortcuts</h2>
            </ModalHeader>
            <ModalBody className="gap-6 pb-6">
              <div className="relative grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Left Column: Recording & Layout */}
                <div className="space-y-6">
                  {/* Recording Controls */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-md">Recording</h3>
                    <div className="space-y-3">
                      {shortcuts
                        .filter((s) => s.category === "recording")
                        .map((shortcut) => (
                          <div
                            key={`${shortcut.category}-${shortcut.keys.join("-")}`}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {shortcut.icon && shortcut.icon}
                              <span className="text-sm">{shortcut.description}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIndex) => (
                                <React.Fragment key={`${shortcut.keys.join("-")}-${keyIndex}`}>
                                  <Kbd keys={[]} className="text-xs">
                                    {key}
                                  </Kbd>
                                  {keyIndex < shortcut.keys.length - 1 && (
                                    <span className="text-default-400">+</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Layout Controls */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-md">Layout</h3>
                    <div className="space-y-3">
                      {shortcuts
                        .filter((s) => s.category === "layout")
                        .map((shortcut) => (
                          <div
                            key={`${shortcut.category}-${shortcut.keys.join("-")}`}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {shortcut.icon && shortcut.icon}
                              <span className="text-sm">{shortcut.description}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIndex) => (
                                <React.Fragment key={`${shortcut.keys.join("-")}-${keyIndex}`}>
                                  <Kbd keys={[]} className="text-xs">
                                    {key}
                                  </Kbd>
                                  {keyIndex < shortcut.keys.length - 1 && (
                                    <span className="text-default-400">+</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Notes */}
                <div className="space-y-3 md:border-divider md:border-l md:pl-8">
                  <h3 className="font-semibold text-md">Notes</h3>
                  <div className="space-y-3">
                    {shortcuts
                      .filter((s) => s.category === "notes")
                      .map((shortcut) => (
                        <div
                          key={`${shortcut.category}-${shortcut.keys.join("-")}`}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {shortcut.icon && shortcut.icon}
                            <span className="text-sm">{shortcut.description}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, keyIndex) => (
                              <React.Fragment key={`${shortcut.keys.join("-")}-${keyIndex}`}>
                                <Kbd keys={[]} className="text-xs">
                                  {key}
                                </Kbd>
                                {keyIndex < shortcut.keys.length - 1 && (
                                  <span className="text-default-400">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Horizontal Divider for mobile */}
              <div className="md:hidden">
                <Divider />
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default KeyboardShortcutsHelp;
