// IPC-based database service for renderer process
import type { PostItNote } from "../types/ui";
import { storageLogger } from "../utils/logger";

// Type for IPC response
interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export class IPCDatabaseService {
  private static instance: IPCDatabaseService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): IPCDatabaseService {
    if (!IPCDatabaseService.instance) {
      IPCDatabaseService.instance = new IPCDatabaseService();
    }
    return IPCDatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      storageLogger.info("Initializing IPC database service...");

      // Initialize database via IPC
      const response = (await window.electron.invoke("db:init")) as IPCResponse;
      if (!response.success) {
        throw new Error(response.error || "Database initialization failed");
      }

      this.isInitialized = true;
      storageLogger.info("IPC database service initialized successfully");
    } catch (error) {
      storageLogger.error({ error }, "Failed to initialize IPC database service");
      throw error;
    }
  }

  async createNote(note: PostItNote): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = (await window.electron.invoke("db:createNote", note)) as IPCResponse;
      if (!response.success) {
        throw new Error(response.error || "Note creation failed");
      }
      storageLogger.debug({ noteId: note.id }, "Note created successfully");
    } catch (error) {
      storageLogger.error({ noteId: note.id, error }, "Failed to create note");
      throw error;
    }
  }

  async getNote(id: string): Promise<PostItNote | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = (await window.electron.invoke(
        "db:getNote",
        id,
      )) as IPCResponse<PostItNote | null>;
      if (!response.success) {
        throw new Error(response.error || "Note retrieval failed");
      }
      return response.data || null;
    } catch (error) {
      storageLogger.error({ noteId: id, error }, "Failed to get note");
      throw error;
    }
  }

  async updateNote(id: string, updates: Partial<PostItNote>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = (await window.electron.invoke("db:updateNote", id, updates)) as IPCResponse;
      if (!response.success) {
        throw new Error(response.error || "Note update failed");
      }
      storageLogger.debug({ noteId: id }, "Note updated successfully");
    } catch (error) {
      storageLogger.error({ noteId: id, error }, "Failed to update note");
      throw error;
    }
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = (await window.electron.invoke("db:deleteNote", id)) as IPCResponse;
      if (!response.success) {
        throw new Error(response.error || "Note deletion failed");
      }
      storageLogger.debug({ noteId: id }, "Note deleted successfully");
    } catch (error) {
      storageLogger.error({ noteId: id, error }, "Failed to delete note");
      throw error;
    }
  }

  async getAllNotes(): Promise<PostItNote[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = (await window.electron.invoke("db:getAllNotes")) as IPCResponse<
        PostItNote[]
      >;
      if (!response.success) {
        throw new Error(response.error || "Get all notes failed");
      }
      storageLogger.debug(
        { count: response.data?.length || 0 },
        "Retrieved all notes successfully",
      );
      return response.data || [];
    } catch (error) {
      storageLogger.error({ error }, "Failed to get all notes");
      throw error;
    }
  }

  async deleteAllNotes(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = (await window.electron.invoke("db:deleteAllNotes")) as IPCResponse;
      if (!response.success) {
        throw new Error(response.error || "Delete all notes failed");
      }
      storageLogger.info("All notes deleted successfully");
    } catch (error) {
      storageLogger.error({ error }, "Failed to delete all notes");
      throw error;
    }
  }

  async getNotesByCategory(category: "answer" | "advice" | "follow-up"): Promise<PostItNote[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = (await window.electron.invoke(
        "db:getNotesByCategory",
        category,
      )) as IPCResponse<PostItNote[]>;
      if (!response.success) {
        throw new Error(response.error || "Get notes by category failed");
      }
      storageLogger.debug(
        { category, count: response.data?.length || 0 },
        "Retrieved notes by category successfully",
      );
      return response.data || [];
    } catch (error) {
      storageLogger.error({ category, error }, "Failed to get notes by category");
      throw error;
    }
  }

  async getRecentNotes(since: number): Promise<PostItNote[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = (await window.electron.invoke("db:getRecentNotes", since)) as IPCResponse<
        PostItNote[]
      >;
      if (!response.success) {
        throw new Error(response.error || "Get recent notes failed");
      }
      storageLogger.debug(
        { since, count: response.data?.length || 0 },
        "Retrieved recent notes successfully",
      );
      return response.data || [];
    } catch (error) {
      storageLogger.error({ since, error }, "Failed to get recent notes");
      throw error;
    }
  }

  async searchNotes(searchText: string, limit?: number): Promise<PostItNote[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = (await window.electron.invoke(
        "db:searchNotes",
        searchText,
        limit,
      )) as IPCResponse<PostItNote[]>;
      if (!response.success) {
        throw new Error(response.error || "Search notes failed");
      }
      storageLogger.debug(
        { searchText, count: response.data?.length || 0 },
        "Search completed successfully",
      );
      return response.data || [];
    } catch (error) {
      storageLogger.error({ searchText, error }, "Failed to search notes");
      throw error;
    }
  }

  async getNotesInRegion(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
  ): Promise<PostItNote[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = (await window.electron.invoke(
        "db:getNotesInRegion",
        minX,
        maxX,
        minY,
        maxY,
      )) as IPCResponse<PostItNote[]>;
      if (!response.success) {
        throw new Error(response.error || "Get notes in region failed");
      }
      storageLogger.debug(
        { minX, maxX, minY, maxY, count: response.data?.length || 0 },
        "Retrieved notes in region successfully",
      );
      return response.data || [];
    } catch (error) {
      storageLogger.error({ minX, maxX, minY, maxY, error }, "Failed to get notes in region");
      throw error;
    }
  }

  async compact(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = (await window.electron.invoke("db:compact")) as IPCResponse;
      if (!response.success) {
        throw new Error(response.error || "Database compaction failed");
      }
      storageLogger.info("Database compaction completed successfully");
    } catch (error) {
      storageLogger.error({ error }, "Failed to compact database");
      throw error;
    }
  }
}

// Export singleton instance
export const ipcDatabaseService = IPCDatabaseService.getInstance();
