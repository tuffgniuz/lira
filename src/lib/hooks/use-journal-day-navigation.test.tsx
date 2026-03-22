import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useJournalDayNavigation } from "./use-journal-day-navigation";

function JournalDayNavigationHarness({
  selectedDate = "2026-03-17",
  onSelectDate = vi.fn(),
}: {
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useJournalDayNavigation({
    dayOptions: [
      { date: "2026-03-17" },
      { date: "2026-03-16" },
      { date: "2026-03-15" },
    ],
    selectedDate,
    onSelectDate,
    listRef,
  });

  return (
    <div>
      <input aria-label="typing target" />
      <div ref={listRef} tabIndex={0} data-testid="day-list" />
    </div>
  );
}

describe("useJournalDayNavigation", () => {
  it("moves the selected date with j and k", () => {
    const onSelectDate = vi.fn();

    render(<JournalDayNavigationHarness onSelectDate={onSelectDate} />);

    fireEvent.keyDown(window, { key: "j" });
    fireEvent.keyDown(window, { key: "k" });

    expect(onSelectDate).toHaveBeenNthCalledWith(1, "2026-03-16");
    expect(onSelectDate).toHaveBeenNthCalledWith(2, "2026-03-17");
  });

  it("ignores keyboard navigation while typing in an input", () => {
    const onSelectDate = vi.fn();

    render(<JournalDayNavigationHarness onSelectDate={onSelectDate} />);

    fireEvent.keyDown(screen.getByLabelText("typing target"), { key: "j" });

    expect(onSelectDate).not.toHaveBeenCalled();
  });
});
