export interface PostItNote {
  id: string;
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isPinned: boolean;
  timestamp: number;
  category: 'response' | 'question' | 'reference' | 'note';
  color: string;
  lastModified: number;
  isAiModified: boolean;
  zIndex?: number;
}

export interface NotePosition {
  id: string;
  position: { x: number; y: number };
}

export interface TopMenuSection {
  left: 'logo-area' | 'navigation-breadcrumbs';
  center: 'action-controls' | 'search-filter';
  right: 'user-controls' | 'view-options';
}

export interface AudioIndicator {
  level: number;
  type: 'mic' | 'system';
}

export interface ViewOptions {
  layout: 'grid' | 'cascade';
  opacity: number;
  alwaysOnTop: boolean;
  showCategories: boolean;
  showInstructions: boolean;
}

export interface SessionInfo {
  startTime: number;
  duration: number;
  isRecording: boolean;
  deviceInfo: {
    mic: { id: number; name: string } | null;
    system: { id: number; name: string } | null;
  };
}