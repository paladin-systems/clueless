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
  const updateNotesPositions = useStore(state => state.updateNotesPositions);
  const addNote = useStore(state => state.addNote);
  const removeNote = useStore(state => state.removeNote);
  const setNotes = useStore(state => state.setNotes);
  const notes = useStore(state => state.notes);
  const selectedNoteId = useStore(state => state.selectedNoteId);
  const selectNote = useStore(state => state.selectNote);


  console.log('AppLayout: geminiResponses count:', geminiResponses.length);
  console.log('AppLayout: isBuildingResponse:', isBuildingResponse);

  // Initialize notes from storage with debounced saves
  const { loadFromStorage, saveToStorage } = useDebounceStorage<PostItNote[]>({
    key: 'post-it-notes',
    delay: 1000
  });
    // Load notes from storage on startup
  useEffect(() => {
    const storedNotes = loadFromStorage();
    console.log('🔍 Loading notes from storage:', storedNotes?.length || 0, 'notes found');
    
    if (storedNotes && storedNotes.length > 0) {
      // Log all notes content for debugging
      console.log('📝 All stored notes content:');      storedNotes.forEach((note, index) => {
        console.log(`Note ${index + 1} (${note.id}):`, {
          category: note.category,
          contentPreview: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
          fullContent: note.content
        });
      });
      
      // Update store with loaded notes only if store is empty
      const currentNotes = useStore.getState().notes;
      if (currentNotes.length === 0) {
        setNotes(storedNotes);
      }
    }
  }, [loadFromStorage, setNotes]);
  
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
    
    const baseOffset = 20;
    
    // Calculate position based on note type and priority
    const getPosition = () => {
      // Get current notes to avoid stale closure
      const currentNotes = useStore.getState().notes;
      const lastNote = currentNotes[currentNotes.length - 1];
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
      timestamp: Date.now(),
      category: response.type,
      color: getColor(),
      lastModified: Date.now(),
      isAiModified: true,
      zIndex: Date.now()
    };

    console.log('Creating new note:', newNote);
    addNote(newNote);
  }, [geminiResponses, addNote]);

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
      }      // Delete selected note
      if (
        selectedNoteId &&
        (event.key === 'Delete' || event.key === 'Backspace')
      ) {
        event.preventDefault();
        removeNote(selectedNoteId);
        selectNote(undefined);
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
          : currentIndex + 1;        if (nextIndex >= notes.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = notes.length - 1;

        selectNote(notes[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notes, selectedNoteId, showKeyboardHelp, showSettings, removeNote]);

  // Note handlers
  const updateNotePosition = useStore(state => state.updateNotePosition);
  const updateNoteSize = useStore(state => state.updateNoteSize);

  const handleNoteMove = useCallback((id: string, position: { x: number; y: number }) => {
    updateNotePosition(id, position);
  }, [updateNotePosition]);

  const handleMultiNoteMove = (movedNotes: { id: string; position: { x: number; y: number } }[]) => {
    updateNotesPositions(movedNotes);
  };
  const handleNoteResize = useCallback((id: string, size: { width: number; height: number }) => {
    updateNoteSize(id, size);
  }, [updateNoteSize]);
  const handleNoteSelect = useCallback((id: string | null) => {
    selectNote(id || undefined);
  }, [selectNote]);

  // Debug: Log all notes when notes array changes (Improved Version)
  useEffect(() => {
    console.log('--- DEBUG START: Notes Logging Effect (AppLayout) ---');
    if (notes) {
      console.log(`DEBUG (AppLayout): notes variable is defined. Type: ${typeof notes}, IsArray: ${Array.isArray(notes)}, Length: ${notes.length}`);
      if (notes.length > 0) {
        console.log('DEBUG (AppLayout): Iterating through notes:');
        notes.forEach((note, index) => {
          if (note && typeof note === 'object') {
            // Ensure note.content is accessed safely, especially if it could be non-string temporarily
            const contentType = typeof note.content;
            let contentPreview = note.content;
            if (contentType !== 'string') {
              contentPreview = `[Content is not a string, type: ${contentType}]`;
            } else if (note.content.length > 100) {
              contentPreview = note.content.substring(0, 100) + '...'; // Preview long content
            }
            console.log(`DEBUG (AppLayout): Note[${index}] ID: ${note.id}, Content Type: ${contentType}, Content Preview:`, contentPreview);
            // If you need to see the full content regardless of type/length for debugging:
            // console.log(`DEBUG (AppLayout): Note[${index}] ID: ${note.id}, Raw Content:`, note.content);
          } else {
            console.log(`DEBUG (AppLayout): Note[${index}] is not a valid object or is null/undefined:`, note);
          }
        });
      } else {
        console.log('DEBUG (AppLayout): Notes array is empty.');
      }
    } else {
      console.log('DEBUG (AppLayout): notes variable is null or undefined.');
    }
    console.log('--- DEBUG END: Notes Logging Effect (AppLayout) ---');
  }, [notes]);

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
        tabIndex={-1}        notes={notes}
        onNoteMove={handleNoteMove}
        onNoteMoveMultiple={handleMultiNoteMove}
        onNoteResize={handleNoteResize}
        selectedNoteId={selectedNoteId}
        onNoteSelect={handleNoteSelect}
        onNoteDelete={removeNote}
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