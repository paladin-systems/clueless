import React from "react";

/**
 * Performance monitoring utilities for the application
 */

// Performance timer for measuring operations
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    console.debug(`Performance: ${this.name} took ${duration.toFixed(2)}ms`);
    return duration;
  }
}

// Debounce utility for expensive operations
// biome-ignore lint/suspicious/noExplicitAny: Generic utility function needs flexible typing
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for limiting function calls
// biome-ignore lint/suspicious/noExplicitAny: Generic utility function needs flexible typing
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Monitor component render count in development
export function useRenderCount(componentName: string): void {
  if (process.env.NODE_ENV === "development") {
    const renderCount = React.useRef(0);
    renderCount.current++;
    console.debug(`${componentName} rendered ${renderCount.current} times`);
  }
}

// Measure and log render time
export function withPerformanceLogging<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
): React.ComponentType<P> {
  return (props: P) => {
    React.useEffect(() => {
      const timer = new PerformanceTimer(`${componentName} render`);
      return () => {
        timer.end();
      };
    });

    return React.createElement(WrappedComponent, props);
  };
}

// Specialized debounced resize function for note operations
export function createDebouncedResize<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait = 150, // Default 150ms for resize operations
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  let isFirstCall = true;

  return (...args: Parameters<T>) => {
    // Clear any existing timeout
    clearTimeout(timeout);

    // For the first call, execute immediately for responsive UI
    if (isFirstCall) {
      func(...args);
      isFirstCall = false;
      // Reset the flag after the debounce period
      timeout = setTimeout(() => {
        isFirstCall = true;
      }, wait);
      return;
    }

    // For subsequent calls within the debounce period, delay execution
    timeout = setTimeout(() => {
      func(...args);
      isFirstCall = true;
    }, wait);
  };
}

// Specialized debounced function for note operations that need immediate UI feedback
// biome-ignore lint/suspicious/noExplicitAny: Generic utility function needs flexible typing
export function createDebouncedNoteUpdate<T extends (...args: any[]) => any>(
  func: T,
  wait = 150, // Default 150ms for note operations
): (...args: Parameters<T>) => void {
  return debounce(func, wait);
}

// Memory usage monitoring
export function logMemoryUsage(label: string): void {
  if ("memory" in performance) {
    const memory = (
      performance as {
        memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
      }
    ).memory;
    console.debug(`Memory Usage (${label}):`, {
      used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB`,
    });
  }
}

// Check if we should enable performance optimizations
export const shouldOptimizePerformance = (): boolean => {
  // Enable optimizations in production or when explicitly requested
  return (
    process.env.NODE_ENV === "production" ||
    localStorage.getItem("enable-performance-optimizations") === "true"
  );
};
