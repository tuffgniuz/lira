import { useEffect, useMemo, useRef, useState } from "react";
import { RightRailColumn } from "@/components/layout/right-rail-column";
import { ThreeColumnLayout } from "@/components/layout/three-column-layout";
import { useJournalDayNavigation } from "@/lib/hooks/use-journal-day-navigation";
import { useJournalDraftAutosave } from "@/lib/hooks/use-journal-draft-autosave";
import { FormField } from "@/components/data-input/form-field";
import { PageShell } from "@/components/layout/page-shell";
import { useWindowWidth } from "@/lib/hooks/use-window-width";
import type { JournalEntry, JournalEntrySummary } from "@/models/journal";
import type { Item } from "@/models/workspace-item";

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
  const windowWidth = useWindowWidth();
  const [intentionDraft, setIntentionDraft] = useState(entry.morningIntention);
  const [reflectionDraft, setReflectionDraft] = useState(entry.reflectionEntry);
  const dayListRef = useRef<HTMLDivElement | null>(null);
  const dayOptions = useMemo(
    () => buildJournalDayOptions(todayDate, selectedDate, entries),
    [entries, selectedDate, todayDate],
  );
  const layoutMode = resolveResponsiveMode(windowWidth);
  const showInlineDays = layoutMode !== "wide";
  const showRightRail = layoutMode !== "narrow";

  useEffect(() => {
    setIntentionDraft(entry.morningIntention);
    setReflectionDraft(entry.reflectionEntry);
  }, [entry.date, entry.morningIntention, entry.reflectionEntry]);

  useJournalDraftAutosave({
    draft: intentionDraft,
    savedValue: entry.morningIntention,
    onSave: (value) => onUpdateEntry({ morningIntention: value }),
  });

  useJournalDraftAutosave({
    draft: reflectionDraft,
    savedValue: entry.reflectionEntry,
    onSave: (value) => onUpdateEntry({ reflectionEntry: value }),
  });

  useJournalDayNavigation({
    dayOptions,
    selectedDate,
    onSelectDate,
    listRef: dayListRef,
  });

  return (
    <PageShell ariaLabel="Journaling" className="page--journaling">
      <ThreeColumnLayout
        className="journal-console"
        leftClassName="journal-nav"
        centerClassName="journal-daily"
        rightClassName="journal-context"
        leftCollapsed={showInlineDays}
        rightCollapsed={!showRightRail}
        leftLabel="Journal days"
        centerLabel="Journal entry"
        rightLabel="Journal context"
        left={
          <JournalDayList
            dayOptions={dayOptions}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            listRef={dayListRef}
          />
        }
        center={
          <>
          <header className="journal-daily__header">
            <div className="journal-daily__heading">
              <p className="page__eyebrow">Today</p>
              <h1 className="journal-page__date">{formatJournalDate(entry.date)}</h1>
            </div>
            {showInlineDays ? (
              <div className="journal-inline-days" data-testid="journal-inline-days">
                <JournalDayList
                  dayOptions={dayOptions}
                  selectedDate={selectedDate}
                  onSelectDate={onSelectDate}
                  inline
                />
              </div>
            ) : null}
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
      {layoutMode === "narrow" ? (
        <section
          className="journal-stacked-context"
          aria-label="Journal context"
          data-testid="journal-stacked-context"
        >
          <RightRailColumn items={items} journalSummaries={entries} todayDate={todayDate} />
        </section>
      ) : null}
    </PageShell>
  );
}

function JournalDayList({
  dayOptions,
  selectedDate,
  onSelectDate,
  listRef,
  inline = false,
}: {
  dayOptions: Array<{ date: string; label: string; preview: string }>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  listRef?: React.RefObject<HTMLDivElement | null>;
  inline?: boolean;
}) {
  return (
    <>
      <div className="journal-nav__header">
        <p className="page__eyebrow">Days</p>
      </div>
      <div
        className={`journal-nav__list ${inline ? "journal-nav__list--inline" : ""}`.trim()}
        ref={listRef}
        tabIndex={inline ? undefined : 0}
      >
        {dayOptions.map((option) => (
          <button
            key={option.date}
            type="button"
            className={`journal-nav__day ${option.date === selectedDate ? "is-active" : ""} ${
              inline ? "journal-nav__day--inline" : ""
            }`.trim()}
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
    <section className="journal-section journal-section--entry ui-panel">
      <div className="journal-entry-editor">
        <FormField label={indicator}>
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          className="journal-entry-editor__input ui-input"
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
        </FormField>
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

function resolveResponsiveMode(windowWidth: number): "wide" | "medium" | "narrow" {
  if (windowWidth < 900) {
    return "narrow";
  }

  if (windowWidth < 1280) {
    return "medium";
  }

  return "wide";
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
