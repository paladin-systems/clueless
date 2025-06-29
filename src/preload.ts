import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  captureScreen: (sendToGemini: boolean = false): Promise<Buffer> => ipcRenderer.invoke('capture-screen', sendToGemini),
  openSettings: (type: 'sound' | 'input' | 'output'): void => ipcRenderer.send('open-settings', type),
  listAudioDevices: (): Promise<any[]> => ipcRenderer.invoke('list-audio-devices'),
  // Update to accept both mic and system audio device IDs
  startAudioCapture: (micDeviceId: number, systemDeviceId: number): Promise<boolean> => 
    ipcRenderer.invoke('start-audio-capture', micDeviceId, systemDeviceId),
  stopAudioCapture: (): Promise<boolean> => ipcRenderer.invoke('stop-audio-capture'),
  // Add window control functions
  minimizeWindow: (): void => ipcRenderer.send('minimize-window'),
  maximizeWindow: (): void => ipcRenderer.send('maximize-window'),
  closeWindow: (): void => ipcRenderer.send('close-window'),
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void => {
    // Whitelist channels
    const validChannels = ['audio-data', 'audio-error', 'mixed-audio', 'gemini-response', 'audio-status', 'audio-activity', 'recording-complete'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, listener);
    }
  },
  // Add remove listener if needed, especially for frequent component mounts/unmounts
  removeListener: (channel: string, listener: (...args: any[]) => void): void => {
     const validChannels = ['audio-data', 'audio-error', 'mixed-audio', 'gemini-response', 'audio-status', 'audio-activity', 'recording-complete'];
     if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, listener);
     }
  }
});