import type { IpcRendererEvent } from "electron";
import type { GeminiResponse } from "./gemini";
import type { AudioDevice } from "./ui";

export interface RecordingPayload {
  buffer: ArrayBuffer;
  timestamp: number;
}

export interface ElectronAPI {
  // Generic IPC invoke method
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;

  // IPC communication
  on: ((
    channel: "audio-activity",
    listener: (event: IpcRendererEvent, levels: { mic: number; system: number }) => void,
  ) => void) &
    ((
      channel: "gemini-response",
      listener: (event: IpcRendererEvent, response: GeminiResponse) => void,
    ) => void) &
    ((
      channel: "audio-status",
      listener: (event: IpcRendererEvent, status: string) => void,
    ) => void) &
    ((channel: "audio-error", listener: (event: IpcRendererEvent, error: string) => void) => void) &
    ((
      channel: "recording-complete",
      listener: (event: IpcRendererEvent, recordingPayload: RecordingPayload) => void,
    ) => void) &
    ((
      channel: "gemini-processing-start" | "gemini-processing-end" | "gemini-turn-complete",
      listener: (event: IpcRendererEvent) => void,
    ) => void);
  removeListener: ((
    channel: "audio-activity",
    listener: (event: IpcRendererEvent, levels: { mic: number; system: number }) => void,
  ) => void) &
    ((
      channel: "gemini-response",
      listener: (event: IpcRendererEvent, response: GeminiResponse) => void,
    ) => void) &
    ((
      channel: "audio-status",
      listener: (event: IpcRendererEvent, status: string) => void,
    ) => void) &
    ((channel: "audio-error", listener: (event: IpcRendererEvent, error: string) => void) => void) &
    ((
      channel: "recording-complete",
      listener: (event: IpcRendererEvent, recordingPayload: RecordingPayload) => void,
    ) => void) &
    ((
      channel: "gemini-processing-start" | "gemini-processing-end" | "gemini-turn-complete",
      listener: (event: IpcRendererEvent) => void,
    ) => void);

  // Audio device management
  listAudioDevices: () => Promise<{
    devices: AudioDevice[];
    defaultInput: number | null;
    defaultOutput: number | null;
  }>;
  startAudioCapture: (micDeviceId: number, systemDeviceId: number) => Promise<boolean>;
  stopAudioCapture: () => Promise<boolean>;

  // Window management
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // Settings
  openSettings: (type: "sound" | "input" | "output") => void;

  // Screenshot and capture
  captureScreen: (sendToGemini?: boolean) => Promise<Buffer>;
}

// Add the ElectronAPI to the Window interface
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
