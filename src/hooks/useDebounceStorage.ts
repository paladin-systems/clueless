import { useCallback, useEffect, useRef } from "react";
import { storageLogger } from "../utils/logger";

interface Options {
  key: string;
  delay?: number;
}

export function useDebounceStorage<T>({ key, delay = 1000 }: Options) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load data from storage
  const loadFromStorage = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      storageLogger.error({ key, error }, "Error loading from storage");
      return null;
    }
  }, [key]);

  // Save data to storage with debounce
  const saveToStorage = useCallback(
    (data: T) => {
      // Clear any existing timeout to prevent multiple saves
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        try {
          const serialized = JSON.stringify(data);
          // Only update if the data has actually changed
          const existing = localStorage.getItem(key);
          if (existing !== serialized) {
            localStorage.setItem(key, serialized);
            storageLogger.debug({ key }, "Data saved to storage");
          }
        } catch (error) {
          storageLogger.error({ key, error }, "Error saving to storage");
        } finally {
          // Clear the timeout reference after completion
          timeoutRef.current = null;
        }
      }, delay);
    },
    [key, delay],
  );

  // Save data to storage immediately without debounce
  const saveToStorageImmediate = useCallback(
    (data: T) => {
      // Cancel any pending debounced save since we're doing immediate save
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      try {
        const serialized = JSON.stringify(data);
        // Only update if the data has actually changed
        const existing = localStorage.getItem(key);
        if (existing !== serialized) {
          localStorage.setItem(key, serialized);
          storageLogger.debug({ key }, "Data saved to storage immediately");
        }
      } catch (error) {
        storageLogger.error({ key, error }, "Error saving to storage immediately");
      }
    },
    [key],
  );

  // Flush any pending saves immediately
  const flushPendingSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [key]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    loadFromStorage,
    saveToStorage,
    saveToStorageImmediate,
    flushPendingSave,
  };
}

// Optional: Add migration support for handling storage version changes
export function migrateStorage(
  key: string,
  version: number,
  migrations: Record<number, (data: unknown) => unknown>,
) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return;

    const data = JSON.parse(stored);
    const currentVersion = data._version || 0;

    if (currentVersion < version) {
      // Apply migrations sequentially
      let migratedData = { ...data };
      for (let v = currentVersion + 1; v <= version; v++) {
        if (migrations[v]) {
          migratedData = migrations[v](migratedData);
        }
      }

      // Update version and save
      migratedData._version = version;
      localStorage.setItem(key, JSON.stringify(migratedData));
    }
  } catch (error) {
    storageLogger.error({ key, error }, "Error migrating storage");
  }
}
