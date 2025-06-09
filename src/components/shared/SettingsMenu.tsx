import {
  Button,
  Checkbox,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Select,
  SelectItem,
  Slider,
} from "@heroui/react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PiCaretDown,
  PiDesktop,
  PiDownloadSimple,
  PiEye,
  PiMicrophone,
  PiQuestion,
} from "react-icons/pi";
import { useModalFocus } from "../../hooks/useModalFocus";
import { useStore } from "../../store";
import type { AudioDevice } from "../../types/ui";
import { type ExportFormat, exportNotes } from "../../utils/exportUtils";
import { uiLogger } from "../../utils/logger";
// Import the global window.electron definition
import "../../types/electron";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsMenu: React.FC<Props> = ({ isOpen, onClose }) => {
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [audioDevicesLoaded, setAudioDevicesLoaded] = useState(false);

  // Separate store selectors to avoid infinite loops
  const viewOptions = useStore((state) => state.viewOptions);
  const updateViewOptions = useStore((state) => state.updateViewOptions);
  const micAudioDevices = useStore((state) => state.micAudioDevices);
  const systemAudioDevices = useStore((state) => state.systemAudioDevices);
  const selectedMicDeviceId = useStore((state) => state.selectedMicDeviceId);
  const selectedSystemDeviceId = useStore((state) => state.selectedSystemDeviceId);
  const setSelectedMicDevice = useStore((state) => state.setSelectedMicDevice);
  const setSelectedSystemDevice = useStore((state) => state.setSelectedSystemDevice);
  const setMicAudioDevices = useStore((state) => state.setMicAudioDevices);
  const setSystemAudioDevices = useStore((state) => state.setSystemAudioDevices);
  const notes = useStore((state) => state.notes);

  // Memoize notes count to prevent unnecessary re-renders
  const notesCount = useMemo(() => notes.length, [notes.length]);

  // Memoize handlers to prevent re-creation on every render
  const handleOpacityChange = useCallback(
    (value: number | number[]) => {
      updateViewOptions({ opacity: value as number });
    },
    [updateViewOptions],
  );

  const handleAlwaysOnTopChange = useCallback(
    (checked: boolean) => {
      updateViewOptions({ alwaysOnTop: checked });
    },
    [updateViewOptions],
  );

  const handleShowInstructionsChange = useCallback(
    (checked: boolean) => {
      updateViewOptions({ showInstructions: checked });
    },
    [updateViewOptions],
  );

  const handleMicDeviceChange = useCallback(
    (keys: "all" | Set<React.Key>) => {
      const key = Array.from(keys as Set<string>)[0];
      if (key) setSelectedMicDevice(Number(key));
    },
    [setSelectedMicDevice],
  );

  const handleSystemDeviceChange = useCallback(
    (keys: "all" | Set<React.Key>) => {
      const key = Array.from(keys as Set<string>)[0];
      if (key) setSelectedSystemDevice(Number(key));
    },
    [setSelectedSystemDevice],
  );

  const handleOpenSoundSettings = useCallback(() => {
    window.electron.openSettings("sound");
  }, []);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      uiLogger.info("Exporting notes", { format, totalNotes: notesCount });
      exportNotes(notes, format);
      setShowExportOptions(false);
    },
    [notes, notesCount],
  );

  // Close export dropdown when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Don't close if clicking on the export button or dropdown
      if (target?.closest(".export-dropdown-container")) {
        return;
      }
      setShowExportOptions(false);
    };

    if (showExportOptions) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showExportOptions]);

  const _modalRef = useModalFocus({ isOpen, onClose });

  // Load audio devices only when modal opens and hasn't been loaded yet
  useEffect(() => {
    if (!isOpen || audioDevicesLoaded) return;

    const electron = window.electron;
    if (electron) {
      electron
        .listAudioDevices()
        .then(
          (devices: {
            devices: AudioDevice[];
            defaultInput: number | null;
            defaultOutput: number | null;
          }) => {
            const micDevices = devices.devices.filter((d) => d.inputChannels > 0);
            const systemDevices = devices.devices.filter((d) => d.outputChannels > 0);

            setMicAudioDevices(
              micDevices.map((d) => ({ ...d, isDefault: d.id === devices.defaultInput })),
            );
            setSystemAudioDevices(
              systemDevices.map((d) => ({ ...d, isDefault: d.id === devices.defaultOutput })),
            );

            if (!selectedMicDeviceId && devices.defaultInput !== null) {
              setSelectedMicDevice(devices.defaultInput);
            }
            if (!selectedSystemDeviceId && devices.defaultOutput !== null) {
              setSelectedSystemDevice(devices.defaultOutput);
            }

            setAudioDevicesLoaded(true);
          },
        )
        .catch((error: Error) => {
          uiLogger.error("Failed to list audio devices", { error });
          setAudioDevicesLoaded(true); // Mark as loaded even on error to prevent retries
        });
    }
  }, [
    isOpen,
    audioDevicesLoaded,
    selectedMicDeviceId,
    selectedSystemDeviceId,
    setMicAudioDevices,
    setSystemAudioDevices,
    setSelectedMicDevice,
    setSelectedSystemDevice,
  ]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      placement="center"
      backdrop="opaque"
      isDismissable={true}
      hideCloseButton={false}
      classNames={{
        backdrop: "z-[2000]",
        wrapper: "z-[2000]",
      }}
    >
      <ModalContent>
        {(_onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="font-semibold text-xl">Settings</h2>
            </ModalHeader>
            <ModalBody className="gap-6 pb-6">
              {/* Window Opacity */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <PiEye />
                  <span>Window Opacity</span>
                </div>
                <Slider
                  label="Window Opacity"
                  step={0.1}
                  minValue={0.3}
                  maxValue={1}
                  value={viewOptions.opacity}
                  onChange={handleOpacityChange}
                  className="max-w-md"
                  formatOptions={{ style: "percent" }}
                  showTooltip={true}
                />
              </div>

              <Divider />

              {/* Window Behavior */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <PiDesktop />
                  <span>Window Behavior</span>
                </div>
                <Checkbox
                  isSelected={viewOptions.alwaysOnTop}
                  onValueChange={handleAlwaysOnTopChange}
                >
                  Always on Top
                </Checkbox>
              </div>

              <Divider />

              {/* Audio Devices */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <PiMicrophone />
                  <span>Audio Devices</span>
                </div>

                <Select
                  label="Microphone Input"
                  selectedKeys={selectedMicDeviceId ? [selectedMicDeviceId.toString()] : []}
                  onSelectionChange={handleMicDeviceChange}
                  placeholder={
                    micAudioDevices.length === 0 ? "No devices found" : "Select a device"
                  }
                  isDisabled={micAudioDevices.length === 0}
                >
                  {micAudioDevices.map((device) => (
                    <SelectItem
                      key={device.id}
                      textValue={`${device.name}${device.isDefault ? " (Default)" : ""}`}
                    >
                      {device.name} {device.isDefault ? "(Default)" : ""}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="System Audio Input (Stereo Mix)"
                  selectedKeys={selectedSystemDeviceId ? [selectedSystemDeviceId.toString()] : []}
                  onSelectionChange={handleSystemDeviceChange}
                  placeholder={
                    systemAudioDevices.length === 0 ? "No devices found" : "Select a device"
                  }
                  isDisabled={systemAudioDevices.length === 0}
                >
                  {systemAudioDevices.map((device) => (
                    <SelectItem
                      key={device.id}
                      textValue={`${device.name}${device.isDefault ? " (Default)" : ""}`}
                    >
                      {device.name} {device.isDefault ? "(Default)" : ""}
                    </SelectItem>
                  ))}
                </Select>

                {systemAudioDevices.length === 0 && (
                  <div className="text-danger text-small">
                    <p>
                      No system audio devices detected. On Windows, ensure "Stereo Mix" is enabled.
                    </p>
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      onPress={handleOpenSoundSettings}
                      className="mt-2"
                    >
                      Open Sound Settings
                    </Button>
                  </div>
                )}
              </div>

              <Divider />

              {/* Help & Instructions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <PiQuestion />
                  <span>Help & Instructions</span>
                </div>
                <Checkbox
                  isSelected={viewOptions.showInstructions}
                  onValueChange={handleShowInstructionsChange}
                >
                  Show Keyboard Instructions
                </Checkbox>
              </div>

              <Divider />

              {/* Export Notes */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <PiDownloadSimple />
                  <span>Export Notes ({notesCount})</span>
                </div>

                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      variant="flat"
                      color="primary"
                      isDisabled={notesCount === 0}
                      endContent={<PiCaretDown />}
                      startContent={<PiDownloadSimple />}
                    >
                      Export Notes
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Export format">
                    <DropdownItem
                      key="json"
                      description="Structured data with metadata"
                      onPress={() => handleExport("json")}
                    >
                      JSON
                    </DropdownItem>
                    <DropdownItem
                      key="markdown"
                      description="Formatted documentation"
                      onPress={() => handleExport("markdown")}
                    >
                      Markdown
                    </DropdownItem>
                    <DropdownItem
                      key="text"
                      description="Simple text format"
                      onPress={() => handleExport("text")}
                    >
                      Plain Text
                    </DropdownItem>
                    <DropdownItem
                      key="csv"
                      description="Spreadsheet compatible"
                      onPress={() => handleExport("csv")}
                    >
                      CSV
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>

                {notesCount === 0 && (
                  <p className="text-small text-warning">
                    Create some notes first to enable export
                  </p>
                )}
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default SettingsMenu;
