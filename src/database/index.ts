import path from "node:path";
// Database initialization and configuration
import { app } from "electron";
import PouchDB from "pouchdb";
import LevelDBAdapter from "pouchdb-adapter-leveldb";
import PouchDBFind from "pouchdb-find";
import PouchDBUpsert from "pouchdb-upsert";
import { storageLogger } from "../utils/logger";

let isInitialized = false;

export async function initializePouchDB(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    storageLogger.info("Initializing PouchDB for Electron with LevelDB...");

    // Configure PouchDB with required plugins (only once)
    PouchDB.plugin(PouchDBFind);
    PouchDB.plugin(PouchDBUpsert);
    PouchDB.plugin(LevelDBAdapter);

    // Set default adapter to leveldb for Electron
    PouchDB.defaults({
      adapter: "leveldb",
    });

    // Ensure user data directory exists
    const userDataPath = app.getPath("userData");
    const dbPath = path.join(userDataPath, "pouchdb");

    storageLogger.info({ dbPath }, "PouchDB database path configured for LevelDB");

    isInitialized = true;
    storageLogger.info("PouchDB initialization completed successfully");
  } catch (error) {
    storageLogger.error({ error }, "Failed to initialize PouchDB");
    throw error;
  }
}

export function isPouchDBInitialized(): boolean {
  return isInitialized;
}

// Export the configured PouchDB for use in services
export { default as PouchDB } from "pouchdb";
export { PouchDBService } from "./PouchDBService";
