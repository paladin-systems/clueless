export interface PostItNoteDocument {
  _id: string;
  _rev?: string;
  type: "post-it-note";
  id: string;
  content: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  timestamp: number;
  category: "answer" | "advice" | "follow-up";
  color: string;
  lastModified: number;
  isAiModified: boolean;
  zIndex?: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// Validation helper
export function validatePostItNoteDocument(doc: unknown): doc is PostItNoteDocument {
  try {
    const obj = doc as Record<string, unknown>;
    return (
      typeof obj._id === "string" &&
      obj.type === "post-it-note" &&
      typeof obj.id === "string" &&
      typeof obj.content === "string" &&
      typeof obj.position === "object" &&
      obj.position !== null &&
      typeof (obj.position as Record<string, unknown>).x === "number" &&
      typeof (obj.position as Record<string, unknown>).y === "number" &&
      typeof obj.size === "object" &&
      obj.size !== null &&
      typeof (obj.size as Record<string, unknown>).width === "number" &&
      typeof (obj.size as Record<string, unknown>).height === "number" &&
      typeof obj.timestamp === "number" &&
      ["answer", "advice", "follow-up"].includes(obj.category as string) &&
      typeof obj.color === "string" &&
      typeof obj.lastModified === "number" &&
      typeof obj.isAiModified === "boolean" &&
      typeof obj.version === "number" &&
      typeof obj.createdAt === "string" &&
      typeof obj.updatedAt === "string"
    );
  } catch {
    return false;
  }
}

// Transform UI PostItNote to PouchDB document
export function transformToDocument(note: import("../../types/ui").PostItNote): PostItNoteDocument {
  const now = new Date().toISOString();
  return {
    _id: `note::${note.id}`,
    type: "post-it-note",
    id: note.id,
    content: note.content,
    position: note.position,
    size: note.size,
    timestamp: note.timestamp,
    category: note.category,
    color: note.color,
    lastModified: note.lastModified,
    isAiModified: note.isAiModified,
    zIndex: note.zIndex,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

// Transform PouchDB document to UI PostItNote
export function transformFromDocument(
  doc: PostItNoteDocument,
): import("../../types/ui").PostItNote {
  return {
    id: doc.id,
    content: doc.content,
    position: doc.position,
    size: doc.size,
    timestamp: doc.timestamp,
    category: doc.category,
    color: doc.color,
    lastModified: doc.lastModified,
    isAiModified: doc.isAiModified,
    zIndex: doc.zIndex,
  };
}
