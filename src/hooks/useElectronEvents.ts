import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { GeminiResponse } from '../types/gemini';
import { rendererLogger } from '../utils/logger';

export const useElectronEvents = () => {
  const store = useStore();
  const micLevelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const systemLevelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Audio activity handler
    const handleAudioActivity = (_event: any, levels: { mic: number; system: number }) => {
      if (micLevelTimeoutRef.current) clearTimeout(micLevelTimeoutRef.current);
      if (systemLevelTimeoutRef.current) clearTimeout(systemLevelTimeoutRef.current);

      micLevelTimeoutRef.current = setTimeout(() => useStore.setState({ micLevel: 0 }), 150);
      systemLevelTimeoutRef.current = setTimeout(() => useStore.setState({ systemLevel: 0 }), 150);

      useStore.setState({
        micLevel: levels.mic,
        systemLevel: levels.system,
      });
    };

    // Handler for when Gemini starts processing a response stream
    const handleGeminiProcessingStart = () => {
      useStore.setState({
        isBuildingResponse: true,
        audioStatus: 'Gemini is generating...'
      });
    };

    // Handler for when Gemini finishes processing a response stream
    const handleGeminiProcessingEnd = () => {
      useStore.setState({
        isBuildingResponse: false,
        // audioStatus: undefined // Keep audioStatus as is, or set to a "completed" message if desired
      });
    };

    // Simplified Gemini response handler (receives complete, parsed response from main.ts)
    const handleGeminiResponse = (_event: any, response: GeminiResponse) => {
      // Validate the response structure slightly before adding
      if (response && response.type && response.content) {
        useStore.getState().addGeminiResponse({ ...response, timestamp: Date.now() });      } else {
        rendererLogger.warn({ response }, 'Received invalid or incomplete Gemini response object');
        // Optionally, add a fallback error note to the UI
        useStore.getState().addGeminiResponse({
          type: 'response',
          content: 'Received an improperly formatted response from AI.',
          category: 'response', // Changed from 'error' to 'response'
          priority: 'medium',
          timestamp: Date.now()
        });
      }
      // isBuildingResponse and audioStatus are now managed by processing-start/end and turn-complete
    };

    // Gemini turn complete handler
    const handleGeminiTurnComplete = () => {
      // This event signifies the end of a conversational turn with Gemini.
      // It might arrive after generationComplete.
      // We can use this to ensure the UI is fully reset if needed.
      useStore.setState(state => ({
        // Only turn off building response if it's still on,
        // and reset audio status if it was 'Gemini is generating...' or 'Processing recording...'
        isBuildingResponse: ['Gemini is generating...', 'Processing recording...'].includes(state.audioStatus || '') ? false : state.isBuildingResponse,
        audioStatus: ['Gemini is generating...', 'Processing recording...'].includes(state.audioStatus || '') ? undefined : state.audioStatus,
      }));
    };

    // Audio status handler
    const handleAudioStatus = (_event: any, status: string) => {
      // Avoid overwriting "Gemini is generating..." if it's active
      if (useStore.getState().audioStatus !== 'Gemini is generating...') {
        useStore.setState({ audioStatus: status });
      }
    };

    // Audio error handler
    const handleAudioError = (_event: any, error: string) => {
      useStore.setState({
        audioError: error,
        isBuildingResponse: false
      });
    };    // Recording complete handler
    const handleRecordingComplete = (_event: any, recordingPayload: any) => {
      // Validate payload
      const isValidBuffer = recordingPayload?.buffer &&
                          typeof recordingPayload.buffer.length === 'number';

      if (!recordingPayload ||
          !isValidBuffer ||
          typeof recordingPayload.timestamp !== 'number' ||
          isNaN(recordingPayload.timestamp)) {
        useStore.setState({ audioError: 'Received invalid recording data.' });
        return;
      }

      const { timestamp, buffer } = recordingPayload;
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const dataUrl = URL.createObjectURL(blob);

      const recording = {
        id: `rec_${timestamp}`,
        timestamp: timestamp,
        dataUrl: dataUrl
      };

      useStore.setState({
        isBuildingResponse: true,
        audioStatus: 'Processing recording...'
      });

      useStore.setState(state => ({
        recordings: [...state.recordings, recording],
        isBuildingResponse: true, // Keep building response true as processing starts
        audioStatus: 'Processing recording...'
      }));
    };

    // Register event listeners
    const electron = (window as any).electron;
    electron.on('audio-activity', handleAudioActivity);
    electron.on('gemini-processing-start', handleGeminiProcessingStart); // New listener
    electron.on('gemini-processing-end', handleGeminiProcessingEnd);   // New listener
    electron.on('gemini-response', handleGeminiResponse);
    electron.on('gemini-turn-complete', handleGeminiTurnComplete);
    electron.on('audio-status', handleAudioStatus);
    electron.on('audio-error', handleAudioError);
    electron.on('recording-complete', handleRecordingComplete);

    // Cleanup function
    return () => {
      const { micLevelTimeout, systemLevelTimeout } = store;
      if (micLevelTimeout) clearTimeout(micLevelTimeout);
      if (systemLevelTimeout) clearTimeout(systemLevelTimeout);

      electron.removeListener('audio-activity', handleAudioActivity);
      electron.removeListener('gemini-processing-start', handleGeminiProcessingStart); // New cleanup
      electron.removeListener('gemini-processing-end', handleGeminiProcessingEnd);   // New cleanup
      electron.removeListener('gemini-response', handleGeminiResponse);
      electron.removeListener('gemini-turn-complete', handleGeminiTurnComplete);
      electron.removeListener('audio-status', handleAudioStatus);
      electron.removeListener('audio-error', handleAudioError);
      electron.removeListener('recording-complete', handleRecordingComplete);
    };
  }, []); // Empty dependency array since we're using the store directly
};