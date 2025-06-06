import pino from "pino";

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === "development";

// Configure Pino based on environment
const loggerConfig = {
  level: isDevelopment ? "debug" : "info",
  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss.l",
        ignore: "pid,hostname",
        levelFirst: true,
        crlf: true, // For Windows compatibility
        singleLine: false, // Ensure multi-line output for objects
        hideObject: false, // Make sure objects are shown
        colorizeObjects: true, // Colorize objects
        depth: 10, // Increase depth to show more nested object details
        appendNewline: true, // Ensure proper line separation
      },
    },
  }),
  // In production, use structured JSON logging
  ...(!isDevelopment && {
    formatters: {
      level: (label: string) => {
        return { level: label };
      },
    },
  }),
};

// Create the main logger instance
export const logger = pino(loggerConfig);

// Log the current environment mode
logger.info(`Application starting in ${isDevelopment ? "development" : "production"} mode`);

// IMPORTANT: Pino logging parameter order
// ✅ CORRECT: logger.info({ object }, 'message')
// ❌ WRONG:   logger.info('message', { object })
// The object must come FIRST, then the message

// Create child loggers for different parts of the application
export const mainLogger = logger.child({ module: "main" });
export const rendererLogger = logger.child({ module: "renderer" });
export const audioLogger = logger.child({ module: "audio" });
export const geminiLogger = logger.child({ module: "gemini" });
export const exportLogger = logger.child({ module: "export" });
export const storageLogger = logger.child({ module: "storage" });
export const uiLogger = logger.child({ module: "ui" });

// Helper function to create contextual loggers
export const createLogger = (context: string) => {
  return logger.child({ context });
};

// Export default logger
export default logger;
