import "@testing-library/jest-dom";
import { afterEach, expect, vi } from "vitest";

// Mock Electron APIs for renderer process tests
const mockElectron = {
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  webFrame: {
    setZoomFactor: vi.fn(),
    setZoomLevel: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
  app: {
    getVersion: vi.fn(() => "1.0.0"),
    getName: vi.fn(() => "clueless"),
  },
};

// Mock the electron module
vi.mock("electron", () => mockElectron);

// Mock PouchDB for tests
vi.mock("pouchdb", () => {
  return {
    default: vi.fn(() => ({
      info: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
      allDocs: vi.fn(),
      find: vi.fn(),
      remove: vi.fn(),
      changes: vi.fn(),
      close: vi.fn(),
      destroy: vi.fn(),
    })),
  };
});

// Mock node modules that might cause issues in browser environment
vi.mock("fs", () => ({}));
vi.mock("path", () => ({
  join: vi.fn((...args) => args.join("/")),
  resolve: vi.fn((...args) => args.join("/")),
  dirname: vi.fn(),
  basename: vi.fn(),
  extname: vi.fn(),
}));

// Mock environment variables
process.env.NODE_ENV = "test";

// Global test utilities
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: "0px",
  thresholds: [0],
  takeRecords: vi.fn(),
})) as unknown as {
  new (
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ): IntersectionObserver;
  prototype: IntersectionObserver;
};

// Extend expect with custom matchers
expect.extend({
  // Add any custom matchers here if needed
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});
