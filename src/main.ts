import path from "node:path";
// Load environment variables BEFORE any other imports
import dotenv from "dotenv";

dotenv.config({
  path: path.join(process.cwd(), ".env"),
});

import { app } from "electron";
import { IPCHandlers } from "./ipc/handlers";
import { mainLogger } from "./utils/logger";
import { WindowManager } from "./window/manager";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

let windowManager: WindowManager;
let ipcHandlers: IPCHandlers;

/**
 * Initialize the application
 */
async function initializeApp(): Promise<void> {
  try {
    // Create window manager and main window
    windowManager = new WindowManager();
    const mainWindow = await windowManager.createWindow();

    if (!mainWindow) {
      throw new Error("Failed to create main window");
    }

    // Setup IPC handlers
    ipcHandlers = new IPCHandlers(mainWindow);

    mainLogger.info("Application initialized successfully");
  } catch (error) {
    mainLogger.error({ error }, "Failed to initialize application");
    throw error;
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", () => {
  initializeApp().catch((error) => {
    mainLogger.error({ error }, "Failed to initialize app");
    app.quit();
  });
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (windowManager?.getMainWindow() === null) {
    initializeApp().catch((error) => {
      mainLogger.error({ error }, "Failed to re-initialize app");
    });
  }
});

// Cleanup on app quit
app.on("before-quit", () => {
  if (ipcHandlers) {
    ipcHandlers.cleanup();
  }
});
