import { useEffect } from "react";
import type { RefObject } from "react";

function moveSelectedDate(
  options: Array<{ date: string }>,
  selectedDate: string,
  delta: number,
  onSelectDate: (date: string) => void,
) {
  const currentIndex = options.findIndex((option) => option.date === selectedDate);
  const fallbackIndex = 0;
  const nextIndex = Math.max(
    0,
    Math.min(options.length - 1, (currentIndex === -1 ? fallbackIndex : currentIndex) + delta),
  );
  const nextDate = options[nextIndex]?.date;

  if (nextDate) {
    onSelectDate(nextDate);
  }
}

export function useJournalDayNavigation({
  dayOptions,
  selectedDate,
  onSelectDate,
  listRef,
}: {
  dayOptions: Array<{ date: string }>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  listRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement) {
        const isTypingTarget =
          event.target.tagName === "INPUT" ||
          event.target.tagName === "TEXTAREA" ||
          event.target.isContentEditable;

        if (isTypingTarget && event.key !== "Escape") {
          return;
        }
      }

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        moveSelectedDate(dayOptions, selectedDate, 1, onSelectDate);
        return;
      }

      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        moveSelectedDate(dayOptions, selectedDate, -1, onSelectDate);
        return;
      }

      if (event.key === "Enter" && document.activeElement === listRef.current) {
        event.preventDefault();
        onSelectDate(selectedDate);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dayOptions, listRef, onSelectDate, selectedDate]);
}
