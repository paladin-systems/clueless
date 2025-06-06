import type React from "react";
import { memo, useCallback, useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useDebounceStorage } from "../hooks/useDebounceStorage";
import { useElectronEvents } from "../hooks/useElectronEvents";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useStore } from "../store";
import type { PostItNote, SessionInfo } from "../types/ui";
import { rendererLogger } from "../utils/logger";
import PostItCanvas from "./PostItCanvas/PostItCanvas";
import TopMenuBar from "./TopMenuBar/TopMenuBar";
import KeyboardShortcutsHelp from "./shared/KeyboardShortcutsHelp";
import LoadingSpinner from "./shared/LoadingSpinner";
import ModalErrorBoundary from "./shared/ModalErrorBoundary";
import SettingsMenu from "./shared/SettingsMenu";

const AppLayout: React.FC = () => {
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize electron event listeners and keyboard shortcuts
  useElectronEvents();
  useKeyboardShortcuts(setShowKeyboardHelp, setShowSettings);

  // Optimize store subscriptions using Zustand v5 pattern with useShallow
  const audioState = useStore(
    useShallow((state) => ({
      micLevel: state.micLevel,
      systemLevel: state.systemLevel,
      isRecording: state.isRecording,
      audioStatus: state.audioStatus,
      selectedMicDeviceId: state.selectedMicDeviceId,
      selectedSystemDeviceId: state.selectedSystemDeviceId,
      micAudioDevices: state.micAudioDevices,
      systemAudioDevices: state.systemAudioDevices,
    })),
  );

  const geminiState = useStore(
    useShallow((state) => ({
      geminiResponses: state.geminiResponses,
      isBuildingResponse: state.isBuildingResponse,
    })),
  );

  const noteState = useStore(
    useShallow((state) => ({
      notes: state.notes,
      selectedNoteId: state.selectedNoteId,
    })),
  );

  // Store actions (these don't change, so we can extract them once)
  const actions = useStore(
    useShallow((state) => ({
      startRecording: state.startRecording,
      stopRecording: state.stopRecording,
      capture: state.capture,
      updateNotesPositions: state.updateNotesPositions,
      addNote: state.addNote,
      removeNote: state.removeNote,
      setNotes: state.setNotes,
      selectNote: state.selectNote,
      updateNotePosition: state.updateNotePosition,
      updateNoteSize: state.updateNoteSize,
    })),
  );

  rendererLogger.debug("AppLayout: geminiResponses count", {
    count: geminiState.geminiResponses.length,
  });
  rendererLogger.debug("AppLayout: isBuildingResponse", {
    isBuildingResponse: geminiState.isBuildingResponse,
  });

  // Initialize notes from storage with debounced saves
  const { loadFromStorage, saveToStorage } = useDebounceStorage<PostItNote[]>({
    key: "post-it-notes",
    delay: 1000,
  });
  // Load notes from storage on startup
  useEffect(() => {
    const storedNotes = loadFromStorage();
    rendererLogger.debug("Loading notes from storage on startup", {
      storedCount: storedNotes?.length || 0,
    });

    if (storedNotes && storedNotes.length > 0) {
      // Update store with loaded notes only if store is empty
      const currentNotes = noteState.notes;
      rendererLogger.debug("Current notes in store", { currentCount: currentNotes.length });
      if (currentNotes.length === 0) {
        rendererLogger.info("Setting notes from storage", { noteCount: storedNotes.length });
        actions.setNotes(storedNotes);
      }
    } else {
      rendererLogger.debug("No stored notes found or empty array");
    }
  }, [loadFromStorage, actions.setNotes, noteState.notes]); // Include the full noteState.notes object

  // Save notes when they change
  useEffect(() => {
    rendererLogger.debug("Saving notes to storage", { noteCount: noteState.notes.length });
    saveToStorage(noteState.notes);
  }, [noteState.notes, saveToStorage]);

  // Track session info
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    startTime: 0,
    duration: 0,
    isRecording: false,
    deviceInfo: {
      mic: null,
      system: null,
    },
  });

  // Update session duration and device info
  useEffect(() => {
    let timer: NodeJS.Timer | null = null;

    if (audioState.isRecording) {
      // Optimize device lookups by memoizing them
      const micDevice = audioState.selectedMicDeviceId
        ? audioState.micAudioDevices.find((d) => d.id === audioState.selectedMicDeviceId)
        : null;

      const systemDevice = audioState.selectedSystemDeviceId
        ? audioState.systemAudioDevices.find((d) => d.id === audioState.selectedSystemDeviceId)
        : null;

      setSessionInfo((prev) => ({
        ...prev,
        startTime: prev.startTime || Date.now(),
        isRecording: true,
        deviceInfo: {
          mic: micDevice
            ? {
                id: audioState.selectedMicDeviceId!,
                name: micDevice.name || "Unknown",
                isDefault: micDevice.isDefault || false,
                inputChannels: micDevice.inputChannels || 0,
                outputChannels: micDevice.outputChannels || 0,
              }
            : null,
          system: systemDevice
            ? {
                id: audioState.selectedSystemDeviceId!,
                name: systemDevice.name || "Unknown",
                isDefault: systemDevice.isDefault || false,
                inputChannels: systemDevice.inputChannels || 0,
                outputChannels: systemDevice.outputChannels || 0,
              }
            : null,
        },
      }));

      // Use a longer interval to reduce CPU usage
      timer = setInterval(() => {
        setSessionInfo((prev) => ({
          ...prev,
          duration: prev.startTime ? Date.now() - prev.startTime : 0,
        }));
      }, 5000); // Update every 5 seconds instead of 1 second
    } else {
      setSessionInfo((prev) => ({
        ...prev,
        isRecording: false,
      }));
    }

    return () => {
      if (timer) {
        clearInterval(timer as NodeJS.Timeout);
      }
    };
  }, [
    audioState.isRecording,
    audioState.selectedMicDeviceId,
    audioState.selectedSystemDeviceId,
    audioState.micAudioDevices,
    audioState.systemAudioDevices,
  ]);
  // Handle new Gemini responses
  useEffect(() => {
    if (geminiState.geminiResponses.length === 0) return;

    const response = geminiState.geminiResponses[geminiState.geminiResponses.length - 1];
    rendererLogger.debug("Processing new Gemini response", { response });

    // Skip if missing required fields
    if (!response.category || !response.content) {
      rendererLogger.warn("Invalid Gemini response format", { response });
      return;
    }

    const baseOffset = 20;

    // Calculate position based on note category
    const getPosition = () => {
      // Get current notes to avoid stale closure
      const currentNotes = noteState.notes;
      const lastNote = currentNotes[currentNotes.length - 1];
      const baseX = lastNote ? lastNote.position.x + baseOffset : baseOffset;
      let baseY: number;

      switch (response.category) {
        case "follow-up":
          baseY = 80; // Follow-up questions at top
          break;
        case "advice":
          baseY = window.innerHeight - 300; // Advice at bottom
          break;
        case "answer":
          baseY = window.innerHeight / 2; // Answers in middle
          break;
        default:
          baseY = lastNote ? lastNote.position.y + baseOffset : 80;
      }

      return {
        x: Math.min(baseX, window.innerWidth - 320),
        y: Math.min(baseY, window.innerHeight - 220),
      };
    };

    // Calculate size based on content length and category
    const getSize = () => {
      const baseSize = { width: 300, height: 200 };
      const contentLength = response.content.length;

      if (response.category === "advice") {
        return { width: 400, height: Math.min(300, Math.max(200, contentLength / 3)) };
      }
      if (response.category === "follow-up") {
        return { width: 250, height: Math.min(150, Math.max(100, contentLength / 4)) };
      }
      return baseSize;
    };

    // Get color based on category
    const getColor = () => {
      switch (response.category) {
        case "answer":
          return "#4c8bf5"; // blue for answers
        case "advice":
          return "#f59e0b"; // amber for advice
        case "follow-up":
          return "#10b981"; // green for follow-ups
        default:
          return "#4c8bf5";
      }
    };

    const newNote: PostItNote = {
      id: `note_${Date.now()}`,
      content: response.content,
      position: getPosition(),
      size: getSize(),
      timestamp: Date.now(),
      category: response.category,
      color: getColor(),
      lastModified: Date.now(),
      isAiModified: true,
      zIndex: Date.now(),
    };

    rendererLogger.info("Creating new note", { newNote });
    actions.addNote(newNote);
  }, [geminiState.geminiResponses, actions.addNote, noteState.notes]);

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
      } // Delete selected note
      if (noteState.selectedNoteId && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        actions.removeNote(noteState.selectedNoteId);
        actions.selectNote(undefined);
      }

      // Tab navigation between notes
      if (event.key === "Tab") {
        event.preventDefault();
        if (noteState.notes.length === 0) return;

        const currentIndex = noteState.selectedNoteId
          ? noteState.notes.findIndex((n) => n.id === noteState.selectedNoteId)
          : -1;

        let nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;
        if (nextIndex >= noteState.notes.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = noteState.notes.length - 1;

        actions.selectNote(noteState.notes[nextIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    noteState.notes,
    noteState.selectedNoteId,
    showKeyboardHelp,
    showSettings,
    actions.removeNote,
    actions.selectNote,
  ]);

  // Note handlers
  const handleNoteMove = useCallback(
    (id: string, position: { x: number; y: number }) => {
      actions.updateNotePosition(id, position);
    },
    [actions.updateNotePosition],
  );

  const handleMultiNoteMove = (
    movedNotes: { id: string; position: { x: number; y: number } }[],
  ) => {
    actions.updateNotesPositions(movedNotes);
  };
  const handleNoteResize = useCallback(
    (id: string, size: { width: number; height: number }) => {
      actions.updateNoteSize(id, size);
    },
    [actions.updateNoteSize],
  );
  const handleNoteSelect = useCallback(
    (id: string | null) => {
      actions.selectNote(id || undefined);
    },
    [actions.selectNote],
  );
  // Debug: Log notes count when notes array changes
  useEffect(() => {
    rendererLogger.info("Notes updated", { totalNotes: noteState.notes.length });
  }, [noteState.notes.length]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-transparent">
      {/* Skip to content link */}
      <a href="#post-it-canvas" className="skip-to-content">
        Skip to post-it notes
      </a>

      {/* Top Menu Bar */}
      <TopMenuBar
        sessionInfo={sessionInfo}
        audioLevels={{
          mic: { level: audioState.micLevel, type: "mic" },
          system: { level: audioState.systemLevel, type: "system" },
        }}
        onStartRecording={actions.startRecording}
        onStopRecording={actions.stopRecording}
        onCapture={actions.capture}
        onSettingsClick={() => setShowSettings(true)}
        onKeyboardHelpClick={() => setShowKeyboardHelp(true)}
      />

      {/* Post-it Canvas */}
      <PostItCanvas
        id="post-it-canvas"
        tabIndex={-1}
        notes={noteState.notes}
        onNoteMove={handleNoteMove}
        onNoteMoveMultiple={handleMultiNoteMove}
        onNoteResize={handleNoteResize}
        selectedNoteId={noteState.selectedNoteId}
        onNoteSelect={handleNoteSelect}
        onNoteDelete={actions.removeNote}
      />

      {/* Loading Indicator */}
      {geminiState.isBuildingResponse && (
        <div className="fixed bottom-4 left-4 flex items-center space-x-2 rounded-lg border border-gray-700/50 bg-gray-900/95 p-3 backdrop-blur-sm">
          <LoadingSpinner size="sm" />
          <span className="text-gray-300 text-sm">
            {audioState.audioStatus || "Processing response..."}
          </span>
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
        <SettingsMenu isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </ModalErrorBoundary>
    </div>
  );
};

export default memo(AppLayout);
