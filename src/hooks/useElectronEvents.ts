import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { GeminiResponse } from '../types/gemini';

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

    // Gemini response handler
    const handleGeminiResponse = (_event: any, response: GeminiResponse) => {
      useStore.setState({
        geminiResponses: [...useStore.getState().geminiResponses, response],
        isBuildingResponse: true, // Set to true when a response chunk is received
        audioStatus: 'Receiving response...'
      });
    };

    // Gemini turn complete handler
    const handleGeminiTurnComplete = () => {
      useStore.setState({
        isBuildingResponse: false,
        audioStatus: undefined
      });
    };

    // Audio status handler
    const handleAudioStatus = (_event: any, status: string) => {
      const shouldStopBuilding = status.includes('complete') || 
                                status.includes('Error') || 
                                status.includes('Stopping');
      
      useStore.setState({ 
        audioStatus: status,
        isBuildingResponse: !shouldStopBuilding
      });
    };

    // Audio error handler
    const handleAudioError = (_event: any, error: string) => {
      useStore.setState({ 
        audioError: error,
        isBuildingResponse: false
      });
    };

    // Recording complete handler
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

      useStore.setState(state => ({
        recordings: [...state.recordings, recording],
        isBuildingResponse: false
      }));
    };

    // Register event listeners
    const electron = (window as any).electron;
    electron.on('audio-activity', handleAudioActivity);
    electron.on('gemini-response', handleGeminiResponse);
    electron.on('audio-status', handleAudioStatus);
    electron.on('audio-error', handleAudioError);
    electron.on('recording-complete', handleRecordingComplete);

    // Cleanup function
    return () => {
      const { micLevelTimeout, systemLevelTimeout } = store;
      if (micLevelTimeout) clearTimeout(micLevelTimeout);
      if (systemLevelTimeout) clearTimeout(systemLevelTimeout);

      electron.removeListener('audio-activity', handleAudioActivity);
      electron.removeListener('gemini-response', handleGeminiResponse);
      electron.removeListener('audio-status', handleAudioStatus);
      electron.removeListener('audio-error', handleAudioError);
      electron.removeListener('recording-complete', handleRecordingComplete);
    };
  }, []); // Empty dependency array since we're using the store directly
};