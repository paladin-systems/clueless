import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { ipcDatabaseService } from "../database/ipcDatabaseService";
import type { GeminiResponse } from "../types/gemini";
import type { NotePosition, PostItNote, ViewOptions } from "../types/ui";
import { storageLogger } from "../utils/logger";
import { debounce } from "../utils/performance";

export interface AppState {
  // Audio-related state
  micLevel: number;
  systemLevel: number;
  micLevelTimeout: NodeJS.Timeout | null;
  systemLevelTimeout: NodeJS.Timeout | null;
  micAudioDevices: {
    id: number;
    name: string;
    isDefault: boolean;
    inputChannels: number;
    outputChannels: number;
  }[];
  systemAudioDevices: {
    id: number;
    name: string;
    isDefault: boolean;
    inputChannels: number;
    outputChannels: number;
  }[];
  selectedMicDeviceId?: number;
  selectedSystemDeviceId?: number;
  isRecording: boolean;
  audioError?: string;
  audioStatus?: string;

  // Recording-related state
  recordings: {
    id: string;
    timestamp: number;
    dataUrl: string;
  }[];

  // UI-related state
  geminiResponses: GeminiResponse[];
  isBuildingResponse: boolean;
  viewOptions: ViewOptions;
  screenCapture?: string;

  // Post-it related state
  notes: PostItNote[];
  selectedNoteId?: string;

  // PouchDB-specific state
  isStorageInitialized: boolean;
  storageError?: string;
  lastSyncTime?: number;

  // Methods
  setMicLevel: (level: number) => void;
  setSystemLevel: (level: number) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  capture: () => Promise<void>;
  setSelectedMicDevice: (deviceId: number) => void;
  setSelectedSystemDevice: (deviceId: number) => void;
  setMicAudioDevices: (
    devices: {
      id: number;
      name: string;
      isDefault: boolean;
      inputChannels: number;
      outputChannels: number;
    }[],
  ) => void;
  setSystemAudioDevices: (
    devices: {
      id: number;
      name: string;
      isDefault: boolean;
      inputChannels: number;
      outputChannels: number;
    }[],
  ) => void;
  addGeminiResponse: (response: GeminiResponse) => void;
  clearResponses: () => void;
  updateViewOptions: (options: Partial<ViewOptions>) => void;

  // Enhanced note methods with PouchDB integration
  addNote: (note: PostItNote) => Promise<void>;
  updateNote: (id: string, updates: Partial<PostItNote>) => Promise<void>;
  updateNotePosition: (id: string, position: { x: number; y: number }) => Promise<void>;
  updateNoteSize: (id: string, size: { width: number; height: number }) => Promise<void>;
  updateNotesPositions: (notes: NotePosition[]) => Promise<void>;
  bringNoteToFront: (id: string) => Promise<void>;
  setNotes: (notes: PostItNote[]) => void;
  removeNote: (id: string) => Promise<void>;
  removeAllNotes: () => Promise<void>;
  selectNote: (id: string | undefined) => void;

  // PouchDB-specific methods
  initializeStorage: () => Promise<void>;
  loadNotesFromStorage: () => Promise<void>;
  syncNotesToStorage: () => Promise<void>;
  searchNotes: (searchText: string) => Promise<PostItNote[]>;
  getNotesByCategory: (category: PostItNote["category"]) => Promise<PostItNote[]>;
  getRecentNotes: (since: number) => Promise<PostItNote[]>;
  getStorageStatistics: () => Promise<unknown>;
  compactStorage: () => Promise<void>;
}

export const usePouchDBStore = create<AppState>()(
  subscribeWithSelector((set, get) => {
    // Helper function to ensure IPC database service is initialized
    const ensureStorageInitialized = async () => {
      if (!get().isStorageInitialized) {
        await get().initializeStorage();
      }
      return ipcDatabaseService;
    };

    // Create debounced functions for database operations to prevent excessive writes
    const debouncedSyncNoteSize = debounce(
      async (id: string, size: { width: number; height: number }) => {
        try {
          const service = await ensureStorageInitialized();
          if (service) {
            await service.updateNote(id, { size, lastModified: Date.now() });
            storageLogger.debug({ noteId: id }, "Note size synced to database (debounced)");
          }
        } catch (error) {
          storageLogger.error({ noteId: id, error }, "Failed to sync note size to database");
          set({
            storageError: error instanceof Error ? error.message : "Failed to sync note size",
          });
        }
      },
      200,
    ); // 200ms debounce for resize operations

    const debouncedSyncNotePosition = debounce(
      async (id: string, position: { x: number; y: number }) => {
        try {
          const service = await ensureStorageInitialized();
          if (service) {
            await service.updateNote(id, { position, lastModified: Date.now() });
            storageLogger.debug({ noteId: id }, "Note position synced to database (debounced)");
          }
        } catch (error) {
          storageLogger.error({ noteId: id, error }, "Failed to sync note position to database");
          set({
            storageError: error instanceof Error ? error.message : "Failed to sync note position",
          });
        }
      },
      150,
    ); // 150ms debounce for position operations

    return {
      // Initial state
      micLevel: 0,
      systemLevel: 0,
      micLevelTimeout: null,
      systemLevelTimeout: null,
      micAudioDevices: [],
      systemAudioDevices: [],
      selectedMicDeviceId: undefined,
      selectedSystemDeviceId: undefined,
      isRecording: false,
      audioError: undefined,
      audioStatus: undefined,
      recordings: [],
      geminiResponses: [] as GeminiResponse[],
      isBuildingResponse: false,
      notes: [],
      viewOptions: {
        layout: "cascade",
        opacity: 0.9,
        alwaysOnTop: false,
        showCategories: true,
        showInstructions: localStorage.getItem("showPostItInstructions") !== "false",
      },
      screenCapture: undefined,
      selectedNoteId: undefined,
      isStorageInitialized: false,
      storageError: undefined,
      lastSyncTime: undefined,

      // Audio methods (unchanged)
      setMicLevel: (level) => set({ micLevel: level }),
      setSystemLevel: (level) => set({ systemLevel: level }),
      setMicAudioDevices: (devices) => set({ micAudioDevices: devices }),
      setSystemAudioDevices: (devices) => set({ systemAudioDevices: devices }),

      startRecording: async () => {
        const { selectedMicDeviceId, selectedSystemDeviceId } = get();
        if (!selectedMicDeviceId || !selectedSystemDeviceId) return;

        try {
          const success = await window.electron.startAudioCapture(
            selectedMicDeviceId,
            selectedSystemDeviceId,
          );
          if (success) {
            set({ isRecording: true, audioError: undefined });
          }
        } catch (error) {
          set({ audioError: String(error) });
        }
      },

      stopRecording: async () => {
        try {
          set({ isRecording: false, audioStatus: "Stopping recording..." });

          const success = await window.electron.stopAudioCapture();
          if (success) {
            set({ isRecording: false, audioStatus: "Recording stopped" });
          } else {
            set({ isRecording: true, audioError: "Failed to stop recording" });
          }
        } catch (error) {
          set({ isRecording: true, audioError: String(error) });
        }
      },

      capture: async () => {
        try {
          await window.electron.captureScreen(get().isRecording);
        } catch (error) {
          set({ audioError: String(error) });
        }
      },

      setSelectedMicDevice: (deviceId) => set({ selectedMicDeviceId: deviceId }),
      setSelectedSystemDevice: (deviceId) => set({ selectedSystemDeviceId: deviceId }),

      addGeminiResponse: (response: GeminiResponse) =>
        set((state) => ({
          geminiResponses: [...state.geminiResponses, response],
        })),

      clearResponses: () => set({ geminiResponses: [] }),

      updateViewOptions: (options) => {
        set((state) => {
          const newViewOptions = { ...state.viewOptions, ...options };
          if (
            Object.keys(newViewOptions).every(
              (key) =>
                newViewOptions[key as keyof ViewOptions] ===
                state.viewOptions[key as keyof ViewOptions],
            )
          ) {
            return state;
          }

          if ("showInstructions" in options) {
            localStorage.setItem("showPostItInstructions", String(options.showInstructions));
          }
          return { viewOptions: newViewOptions };
        });
      },

      // Enhanced note methods with PouchDB integration
      addNote: async (note) => {
        try {
          const service = await ensureStorageInitialized();
          if (!service) throw new Error("Storage not initialized");

          // Add to database first
          await service.createNote(note);

          // Then update local state
          set((state) => ({
            notes: [...state.notes, { ...note, zIndex: note.zIndex || Date.now() }],
          }));

          storageLogger.debug({ noteId: note.id }, "Note added");
        } catch (error) {
          storageLogger.error({ noteId: note.id, error }, "Failed to add note");
          set({ storageError: error instanceof Error ? error.message : "Failed to add note" });
        }
      },

      updateNote: async (id, updates) => {
        try {
          const service = await ensureStorageInitialized();
          if (!service) throw new Error("Storage not initialized");

          // Update in database first
          await service.updateNote(id, updates);

          // Then update local state
          set((state) => ({
            notes: state.notes.map((note) => (note.id === id ? { ...note, ...updates } : note)),
          }));

          storageLogger.debug({ noteId: id }, "Note updated");
        } catch (error) {
          storageLogger.error({ noteId: id, error }, "Failed to update note");
          set({ storageError: error instanceof Error ? error.message : "Failed to update note" });
        }
      },

      updateNotePosition: async (id, position) => {
        const note = get().notes.find((n) => n.id === id);
        if (!note || (note.position.x === position.x && note.position.y === position.y)) {
          return;
        }

        // Update local state immediately for responsive UI
        const updates = { position, zIndex: Date.now() };
        set((state) => ({
          notes: state.notes.map((note) => (note.id === id ? { ...note, ...updates } : note)),
        }));

        // Use debounced database sync to prevent excessive writes
        debouncedSyncNotePosition(id, position);
      },

      updateNoteSize: async (id, size) => {
        const note = get().notes.find((n) => n.id === id);
        if (!note || (note.size.width === size.width && note.size.height === size.height)) {
          return;
        }

        // Update local state immediately for responsive UI
        const updates = { size, zIndex: Date.now() };
        set((state) => ({
          notes: state.notes.map((note) => (note.id === id ? { ...note, ...updates } : note)),
        }));

        // Use debounced database sync to prevent excessive writes
        debouncedSyncNoteSize(id, size);
      },

      updateNotesPositions: async (updatedNotes) => {
        try {
          const service = await ensureStorageInitialized();
          if (!service) throw new Error("Storage not initialized");

          // Update each note position in database
          const updatePromises = updatedNotes.map(async (updatedNote) => {
            await service.updateNote(updatedNote.id, { position: updatedNote.position });
          });

          await Promise.all(updatePromises);

          // Update local state
          set((state) => {
            const newNotes = state.notes.map((existingNote) => {
              const updated = updatedNotes.find((un) => un.id === existingNote.id);
              return updated ? { ...existingNote, position: updated.position } : existingNote;
            });
            return { notes: newNotes };
          });

          storageLogger.debug({ count: updatedNotes.length }, "Notes positions updated");
        } catch (error) {
          storageLogger.error({ error }, "Failed to update notes positions");
          set({
            storageError: error instanceof Error ? error.message : "Failed to update positions",
          });
        }
      },

      bringNoteToFront: async (id: string) => {
        await get().updateNote(id, { zIndex: Date.now() });
      },

      setNotes: (notes) => set({ notes }),

      removeNote: async (id) => {
        try {
          const service = await ensureStorageInitialized();
          if (!service) throw new Error("Storage not initialized");

          // Remove from database first
          await service.deleteNote(id);

          // Then update local state
          set((state) => {
            const newNotes = state.notes.filter((note) => note.id !== id);
            return {
              notes: newNotes,
              selectedNoteId: state.selectedNoteId === id ? undefined : state.selectedNoteId,
            };
          });

          storageLogger.debug({ noteId: id }, "Note removed");
        } catch (error) {
          storageLogger.error({ noteId: id, error }, "Failed to remove note");
          set({ storageError: error instanceof Error ? error.message : "Failed to remove note" });
        }
      },

      removeAllNotes: async () => {
        try {
          const service = await ensureStorageInitialized();
          if (!service) throw new Error("Storage not initialized");

          // Remove from database first
          await service.deleteAllNotes();

          // Then update local state
          set({ notes: [], selectedNoteId: undefined });

          storageLogger.info("All notes removed");
        } catch (error) {
          storageLogger.error({ error }, "Failed to remove all notes");
          set({
            storageError: error instanceof Error ? error.message : "Failed to remove all notes",
          });
        }
      },

      selectNote: (id) => {
        const state = get();
        if (state.selectedNoteId === id) {
          return;
        }

        if (id) {
          const zIndex = Date.now();
          // Update local state immediately
          const updatedNotes = state.notes.map((note) =>
            note.id === id ? { ...note, zIndex } : note,
          );
          set({ selectedNoteId: id, notes: updatedNotes });

          // Sync z-index to database in background
          ensureStorageInitialized()
            .then((service) => {
              if (service) {
                return service.updateNote(id, { zIndex });
              }
            })
            .then(() => {
              storageLogger.debug({ noteId: id }, "Note z-index synced to database");
            })
            .catch((error) => {
              storageLogger.error({ noteId: id, error }, "Failed to sync note z-index to database");
            });
        } else {
          set({ selectedNoteId: id });
        }
      }, // IPC Database storage methods
      initializeStorage: async () => {
        try {
          if (get().isStorageInitialized) return;

          storageLogger.info("Initializing IPC database storage...");

          // Initialize IPC database service
          await ipcDatabaseService.initialize();

          set({
            isStorageInitialized: true,
            storageError: undefined,
            lastSyncTime: Date.now(),
          });

          storageLogger.info("IPC database storage initialized successfully");
        } catch (error) {
          storageLogger.error({ error }, "Failed to initialize IPC database storage");
          set({
            storageError: error instanceof Error ? error.message : "Storage initialization failed",
            isStorageInitialized: false,
          });
          throw error;
        }
      },

      loadNotesFromStorage: async () => {
        try {
          const service = await ensureStorageInitialized();
          if (!service) throw new Error("Storage not initialized");

          const notes = await service.getAllNotes();
          set({ notes, storageError: undefined });

          storageLogger.debug({ count: notes.length }, "Notes loaded from storage");
        } catch (error) {
          storageLogger.error({ error }, "Failed to load notes from storage");
          set({ storageError: error instanceof Error ? error.message : "Failed to load notes" });
        }
      },

      syncNotesToStorage: async () => {
        try {
          const service = await ensureStorageInitialized();
          if (!service) throw new Error("Storage not initialized");

          const currentNotes = get().notes;

          // This is a simplified sync - in a real implementation, you might want
          // more sophisticated conflict resolution
          const dbNotes = await service.getAllNotes();
          const dbNotesMap = new Map(dbNotes.map((note) => [note.id, note]));

          // Update or create notes that have changed
          for (const note of currentNotes) {
            const dbNote = dbNotesMap.get(note.id);
            if (!dbNote || dbNote.lastModified !== note.lastModified) {
              if (dbNote) {
                await service.updateNote(note.id, note);
              } else {
                await service.createNote(note);
              }
            }
          }

          set({ lastSyncTime: Date.now(), storageError: undefined });
          storageLogger.debug("Notes synced to storage");
        } catch (error) {
          storageLogger.error({ error }, "Failed to sync notes to storage");
          set({ storageError: error instanceof Error ? error.message : "Failed to sync notes" });
        }
      },

      searchNotes: async (searchText: string) => {
        try {
          const service = await ensureStorageInitialized();
          if (!service) throw new Error("Storage not initialized");

          return await service.searchNotes(searchText);
        } catch (error) {
          storageLogger.error({ searchText, error }, "Failed to search notes");
          return [];
        }
      },

      getNotesByCategory: async (category: PostItNote["category"]) => {
        try {
          const service = await ensureStorageInitialized();
          if (!service) throw new Error("Storage not initialized");

          return await service.getNotesByCategory(category);
        } catch (error) {
          storageLogger.error({ category, error }, "Failed to get notes by category");
          return [];
        }
      },

      getRecentNotes: async (since: number) => {
        try {
          const service = await ensureStorageInitialized();
          if (!service) throw new Error("Storage not initialized");

          return await service.getRecentNotes(since);
        } catch (error) {
          storageLogger.error({ since, error }, "Failed to get recent notes");
          return [];
        }
      },
      getStorageStatistics: async () => {
        try {
          const service = await ensureStorageInitialized();
          if (!service) throw new Error("Storage not initialized");

          // Get basic statistics from the current notes
          const notes = await service.getAllNotes();
          return {
            totalNotes: notes.length,
            lastModified: Math.max(...notes.map((n) => n.lastModified || 0)),
            categories: {
              answer: notes.filter((n) => n.category === "answer").length,
              advice: notes.filter((n) => n.category === "advice").length,
              "follow-up": notes.filter((n) => n.category === "follow-up").length,
            },
          };
        } catch (error) {
          storageLogger.error({ error }, "Failed to get storage statistics");
          return null;
        }
      },

      compactStorage: async () => {
        try {
          const service = await ensureStorageInitialized();
          if (!service) throw new Error("Storage not initialized");

          await service.compact();
          storageLogger.info("Storage compacted successfully");
        } catch (error) {
          storageLogger.error({ error }, "Failed to compact storage");
          set({
            storageError: error instanceof Error ? error.message : "Failed to compact storage",
          });
        }
      },
    };
  }),
);

// Initialize storage when the store is created
usePouchDBStore
  .getState()
  .initializeStorage()
  .catch((error) => {
    storageLogger.error({ error }, "Failed to initialize storage on store creation");
  });

// Export the original store interface for compatibility
export { usePouchDBStore as useStore };
