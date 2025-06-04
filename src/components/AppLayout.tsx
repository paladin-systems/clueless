import React, { useEffect, useState, useCallback } from 'react';
import TopMenuBar from './TopMenuBar/TopMenuBar';
import PostItCanvas from './PostItCanvas/PostItCanvas';
import { PostItNote, SessionInfo } from '../types/ui';
import { useStore } from '../store';
import { useElectronEvents } from '../hooks/useElectronEvents';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useDebounceStorage } from '../hooks/useDebounceStorage';
import KeyboardShortcutsHelp from './shared/KeyboardShortcutsHelp';
import SettingsMenu from './shared/SettingsMenu';
import ModalErrorBoundary from './shared/ModalErrorBoundary';
import LoadingSpinner from './shared/LoadingSpinner';

const AppLayout: React.FC = () => {
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Initialize electron event listeners and keyboard shortcuts
  useElectronEvents();
  useKeyboardShortcuts(setShowKeyboardHelp, setShowSettings);

  const micLevel = useStore(state => state.micLevel);
  const systemLevel = useStore(state => state.systemLevel);
  const isRecording = useStore(state => state.isRecording);
  const startRecording = useStore(state => state.startRecording);
  const stopRecording = useStore(state => state.stopRecording);
  const capture = useStore(state => state.capture);
  const selectedMicDeviceId = useStore(state => state.selectedMicDeviceId);
  const selectedSystemDeviceId = useStore(state => state.selectedSystemDeviceId);
  const micAudioDevices = useStore(state => state.micAudioDevices);
  const systemAudioDevices = useStore(state => state.systemAudioDevices);
  const geminiResponses = useStore(state => state.geminiResponses);
  const isBuildingResponse = useStore(state => state.isBuildingResponse);
  const audioStatus = useStore(state => state.audioStatus); // Get audioStatus

  console.log('AppLayout: geminiResponses count:', geminiResponses.length);
  console.log('AppLayout: isBuildingResponse:', isBuildingResponse);

  // Initialize notes from storage with debounced saves
  const { loadFromStorage, saveToStorage } = useDebounceStorage<PostItNote[]>({
    key: 'post-it-notes',
    delay: 1000
  });
  const [notes, setNotes] = useState<PostItNote[]>(() => {
    const savedNotes = loadFromStorage();
    return savedNotes || [];
  });

  console.log('AppLayout: notes count:', notes.length);

  // Save notes when they change
  useEffect(() => {
    if (notes.length > 0) {
      saveToStorage(notes);
    }
  }, [notes, saveToStorage]);
  
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
            name: micAudioDevices.find(d => d.id === selectedMicDeviceId)?.name || 'Unknown',
            isDefault: micAudioDevices.find(d => d.id === selectedMicDeviceId)?.isDefault || false,
            inputChannels: micAudioDevices.find(d => d.id === selectedMicDeviceId)?.inputChannels || 0,
            outputChannels: micAudioDevices.find(d => d.id === selectedMicDeviceId)?.outputChannels || 0
          } : null,
          system: selectedSystemDeviceId ? {
            id: selectedSystemDeviceId,
            name: systemAudioDevices.find(d => d.id === selectedSystemDeviceId)?.name || 'Unknown',
            isDefault: systemAudioDevices.find(d => d.id === selectedSystemDeviceId)?.isDefault || false,
            inputChannels: systemAudioDevices.find(d => d.id === selectedSystemDeviceId)?.inputChannels || 0,
            outputChannels: systemAudioDevices.find(d => d.id === selectedSystemDeviceId)?.outputChannels || 0
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
    console.log('Processing new Gemini response:', response);
    
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

    console.log('Creating new note:', newNote);
    setNotes(prev => [...prev, newNote]);
  }, [geminiResponses]);

  // Handle note deletion
  const handleNoteDelete = useCallback((id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  }, []);

  // Handle global keyboard shortcuts for notes
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if typing in an input or if modals are open
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        showKeyboardHelp ||
        showSettings
      ) {
        return;
      }

      // Delete selected note
      if (
        selectedNoteId &&
        (event.key === 'Delete' || event.key === 'Backspace')
      ) {
        event.preventDefault();
        handleNoteDelete(selectedNoteId);
        setSelectedNoteId(null);
      }

      // Tab navigation between notes
      if (event.key === 'Tab') {
        event.preventDefault();
        if (notes.length === 0) return;

        const currentIndex = selectedNoteId
          ? notes.findIndex(n => n.id === selectedNoteId)
          : -1;

        let nextIndex = event.shiftKey
          ? currentIndex - 1
          : currentIndex + 1;

        if (nextIndex >= notes.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = notes.length - 1;

        setSelectedNoteId(notes[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notes, selectedNoteId, showKeyboardHelp, showSettings, handleNoteDelete]);

  // Note handlers
  const handleNoteMove = (id: string, position: { x: number; y: number }) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === id ? { ...note, position, zIndex: Date.now() } : note
      )
    );
  };

  const handleMultiNoteMove = (movedNotes: { id: string; position: { x: number; y: number } }[]) => {
    setNotes(prev => {
      const updates = new Map(movedNotes.map(n => [n.id, n.position]));
      return prev.map(note =>
        updates.has(note.id)
          ? { ...note, position: updates.get(note.id)!, zIndex: Date.now() }
          : note
      );
    });
  };

  const handleNoteResize = (id: string, size: { width: number; height: number }) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === id ? { ...note, size, zIndex: Date.now() } : note
      )
    );
  };

  const handleNotePinToggle = (id: string) => {
    setNotes(prev => {
      const maxZ = Math.max(...prev.map(n => n.zIndex || 0));
      return prev.map(note =>
        note.id === id
          ? { ...note, isPinned: !note.isPinned, zIndex: maxZ + 1 }
          : note
      );
    });
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-transparent">
      {/* Skip to content link */}
      <a
        href="#post-it-canvas"
        className="skip-to-content"
      >
        Skip to post-it notes
      </a>

      {/* Top Menu Bar */}
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

      {/* Post-it Canvas */}
      <PostItCanvas
        id="post-it-canvas"
        tabIndex={-1}
        notes={notes}
        onNoteMove={handleNoteMove}
        onNoteMoveMultiple={handleMultiNoteMove}
        onNoteResize={handleNoteResize}
        onNotePinToggle={handleNotePinToggle}
        selectedNoteId={selectedNoteId}
        onNoteSelect={setSelectedNoteId}
        onNoteDelete={handleNoteDelete}
      />

      {/* Loading Indicator */}
      {isBuildingResponse && (
        <div className="fixed bottom-4 left-4 flex items-center space-x-2 bg-gray-900/95 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-gray-300">{audioStatus || 'Processing response...'}</span>
        </div>
      )}

      {/* Modal Windows */}
      <ModalErrorBoundary onClose={() => setShowKeyboardHelp(false)}>
        <KeyboardShortcutsHelp
          isOpen={showKeyboardHelp}
          onClose={() => setShowKeyboardHelp(false)}
        />
      </ModalErrorBoundary>

      <ModalErrorBoundary onClose={() => setShowSettings(false)}>
        <SettingsMenu
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </ModalErrorBoundary>
    </div>
  );
};

export default AppLayout;