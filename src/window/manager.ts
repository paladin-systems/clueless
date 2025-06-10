import path from "node:path";
import { BrowserWindow, app } from "electron";
import { initializePouchDB } from "../database";
import { removeDatabaseIPC, setupDatabaseIPC } from "../database/ipcHandlers";
import { mainLogger } from "../utils/logger";

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  /**
   * Create the main browser window
   */
  public async createWindow(): Promise<BrowserWindow | null> {
    // Initialize PouchDB for the main process
    try {
      await initializePouchDB();
      mainLogger.info("PouchDB initialized successfully in main process");

      // Setup database IPC handlers
      setupDatabaseIPC();
      mainLogger.info("Database IPC handlers setup completed");
    } catch (error) {
      mainLogger.error({ error }, "Failed to initialize PouchDB in main process");
      // Continue anyway - the app may still function with limited database capabilities
    }

    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      title: "", // Set empty title to prevent any title bar display
      hasShadow: false,
      resizable: false, // Prevent window from being resized
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
      frame: true, // Enable frame to hide Title Bar
      transparent: true, // Enable window transparency
      autoHideMenuBar: true, // Hide the menu bar
      fullscreen: true, // Set to true for fullscreen
      alwaysOnTop: true, // Keep window always on top for overlay behavior
      skipTaskbar: true, // Hide from taskbar for true overlay experience
    });

    // Load the index.html of the app
    const isDev = !app.isPackaged;
    if (isDev) {
      // In development, use the Vite dev server URL
      this.mainWindow.loadURL("http://localhost:5173"); // Vite dev server URL
      // Open the DevTools automatically in development
      this.mainWindow.webContents.openDevTools();
    } else {
      // In production, use the built index.html file
      mainLogger.info(
        { path: path.join(__dirname, "../dist/index.html") },
        "Loading production build",
      );
      this.mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }

    // Setup window event handlers
    this.setupWindowEvents();

    return this.mainWindow;
  }

  /**
   * Get the current main window
   */
  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Setup window event handlers
   */
  private setupWindowEvents(): void {
    if (!this.mainWindow) return;

    // Clean up on window close
    this.mainWindow.on("closed", async () => {
      this.cleanup();
      this.mainWindow = null;
    });
  }

  /**
   * Cleanup resources when window closes
   */
  private cleanup(): void {
    removeDatabaseIPC();
  }
}
