import { create } from 'zustand';
import { PostItNote, AudioIndicator, ViewOptions, NotePosition } from '../types/ui';
import { GeminiResponse } from '../types/gemini';

interface AppState {
  // Audio-related state
  micLevel: number;
  systemLevel: number;
  micLevelTimeout: NodeJS.Timeout | null;
  systemLevelTimeout: NodeJS.Timeout | null;
  micAudioDevices: { id: number; name: string; isDefault: boolean; inputChannels: number; outputChannels: number }[];
  systemAudioDevices: { id: number; name: string; isDefault: boolean; inputChannels: number; outputChannels: number }[];
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
  // currentGeminiTextBuffer: string; // This will be removed
  viewOptions: ViewOptions;
  screenCapture?: string;

  // Post-it related state
  notes: PostItNote[];
  selectedNoteId?: string;

  // Methods
  setMicLevel: (level: number) => void;
  setSystemLevel: (level: number) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  capture: () => Promise<void>;
  setSelectedMicDevice: (deviceId: number) => void;
  setSelectedSystemDevice: (deviceId: number) => void;
  setMicAudioDevices: (devices: { id: number; name: string; isDefault: boolean; inputChannels: number; outputChannels: number }[]) => void;
  setSystemAudioDevices: (devices: { id: number; name: string; isDefault: boolean; inputChannels: number; outputChannels: number }[]) => void;
  addGeminiResponse: (response: GeminiResponse) => void;
  clearResponses: () => void;
  updateViewOptions: (options: Partial<ViewOptions>) => void;
  addNote: (note: PostItNote) => void;
  updateNote: (id: string, updates: Partial<PostItNote>) => void;  updateNotePosition: (id: string, position: { x: number; y: number }) => void;
  updateNoteSize: (id: string, size: { width: number; height: number }) => void;
  updateNotesPositions: (notes: NotePosition[]) => void;
  bringNoteToFront: (id: string) => void;
  setNotes: (notes: PostItNote[]) => void;
  removeNote: (id: string) => void;
  selectNote: (id: string | undefined) => void;
}

export const useStore = create<AppState>((set, get) => ({
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
  // currentGeminiTextBuffer: '', // This will be removed
  notes: [],
  viewOptions: {
    layout: 'cascade',
    opacity: 0.9,
    alwaysOnTop: false,
    showCategories: true,
    showInstructions: localStorage.getItem('showPostItInstructions') !== 'false'
  },
  screenCapture: undefined,
  selectedNoteId: undefined,

  // Methods
  setMicLevel: (level) => set({ micLevel: level }),
  setSystemLevel: (level) => set({ systemLevel: level }),
  setMicAudioDevices: (devices) => set({ micAudioDevices: devices }),
  setSystemAudioDevices: (devices) => set({ systemAudioDevices: devices }),

  startRecording: async () => {
    const { selectedMicDeviceId, selectedSystemDeviceId } = get();
    if (!selectedMicDeviceId || !selectedSystemDeviceId) return;

    try {
      const success = await (window as any).electron.startAudioCapture(
        selectedMicDeviceId,
        selectedSystemDeviceId
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
      const success = await (window as any).electron.stopAudioCapture();
      if (success) {
        set({ isRecording: false });
      }
    } catch (error) {
      set({ audioError: String(error) });
    }
  },

  capture: async () => {
    try {
      await (window as any).electron.captureScreen(get().isRecording);
    } catch (error) {
      set({ audioError: String(error) });
    }
  },

  setSelectedMicDevice: (deviceId) => set({ selectedMicDeviceId: deviceId }),
  setSelectedSystemDevice: (deviceId) => set({ selectedSystemDeviceId: deviceId }),

  addGeminiResponse: (response: GeminiResponse) => set((state) => ({
    geminiResponses: [...state.geminiResponses, response]
  })),

  clearResponses: () => set({ geminiResponses: [] }),

  updateViewOptions: (options) => {
    set((state) => {
      const newViewOptions = { ...state.viewOptions, ...options };
      // Perform a shallow comparison to avoid unnecessary re-renders
      if (Object.keys(newViewOptions).every(key => newViewOptions[key as keyof ViewOptions] === state.viewOptions[key as keyof ViewOptions])) {
        return state; // No actual change, return current state to prevent re-render
      }

      if ('showInstructions' in options) {
        localStorage.setItem('showPostItInstructions', String(options.showInstructions));
      }
      return { viewOptions: newViewOptions };
    });
  },
  addNote: (note) => set((state) => ({
    notes: [...state.notes, { ...note, zIndex: note.zIndex || Date.now() }]
  })),

  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((note) =>
      note.id === id ? { ...note, ...updates } : note
    )
  })),

  updateNotesPositions: (updatedNotes) => set((state) => {
    const newNotes = state.notes.map(existingNote => {
      const updated = updatedNotes.find(un => un.id === existingNote.id);
      return updated ? { ...existingNote, position: updated.position } : existingNote;
    });
    return { notes: newNotes };
  }),
  updateNotePosition: (id, position) => set((state) => ({
    notes: state.notes.map((note) =>
      note.id === id ? { ...note, position, zIndex: Date.now() } : note
    )
  })),

  updateNoteSize: (id, size) => set((state) => ({
    notes: state.notes.map((note) =>
      note.id === id ? { ...note, size, zIndex: Date.now() } : note
    )
  })),

  bringNoteToFront: (id: string) => set((state) => ({
    notes: state.notes.map((note) =>
      note.id === id ? { ...note, zIndex: Date.now() } : note
    )
  })),


  setNotes: (notes) => set({ notes }),

  removeNote: (id) => set((state) => ({
    notes: state.notes.filter((note) => note.id !== id)
  })),

  selectNote: (id) => set((state) => {
    // If selecting a note, bring it to front
    if (id) {
      const updatedNotes = state.notes.map((note) =>
        note.id === id ? { ...note, zIndex: Date.now() } : note
      );
      return { selectedNoteId: id, notes: updatedNotes };
    }
    // If deselecting (id is undefined), just update selection
    return { selectedNoteId: id };
  })
}));