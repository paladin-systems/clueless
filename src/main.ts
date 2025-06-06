import dotenv from "dotenv";

// Load environment variables from .env file as early as possible
dotenv.config({
  path: path.join(process.cwd(), ".env"),
});

import path from "path";
import { type Blob as GenAIBlob, GoogleGenAI, Modality, type Session } from "@google/genai";
import { RtAudio, type RtAudioErrorType, RtAudioFormat, type RtAudioStreamFlags } from "audify"; // Import audify, RtAudioErrorType, and RtAudioStreamFlags
import { BrowserWindow, app, desktopCapturer, ipcMain, shell } from "electron";
import { audioLogger, geminiLogger, mainLogger } from "./utils/logger";

// Constants
const isDev = !app.isPackaged;
const TARGET_SAMPLE_RATE = 16000; // Sample rate expected by Gemini
const TARGET_CHANNELS = 1; // Mono audio expected by Gemini
const TARGET_FORMAT = RtAudioFormat.RTAUDIO_SINT16; // Signed 16-bit integer PCM
const FRAME_SIZE_MS = 40; // Process audio in 40ms chunks
const FRAME_SIZE_SAMPLES = (TARGET_SAMPLE_RATE * FRAME_SIZE_MS) / 1000; // Calculate frame size in samples

// Access environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-live-001";
const GEMINI_TEMPERATURE = Number.parseFloat(process.env.GEMINI_TEMPERATURE || "0.7");

/**
 * Converts a Node.js Buffer to a GenAI Blob format for sending to Gemini API
 * @param buffer The audio buffer to convert
 * @param mimeType The MIME type of the audio data
 */
function bufferToGenAIBlob(buffer: Buffer, mimeType: string): GenAIBlob {
  const base64Data = buffer.toString("base64");
  return {
    mimeType,
    data: base64Data,
  };
}

let mainWindow: BrowserWindow | null = null;
let micAudioIO: RtAudio | null = null; // Use RtAudio type
let systemAudioIO: RtAudio | null = null; // Use RtAudio type

// Helper function to create a WAV header
function createWavHeader(
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number,
  dataLength: number,
): Buffer {
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const subChunk2Size = dataLength;
  const chunkSize = 36 + subChunk2Size; // 4 + (8 + 16) + (8 + subChunk2Size)

  const buffer = Buffer.alloc(44);

  // RIFF chunk descriptor
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write("WAVE", 8);

  // fmt sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(subChunk2Size, 40);

  return buffer;
}
let geminiSession: Session | null = null; // To hold the Gemini Live session

let latestMicChunk: Buffer | null = null; // For audio mixing
let latestSystemChunk: Buffer | null = null; // For audio mixing
let newMicChunkAvailable = false; // Flag for new mic data
let newSystemChunkAvailable = false; // Flag for new system data
let currentRecordingChunks: Buffer[] | null = null; // To store mixed audio chunks during recording
let processingInterval: NodeJS.Timeout | null = null; // Interval timer for processing audio

// Initialize the Generative AI client
let genAI: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
} else {
  mainLogger.error("Gemini API key not found. Please set the GEMINI_API_KEY environment variable.");
  // Optionally, quit the app or disable functionality
  // app.quit();
}

// Mixes two mono Int16 PCM audio buffers, handling potentially slightly different lengths
function mixChunks(mic: Buffer, system: Buffer): Buffer {
  // Ensure both buffers exist and contain some data
  if (!mic || !system || mic.length === 0 || system.length === 0) {
    audioLogger.warn("Invalid or empty buffers provided to mixChunks. Returning empty buffer.");
    return Buffer.alloc(0);
  }

  // Determine the length to mix (use the shorter buffer length)
  // Also ensure the length is even for Int16 processing
  const length = Math.min(mic.length, system.length);
  const mixLength = length % 2 === 0 ? length : length - 1; // Ensure even length

  if (mixLength <= 0) {
    audioLogger.warn("Zero mixable length after adjusting for Int16. Returning empty buffer.");
    return Buffer.alloc(0);
  }

  const mixed = Buffer.alloc(mixLength);

  for (let i = 0; i < mixLength; i += 2) {
    const micSample = mic.readInt16LE(i);
    const sysSample = system.readInt16LE(i);

    // Simple addition and clamping
    let mixedSample = micSample + sysSample;
    mixedSample = Math.max(-32768, Math.min(32767, mixedSample)); // Clamp to Int16 range

    mixed.writeInt16LE(mixedSample, i);
  }
  return mixed;
}

// Compute peak audio level (0.0 to 1.0) for a mono Int16 PCM buffer
function getPeakLevel(buffer: Buffer): number {
  let peak = 0;
  // Iterate through Int16 samples
  for (let i = 0; i + 1 < buffer.length; i += 2) {
    const sample = Math.abs(buffer.readInt16LE(i));
    if (sample > peak) peak = sample;
  }
  // Avoid division by zero if buffer is silent
  return peak > 0 ? peak / 32767 : 0;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: "", // Set empty title to prevent any title bar display
    hasShadow: false,
    resizable: false, // Prevent window from being resized
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // Vite builds preload here
      nodeIntegration: false, // Keep false
      contextIsolation: true, // Keep true
    },
    frame: false, // Keep false for transparency
    transparent: true, // Enable window transparency
    autoHideMenuBar: true, // Hide the menu bar
    fullscreen: true, // Set to true for fullscreen
    alwaysOnTop: true, // Keep window always on top for overlay behavior
    skipTaskbar: true, // Hide from taskbar for true overlay experience
    // Configuration for overlay window (example)
    // frame: false,
    // transparent: true,
    // alwaysOnTop: true,
    // skipTaskbar: true,
  });
  // Load the index.html of the app.
  if (isDev) {
    // In development, use the Vite dev server URL
    mainWindow.loadURL("http://localhost:5173"); // Vite dev server URL
    // Open the DevTools automatically in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, use the built index.html file
    mainLogger.info(
      { path: path.join(__dirname, "../dist/index.html") },
      "Loading production build",
    );
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Clean up audio streams and session on close
  mainWindow.on("closed", async () => {
    await stopAllAudioStreamsAndSession();
    mainWindow = null;
  });
}

let heartbeatInterval: NodeJS.Timeout | null = null;
const HEARTBEAT_INTERVAL_MS = 5000; // 5 seconds
let isClosingIntentionally = false; // <<< ADD THIS FLAG

// Helper function to keep the Gemini session alive during periods of silence
function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (geminiSession) {
      try {
        // Send an empty client content to keep the session alive
        // This is similar to a WebSocket ping/pong
        geminiSession.sendClientContent({ turnComplete: false });
      } catch (error) {
        geminiLogger.warn({ error }, "Error sending heartbeat");
        // If we have persistent errors, stop the heartbeat
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      }
    } else {
      // No active session, stop the heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
}

// Helper function to stop the heartbeat
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Update stopAllAudioStreamsAndSession to use RtAudio methods AND set the flag
async function stopAllAudioStreamsAndSession() {
  stopHeartbeat();

  // Stop the processing interval
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }

  if (micAudioIO) {
    audioLogger.info("Stopping mic audio capture");
    try {
      if (micAudioIO.isStreamOpen()) {
        micAudioIO.stop();
        micAudioIO.closeStream();
      }
    } catch (error) {
      audioLogger.error({ error }, "Error stopping mic audio stream");
    }
    micAudioIO = null;
  }

  if (systemAudioIO) {
    audioLogger.info("Stopping system audio capture");
    try {
      if (systemAudioIO.isStreamOpen()) {
        systemAudioIO.stop();
        systemAudioIO.closeStream();
      }
    } catch (error) {
      audioLogger.error({ error }, "Error stopping system audio stream");
    }
    systemAudioIO = null;
  }

  // Remove resample worker termination logic
  // if (resampleWorker) { ... }

  if (geminiSession) {
    geminiLogger.info("Closing Gemini session intentionally");
    isClosingIntentionally = true; // <<< SET FLAG HERE
    try {
      await geminiSession.close();
      geminiLogger.info("Gemini session closed");
    } catch (error) {
      geminiLogger.error({ error }, "Error closing Gemini session");
      isClosingIntentionally = false; // Reset flag on error too
    }
    // Note: geminiSession is set to null *after* onclose callback potentially runs
    geminiSession = null;
  }

  // Reset chunk buffers
  latestMicChunk = null;
  latestSystemChunk = null;
  currentRecordingChunks = null; // Clear recorded chunks
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC: List audio input devices using RtAudio
ipcMain.handle("list-audio-devices", () => {
  try {
    const rtAudio = new RtAudio();
    const devices = rtAudio.getDevices();
    const defaultInput = rtAudio.getDefaultInputDevice();
    const defaultOutput = rtAudio.getDefaultOutputDevice();
    // Log devices with correct Pino parameter order: object first, message second
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

    // Add inputChannels and outputChannels to each device
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
    mainWindow?.webContents.send(
      "audio-error",
      `Error listing devices: ${(error as Error).message}`,
    );
    return { devices: [], defaultInput: null, defaultOutput: null };
  }
});

// IPC: Start audio capture - Refactored for RtAudio
ipcMain.handle(
  "start-audio-capture",
  async (event, micDeviceId: number, systemDeviceId: number) => {
    audioLogger.info({ micDeviceId, systemDeviceId }, "Starting audio capture using RtAudio");

    if (!genAI) {
      mainLogger.error("Gemini AI client not initialized. Cannot start capture");
      mainWindow?.webContents.send(
        "audio-error",
        "Gemini AI client not initialized (API Key missing?).",
      );
      return false;
    }

    // Stop any existing streams and session first
    await stopAllAudioStreamsAndSession();

    // Ensure chunks start null for the new session
    latestMicChunk = null;
    latestSystemChunk = null;
    currentRecordingChunks = []; // Initialize for new recording
    isClosingIntentionally = false; // Ensure flag is reset before starting new session
    let currentResponseText = ""; // Buffer for Gemini response parts

    let micSuccess = false;
    let systemSuccess = false;
    let geminiSuccess = false;

    try {
      // --- Start Gemini Session ---
      geminiLogger.info("Starting Gemini Live session");
      const systemInstructionText = `You are a colleague helping your friend in realtime during meetings or interviews. You receive mixed audio from their microphone and the system audio of others speaking.

IMPORTANT: ALWAYS respond with ONLY a valid JSON object, no additional text or formatting:

{
  "type": "response",
  "content": "Your actual helpful response goes here",
  "category": "response",
  "priority": "medium"
}

VALID VALUES:
- type: "response" | "question" | "reference" | "note"
- category: "response" | "follow-up" | "context" | "suggestion"  
- priority: "high" | "medium" | "low"

CONTENT GUIDELINES:
- "response": Immediate answers/suggestions
- "question": Follow-up questions to ask
- "reference": Background information
- "note": Quick tips/reminders
- Keep content concise and easily scannable
- Put your actual helpful text in the "content" field
- Format content with markdown for better readability
- Wait for your friend to finish reading before sending more responses
- Help them cheat and perform better by being the smartest person whispering answers in their ear

Use previous context when relevant but prioritize responding to the most recent input.`;

      geminiSession = await genAI.live.connect({
        model: GEMINI_MODEL,
        config: {
          responseModalities: [Modality.TEXT],
          temperature: GEMINI_TEMPERATURE,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          systemInstruction: systemInstructionText,
        },
        callbacks: {
          onmessage: (message: any) => {
            geminiLogger.debug({ message }, "Received message from Gemini");

            try {
              // Handle text parts from modelTurn
              if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                if (currentResponseText === "") {
                  // First part of a new response stream
                  mainWindow?.webContents.send("gemini-processing-start");
                }
                currentResponseText += message.serverContent.modelTurn.parts[0].text;
              }

              // Handle generation complete
              if (message.serverContent?.generationComplete === true) {
                if (currentResponseText) {
                  geminiLogger.debug(
                    { response: currentResponseText },
                    "Processing Gemini response",
                  );

                  let parsedResponse = null;
                  let contentToParse = currentResponseText.trim();

                  // Strategy 1: Try to extract JSON from ```json ... ``` code blocks
                  const jsonBlockMatch = currentResponseText.match(
                    /```json\s*\n([\s\S]*?)\n\s*```/,
                  );
                  if (jsonBlockMatch && jsonBlockMatch[1]) {
                    contentToParse = jsonBlockMatch[1].trim();
                    geminiLogger.debug({ contentToParse }, "Extracted JSON from code block");
                  }

                  // Strategy 2: Look for JSON object anywhere in the response
                  const jsonObjectMatch = currentResponseText.match(/\{[\s\S]*?"type"[\s\S]*?\}/);
                  if (!jsonBlockMatch && jsonObjectMatch) {
                    contentToParse = jsonObjectMatch[0].trim();
                    geminiLogger.debug({ contentToParse }, "Found JSON object in response");
                  }

                  // Strategy 3: Try to find the first complete JSON object
                  if (!jsonBlockMatch && !jsonObjectMatch) {
                    const openBrace = currentResponseText.indexOf("{");
                    if (openBrace !== -1) {
                      let braceCount = 0;
                      let endPos = openBrace;

                      for (let i = openBrace; i < currentResponseText.length; i++) {
                        if (currentResponseText[i] === "{") braceCount++;
                        if (currentResponseText[i] === "}") braceCount--;
                        if (braceCount === 0) {
                          endPos = i;
                          break;
                        }
                      }

                      if (braceCount === 0) {
                        contentToParse = currentResponseText
                          .substring(openBrace, endPos + 1)
                          .trim();
                        geminiLogger.debug({ contentToParse }, "Extracted balanced JSON");
                      }
                    }
                  }

                  try {
                    const parsedJson = JSON.parse(contentToParse);
                    geminiLogger.debug({ parsedJson }, "Parsed JSON");

                    // Validate the expected structure
                    if (
                      typeof parsedJson === "object" &&
                      parsedJson !== null &&
                      ["response", "question", "reference", "note"].includes(parsedJson.type) &&
                      typeof parsedJson.content === "string" &&
                      ["response", "follow-up", "context", "suggestion"].includes(
                        parsedJson.category,
                      ) &&
                      ["high", "medium", "low"].includes(parsedJson.priority)
                    ) {
                      geminiLogger.info({ parsedJson }, "Valid structured response, sending");
                      parsedResponse = { ...parsedJson, timestamp: Date.now() };
                    } else {
                      geminiLogger.warn(
                        "JSON structure validation failed, expected fields missing or invalid",
                      );
                    }
                  } catch (parseError) {
                    geminiLogger.debug({ parseError }, "JSON parsing failed");
                  }

                  // If we successfully parsed a valid JSON response, send it
                  if (parsedResponse) {
                    mainWindow?.webContents.send("gemini-response", parsedResponse);
                  } else {
                    // Fallback: send as plain text response but clean it up first
                    let cleanContent = currentResponseText;

                    // If the content looks like raw JSON, try to extract just the content field
                    if (cleanContent.includes('"content"') && cleanContent.includes('"type"')) {
                      try {
                        // Try to extract content from what looks like a JSON structure
                        const contentMatch = cleanContent.match(
                          /"content"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/,
                        );
                        if (contentMatch && contentMatch[1]) {
                          cleanContent = contentMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n");
                          geminiLogger.debug(
                            { cleanContent },
                            "Extracted content from JSON-like text",
                          );
                        }
                      } catch (e) {
                        geminiLogger.debug("Failed to extract content from JSON-like text");
                      }
                    }

                    geminiLogger.info({ cleanContent }, "Sending as plain text response");
                    mainWindow?.webContents.send("gemini-response", {
                      type: "response",
                      content: cleanContent,
                      category: "response",
                      priority: "medium",
                      timestamp: Date.now(),
                    });
                  }
                }
                currentResponseText = ""; // Reset buffer
                mainWindow?.webContents.send("gemini-processing-end");
              }

              // Handle turn complete
              if (message.serverContent?.turnComplete === true) {
                mainWindow?.webContents.send("gemini-turn-complete");
                // Ensure buffer is cleared if turn completes, possibly before generation if an error occurs
                if (currentResponseText !== "") {
                  geminiLogger.warn(
                    "Gemini turn completed, but response buffer was not empty. Clearing buffer",
                  );
                  currentResponseText = "";
                  // If processing was ongoing, ensure it's marked as ended
                  mainWindow?.webContents.send("gemini-processing-end");
                }
              }

              // Handle errors from Gemini
              if (message.error) {
                geminiLogger.error({ error: message.error }, "Gemini message contained an error");
                mainWindow?.webContents.send(
                  "audio-error",
                  `Gemini error: ${message.error.message || JSON.stringify(message.error)}`,
                );
                // If an error occurs, clear buffer and signal end of processing
                currentResponseText = "";
                mainWindow?.webContents.send("gemini-processing-end");
              }
            } catch (error) {
              geminiLogger.error({ error }, "Error processing Gemini message in onmessage");
              mainWindow?.webContents.send(
                "audio-error",
                `Internal error processing Gemini response: ${(error as Error).message}`,
              );
              currentResponseText = "";
              mainWindow?.webContents.send("gemini-processing-end");
            }
          },
          onerror: (error: ErrorEvent) => {
            geminiLogger.error({ error }, "Gemini session error (onerror callback)");
            mainWindow?.webContents.send(
              "audio-error",
              `Gemini session error: ${error.message || error.error || "Unknown error"}`,
            );
            stopAllAudioStreamsAndSession(); // Still stop everything on error
          },
          onopen: () => {
            geminiLogger.info("Gemini session opened successfully");
            mainWindow?.webContents.send("audio-status", "Connected to Gemini.");
            startHeartbeat(); // Start sending heartbeat signals
          },
          onclose: (event: CloseEvent) => {
            // <<< MODIFY THIS CALLBACK
            geminiLogger.info({ code: event.code, reason: event.reason }, "Gemini session closed");
            if (!isClosingIntentionally) {
              // Check the flag
              // Only send status if closure wasn't intentional
              mainWindow?.webContents.send(
                "audio-status",
                `Disconnected from Gemini: ${event.reason || "Unknown reason"}`,
              );
            }
            // Reset the flag regardless, ready for the next session or unexpected close
            isClosingIntentionally = false;
            stopHeartbeat(); // Stop heartbeat on close
            // Do NOT set geminiSession = null here, it's handled in stopAllAudioStreamsAndSession
          },
        },
      });
      geminiLogger.info("Gemini Live session connect call completed");
      // Start heartbeat moved to onopen callback
      geminiSuccess = true;
      geminiLogger.info("Gemini session configuration seems successful");
      // --- Gemini Session Started ---

      // Function to process and send mixed audio (Keep this part mostly as is)
      function processAndSendMixedAudio() {
        if (latestMicChunk && latestSystemChunk && geminiSession) {
          try {
            const mixed = mixChunks(latestMicChunk, latestSystemChunk);

            // --- Collect mixed chunk for recording ---
            if (currentRecordingChunks) {
              currentRecordingChunks.push(mixed);
            }
            // --- End recording collection ---

            // Convert mixed buffer to GenAIBlob format
            const audioBlob = bufferToGenAIBlob(
              mixed,
              "audio/pcm", // Keep MIME type simple
            );

            // Send the audio data to Gemini (check session again just in case)
            if (geminiSession) {
              geminiSession.sendRealtimeInput({
                media: audioBlob,
              });
            } else {
              geminiLogger.warn("Gemini session missing when trying to send audio");
            }
            // Optionally send mixed audio to renderer for visualization/debugging
            // mainWindow?.webContents.send('mixed-audio', mixed);
          } catch (mixErr) {
            audioLogger.error({ error: mixErr }, "Error mixing or sending audio");
          } finally {
            // Reset flags after processing attempt
            newMicChunkAvailable = false;
            newSystemChunkAvailable = false;
          }
        }
      }

      // --- Start Microphone Capture using RtAudio ---
      audioLogger.info({ micDeviceId }, "Starting microphone capture with RtAudio");
      micAudioIO = new RtAudio();

      // Define the input callback for the microphone
      const micInputCallback = (pcm: Buffer) => {
        latestMicChunk = pcm;
        // Compute peak level and send for activity indicator
        const level = getPeakLevel(pcm);
        // Send both levels together
        mainWindow?.webContents.send("audio-activity", {
          mic: level,
          system: getPeakLevel(latestSystemChunk || Buffer.alloc(0)),
        });
        newMicChunkAvailable = true;
      };

      // Open the microphone stream (input-only)
      micAudioIO.openStream(
        null,
        {
          deviceId: micDeviceId,
          nChannels: TARGET_CHANNELS,
          firstChannel: 0,
        },
        TARGET_FORMAT,
        TARGET_SAMPLE_RATE,
        FRAME_SIZE_SAMPLES,
        `MicStream-${Date.now()}`,
        micInputCallback,
        null, // frameOutputCallback
      );
      micAudioIO.start();
      audioLogger.info("Microphone audio capture started with RtAudio");
      micSuccess = true;
      // --- Microphone Capture Started ---

      // --- Start System Audio Capture using RtAudio ---
      audioLogger.info({ systemDeviceId }, "Starting system audio capture with RtAudio");
      systemAudioIO = new RtAudio();

      // Define the input callback for system audio
      const systemInputCallback = (pcm: Buffer) => {
        latestSystemChunk = pcm;
        // Compute peak level and send for activity indicator
        const level = getPeakLevel(pcm);
        // Send both levels together
        mainWindow?.webContents.send("audio-activity", {
          mic: getPeakLevel(latestMicChunk || Buffer.alloc(0)),
          system: level,
        });
        newSystemChunkAvailable = true;
      };

      // Open the system audio input stream
      systemAudioIO.openStream(
        null, // No output stream parameters
        {
          deviceId: systemDeviceId,
          nChannels: TARGET_CHANNELS, // Request mono (RtAudio might handle downmixing)
          firstChannel: 0,
        },
        TARGET_FORMAT,
        TARGET_SAMPLE_RATE,
        FRAME_SIZE_SAMPLES, // Buffer frames
        `SystemStream-${Date.now()}`, // Stream name
        systemInputCallback, // Input callback
        null, // No output callback (outputCallback)
        0 as RtAudioStreamFlags, // options (Cast 0 to RtAudioStreamFlags)
        (type: RtAudioErrorType, msg: string) => {
          // Correct error callback signature
          audioLogger.error({ type, message: msg }, "System Audio RtAudio Error");
          // Ignore "No open stream to close" errors as they occur during cleanup
          if (msg.includes("No open stream to close")) {
            audioLogger.debug("Ignored No open stream to close error during cleanup");
            return;
          }
          mainWindow?.webContents.send("audio-error", `System audio error: ${msg}`);
          stopAllAudioStreamsAndSession(); // Stop everything on device error
        },
      );
      systemAudioIO.start();
      audioLogger.info("System audio capture started with RtAudio");
      systemSuccess = true;
      // --- System Audio Capture Started ---

      // --- Remove Resample Worker Logic ---
      // No need to spawn or manage the worker anymore

      // --- Start Processing Interval --- (Keep this logic)
      if (processingInterval) clearInterval(processingInterval); // Clear any old interval
      processingInterval = setInterval(() => {
        // Check if both new mic and system chunks are available
        if (newMicChunkAvailable && newSystemChunkAvailable) {
          // Process the latest available chunks
          processAndSendMixedAudio();
          // Flags are reset inside processAndSendMixedAudio
        }
      }, FRAME_SIZE_MS / 2); // Process more frequently than chunk arrival (e.g., every 20ms for 40ms chunks)
      // --- Processing Interval Started ---

      return micSuccess && systemSuccess && geminiSuccess; // Success only if all started
    } catch (error) {
      mainLogger.error({ error }, "Failed to start audio capture or Gemini session with RtAudio");
      // Use type assertion for error message
      mainWindow?.webContents.send(
        "audio-error",
        `Failed to start capture: ${(error as Error).message || String(error)}`,
      );
      // Clean up if anything failed
      await stopAllAudioStreamsAndSession();
      return false;
    }
  },
);

// IPC: Stop audio capture - Updated for RtAudio
ipcMain.handle("stop-audio-capture", async () => {
  audioLogger.info("Stopping all audio capture and Gemini session (RtAudio)");
  let recordingData: { timestamp: number; buffer: Buffer } | null = null; // To store buffer and timestamp

  try {
    // --- Process recording chunks ---
    if (currentRecordingChunks && currentRecordingChunks.length > 0) {
      audioLogger.info({ chunkCount: currentRecordingChunks.length }, "Processing recorded chunks");
      const audioData = Buffer.concat(currentRecordingChunks);
      if (audioData.length > 0) {
        const header = createWavHeader(TARGET_SAMPLE_RATE, TARGET_CHANNELS, 16, audioData.length);
        const wavBuffer = Buffer.concat([header, audioData]);
        // Store buffer and timestamp together
        recordingData = { timestamp: Date.now(), buffer: wavBuffer };
      } else {
        audioLogger.warn("Concatenated audio data is empty");
        mainWindow?.webContents.send("audio-error", "Recording resulted in empty audio data.");
      }
    } else {
      audioLogger.info("No recording chunks found to process");
    }
    // --- Recording processed ---

    await stopAllAudioStreamsAndSession(); // Stop streams *after* processing chunks

    // Send recording data *after* stopping streams if data exists
    if (recordingData) {
      audioLogger.info("Sending recording-complete event with timestamp and buffer");
      // Send the object containing both timestamp and buffer
      mainWindow?.webContents.send("recording-complete", recordingData);
    }

    audioLogger.info("All audio capture and session stopped");
    return true; // Indicate success
  } catch (error) {
    audioLogger.error({ error }, "Failed to stop audio capture/session gracefully (RtAudio)");
    return false;
  }
});

// IPC: Capture screenshot on request (Keep this logic)
ipcMain.handle("capture-screen", async (event, sendToGemini = false) => {
  mainLogger.info("Capturing screenshot");
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 1280, height: 720 }, // Adjust size as needed
  });

  if (sources.length > 0) {
    const pngBuffer = sources[0].thumbnail.toPNG();

    // If requested, send the image to Gemini session
    if (sendToGemini && geminiSession) {
      try {
        geminiLogger.info("Sending screenshot to Gemini");
        const imageBlob = bufferToGenAIBlob(pngBuffer, "image/png");
        geminiSession.sendRealtimeInput({
          media: imageBlob,
        });
      } catch (error) {
        geminiLogger.error({ error }, "Error sending screenshot to Gemini");
      }
    }

    return pngBuffer;
  } else {
    throw new Error("No screen sources found");
  }
});

// IPC: Open the Windows Sound settings to help user enable "Stereo Mix" if needed (Keep this logic)
ipcMain.on("open-settings", (event, url: string) => {
  shell.openExternal(url);
});

// --- Window Control IPC Handlers ---

// Minimize window
ipcMain.on("minimize-window", () => {
  mainWindow?.minimize();
});

// Maximize/Restore window
ipcMain.on("maximize-window", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

// Close window
ipcMain.on("close-window", () => {
  mainWindow?.close();
});
