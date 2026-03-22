import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JournalingPage } from "./journaling-page";
import type { JournalEntry } from "@/models/journal";
import type { JournalEntrySummary } from "@/models/journal";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });

  fireEvent(window, new Event("resize"));
}

function createEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "journal-2026-03-17",
    date: "2026-03-17",
    morningIntention: "Finish the review and close two tasks.",
    diaryEntry: "",
    reflectionEntry: "",
    focuses: [],
    commitments: [],
    reflection: {
      wentWell: "",
      didntGoWell: "",
      learned: "",
      gratitude: "",
    },
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T00:00:00.000Z",
    ...overrides,
  };
}

function createEntrySummary(overrides: Partial<JournalEntrySummary> = {}): JournalEntrySummary {
  return {
    date: "2026-03-17",
    preview: "# Diary # Reflection Entry # Focus",
    ...overrides,
  };
}

describe("JournalingPage intentions", () => {
  it("shows a large inline editor when no intention is written yet", () => {
    vi.useFakeTimers();
    const onUpdateEntry = vi.fn();

    render(
      <JournalingPage
        todayDate="2026-03-17"
        selectedDate="2026-03-17"
        entry={createEntry({ morningIntention: "" })}
        entries={[]}
        items={[]}
        onSelectDate={vi.fn()}
        onUpdateEntry={onUpdateEntry}
      />,
    );

    const textarea = screen.getByLabelText("Today's intention");

    expect(textarea).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit intention" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete intention" })).not.toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "Ship the journal flow" } });
    vi.advanceTimersByTime(700);

    expect(onUpdateEntry).toHaveBeenCalledWith({ morningIntention: "Ship the journal flow" });
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("shows an existing intention in the inline editor without action buttons", () => {
    const onUpdateEntry = vi.fn();

    render(
      <JournalingPage
        todayDate="2026-03-17"
        selectedDate="2026-03-17"
        entry={createEntry()}
        entries={[]}
        items={[]}
        onSelectDate={vi.fn()}
        onUpdateEntry={onUpdateEntry}
      />,
    );

    expect(screen.getByLabelText("Today's intention")).toHaveValue(
      "Finish the review and close two tasks.",
    );
    expect(screen.queryByRole("button", { name: "Edit intention" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete intention" })).not.toBeInTheDocument();
    expect(onUpdateEntry).not.toHaveBeenCalled();
  });

  it("clears the saved intention by autosaving an empty draft", () => {
    vi.useFakeTimers();
    const onUpdateEntry = vi.fn();

    render(
      <JournalingPage
        todayDate="2026-03-17"
        selectedDate="2026-03-17"
        entry={createEntry()}
        entries={[]}
        items={[]}
        onSelectDate={vi.fn()}
        onUpdateEntry={onUpdateEntry}
      />,
    );

    fireEvent.change(screen.getByLabelText("Today's intention"), { target: { value: "" } });
    vi.advanceTimersByTime(700);

    expect(onUpdateEntry).toHaveBeenCalledWith({ morningIntention: "" });
    vi.useRealTimers();
  });

  it("keeps the day list accessible as an inline picker on medium widths", () => {
    setViewportWidth(1100);

    render(
      <JournalingPage
        todayDate="2026-03-17"
        selectedDate="2026-03-17"
        entry={createEntry()}
        entries={[
          createEntrySummary(),
          createEntrySummary({ date: "2026-03-16", preview: "Yesterday" }),
        ]}
        items={[]}
        onSelectDate={vi.fn()}
        onUpdateEntry={vi.fn()}
      />,
    );

    expect(screen.getByTestId("journal-inline-days")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-stacked-context")).not.toBeInTheDocument();
  });

  it("moves the right rail below the entry on narrow widths", () => {
    setViewportWidth(800);

    render(
      <JournalingPage
        todayDate="2026-03-17"
        selectedDate="2026-03-17"
        entry={createEntry()}
        entries={[createEntrySummary()]}
        items={[]}
        onSelectDate={vi.fn()}
        onUpdateEntry={vi.fn()}
      />,
    );

    expect(screen.getByTestId("journal-inline-days")).toBeInTheDocument();
    expect(screen.getByTestId("journal-stacked-context")).toBeInTheDocument();
  });
});
