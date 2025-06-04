import { useEffect } from 'react';
import { useStore } from '../store';

export const useElectronEvents = () => {
  const store = useStore();

  useEffect(() => {
    // Audio activity handler
    const handleAudioActivity = (_event: any, levels: { mic: number; system: number }) => {
      if (store.micLevelTimeout) clearTimeout(store.micLevelTimeout);
      if (store.systemLevelTimeout) clearTimeout(store.systemLevelTimeout);

      const micTimeout = setTimeout(() => useStore.setState({ micLevel: 0 }), 150);
      const sysTimeout = setTimeout(() => useStore.setState({ systemLevel: 0 }), 150);

      useStore.setState({
        micLevel: levels.mic,
        systemLevel: levels.system,
        micLevelTimeout: micTimeout,
        systemLevelTimeout: sysTimeout
      });
    };

    // Gemini response handler
    const handleGeminiResponse = (_event: any, chunk: string) => {
      const isStartingNew = !store.isBuildingResponse;
      const lastIndex = store.geminiResponses.length - 1;

      if (isStartingNew || store.geminiResponses.length === 0) {
        useStore.setState({
          geminiResponses: [...store.geminiResponses, chunk],
          isBuildingResponse: true,
          audioStatus: 'Receiving response...'
        });
      } else {
        const updatedResponses = [...store.geminiResponses];
        updatedResponses[lastIndex] = updatedResponses[lastIndex] + chunk;
        useStore.setState({
          geminiResponses: updatedResponses,
          isBuildingResponse: true
        });
      }
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