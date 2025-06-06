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
export function debounce<T extends (...args: unknown[]) => unknown>(
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
export function throttle<T extends (...args: unknown[]) => unknown>(
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
