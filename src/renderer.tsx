// filepath: c:\Users\yuri_\IdeaProjects\clueless\src\renderer.tsx
import "./renderer.css"; // Import CSS styles
import React, { useEffect, useState, useCallback, useRef } from 'react'; // Add useRef
import { createRoot } from 'react-dom/client';
import { create } from 'zustand';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import { shallow } from 'zustand/shallow'; // Import shallow for comparison

interface AudioDevice {
  id: number;
  name: string;
  inputChannels: number;
  outputChannels: number;
  duplexChannels: number;
  isDefaultInput: boolean;
  isDefaultOutput: boolean;
  sampleRates: number[];
  preferredSampleRate: number;
  nativeFormats: number;
}

interface AppState {
  screenshot?: string;
  micAudioDevices: AudioDevice[]; // Renamed from audioDevices
  systemAudioDevices: AudioDevice[]; // Added for system audio
  selectedMicDeviceId?: number; // Renamed from selectedDeviceId
  selectedSystemDeviceId?: number; // Added for system audio
  isRecording: boolean;
  audioError?: string;
  audioStatus?: string; // Status messages from the audio processing
  geminiResponses: string[]; // Array of responses from Gemini
  // Audio levels for visual indicators (0.0 to 1.0)
  micLevel: number;        // Current microphone amplitude level
  systemLevel: number;     // Current system audio amplitude level
  micLevelTimeout: NodeJS.Timeout | null;    // Timeout ID to reset mic level
  systemLevelTimeout: NodeJS.Timeout | null; // Timeout ID to reset system level
  isBuildingResponse: boolean; // Tracks if we are appending to the last response
  recordings: { id: string; timestamp: number; dataUrl: string }[]; // Store completed recordings
  clearResponses: () => void; // Method to clear responses
  clearRecordings: () => void; // Method to clear recordings
  capture: () => Promise<void>;
  fetchAudioDevices: () => Promise<void>;
  setSelectedMicDevice: (deviceId: number) => void;
  setSelectedSystemDevice: (deviceId: number) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  openSettings: (type: 'sound' | 'input' | 'output') => Promise<void>; // Open system settings
  // Add window control functions
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

// Helper function to convert Uint8Array or Buffer-like object to Base64
function arrayBufferToBase64(bufferData: number[] | Uint8Array): string {
  let binary = '';
  // Ensure we have a Uint8Array
  const bytes = bufferData instanceof Uint8Array ? bufferData : new Uint8Array(bufferData);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

const useStore = create<AppState>((set, get) => ({
  screenshot: undefined,
  micAudioDevices: [],
  systemAudioDevices: [],
  selectedMicDeviceId: undefined,
  selectedSystemDeviceId: undefined,
  isRecording: false,
  audioError: undefined,
  audioStatus: undefined,
  geminiResponses: [],
  micLevel: 0,
  systemLevel: 0,
  micLevelTimeout: null,
  systemLevelTimeout: null,
  isBuildingResponse: false, // Initialize
  recordings: [], // Initialize recordings array
  clearResponses: () => set({ geminiResponses: [] }),
  clearRecordings: () => set({ recordings: [] }),

  capture: async () => {
    try {
      const sendToGemini = get().isRecording;
      // Data received from main process might be Uint8Array or { type: 'Buffer', data: [...] }
      const receivedData: any = await (window as any).electron.captureScreen(sendToGemini);

      let base64 = '';
      if (receivedData) {
        // Check for { type: 'Buffer', data: [...] } structure
        if (receivedData.type === 'Buffer' && Array.isArray(receivedData.data)) {
          base64 = arrayBufferToBase64(receivedData.data);
        } 
        // Check if it's already a Uint8Array (common case)
        else if (receivedData instanceof Uint8Array) {
          base64 = arrayBufferToBase64(receivedData);
        } 
        // Fallback/Error handling for unexpected formats
        else {
          console.error('Unexpected screenshot data format received:', receivedData);
          throw new Error('Received screenshot data in an unexpected format.');
        }
        set({ screenshot: `data:image/png;base64,${base64}` });
      } else {
         throw new Error('No screenshot data received.');
      }
    } catch (error) {
      console.error('Failed to capture screen:', error);
      // Use type assertion for error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ audioError: `Screen capture error: ${errorMessage}` });
    }
  },
  
  fetchAudioDevices: async () => {
    try {
      console.log('Fetching all audio devices...');
      const { devices, defaultInput, defaultOutput }: { devices: AudioDevice[]; defaultInput: number; defaultOutput: number } =
        await (window as any).electron.listAudioDevices();
      console.log('Received devices in renderer:', devices, 'Default Input:', defaultInput, 'Default Output:', defaultOutput);

      const micDevices = devices.filter(d => d.inputChannels > 0);
      const systemDevices = devices.filter(d => d.outputChannels > 0);

      console.log('Filtered Mic Devices:', micDevices);
      console.log('Filtered System Devices:', systemDevices);

      set({
        micAudioDevices: micDevices,
        systemAudioDevices: systemDevices,
        selectedMicDeviceId: defaultInput ?? micDevices[0]?.id,
        selectedSystemDeviceId: defaultOutput ?? systemDevices[0]?.id
      });
    } catch (error) {
      console.error('Failed to fetch audio devices:', error);
      set({ audioError: 'Failed to fetch audio devices' });
    }
  },
  
  setSelectedMicDevice: (deviceId: number) => {
    set({ selectedMicDeviceId: deviceId });
  },
  
  setSelectedSystemDevice: (deviceId: number) => {
    set({ selectedSystemDeviceId: deviceId });
  },
  
  startRecording: async () => {
    const { selectedMicDeviceId, selectedSystemDeviceId, isRecording } = get();
    if (isRecording || selectedMicDeviceId === undefined || selectedSystemDeviceId === undefined) {
      console.log('Cannot start recording. Already recording or devices not selected.');
      return;
    }
    
    // Clear previous errors and responses when starting new recording
    set({ 
      audioError: undefined,
      audioStatus: 'Starting capture...',
      geminiResponses: [] // Clear previous responses
    });
    
    try {
      const success = await (window as any).electron.startAudioCapture(selectedMicDeviceId, selectedSystemDeviceId);
      if (success) {
        set({ 
          isRecording: true,
          audioStatus: 'Recording active - Listening...'
        });
        console.log('Recording started successfully.');
      } else {
        console.error('Failed to start recording from main process.');
        set({ 
          audioError: 'Failed to start recording',
          audioStatus: 'Recording failed'
        });
      }
    } catch (error) {
      console.error('Error calling startAudioCapture:', error);
      set({ 
        audioError: `Error starting recording: ${error}`,
        audioStatus: 'Error with audio capture'
      });
    }
  },
  
  stopRecording: async () => {
    const { isRecording } = get();
    if (!isRecording) {
      console.log('Not recording.');
      return;
    }
    
    set({ audioStatus: 'Stopping capture...' });
    
    try {
      const success = await (window as any).electron.stopAudioCapture();
      if (success) {
        set({ 
          isRecording: false,
          audioStatus: 'Recording stopped'
        });
        console.log('Recording stopped successfully.');
      } else {
        console.error('Failed to stop recording from main process.');
        set({ 
          audioError: 'Failed to stop recording properly',
          audioStatus: 'Error stopping recording',
          isRecording: false // Force state update even if backend reports failure
        });
      }
    } catch (error) {
      console.error('Error calling stopAudioCapture:', error);
      set({ 
        audioError: `Error stopping recording: ${error}`,
        audioStatus: 'Error stopping recording',
        isRecording: false // Force state update even on error
      });
    }
  },
  
  openSettings: async (type: 'sound' | 'input' | 'output') => {
    try {
      await (window as any).electron.openSettings(type);
    } catch (error) {
      console.error(`Failed to open ${type} settings:`, error);
      set({ audioError: `Failed to open ${type} settings` });
    }
  },
  // Add window control implementations
  minimizeWindow: () => (window as any).electron.minimizeWindow(),
  maximizeWindow: () => (window as any).electron.maximizeWindow(),
  closeWindow: () => (window as any).electron.closeWindow(),
}));

const App = () => {
  const {
    screenshot,
    capture,
    micAudioDevices,
    systemAudioDevices,
    fetchAudioDevices,
    selectedMicDeviceId,
    selectedSystemDeviceId,
    setSelectedMicDevice,
    setSelectedSystemDevice,
    isRecording,
    startRecording,
    stopRecording,
    openSettings,
    audioError,
    audioStatus,
    geminiResponses,
    clearResponses,
    recordings,     // Get recordings state
    clearRecordings,// Get clear recordings function
    micLevel,       // Get audio level states
    systemLevel,     // Get audio level states
    // Add window control functions from store
    minimizeWindow,
    maximizeWindow,
    closeWindow,
  } = useStore();

  const responsesContainerRef = useRef<HTMLDivElement>(null); // Ref for the responses container
  const [showFade, setShowFade] = useState(false); // State to control fade visibility

  // Define checkScroll using useCallback so it has a stable reference
  const checkScroll = useCallback(() => {
    const container = responsesContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 1; // +1 for tolerance
      // Show fade only if overflowing AND not near the bottom
      setShowFade(container.scrollHeight > container.clientHeight && !isNearBottom);
    } else {
      setShowFade(false);
    }
  }, []); // No dependencies needed as it only uses the ref and state setter
  // Style for the activity dot - size and brightness based on audio level
  // Using CSS variables for consistency might be better if complexity increases
  const activityDotStyle = (level: number): React.CSSProperties => {
    const isActive = level > 0.01;
    const size = isActive ? Math.max(8, 8 + Math.min(level * 15, 12)) : 8;
    const intensity = isActive ? Math.max(50, 75 + Math.min(Math.floor(level * 150), 25)) : 0;
    // Use primary color when active, gray when inactive
    const color = isActive ? `rgba(76, 139, 245, ${intensity / 100})` : '#6b7280'; // Use Tailwind gray-500 for inactive
    return {
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      borderRadius: '50%',
      transition: 'all 0.1s ease-out',
      boxShadow: isActive ? `0 0 ${size * 0.8}px ${size * 0.3}px rgba(76, 139, 245, 0.4)` : 'none',
    };
  };

  useEffect(() => {
    fetchAudioDevices();

    // Setup listeners for audio events from main process
    const handleAudioActivity = (_event: any, levels: { mic: number; system: number }) => {
      useStore.setState(state => {
        // Clear previous timeouts if new data arrives
        if (state.micLevelTimeout) clearTimeout(state.micLevelTimeout);
        if (state.systemLevelTimeout) clearTimeout(state.systemLevelTimeout);

        // Set new levels and schedule reset timeouts
        return {
          micLevel: levels.mic,
          systemLevel: levels.system,
          micLevelTimeout: setTimeout(() => useStore.setState({ micLevel: 0, micLevelTimeout: null }), 150), // Reset after 150ms
          systemLevelTimeout: setTimeout(() => useStore.setState({ systemLevel: 0, systemLevelTimeout: null }), 150) // Reset after 150ms
        };
      });
    };

    const handleGeminiResponse = (_event: any, chunk: string) => {
      console.log("Renderer received Gemini chunk:", chunk);
      useStore.setState(state => {
        const isStartingNewResponse = !state.isBuildingResponse;
        const lastResponseIndex = state.geminiResponses.length - 1;

        if (isStartingNewResponse || state.geminiResponses.length === 0) {
          // Start a new response entry
          return {
            geminiResponses: [...state.geminiResponses, chunk],
            isBuildingResponse: true, // Mark as building
            audioStatus: 'Receiving response...' // Update status
          };
        } else {
          // Append to the last response entry
          const updatedResponses = [...state.geminiResponses];
          updatedResponses[lastResponseIndex] = updatedResponses[lastResponseIndex] + chunk;
          return {
            geminiResponses: updatedResponses,
            isBuildingResponse: true // Continue building
          };
        }
      });
    };

    const handleAudioStatus = (_event: any, status: string) => {
      console.log("Renderer received status:", status);
      // If the status indicates completion or error, stop building the response
      if (status.includes('complete') || status.includes('Error') || status.includes('Stopping')) {
        useStore.setState({ audioStatus: status, isBuildingResponse: false });
      } else {
        useStore.setState({ audioStatus: status });
      }
    };

    const handleAudioError = (_event: any, error: string) => {
      console.error("Renderer received error:", error);
      useStore.setState({ audioError: error, isBuildingResponse: false }); // Stop building on error
    };

    // Update listener to expect an object { timestamp: number, buffer: Buffer }
    const handleRecordingComplete = (_event: any, recordingPayload: any) => { // Use 'any' temporarily for logging
      // Log the raw payload *before* validation
      console.log("Raw recording payload received:", recordingPayload);
      console.log("Type of payload:", typeof recordingPayload);
      if (recordingPayload) {
        console.log("Type of timestamp:", typeof recordingPayload.timestamp, "Value:", recordingPayload.timestamp);
        console.log("Type of buffer:", typeof recordingPayload.buffer, "Is Buffer?:", recordingPayload.buffer instanceof Uint8Array); // Check if it's at least ArrayBuffer/Uint8Array like
        console.log("Buffer length:", recordingPayload.buffer?.length);
      }

      // Add validation for the received payload
      // Check if buffer looks like a buffer (e.g., has length property)
      const isValidBuffer = recordingPayload?.buffer && typeof recordingPayload.buffer.length === 'number';
      if (!recordingPayload || !isValidBuffer || typeof recordingPayload.timestamp !== 'number' || isNaN(recordingPayload.timestamp)) {
        console.error("Invalid recording payload received (failed validation):", recordingPayload);
        useStore.setState({ audioError: 'Received invalid recording data.' });
        return;
      }

      // Now we assume the structure is valid enough
      const { timestamp, buffer } = recordingPayload as { timestamp: number; buffer: Uint8Array }; // Cast buffer to Uint8Array

      console.log("Renderer received validated recording buffer:", buffer.length, "bytes at timestamp:", timestamp);

      // Convert Buffer/Uint8Array to Blob, then to Data URL
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const dataUrl = URL.createObjectURL(blob); // This URL is temporary

      const recording = {
        id: `rec_${timestamp}`, // Use timestamp for a more unique ID
        timestamp: timestamp, // Use the timestamp received from main process
        dataUrl: dataUrl
      };

      console.log("Storing recording:", recording); // Log the object being stored

      useStore.setState(state => ({
        recordings: [...state.recordings, recording],
        isBuildingResponse: false // Assuming recording completion means response building is done
      }));
    };


    // Register listeners
    (window as any).electron.on('audio-activity', handleAudioActivity);
    (window as any).electron.on('gemini-response', handleGeminiResponse);
    (window as any).electron.on('audio-status', handleAudioStatus);
    (window as any).electron.on('audio-error', handleAudioError);
    (window as any).electron.on('recording-complete', handleRecordingComplete); // Listen for completed recordings

    // Cleanup function
    return () => {
      (window as any).electron.removeListener('audio-activity', handleAudioActivity);
      (window as any).electron.removeListener('gemini-response', handleGeminiResponse);
      (window as any).electron.removeListener('audio-status', handleAudioStatus);
      (window as any).electron.removeListener('audio-error', handleAudioError);
      (window as any).electron.removeListener('recording-complete', handleRecordingComplete); // Clean up listener
      // Clear any pending timeouts on unmount
      const { micLevelTimeout, systemLevelTimeout } = useStore.getState();
      if (micLevelTimeout) clearTimeout(micLevelTimeout);
      if (systemLevelTimeout) clearTimeout(systemLevelTimeout);
    };
  }, [fetchAudioDevices]);

  const handleMicDeviceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMicDevice(parseInt(event.target.value, 10));
  };

  const handleSystemDeviceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSystemDevice(parseInt(event.target.value, 10));
  };

  const handleOpenSoundSettings = () => {
    openSettings('sound');
  };

  // Effect for managing fade and auto-scroll
  useEffect(() => {
    const container = responsesContainerRef.current;
    if (container) {
      checkScroll();
      if (useStore.getState().isBuildingResponse) {
        container.scrollTop = container.scrollHeight;
      }
      container.addEventListener('scroll', checkScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScroll);
      }
    };
  }, [geminiResponses, checkScroll]);

  // Style for the fade-out effect
  const fadeStyle: React.CSSProperties = {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40px',
    background: 'linear-gradient(to bottom, rgba(42, 42, 42, 0), rgba(42, 42, 42, 1))',
    pointerEvents: 'none',
    opacity: showFade ? 1 : 0,
    transition: 'opacity 0.2s ease-in-out',
    borderBottomLeftRadius: 'var(--border-radius-xl, 0.75rem)',
    borderBottomRightRadius: 'var(--border-radius-xl, 0.75rem)',
  };

  return (
    <div className="glass-container flex flex-col h-screen p-4 space-y-4 text-sm"> {/* Applied glass-container */}

      {/* Header */}
      <div className="flex justify-between items-center mt-4">
        <h1 className="text-lg font-semibold">Clueless</h1>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs opacity-75">Mic:</span>
            <div style={activityDotStyle(micLevel)} />
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs opacity-75">Sys:</span>
            <div style={activityDotStyle(systemLevel)} />
          </div>
        </div>
      </div>

      {/* Device Selection & Controls */}
      <div className="grid grid-cols-2 gap-3" data-no-drag>
        <div className="flex flex-col space-y-1">
          <label htmlFor="micDevice" className="text-xs font-medium opacity-80">Microphone</label>
          <select
            id="micDevice"
            value={selectedMicDeviceId ?? ''}
            onChange={handleMicDeviceChange}
            disabled={isRecording}
            className="glass-button-secondary text-xs px-2 py-1" /* Applied glass style */
          >
            <option value="" disabled>Select Mic</option>
            {micAudioDevices.map(device => (
              <option key={device.id} value={device.id}>
                {device.name} {device.isDefaultInput ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label htmlFor="systemDevice" className="text-xs font-medium opacity-80">System Audio</label>
          <select
            id="systemDevice"
            value={selectedSystemDeviceId ?? ''}
            onChange={handleSystemDeviceChange}
            disabled={isRecording}
            className="glass-button-secondary text-xs px-2 py-1" /* Applied glass style */
          >
            <option value="" disabled>Select System Output</option>
            {systemAudioDevices.map(device => (
              <option key={device.id} value={device.id}>
                {device.name} {device.isDefaultOutput ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2" data-no-drag>
        <button
          onClick={capture}
          disabled={isRecording}
          className="glass-button-secondary flex-1 text-xs" /* Applied glass style */
        >
          Capture Screen
        </button>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`glass-button flex-1 text-xs ${isRecording ? 'bg-error hover:bg-red-700' : ''}`} /* Applied glass style */
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        <button onClick={handleOpenSoundSettings} className="glass-button-secondary text-xs px-2" title="Open Sound Settings"> {/* Applied glass style */}
          {'⚙️'} {/* Correctly wrap emoji in braces as string literal */}
        </button>
      </div>

      {/* Status & Error Display */}
      <div className="text-xs min-h-[1.2em]">
        {audioError && <p className="text-error">Error: {audioError}</p>}
        {audioStatus && <p className="text-primary opacity-90">{audioStatus}</p>}
      </div>

      {/* Gemini Responses Area */}
      <div className="flex-grow flex flex-col space-y-2 overflow-hidden relative glass-panel p-3"> {/* Applied glass-panel */}
        <div className="flex justify-between items-center mb-1" data-no-drag>
          <h2 className="text-xs font-semibold opacity-80">Transcript & Responses</h2>
          <button onClick={clearResponses} className="glass-button-secondary text-xs px-1.5 py-0.5" title="Clear Responses"> {/* Applied glass style */}
            Clear {/* Correct: This is just text content */}
          </button>
        </div>
        <div
          ref={responsesContainerRef}
          className="flex-grow overflow-y-auto space-y-3 pr-2 markdown-content text-xs"
          onScroll={checkScroll}
          data-no-drag
        >
          {geminiResponses.map((response, index) => (
            // Wrap ReactMarkdown in a div to apply className
            <div key={index} className="bg-glass-dark-100 p-2 rounded-md shadow-inner">
              <ReactMarkdown>{response}</ReactMarkdown>
            </div>
          ))}
          {geminiResponses.length === 0 && <p className="text-center opacity-50 italic">No responses yet...</p>}
        </div>
        <div style={fadeStyle}></div>
      </div>

      {/* Recordings List Area */}
      {recordings.length > 0 && (
        <div className="shrink-0 flex flex-col space-y-1 glass-panel p-2 max-h-28 overflow-hidden">
          <div className="flex justify-between items-center mb-1" data-no-drag>
            <h2 className="text-xs font-semibold opacity-80">Saved Recordings</h2>
            <button onClick={clearRecordings} className="glass-button-secondary text-xs px-1.5 py-0.5" title="Clear Recordings">
              Clear
            </button>
          </div>
          <div className="overflow-y-auto space-y-1 pr-1">
            {recordings.map(rec => {
              const isValidTimestamp = typeof rec.timestamp === 'number' && !isNaN(rec.timestamp);
              // Use a more specific time format
              const displayTime = isValidTimestamp
                ? new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'Invalid Timestamp';

              return (
                <div key={rec.id} className="flex justify-between items-center bg-glass-dark-100 p-1 rounded text-xs">
                  <span>Rec_{displayTime}</span>
                  <audio controls src={rec.dataUrl} className="h-6 w-60" data-no-drag></audio>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add window controls container */}
      <div className="window-controls" data-no-drag>
        <button onClick={closeWindow} className="window-control close" aria-label="Close"></button>
        <button onClick={minimizeWindow} className="window-control minimize" aria-label="Minimize"></button>
        <button onClick={maximizeWindow} className="window-control maximize" aria-label="Maximize"></button>
      </div>

    </div>
  );
};

// Correct the ID to match index.html
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
