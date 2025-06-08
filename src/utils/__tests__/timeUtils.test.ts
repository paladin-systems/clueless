import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDuration, formatTimestamp, formatTooltipTime, getElapsedTime } from "../timeUtils";

describe("timeUtils", () => {
  // Mock Date.now for consistent testing
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("formatDuration", () => {
    it("formats duration less than a minute", () => {
      expect(formatDuration(30000)).toBe("00:30"); // 30 seconds
      expect(formatDuration(45000)).toBe("00:45"); // 45 seconds
    });

    it("formats duration in minutes", () => {
      expect(formatDuration(90000)).toBe("01:30"); // 1 minute 30 seconds
      expect(formatDuration(300000)).toBe("05:00"); // 5 minutes
    });

    it("formats duration with hours", () => {
      expect(formatDuration(3600000)).toBe("01:00:00"); // 1 hour
      expect(formatDuration(3661000)).toBe("01:01:01"); // 1 hour 1 minute 1 second
      expect(formatDuration(7265000)).toBe("02:01:05"); // 2 hours 1 minute 5 seconds
    });

    it("handles zero duration", () => {
      expect(formatDuration(0)).toBe("00:00");
    });

    it("handles very large durations", () => {
      expect(formatDuration(86400000)).toBe("24:00:00"); // 24 hours
      expect(formatDuration(90061000)).toBe("25:01:01"); // 25 hours 1 minute 1 second
    });
  });

  describe("formatTimestamp", () => {
    it("formats timestamp to locale time string", () => {
      const timestamp = new Date("2024-01-15T14:30:45").getTime();
      const result = formatTimestamp(timestamp);

      // The exact format may vary by locale, but should contain time components
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it("handles different timestamps", () => {
      const morning = new Date("2024-01-15T09:15:30").getTime();
      const evening = new Date("2024-01-15T21:45:15").getTime();

      const morningResult = formatTimestamp(morning);
      const eveningResult = formatTimestamp(evening);

      expect(morningResult).toMatch(/\d{1,2}:\d{2}:\d{2}/);
      expect(eveningResult).toMatch(/\d{1,2}:\d{2}:\d{2}/);
      expect(morningResult).not.toBe(eveningResult);
    });
  });

  describe("getElapsedTime", () => {
    it("returns seconds ago for recent timestamps", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(getElapsedTime(now - 30000)).toBe("30s ago");
      expect(getElapsedTime(now - 45000)).toBe("45s ago");
      expect(getElapsedTime(now - 1000)).toBe("1s ago");
    });

    it("returns minutes ago for timestamps within an hour", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(getElapsedTime(now - 60000)).toBe("1m ago");
      expect(getElapsedTime(now - 300000)).toBe("5m ago");
      expect(getElapsedTime(now - 1800000)).toBe("30m ago");
    });

    it("returns hours ago for timestamps within a day", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(getElapsedTime(now - 3600000)).toBe("1h ago");
      expect(getElapsedTime(now - 7200000)).toBe("2h ago");
      expect(getElapsedTime(now - 43200000)).toBe("12h ago");
    });

    it("returns days ago for older timestamps", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(getElapsedTime(now - 86400000)).toBe("1d ago");
      expect(getElapsedTime(now - 172800000)).toBe("2d ago");
      expect(getElapsedTime(now - 604800000)).toBe("7d ago");
    });

    it("handles edge cases", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Just under thresholds
      expect(getElapsedTime(now - 59000)).toBe("59s ago");
      expect(getElapsedTime(now - 3599000)).toBe("59m ago");
      expect(getElapsedTime(now - 86399000)).toBe("23h ago");
    });
  });

  describe("formatTooltipTime", () => {
    it("formats timestamp for tooltip display", () => {
      const timestamp = new Date("2024-01-15T14:30:45").getTime();
      const result = formatTooltipTime(timestamp);

      // Should contain time components (locale-independent)
      expect(result).toMatch(/\d{1,2}:\d{2}/);
      expect(result).toContain("15"); // day
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles different months and times", () => {
      const january = new Date("2024-01-15T09:30:00").getTime();
      const december = new Date("2024-12-25T15:45:30").getTime();

      const januaryResult = formatTooltipTime(january);
      const decemberResult = formatTooltipTime(december);

      // Results should be different for different months
      expect(januaryResult).not.toBe(decemberResult);
      expect(januaryResult).toContain("15");
      expect(decemberResult).toContain("25");
    });

    it("handles same day different times", () => {
      const morning = new Date("2024-06-15T09:30:00").getTime();
      const evening = new Date("2024-06-15T21:45:00").getTime();

      const morningResult = formatTooltipTime(morning);
      const eveningResult = formatTooltipTime(evening);

      // Both should have same date but different times
      expect(morningResult).toContain("15"); // day
      expect(eveningResult).toContain("15"); // day
      expect(morningResult).not.toBe(eveningResult);
      expect(morningResult).toMatch(/09:30|9:30/);
      expect(eveningResult).toMatch(/21:45|9:45/);
    });
  });
});
