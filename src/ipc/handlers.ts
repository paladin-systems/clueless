import { desktopCapturer, ipcMain, shell } from "electron";
import type { BrowserWindow } from "electron";
import { FRAME_SIZE_MS, TARGET_CHANNELS, TARGET_SAMPLE_RATE } from "../audio/constants";
import { AudioManager } from "../audio/manager";
import { createWavHeader, mixChunks } from "../audio/utils";
import { GeminiManager } from "../gemini/manager";
import { audioLogger, mainLogger } from "../utils/logger";

export class IPCHandlers {
  private audioManager: AudioManager;
  private geminiManager: GeminiManager;
  private mainWindow: BrowserWindow | null;
  private currentRecordingChunks: Buffer[] | null = null;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;
    this.audioManager = new AudioManager(mainWindow);
    this.geminiManager = new GeminiManager(mainWindow);
    this.setupHandlers();
  }

  /**
   * Setup all IPC handlers
   */
  private setupHandlers(): void {
    this.setupAudioHandlers();
    this.setupGeminiHandlers();
    this.setupWindowHandlers();
    this.setupUtilityHandlers();
  }

  /**
   * Setup audio-related IPC handlers
   */
  private setupAudioHandlers(): void {
    // List audio devices
    ipcMain.handle("list-audio-devices", () => {
      audioLogger.info("IPC: list-audio-devices called");
      return this.audioManager.listAudioDevices();
    });

    // Start audio capture
    ipcMain.handle(
      "start-audio-capture",
      async (_event, micDeviceId: number, systemDeviceId: number) => {
        audioLogger.info(
          { micDeviceId, systemDeviceId },
          "IPC: start-audio-capture called - Starting audio capture using RtAudio",
        );

        if (!this.geminiManager.isInitialized()) {
          mainLogger.error("Gemini AI client not initialized. Cannot start capture");
          this.mainWindow?.webContents.send(
            "audio-error",
            "Gemini AI client not initialized (API Key missing?).",
          );
          return false;
        }

        // Stop any existing processing
        await this.stopAllProcessing();

        // Reset recording chunks
        this.currentRecordingChunks = [];

        try {
          // Start Gemini session
          const geminiSuccess = await this.geminiManager.startSession();
          if (!geminiSuccess) {
            return false;
          }

          // Start audio streams
          const micSuccess = this.audioManager.startMicrophoneCapture(micDeviceId);
          const systemSuccess = this.audioManager.startSystemAudioCapture(systemDeviceId);

          if (!micSuccess || !systemSuccess) {
            await this.stopAllProcessing();
            return false;
          }

          // Start audio processing interval
          this.startAudioProcessing();

          return true;
        } catch (error) {
          mainLogger.error({ error }, "Failed to start audio capture or Gemini session");
          this.mainWindow?.webContents.send(
            "audio-error",
            `Failed to start capture: ${(error as Error).message || String(error)}`,
          );
          await this.stopAllProcessing();
          return false;
        }
      },
    );

    // Stop audio capture
    ipcMain.handle("stop-audio-capture", async () => {
      audioLogger.info("Stopping all audio capture and Gemini session");
      let recordingData: { timestamp: number; buffer: Buffer } | null = null;

      try {
        // Process recording chunks
        if (this.currentRecordingChunks && this.currentRecordingChunks.length > 0) {
          audioLogger.info(
            { chunkCount: this.currentRecordingChunks.length },
            "Processing recorded chunks",
          );
          const audioData = Buffer.concat(this.currentRecordingChunks);
          if (audioData.length > 0) {
            const header = createWavHeader(
              TARGET_SAMPLE_RATE,
              TARGET_CHANNELS,
              16,
              audioData.length,
            );
            const wavBuffer = Buffer.concat([header, audioData]);
            recordingData = { timestamp: Date.now(), buffer: wavBuffer };
          } else {
            audioLogger.warn("Concatenated audio data is empty");
            this.mainWindow?.webContents.send(
              "audio-error",
              "Recording resulted in empty audio data.",
            );
          }
        } else {
          audioLogger.info("No recording chunks found to process");
        }

        await this.stopAllProcessing();

        // Send recording data if available
        if (recordingData) {
          audioLogger.info("Sending recording-complete event with timestamp and buffer");
          this.mainWindow?.webContents.send("recording-complete", recordingData);
        }

        audioLogger.info("All audio capture and session stopped");
        return true;
      } catch (error) {
        audioLogger.error({ error }, "Failed to stop audio capture/session gracefully");
        return false;
      }
    });
  }

  /**
   * Setup Gemini-related IPC handlers
   */
  private setupGeminiHandlers(): void {
    // Capture and optionally send screenshot to Gemini
    ipcMain.handle("capture-screen", async (_event, sendToGemini = false) => {
      mainLogger.info("Capturing screenshot");
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1280, height: 720 },
      });

      if (sources.length > 0) {
        const pngBuffer = sources[0].thumbnail.toPNG();

        if (sendToGemini) {
          this.geminiManager.sendImage(pngBuffer);
        }

        return pngBuffer;
      }
      throw new Error("No screen sources found");
    });
  }

  /**
   * Setup window control IPC handlers
   */
  private setupWindowHandlers(): void {
    // Minimize window
    ipcMain.on("minimize-window", () => {
      this.mainWindow?.minimize();
    });

    // Maximize/Restore window
    ipcMain.on("maximize-window", () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    // Close window
    ipcMain.on("close-window", () => {
      this.mainWindow?.close();
    });
  }

  /**
   * Setup utility IPC handlers
   */
  private setupUtilityHandlers(): void {
    // Open external URLs
    ipcMain.on("open-settings", (_event, url: string) => {
      shell.openExternal(url);
    });
  }

  /**
   * Start audio processing interval
   */
  private startAudioProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      const { mic, system, newMicAvailable, newSystemAvailable } =
        this.audioManager.getLatestChunks();

      if (newMicAvailable && newSystemAvailable && mic && system) {
        try {
          const mixed = mixChunks(mic, system);

          // Collect mixed chunk for recording
          if (this.currentRecordingChunks) {
            this.currentRecordingChunks.push(mixed);
          }

          // Send to Gemini
          this.geminiManager.sendAudio(mixed);
        } catch (error) {
          audioLogger.error({ error }, "Error mixing or sending audio");
        } finally {
          this.audioManager.resetChunkFlags();
        }
      }
    }, FRAME_SIZE_MS / 2);
  }

  /**
   * Stop all processing (audio streams, Gemini session, intervals)
   */
  private async stopAllProcessing(): Promise<void> {
    // Stop processing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Stop audio streams
    this.audioManager.stopAllStreams();

    // Close Gemini session
    await this.geminiManager.closeSession();

    // Reset recording chunks
    this.currentRecordingChunks = null;
  }

  /**
   * Cleanup all handlers and resources
   */
  public cleanup(): void {
    this.stopAllProcessing();
    // Remove IPC handlers if needed (Electron automatically cleans up on app quit)
  }
}
