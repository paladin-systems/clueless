import { RtAudio, type RtAudioErrorType, type RtAudioStreamFlags } from "audify";
import type { BrowserWindow } from "electron";
import { audioLogger } from "../utils/logger";
import {
  FRAME_SIZE_SAMPLES,
  TARGET_CHANNELS,
  TARGET_FORMAT,
  TARGET_SAMPLE_RATE,
} from "./constants";
import { getPeakLevel } from "./utils";

export class AudioManager {
  private micAudioIO: RtAudio | null = null;
  private systemAudioIO: RtAudio | null = null;
  private latestMicChunk: Buffer | null = null;
  private latestSystemChunk: Buffer | null = null;
  private newMicChunkAvailable = false;
  private newSystemChunkAvailable = false;
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;
  }

  /**
   * List available audio devices
   */
  public listAudioDevices() {
    try {
      const rtAudio = new RtAudio();
      const devices = rtAudio.getDevices();
      const defaultInput = rtAudio.getDefaultInputDevice();
      const defaultOutput = rtAudio.getDefaultOutputDevice();

      audioLogger.debug(
        {
          deviceCount: devices.length,
          defaultInput,
          defaultOutput,
          devices: devices.map((d) => ({
            id: d.id,
            name: d.name,
            inputChannels: d.inputChannels,
            outputChannels: d.outputChannels,
          })),
        },
        "Devices found",
      );

      const devicesWithChannels = devices
        ? devices.map((d) => ({
            ...d,
            inputChannels: d.inputChannels,
            outputChannels: d.outputChannels,
          }))
        : [];

      return { devices: devicesWithChannels, defaultInput, defaultOutput };
    } catch (error) {
      audioLogger.error({ error }, "Error listing audio devices with RtAudio");
      this.mainWindow?.webContents.send(
        "audio-error",
        `Error listing devices: ${(error as Error).message}`,
      );
      return { devices: [], defaultInput: null, defaultOutput: null };
    }
  }

  /**
   * Start microphone capture
   */
  public startMicrophoneCapture(deviceId: number): boolean {
    try {
      audioLogger.info({ micDeviceId: deviceId }, "Starting microphone capture with RtAudio");
      this.micAudioIO = new RtAudio();

      const micInputCallback = (pcm: Buffer) => {
        this.latestMicChunk = pcm;
        const level = getPeakLevel(pcm);
        this.mainWindow?.webContents.send("audio-activity", {
          mic: level,
          system: getPeakLevel(this.latestSystemChunk || Buffer.alloc(0)),
        });
        this.newMicChunkAvailable = true;
      };

      this.micAudioIO.openStream(
        null,
        {
          deviceId: deviceId,
          nChannels: TARGET_CHANNELS,
          firstChannel: 0,
        },
        TARGET_FORMAT,
        TARGET_SAMPLE_RATE,
        FRAME_SIZE_SAMPLES,
        `MicStream-${Date.now()}`,
        micInputCallback,
        null,
      );
      this.micAudioIO.start();
      audioLogger.info("Microphone audio capture started with RtAudio");
      return true;
    } catch (error) {
      audioLogger.error({ error }, "Failed to start microphone capture");
      return false;
    }
  }

  /**
   * Start system audio capture
   */
  public startSystemAudioCapture(deviceId: number): boolean {
    try {
      audioLogger.info({ systemDeviceId: deviceId }, "Starting system audio capture with RtAudio");
      this.systemAudioIO = new RtAudio();

      const systemInputCallback = (pcm: Buffer) => {
        this.latestSystemChunk = pcm;
        const level = getPeakLevel(pcm);
        this.mainWindow?.webContents.send("audio-activity", {
          mic: getPeakLevel(this.latestMicChunk || Buffer.alloc(0)),
          system: level,
        });
        this.newSystemChunkAvailable = true;
      };

      this.systemAudioIO.openStream(
        null,
        {
          deviceId: deviceId,
          nChannels: TARGET_CHANNELS,
          firstChannel: 0,
        },
        TARGET_FORMAT,
        TARGET_SAMPLE_RATE,
        FRAME_SIZE_SAMPLES,
        `SystemStream-${Date.now()}`,
        systemInputCallback,
        null,
        0 as RtAudioStreamFlags,
        (type: RtAudioErrorType, msg: string) => {
          audioLogger.error({ type, message: msg }, "System Audio RtAudio Error");
          if (msg.includes("No open stream to close")) {
            audioLogger.debug("Ignored No open stream to close error during cleanup");
            return;
          }
          this.mainWindow?.webContents.send("audio-error", `System audio error: ${msg}`);
        },
      );
      this.systemAudioIO.start();
      audioLogger.info("System audio capture started with RtAudio");
      return true;
    } catch (error) {
      audioLogger.error({ error }, "Failed to start system audio capture");
      return false;
    }
  }

  /**
   * Stop all audio streams
   */
  public stopAllStreams(): void {
    if (this.micAudioIO) {
      audioLogger.info("Stopping mic audio capture");
      try {
        if (this.micAudioIO.isStreamOpen()) {
          this.micAudioIO.stop();
          this.micAudioIO.closeStream();
        }
      } catch (error) {
        audioLogger.error({ error }, "Error stopping mic audio stream");
      }
      this.micAudioIO = null;
    }

    if (this.systemAudioIO) {
      audioLogger.info("Stopping system audio capture");
      try {
        if (this.systemAudioIO.isStreamOpen()) {
          this.systemAudioIO.stop();
          this.systemAudioIO.closeStream();
        }
      } catch (error) {
        audioLogger.error({ error }, "Error stopping system audio stream");
      }
      this.systemAudioIO = null;
    }

    // Reset chunk buffers
    this.latestMicChunk = null;
    this.latestSystemChunk = null;
    this.newMicChunkAvailable = false;
    this.newSystemChunkAvailable = false;
  }

  /**
   * Get latest audio chunks
   */
  public getLatestChunks(): {
    mic: Buffer | null;
    system: Buffer | null;
    newMicAvailable: boolean;
    newSystemAvailable: boolean;
  } {
    return {
      mic: this.latestMicChunk,
      system: this.latestSystemChunk,
      newMicAvailable: this.newMicChunkAvailable,
      newSystemAvailable: this.newSystemChunkAvailable,
    };
  }

  /**
   * Reset chunk availability flags
   */
  public resetChunkFlags(): void {
    this.newMicChunkAvailable = false;
    this.newSystemChunkAvailable = false;
  }
}
