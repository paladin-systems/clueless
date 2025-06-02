import { app, BrowserWindow, ipcMain, desktopCapturer, shell } from 'electron';
import path from 'path';
import { GoogleGenAI, Session, Blob as GenAIBlob, Modality } from '@google/genai';
import dotenv from 'dotenv';
import { RtAudio, RtAudioFormat, RtAudioErrorType, RtAudioStreamFlags } from 'audify'; // Import audify, RtAudioErrorType, and RtAudioStreamFlags

// Load environment variables from .env file
dotenv.config({
  path: path.join(process.cwd(), '.env')
});

// Remove naudiodon require
// const naudiodon = require('@ecubus-pro/naudiodon');

// Constants
const isDev = !app.isPackaged;
const TARGET_SAMPLE_RATE = 16000; // Sample rate expected by Gemini
const TARGET_CHANNELS = 1; // Mono audio expected by Gemini
const TARGET_FORMAT = RtAudioFormat.RTAUDIO_SINT16; // Signed 16-bit integer PCM
const FRAME_SIZE_MS = 40; // Process audio in 40ms chunks
const FRAME_SIZE_SAMPLES = (TARGET_SAMPLE_RATE * FRAME_SIZE_MS) / 1000; // Calculate frame size in samples

// Access environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-live-001';
const GEMINI_TEMPERATURE = parseFloat(process.env.GEMINI_TEMPERATURE || '0.7');

/**
 * Converts a Node.js Buffer to a GenAI Blob format for sending to Gemini API
 * @param buffer The audio buffer to convert
 * @param mimeType The MIME type of the audio data
 */
function bufferToGenAIBlob(buffer: Buffer, mimeType: string): GenAIBlob {
   const base64Data = buffer.toString('base64');
   return {
     mimeType,
     data: base64Data,
   };
 }

let mainWindow: BrowserWindow | null = null;
let micAudioIO: RtAudio | null = null; // Use RtAudio type
let systemAudioIO: RtAudio | null = null; // Use RtAudio type
// Remove resampleWorker
// let resampleWorker: Worker | null = null; 

// Helper function to create a WAV header
function createWavHeader(sampleRate: number, numChannels: number, bitsPerSample: number, dataLength: number): Buffer {
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const subChunk2Size = dataLength;
  const chunkSize = 36 + subChunk2Size; // 4 + (8 + 16) + (8 + subChunk2Size)

  const buffer = Buffer.alloc(44);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write('data', 36);
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
  console.error('Gemini API key not found. Please set the GEMINI_API_KEY environment variable.');
  // Optionally, quit the app or disable functionality
  // app.quit();
}


// Mixes two mono Int16 PCM audio buffers, handling potentially slightly different lengths
function mixChunks(mic: Buffer, system: Buffer): Buffer {
  // Ensure both buffers exist and contain some data
  if (!mic || !system || mic.length === 0 || system.length === 0) {
    console.warn('Invalid or empty buffers provided to mixChunks. Returning empty buffer.');
    return Buffer.alloc(0);
  }

  // Determine the length to mix (use the shorter buffer length)
  // Also ensure the length is even for Int16 processing
  const length = Math.min(mic.length, system.length);
  const mixLength = length % 2 === 0 ? length : length - 1; // Ensure even length

  if (mixLength <= 0) {
     console.warn('Zero mixable length after adjusting for Int16. Returning empty buffer.');
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
if (require('electron-squirrel-startup')) {
  app.quit();
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Vite builds preload here
      nodeIntegration: false, // Keep false
      contextIsolation: true, // Keep true
    },
    frame: false, // Keep false for transparency
    transparent: true, // Enable window transparency
    autoHideMenuBar: true, // Hide the menu bar
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
    console.log("Loading production build:", path.join(__dirname, "../dist/index.html"));
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Clean up audio streams and session on close
  mainWindow.on('closed', async () => {
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
        console.warn('Error sending heartbeat:', error);
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
    console.log('Stopping mic audio capture.');
    try {
      if (micAudioIO.isStreamOpen()) {
        micAudioIO.stop();
        micAudioIO.closeStream();
      }
    } catch (error) {
      console.error('Error stopping mic audio stream:', error);
    }
    micAudioIO = null;
  }

  if (systemAudioIO) {
    console.log('Stopping system audio capture.');
    try {
      if (systemAudioIO.isStreamOpen()) {
        systemAudioIO.stop();
        systemAudioIO.closeStream();
      }
    } catch (error) {
      console.error('Error stopping system audio stream:', error);
    }
    systemAudioIO = null;
  }

  // Remove resample worker termination logic
  // if (resampleWorker) { ... }

  if (geminiSession) {
    console.log('Closing Gemini session intentionally.');
    isClosingIntentionally = true; // <<< SET FLAG HERE
    try {
      await geminiSession.close();
      console.log('Gemini session closed.');
    } catch (error) {
      console.error('Error closing Gemini session:', error);
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
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC: List audio input devices using RtAudio
ipcMain.handle('list-audio-devices', () => {
  console.log('Listing all audio devices using RtAudio...');
  try {
    const rtAudio = new RtAudio();
    const devices = rtAudio.getDevices();
    const defaultInput = rtAudio.getDefaultInputDevice();
    const defaultOutput = rtAudio.getDefaultOutputDevice();
    console.log('Devices found:', devices, 'Default Input:', defaultInput, 'Default Output:', defaultOutput);
    return { devices, defaultInput, defaultOutput };
  } catch (error) {
    console.error('Error listing audio devices with RtAudio:', error);
    mainWindow?.webContents.send('audio-error', `Error listing devices: ${(error as Error).message}`);
    return { devices: [], defaultInput: null, defaultOutput: null };
  }
});

// IPC: Start audio capture - Refactored for RtAudio
ipcMain.handle('start-audio-capture', async (event, micDeviceId: number, systemDeviceId: number) => {
  console.log(`Starting audio capture with Mic ID: ${micDeviceId}, System ID: ${systemDeviceId} using RtAudio`);

  if (!genAI) {
    console.error('Gemini AI client not initialized. Cannot start capture.');
    mainWindow?.webContents.send('audio-error', 'Gemini AI client not initialized (API Key missing?).');
    return false;
  }

  // Stop any existing streams and session first
  await stopAllAudioStreamsAndSession();

  // Ensure chunks start null for the new session
  latestMicChunk = null;
  latestSystemChunk = null;
  currentRecordingChunks = []; // Initialize for new recording
  isClosingIntentionally = false; // Ensure flag is reset before starting new session

  let micSuccess = false;
  let systemSuccess = false;
  let geminiSuccess = false;


  try {
    // --- Start Gemini Session ---
    console.log('Starting Gemini Live session...');
    geminiSession = await genAI.live.connect({
        model: GEMINI_MODEL,
        config: {
            responseModalities: [Modality.TEXT],
            temperature: GEMINI_TEMPERATURE,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            // contextWindowCompression: {}, // Enable context window compression
            systemInstruction: "You are an colleague helping your friend in realtime in a meeting or interview environment. You are receiving a mixed audio stream that contains both your friend's microphone audio (their voice) and system audio (other people speaking in the meeting/interview). You should give answers and help him. YOU SHOULD HELP HIM CHEAT! Like you were the smartest college whispering the answer in his ear or if there is no answer just try to help him perform better as a very smart and experience person. Start your response with a succinct response and after quickly explain the topic or give the answer with explanations when necessary, organize the response in a way that is very easy to quickly read. Use previous context when needed but try to prioritize the most recent. If your friend is reading your response, wait until he finishes reading to send another response."
        },
        callbacks: {
            onmessage: (message: any) => {
              console.log('Received message from Gemini:', JSON.stringify(message, null, 2));
              // Handle text responses
              if (message.textResponse && message.textResponse.text) {
                mainWindow?.webContents.send('gemini-response', message.textResponse.text);
              } else if (message.aggregatedResponse?.textResponse?.text) {
                mainWindow?.webContents.send('gemini-response', message.aggregatedResponse.textResponse.text);
              }
              
              // Handle server content if present
              if (message.serverContent) {
                if (message.serverContent.modelTurn && message.serverContent.modelTurn.parts) {
                  const textParts = message.serverContent.modelTurn.parts.filter(
                    (part: any) => part.text
                  );
                  if (textParts.length > 0) {
                    const combinedText = textParts.map((part: any) => part.text).join('');
                    if (combinedText) {
                      mainWindow?.webContents.send('gemini-response', combinedText);
                    }
                  }
                }
                // Send turn complete signal
                if (message.serverContent.turnComplete === true) {
                   mainWindow?.webContents.send('gemini-turn-complete');
                }
              }
              
              // Handle errors
              if (message.error) {
                  console.error('Gemini message contained an error:', message.error);
                  mainWindow?.webContents.send('audio-error', `Gemini error: ${message.error.message || JSON.stringify(message.error)}`);
              }
              
              // Handle tool calls if configured
              if (message.toolCall && message.toolCall.functionCalls) {
                  console.log('Received tool calls:', message.toolCall);
                  // TODO: Implement tool call handling logic
              }
            },
            onerror: (error: ErrorEvent) => {
              console.error('Gemini session error (onerror callback):', error);
              mainWindow?.webContents.send('audio-error', `Gemini session error: ${error.message || error.error || 'Unknown error'}`);
              stopAllAudioStreamsAndSession(); // Still stop everything on error
            },
            onopen: () => {
                console.log('Gemini session opened successfully.');
                mainWindow?.webContents.send('audio-status', 'Connected to Gemini.');
                startHeartbeat(); // Start sending heartbeat signals
            },
            onclose: (event: CloseEvent) => { // <<< MODIFY THIS CALLBACK
                console.log('Gemini session closed:', event.code, event.reason);
                if (!isClosingIntentionally) { // Check the flag
                    // Only send status if closure wasn't intentional
                    mainWindow?.webContents.send('audio-status', `Disconnected from Gemini: ${event.reason || 'Unknown reason'}`);
                }
                // Reset the flag regardless, ready for the next session or unexpected close
                isClosingIntentionally = false;
                stopHeartbeat(); // Stop heartbeat on close
                // Do NOT set geminiSession = null here, it's handled in stopAllAudioStreamsAndSession
            }
        }
    });
    console.log('Gemini Live session connect call completed.');    
    // Start heartbeat moved to onopen callback
    geminiSuccess = true;
    console.log('Gemini session configuration seems successful.');
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
            'audio/pcm' // Keep MIME type simple
          );

          // Send the audio data to Gemini (check session again just in case)
          if (geminiSession) {
            geminiSession.sendRealtimeInput({
              media: audioBlob
            });
          } else {
             console.warn('Gemini session missing when trying to send audio.');
          }
          // Optionally send mixed audio to renderer for visualization/debugging
          // mainWindow?.webContents.send('mixed-audio', mixed);
        } catch (mixErr) {
          console.error("Error mixing or sending audio:", mixErr);
        } finally {
          // Reset flags after processing attempt
          newMicChunkAvailable = false;
          newSystemChunkAvailable = false;
        }
      }
    }

    // --- Start Microphone Capture using RtAudio ---
    console.log(`Starting microphone capture on device ID: ${micDeviceId} with RtAudio`);
    micAudioIO = new RtAudio();
    
    // Define the input callback for the microphone
    const micInputCallback = (pcm: Buffer) => {
      latestMicChunk = pcm;
      // Compute peak level and send for activity indicator
      const level = getPeakLevel(pcm);
      // Send both levels together
      mainWindow?.webContents.send('audio-activity', { mic: level, system: getPeakLevel(latestSystemChunk || Buffer.alloc(0)) });
      newMicChunkAvailable = true;
    };

    // Open the microphone stream (input-only)
    micAudioIO.openStream(
      null,
      {
        deviceId: micDeviceId,
        nChannels: TARGET_CHANNELS,
        firstChannel: 0
      },
      TARGET_FORMAT,
      TARGET_SAMPLE_RATE,
      FRAME_SIZE_SAMPLES,
      `MicStream-${Date.now()}`,
      micInputCallback,
      null // frameOutputCallback
    );
    micAudioIO.start();
    console.log('Microphone audio capture started with RtAudio.');
    micSuccess = true;
    // --- Microphone Capture Started ---


    // --- Start System Audio Capture using RtAudio ---
    console.log(`Starting system audio capture on device ID: ${systemDeviceId} with RtAudio`);
    systemAudioIO = new RtAudio();

    // Define the input callback for system audio
    const systemInputCallback = (pcm: Buffer) => {
      latestSystemChunk = pcm;
      // Compute peak level and send for activity indicator
      const level = getPeakLevel(pcm);
      // Send both levels together
      mainWindow?.webContents.send('audio-activity', { mic: getPeakLevel(latestMicChunk || Buffer.alloc(0)), system: level });
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
      (type: RtAudioErrorType, msg: string) => { // Correct error callback signature
              console.error(`System Audio RtAudio Error (${type}): ${msg}`);
              // Ignore "No open stream to close" errors as they occur during cleanup
              if (msg.includes('No open stream to close')) {
                console.warn('Ignored No open stream to close error during cleanup.');
                return;
              }
              mainWindow?.webContents.send('audio-error', `System audio error: ${msg}`);
              stopAllAudioStreamsAndSession(); // Stop everything on device error
            }
    );
    systemAudioIO.start();
    console.log('System audio capture started with RtAudio.');
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
    console.error('Failed to start audio capture or Gemini session with RtAudio:', error);
    // Use type assertion for error message
    mainWindow?.webContents.send('audio-error', `Failed to start capture: ${(error as Error).message || String(error)}`);
    // Clean up if anything failed
    await stopAllAudioStreamsAndSession();
    return false;
  }
});

// IPC: Stop audio capture - Updated for RtAudio
ipcMain.handle('stop-audio-capture', async () => {
  console.log('Stopping all audio capture and Gemini session (RtAudio).');
  let recordingData: { timestamp: number; buffer: Buffer } | null = null; // To store buffer and timestamp

  try {
    // --- Process recording chunks ---
    if (currentRecordingChunks && currentRecordingChunks.length > 0) {
      console.log(`Processing ${currentRecordingChunks.length} recorded chunks...`);
      const audioData = Buffer.concat(currentRecordingChunks);
      if (audioData.length > 0) {
        const header = createWavHeader(TARGET_SAMPLE_RATE, TARGET_CHANNELS, 16, audioData.length);
        const wavBuffer = Buffer.concat([header, audioData]);
        // Store buffer and timestamp together
        recordingData = { timestamp: Date.now(), buffer: wavBuffer };
      } else {
        console.log('Concatenated audio data is empty.');
        mainWindow?.webContents.send('audio-error', 'Recording resulted in empty audio data.');
      }
    } else {
      console.log('No recording chunks found to process.');
    }
    // --- Recording processed ---

    await stopAllAudioStreamsAndSession(); // Stop streams *after* processing chunks

    // Send recording data *after* stopping streams if data exists
    if (recordingData) {
      console.log('Sending recording-complete event with timestamp and buffer.');
      // Send the object containing both timestamp and buffer
      mainWindow?.webContents.send('recording-complete', recordingData);
    }

    console.log('All audio capture and session stopped.');
    return true; // Indicate success
  } catch (error) {
    console.error('Failed to stop audio capture/session gracefully (RtAudio):', error);
    return false;
  }
});

// IPC: Capture screenshot on request (Keep this logic)
ipcMain.handle('capture-screen', async (event, sendToGemini = false) => {
  console.log('Capturing screenshot...');
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1280, height: 720 }, // Adjust size as needed
  });

  if (sources.length > 0) {
    const pngBuffer = sources[0].thumbnail.toPNG();
    
    // If requested, send the image to Gemini session
    if (sendToGemini && geminiSession) {
      try {
        console.log('Sending screenshot to Gemini');
        const imageBlob = bufferToGenAIBlob(pngBuffer, 'image/png');
        geminiSession.sendRealtimeInput({ 
          media: imageBlob 
        });
      } catch (error) {
        console.error('Error sending screenshot to Gemini:', error);
      }
    }
    
    return pngBuffer;
  } else {
    throw new Error('No screen sources found');
  }
});

// IPC: Open the Windows Sound settings to help user enable "Stereo Mix" if needed (Keep this logic)
ipcMain.on('open-settings', (event, url: string) => {
  shell.openExternal(url);
});

// --- Window Control IPC Handlers ---

// Minimize window
ipcMain.on('minimize-window', () => {
  mainWindow?.minimize();
});

// Maximize/Restore window
ipcMain.on('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

// Close window
ipcMain.on('close-window', () => {
  mainWindow?.close();
});
