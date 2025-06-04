import React, { useEffect, useState, useCallback } from 'react';
import TopMenuBar from './TopMenuBar/TopMenuBar';
import PostItCanvas from './PostItCanvas/PostItCanvas';
import { PostItNote, SessionInfo } from '../types/ui';
import { GeminiResponse } from '../types/gemini';
import { useStore } from '../store';
import { useElectronEvents } from '../hooks/useElectronEvents';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from './shared/KeyboardShortcutsHelp';
import SettingsMenu from './shared/SettingsMenu';

const AppLayout: React.FC = () => {
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize electron event listeners and keyboard shortcuts
  useElectronEvents();
  useKeyboardShortcuts(setShowKeyboardHelp, setShowSettings);


  const {
    micLevel,
    systemLevel,
    isRecording,
    startRecording,
    stopRecording,
    capture,
    selectedMicDeviceId,
    selectedSystemDeviceId,
    micAudioDevices,
    systemAudioDevices,
    geminiResponses
  } = useStore(state => ({
    micLevel: state.micLevel,
    systemLevel: state.systemLevel,
    isRecording: state.isRecording,
    startRecording: state.startRecording,
    stopRecording: state.stopRecording,
    capture: state.capture,
    selectedMicDeviceId: state.selectedMicDeviceId,
    selectedSystemDeviceId: state.selectedSystemDeviceId,
    micAudioDevices: state.micAudioDevices,
    systemAudioDevices: state.systemAudioDevices,
    geminiResponses: state.geminiResponses
  }));

  const [notes, setNotes] = useState<PostItNote[]>([]);
  
  // Track session info
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    startTime: 0,
    duration: 0,
    isRecording: false,
    deviceInfo: {
      mic: null,
      system: null
    }
  });

  // Update session duration and device info
  useEffect(() => {
    let timer: NodeJS.Timer | null = null;

    if (isRecording) {
      setSessionInfo(prev => ({
        ...prev,
        startTime: prev.startTime || Date.now(),
        isRecording: true,
        deviceInfo: {
          mic: selectedMicDeviceId ? {
            id: selectedMicDeviceId,
            name: micAudioDevices.find(d => d.id === selectedMicDeviceId)?.name || 'Unknown'
          } : null,
          system: selectedSystemDeviceId ? {
            id: selectedSystemDeviceId,
            name: systemAudioDevices.find(d => d.id === selectedSystemDeviceId)?.name || 'Unknown'
          } : null
        }
      }));

      timer = setInterval(() => {
        setSessionInfo(prev => ({
          ...prev,
          duration: prev.startTime ? Date.now() - prev.startTime : 0
        }));
      }, 1000);
    } else {
      setSessionInfo(prev => ({
        ...prev,
        isRecording: false
      }));
    }

    return () => {
      if (timer) {
        clearInterval(timer as NodeJS.Timeout);
      }
    };
  }, [isRecording, selectedMicDeviceId, selectedSystemDeviceId, micAudioDevices, systemAudioDevices]);

  // Handle new Gemini responses
  useEffect(() => {
    if (geminiResponses.length === 0) return;

    const response = geminiResponses[geminiResponses.length - 1];
    
    // Skip if missing required fields
    if (!response.type || !response.content) {
      console.warn('Invalid Gemini response format:', response);
      return;
    }
    
    const lastNote = notes[notes.length - 1];
    const baseOffset = 20;
    
    // Calculate position based on note type and priority
    const getPosition = () => {
      const baseX = lastNote ? lastNote.position.x + baseOffset : baseOffset;
      let baseY: number;
      
      switch (response.type) {
        case 'question':
          baseY = 80; // Questions at top
          break;
        case 'reference':
          baseY = window.innerHeight - 300; // References at bottom
          break;
        case 'note':
          baseY = window.innerHeight / 2; // Notes in middle
          break;
        default:
          baseY = lastNote ? lastNote.position.y + baseOffset : 80;
      }
      
      return {
        x: Math.min(baseX, window.innerWidth - 320),
        y: Math.min(baseY, window.innerHeight - 220)
      };
    };

    // Calculate size based on content length and type
    const getSize = () => {
      const baseSize = { width: 300, height: 200 };
      const contentLength = response.content.length;
      
      if (response.type === 'reference') {
        return { width: 400, height: Math.min(300, Math.max(200, contentLength / 3)) };
      }
      if (response.type === 'note') {
        return { width: 250, height: Math.min(150, Math.max(100, contentLength / 4)) };
      }
      return baseSize;
    };

    // Get color based on priority
    const getColor = () => {
      switch (response.priority) {
        case 'high':
          return '#ef4444'; // red
        case 'medium':
          return '#4c8bf5'; // blue
        case 'low':
          return '#10b981'; // green
        default:
          return '#4c8bf5';
      }
    };

    const newNote: PostItNote = {
      id: `note_${Date.now()}`,
      content: response.content,
      position: getPosition(),
      size: getSize(),
      isPinned: response.priority === 'high',
      timestamp: Date.now(),
      category: response.type,
      color: getColor(),
      lastModified: Date.now(),
      isAiModified: true,
      zIndex: Date.now()
    };

    setNotes(prev => [...prev, newNote]);
  }, [geminiResponses, notes]);

  // Note handlers with multi-note support
  const handleNoteMove = useCallback((id: string, position: { x: number; y: number }) => {
    setNotes(prev => 
      prev.map(note => 
        note.id === id ? { ...note, position, zIndex: Date.now() } : note
      )
    );
  }, []);

  const handleMultiNoteMove = useCallback((movedNotes: { id: string; position: { x: number; y: number } }[]) => {
    setNotes(prev => {
      const updates = new Map(movedNotes.map(n => [n.id, n.position]));
      return prev.map(note => 
        updates.has(note.id) 
          ? { ...note, position: updates.get(note.id)!, zIndex: Date.now() }
          : note
      );
    });
  }, []);

  const handleNoteResize = useCallback((id: string, size: { width: number; height: number }) => {
    setNotes(prev => 
      prev.map(note => 
        note.id === id ? { ...note, size, zIndex: Date.now() } : note
      )
    );
  }, []);

  const handleNotePinToggle = useCallback((id: string) => {
    setNotes(prev => {
      const maxZ = Math.max(...prev.map(n => n.zIndex || 0));
      return prev.map(note => 
        note.id === id 
          ? { ...note, isPinned: !note.isPinned, zIndex: maxZ + 1 }
          : note
      );
    });
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-transparent">
      <a
        href="#post-it-canvas"
        className="skip-to-content"
      >
        Skip to post-it notes
      </a>
      <TopMenuBar
        sessionInfo={sessionInfo}
        audioLevels={{
          mic: { level: micLevel, type: 'mic' },
          system: { level: systemLevel, type: 'system' }
        }}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onCapture={capture}
        onSettingsClick={() => setShowSettings(true)}
        onKeyboardHelpClick={() => setShowKeyboardHelp(true)}
      />
      <PostItCanvas
        id="post-it-canvas"
        tabIndex={-1}
        notes={notes}
        onNoteMove={handleNoteMove}
        onNoteMoveMultiple={handleMultiNoteMove}
        onNoteResize={handleNoteResize}
        onNotePinToggle={handleNotePinToggle}
      />
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
      <SettingsMenu
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default AppLayout;