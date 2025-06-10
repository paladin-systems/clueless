import path from "node:path";
import { app } from "electron";

export const DATABASE_NAME = "clueless-notes";
export const SCHEMA_VERSION = 1;

const getDatabasePath = (): string => {
  const isDev = !app.isPackaged;
  const userDataPath = app.getPath("userData");

  return path.join(userDataPath, "pouchdb", isDev ? "development" : "production", DATABASE_NAME);
};

export const getPouchDBConfig = () => ({
  name: getDatabasePath(),
  adapter: "leveldb",
  auto_compaction: true,
  revs_limit: 10, // Keep only 10 revisions to save space
});

// Index definitions for optimized queries
export const INDEXES = [
  {
    index: {
      fields: ["type"],
    },
    name: "idx_type",
    ddoc: "idx_type",
  },
  {
    index: {
      fields: ["type", "timestamp"],
    },
    name: "idx_timestamp",
    ddoc: "idx_timestamp",
  },
  {
    index: {
      fields: ["type", "category"],
    },
    name: "idx_category",
    ddoc: "idx_category",
  },
  {
    index: {
      fields: ["type", "lastModified"],
    },
    name: "idx_lastModified",
    ddoc: "idx_lastModified",
  },
  {
    index: {
      fields: ["type", "position.x", "position.y"],
    },
    name: "idx_position",
    ddoc: "idx_position",
  },
];

// Query selectors for common operations
export const QUERIES = {
  getAllNotes: {
    selector: {
      type: "post-it-note",
    },
    sort: ["type", { timestamp: "desc" as const }],
    use_index: "idx_timestamp",
  },

  getNoteById: (id: string) => ({
    selector: {
      type: "post-it-note",
      id: id,
    },
    limit: 1,
  }),

  getNotesByCategory: (category: string) => ({
    selector: {
      type: "post-it-note",
      category: category,
    },
    sort: [{ timestamp: "desc" as const }],
  }),

  getRecentNotes: (since: number) => ({
    selector: {
      type: "post-it-note",
      lastModified: { $gt: since },
    },
    sort: [{ lastModified: "desc" as const }],
  }),

  getNotesInRegion: (minX: number, maxX: number, minY: number, maxY: number) => ({
    selector: {
      type: "post-it-note",
      "position.x": { $gte: minX, $lte: maxX },
      "position.y": { $gte: minY, $lte: maxY },
    },
  }),

  searchNotes: (searchText: string) => ({
    selector: {
      type: "post-it-note",
      content: { $regex: new RegExp(searchText, "i") },
    },
  }),
};

// Database settings
export const DB_SETTINGS = {
  syncRetryDelays: [1000, 2000, 4000, 8000],
  maxSyncRetries: 3,
  compactionInterval: 300000, // 5 minutes
  indexCreationTimeout: 30000, // 30 seconds
};
