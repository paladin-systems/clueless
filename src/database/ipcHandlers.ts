import { ipcMain } from "electron";
import type { PostItNote } from "../types/ui";
import { storageLogger } from "../utils/logger";
import { PouchDBService } from "./PouchDBService";

let pouchDBService: PouchDBService | null = null;

export function setupDatabaseIPC(): void {
  // Initialize services
  pouchDBService = PouchDBService.getInstance();

  // Database initialization
  ipcMain.handle("db:init", async () => {
    try {
      await pouchDBService!.initialize();
      storageLogger.info("Database initialized via IPC");
      return { success: true };
    } catch (error) {
      storageLogger.error({ error }, "Database initialization failed via IPC");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  // CRUD operations
  ipcMain.handle("db:createNote", async (_, note: PostItNote) => {
    try {
      await pouchDBService!.createNote(note);
      storageLogger.debug({ noteId: note.id }, "Note created via IPC");
      return { success: true };
    } catch (error) {
      storageLogger.error({ noteId: note.id, error }, "Note creation failed via IPC");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle("db:getNote", async (_, id: string) => {
    try {
      const note = await pouchDBService!.getNote(id);
      return { success: true, data: note };
    } catch (error) {
      storageLogger.error({ noteId: id, error }, "Note retrieval failed via IPC");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle("db:updateNote", async (_, id: string, updates: Partial<PostItNote>) => {
    try {
      await pouchDBService!.updateNote(id, updates);
      storageLogger.debug({ noteId: id }, "Note updated via IPC");
      return { success: true };
    } catch (error) {
      storageLogger.error({ noteId: id, error }, "Note update failed via IPC");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle("db:deleteNote", async (_, id: string) => {
    try {
      await pouchDBService!.deleteNote(id);
      storageLogger.debug({ noteId: id }, "Note deleted via IPC");
      return { success: true };
    } catch (error) {
      storageLogger.error({ noteId: id, error }, "Note deletion failed via IPC");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle("db:getAllNotes", async () => {
    try {
      const notes = await pouchDBService!.getAllNotes();
      return { success: true, data: notes };
    } catch (error) {
      storageLogger.error({ error }, "Get all notes failed via IPC");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle("db:deleteAllNotes", async () => {
    try {
      await pouchDBService!.deleteAllNotes();
      storageLogger.info("All notes deleted via IPC");
      return { success: true };
    } catch (error) {
      storageLogger.error({ error }, "Delete all notes failed via IPC");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle(
    "db:getNotesByCategory",
    async (_, category: "answer" | "advice" | "follow-up") => {
      try {
        const notes = await pouchDBService!.getNotesByCategory(category);
        return { success: true, data: notes };
      } catch (error) {
        storageLogger.error({ category, error }, "Get notes by category failed via IPC");
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  );

  ipcMain.handle("db:getRecentNotes", async (_, since: number) => {
    try {
      const notes = await pouchDBService!.getRecentNotes(since);
      return { success: true, data: notes };
    } catch (error) {
      storageLogger.error({ since, error }, "Get recent notes failed via IPC");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle("db:searchNotes", async (_, searchText: string, limit?: number) => {
    try {
      const notes = await pouchDBService!.searchNotes(searchText, limit);
      return { success: true, data: notes };
    } catch (error) {
      storageLogger.error({ searchText, error }, "Search notes failed via IPC");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle(
    "db:getNotesInRegion",
    async (_, minX: number, maxX: number, minY: number, maxY: number) => {
      try {
        const notes = await pouchDBService!.getNotesInRegion(minX, maxX, minY, maxY);
        return { success: true, data: notes };
      } catch (error) {
        storageLogger.error(
          { minX, maxX, minY, maxY, error },
          "Get notes in region failed via IPC",
        );
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  );

  // Database management - using PouchDB's built-in methods
  ipcMain.handle("db:compact", async () => {
    try {
      // Access the internal database for compaction
      const db = (pouchDBService as unknown as { db?: { compact(): Promise<void> } }).db;
      if (db) {
        await db.compact();
        storageLogger.info("Database compaction completed via IPC");
        return { success: true };
      }
      throw new Error("Database not initialized");
    } catch (error) {
      storageLogger.error({ error }, "Database compaction failed via IPC");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  storageLogger.info("Database IPC handlers setup completed");
}

export function removeDatabaseIPC(): void {
  // Remove all database-related IPC handlers
  const handlers = [
    "db:init",
    "db:migrate",
    "db:createNote",
    "db:getNote",
    "db:updateNote",
    "db:deleteNote",
    "db:getAllNotes",
    "db:deleteAllNotes",
    "db:getNotesByCategory",
    "db:getRecentNotes",
    "db:searchNotes",
    "db:getNotesInRegion",
    "db:compact",
  ];

  handlers.forEach((handler) => {
    ipcMain.removeHandler(handler);
  });

  storageLogger.info("Database IPC handlers removed");
}
