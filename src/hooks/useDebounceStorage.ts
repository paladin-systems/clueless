import { useCallback, useRef, useEffect } from 'react';
import { storageLogger } from '../utils/logger';

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
      return stored ? JSON.parse(stored) : null;    } catch (error) {
      storageLogger.error({ key, error }, 'Error loading from storage');
      return null;
    }
  }, [key]);

  // Save data to storage with debounce
  const saveToStorage = useCallback((data: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));      } catch (error) {
        storageLogger.error({ key, error }, 'Error saving to storage');
      }
    }, delay);
  }, [key, delay]);

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
    saveToStorage
  };
}

// Optional: Add migration support for handling storage version changes
export function migrateStorage(key: string, version: number, migrations: Record<number, (data: any) => any>) {
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
    }  } catch (error) {
    storageLogger.error({ key, error }, 'Error migrating storage');
  }
}