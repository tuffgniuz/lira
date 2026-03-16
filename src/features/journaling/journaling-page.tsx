import { useEffect, useMemo, useRef, useState } from "react";
import { RightRailColumn } from "../../components/right-rail-column";
import { ThreeColumnLayout } from "../../components/three-column-layout";
import type { JournalEntry, JournalEntrySummary } from "../../models/journal";
import type { Item } from "../../models/item";

type JournalingPageProps = {
  todayDate: string;
  selectedDate: string;
  entry: JournalEntry;
  entries: JournalEntrySummary[];
  items: Item[];
  onSelectDate: (date: string) => void;
  onUpdateEntry: (updates: Partial<JournalEntry>) => void;
};

export function JournalingPage({
  todayDate,
  selectedDate,
  entry,
  entries,
  items,
  onSelectDate,
  onUpdateEntry,
}: JournalingPageProps) {
  const [intentionDraft, setIntentionDraft] = useState(entry.morningIntention);
  const [reflectionDraft, setReflectionDraft] = useState(entry.reflectionEntry);
  const dayListRef = useRef<HTMLDivElement | null>(null);
  const dayOptions = useMemo(
    () => buildJournalDayOptions(todayDate, selectedDate, entries),
    [entries, selectedDate, todayDate],
  );

  useEffect(() => {
    setIntentionDraft(entry.morningIntention);
    setReflectionDraft(entry.reflectionEntry);
  }, [entry.date, entry.morningIntention, entry.reflectionEntry]);

  useEffect(() => {
    const trimmedDraft = intentionDraft.trim();
    const trimmedValue = entry.morningIntention.trim();

    if (trimmedDraft === trimmedValue) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onUpdateEntry({ morningIntention: trimmedDraft });
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [entry.morningIntention, intentionDraft, onUpdateEntry]);

  useEffect(() => {
    const trimmedDraft = reflectionDraft.trim();
    const trimmedValue = entry.reflectionEntry.trim();

    if (trimmedDraft === trimmedValue) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onUpdateEntry({ reflectionEntry: trimmedDraft });
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [entry.reflectionEntry, onUpdateEntry, reflectionDraft]);

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

      if (event.key === "Enter" && document.activeElement === dayListRef.current) {
        event.preventDefault();
        onSelectDate(selectedDate);
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dayOptions, onSelectDate, selectedDate]);

  return (
    <section className="page page--journaling" aria-label="Journaling">
      <ThreeColumnLayout
        className="journal-console"
        leftClassName="journal-nav"
        centerClassName="journal-daily"
        rightClassName="journal-context"
        leftLabel="Journal days"
        centerLabel="Journal entry"
        rightLabel="Journal context"
        left={
          <>
          <div className="journal-nav__header">
            <p className="page__eyebrow">Days</p>
          </div>
          <div className="journal-nav__list" ref={dayListRef} tabIndex={0}>
            {dayOptions.map((option) => (
              <button
                key={option.date}
                type="button"
                className={`journal-nav__day ${
                  option.date === selectedDate ? "is-active" : ""
                }`}
                onClick={() => onSelectDate(option.date)}
              >
                <span className="journal-nav__day-label">{option.label}</span>
                <span className="journal-nav__day-preview">
                  {option.preview || "No entry yet"}
                </span>
              </button>
            ))}
          </div>
          </>
        }
        center={
          <>
          <header className="journal-daily__header">
            <div className="journal-daily__heading">
              <p className="page__eyebrow">Today</p>
              <h1 className="journal-page__date">{formatJournalDate(entry.date)}</h1>
            </div>
          </header>

          <div className="journal-stack">
            <JournalEntrySection
              indicator="Today's intention"
              draft={intentionDraft}
              onDraftChange={setIntentionDraft}
              placeholder="What do you want to achieve today?"
              ariaLabel="Today's intention"
            />
            <JournalEntrySection
              indicator="Reflection"
              draft={reflectionDraft}
              onDraftChange={setReflectionDraft}
              placeholder="What stood out about today?"
              ariaLabel="Reflection entry"
            />
          </div>
          </>
        }
        right={
          <RightRailColumn items={items} journalSummaries={entries} todayDate={todayDate} />
        }
      />
    </section>
  );
}

function JournalEntrySection({
  indicator,
  draft,
  onDraftChange,
  placeholder,
  ariaLabel,
}: {
  indicator: string;
  draft: string;
  onDraftChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <section className="journal-section journal-section--entry">
      <div className="journal-entry-editor">
        <p className="journal-entry-editor__label">{indicator}</p>
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          className="journal-entry-editor__input"
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
      </div>
    </section>
  );
}

function buildJournalDayOptions(
  todayDate: string,
  selectedDate: string,
  entries: JournalEntrySummary[],
) {
  const summariesByDate = new Map(entries.map((entry) => [entry.date, entry.preview]));
  const yesterdayDate = shiftDate(todayDate, -1);
  const recentDates = Array.from({ length: 8 }, (_, index) => shiftDate(todayDate, -index));
  const mergedDates = Array.from(
    new Set([todayDate, selectedDate, ...recentDates, ...entries.map((entry) => entry.date)]),
  ).sort((left, right) => {
    if (left === yesterdayDate && right === todayDate) {
      return -1;
    }

    if (left === todayDate && right === yesterdayDate) {
      return 1;
    }

    return right.localeCompare(left);
  });

  return mergedDates.map((date) => ({
    date,
    label: labelForJournalNavDate(date),
    preview: summariesByDate.get(date) ?? "",
  }));
}

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

function shiftDate(date: string, deltaDays: number) {
  const parsedDate = new Date(`${date}T12:00:00`);
  parsedDate.setDate(parsedDate.getDate() + deltaDays);

  return `${parsedDate.getFullYear()}-${`${parsedDate.getMonth() + 1}`.padStart(2, "0")}-${`${parsedDate.getDate()}`.padStart(2, "0")}`;
}

function labelForJournalNavDate(date: string) {
  const todayString = localTodayString();
  const targetDate = new Date(`${date}T12:00:00`);
  const today = new Date(`${todayString}T12:00:00`);
  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === -1) {
    return "Yesterday";
  }

  return formatShortJournalDate(date);
}

function formatJournalDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);

  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(parsedDate);
}

function formatShortJournalDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(parsedDate);
}

function localTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
