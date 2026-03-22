import { describe, expect, it } from "vitest";
import type { JournalEntry, JournalEntrySummary } from "@/models/journal";
import { applyJournalEntryUpdates, upsertJournalSummary } from "./journal-entry-state";

function createJournalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "journal-2026-03-17",
    date: "2026-03-17",
    morningIntention: "",
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

describe("applyJournalEntryUpdates", () => {
  it("applies content updates and uses the provided timestamp", () => {
    const current = createJournalEntry();

    const updated = applyJournalEntryUpdates(
      current,
      { morningIntention: "Finish the review" },
      "2026-03-17T09:00:00.000Z",
    );

    expect(updated.morningIntention).toBe("Finish the review");
    expect(updated.updatedAt).toBe("2026-03-17T09:00:00.000Z");
  });

  it("produces a new updatedAt value on successive saves", () => {
    const current = createJournalEntry();

    const firstSave = applyJournalEntryUpdates(
      current,
      { diaryEntry: "First draft" },
      "2026-03-17T09:00:00.000Z",
    );
    const secondSave = applyJournalEntryUpdates(
      firstSave,
      { diaryEntry: "Second draft" },
      "2026-03-17T09:00:01.000Z",
    );

    expect(firstSave.updatedAt).not.toBe(secondSave.updatedAt);
    expect(secondSave.diaryEntry).toBe("Second draft");
  });

  it("updates the matching summary preview immediately after deletion", () => {
    const current = createJournalEntry({
      morningIntention: "Finish the review",
    });
    const summaries: JournalEntrySummary[] = [
      { date: "2026-03-17", preview: "Finish the review" },
      { date: "2026-03-16", preview: "Older note" },
    ];

    const updated = applyJournalEntryUpdates(
      current,
      { morningIntention: "" },
      "2026-03-17T09:00:02.000Z",
    );
    const nextSummaries = upsertJournalSummary(summaries, updated);

    expect(nextSummaries[0]).toEqual({
      date: "2026-03-17",
      preview: "",
    });
  });
});
