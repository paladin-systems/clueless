import PouchDB from "pouchdb";
import type { PostItNote } from "../types/ui";
import { storageLogger } from "../utils/logger";
import { INDEXES, QUERIES, pouchDBConfig } from "./PouchDBConfig";
import {
  type PostItNoteDocument,
  transformFromDocument,
  transformToDocument,
  validatePostItNoteDocument,
} from "./schemas/PostItNote";

export class PouchDBService {
  private static instance: PouchDBService;
  private db: PouchDB.Database<PostItNoteDocument> | null = null;
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): PouchDBService {
    if (!PouchDBService.instance) {
      PouchDBService.instance = new PouchDBService();
    }
    return PouchDBService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      storageLogger.info("Initializing PouchDB...");

      // Create database instance
      this.db = new PouchDB<PostItNoteDocument>(pouchDBConfig.name, {
        adapter: pouchDBConfig.adapter,
        auto_compaction: pouchDBConfig.auto_compaction,
        revs_limit: pouchDBConfig.revs_limit,
      });

      // Create indexes for optimized queries
      await this.createIndexes();

      // Set up database event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      storageLogger.info("PouchDB initialized successfully");
    } catch (error) {
      storageLogger.error({ error }, "Failed to initialize PouchDB");
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      storageLogger.info("Creating database indexes...");

      for (const indexDef of INDEXES) {
        try {
          await this.db.createIndex(indexDef);
          storageLogger.debug({ indexName: indexDef.name }, "Index created");
        } catch (error) {
          // Index might already exist, log warning but continue
          storageLogger.warn({ indexName: indexDef.name, error }, "Index creation skipped");
        }
      }

      storageLogger.info("Database indexes created successfully");
    } catch (error) {
      storageLogger.error({ error }, "Failed to create indexes");
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.db) return;

    this.db.on("error", (error: Error) => {
      storageLogger.error({ error }, "PouchDB error");
    });

    this.db.on("destroyed", () => {
      storageLogger.info("PouchDB database destroyed");
      this.isInitialized = false;
    });
  }

  // CRUD Operations

  async createNote(note: PostItNote): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const doc = transformToDocument(note);
      await this.db.put(doc);
      storageLogger.debug({ noteId: note.id }, "Note created");
    } catch (error) {
      storageLogger.error({ noteId: note.id, error }, "Failed to create note");
      throw error;
    }
  }

  async getNote(id: string): Promise<PostItNote | null> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const result = await this.db.find(QUERIES.getNoteById(id));

      if (result.docs.length === 0) {
        return null;
      }

      const doc = result.docs[0];
      if (!validatePostItNoteDocument(doc)) {
        storageLogger.warn({ noteId: id }, "Invalid document found");
        return null;
      }

      return transformFromDocument(doc);
    } catch (error) {
      storageLogger.error({ noteId: id, error }, "Failed to get note");
      throw error;
    }
  }

  async getAllNotes(): Promise<PostItNote[]> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const result = await this.db.find(QUERIES.getAllNotes);

      const validNotes = result.docs.filter(validatePostItNoteDocument).map(transformFromDocument);

      storageLogger.debug({ count: validNotes.length }, "Retrieved all notes");
      return validNotes;
    } catch (error) {
      storageLogger.error({ error }, "Failed to get all notes");
      throw error;
    }
  }

  async updateNote(id: string, updates: Partial<PostItNote>): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const result = await this.db.find(QUERIES.getNoteById(id));

      if (result.docs.length === 0) {
        throw new Error(`Note with id ${id} not found`);
      }

      const existingDoc = result.docs[0];
      const updatedNote = {
        ...transformFromDocument(existingDoc),
        ...updates,
        lastModified: Date.now(),
      };

      const updatedDoc = {
        ...transformToDocument(updatedNote),
        _rev: existingDoc._rev,
        updatedAt: new Date().toISOString(),
      };

      await this.db.put(updatedDoc);
      storageLogger.debug({ noteId: id }, "Note updated");
    } catch (error) {
      storageLogger.error({ noteId: id, error }, "Failed to update note");
      throw error;
    }
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const result = await this.db.find(QUERIES.getNoteById(id));

      if (result.docs.length === 0) {
        throw new Error(`Note with id ${id} not found`);
      }

      const doc = result.docs[0];
      await this.db.remove(doc);
      storageLogger.debug({ noteId: id }, "Note deleted");
    } catch (error) {
      storageLogger.error({ noteId: id, error }, "Failed to delete note");
      throw error;
    }
  }

  async deleteAllNotes(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const result = await this.db.find(QUERIES.getAllNotes);

      const deletePromises = result.docs.map((doc: PostItNoteDocument & { _rev: string }) =>
        this.db!.remove(doc),
      );
      await Promise.all(deletePromises);

      storageLogger.info({ count: result.docs.length }, "All notes deleted");
    } catch (error) {
      storageLogger.error({ error }, "Failed to delete all notes");
      throw error;
    }
  }

  // Advanced Query Operations

  async getNotesByCategory(category: PostItNote["category"]): Promise<PostItNote[]> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const result = await this.db.find(QUERIES.getNotesByCategory(category));

      const validNotes = result.docs.filter(validatePostItNoteDocument).map(transformFromDocument);

      storageLogger.debug({ category, count: validNotes.length }, "Retrieved notes by category");
      return validNotes;
    } catch (error) {
      storageLogger.error({ category, error }, "Failed to get notes by category");
      throw error;
    }
  }

  async getRecentNotes(since: number): Promise<PostItNote[]> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const result = await this.db.find(QUERIES.getRecentNotes(since));

      const validNotes = result.docs.filter(validatePostItNoteDocument).map(transformFromDocument);

      storageLogger.debug({ since, count: validNotes.length }, "Retrieved recent notes");
      return validNotes;
    } catch (error) {
      storageLogger.error({ since, error }, "Failed to get recent notes");
      throw error;
    }
  }

  async searchNotes(searchText: string, limit = 50): Promise<PostItNote[]> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const query = {
        ...QUERIES.searchNotes(searchText),
        limit,
      };

      const result = await this.db.find(query);

      const validNotes = result.docs.filter(validatePostItNoteDocument).map(transformFromDocument);

      storageLogger.debug({ searchText, count: validNotes.length }, "Search completed");
      return validNotes;
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
    if (!this.db) throw new Error("Database not initialized");

    try {
      const result = await this.db.find(QUERIES.getNotesInRegion(minX, maxX, minY, maxY));

      const validNotes = result.docs.filter(validatePostItNoteDocument).map(transformFromDocument);

      storageLogger.debug(
        { region: { minX, maxX, minY, maxY }, count: validNotes.length },
        "Retrieved notes in region",
      );
      return validNotes;
    } catch (error) {
      storageLogger.error(
        { region: { minX, maxX, minY, maxY }, error },
        "Failed to get notes in region",
      );
      throw error;
    }
  }

  // Utility Methods

  async getStatistics(): Promise<{
    totalNotes: number;
    categories: Record<string, number>;
    avgNoteSize: number;
    dbSize: number;
  }> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const allNotes = await this.getAllNotes();
      const categories: Record<string, number> = {};
      let totalContentLength = 0;

      for (const note of allNotes) {
        categories[note.category] = (categories[note.category] || 0) + 1;
        totalContentLength += note.content.length;
      }

      const info = await this.db.info();

      return {
        totalNotes: allNotes.length,
        categories,
        avgNoteSize: allNotes.length > 0 ? totalContentLength / allNotes.length : 0,
        dbSize: (info as { disk_size?: number }).disk_size || 0,
      };
    } catch (error) {
      storageLogger.error({ error }, "Failed to get statistics");
      throw error;
    }
  }

  async compact(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      storageLogger.info("Starting database compaction...");
      await this.db.compact();
      storageLogger.info("Database compaction completed");
    } catch (error) {
      storageLogger.error({ error }, "Failed to compact database");
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
      this.initPromise = null;
      storageLogger.info("PouchDB connection closed");
    } catch (error) {
      storageLogger.error({ error }, "Failed to close PouchDB connection");
      throw error;
    }
  }
}
