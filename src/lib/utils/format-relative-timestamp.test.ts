import { describe, expect, it, vi } from "vitest";
import { formatRelativeTimestamp } from "./format-relative-timestamp";

describe("formatRelativeTimestamp", () => {
  it("uses a stable just-now label for sub-minute timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T12:00:00.000Z"));

    expect(formatRelativeTimestamp("2026-03-20T11:59:30.000Z")).toBe("just now");
    expect(formatRelativeTimestamp("2026-03-20T12:00:00.000Z")).toBe("now");

    vi.useRealTimers();
  });

  it("steps through minute-level and hour-level labels instead of second-level labels", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T12:00:00.000Z"));

    expect(formatRelativeTimestamp("2026-03-20T11:58:00.000Z")).toBe("2 minutes ago");
    expect(formatRelativeTimestamp("2026-03-20T10:00:00.000Z")).toBe("2 hours ago");

    vi.useRealTimers();
  });
});
