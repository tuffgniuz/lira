import type { JournalEntry, JournalEntrySummary } from "../../models/journal";

export function applyJournalEntryUpdates(
  current: JournalEntry,
  updates: Partial<JournalEntry>,
  updatedAt: string,
): JournalEntry {
  return {
    ...current,
    ...updates,
    updatedAt,
  };
}

export function upsertJournalSummary(
  summaries: JournalEntrySummary[],
  entry: JournalEntry,
): JournalEntrySummary[] {
  const preview = getJournalPreview(entry);
  const nextSummary = {
    date: entry.date,
    preview,
  };
  const nextSummaries = summaries.some((summary) => summary.date === entry.date)
    ? summaries.map((summary) => (summary.date === entry.date ? nextSummary : summary))
    : [...summaries, nextSummary];

  return nextSummaries.sort((left, right) => right.date.localeCompare(left.date));
}

export function getJournalPreview(entry: JournalEntry) {
  const candidates = [
    entry.reflectionEntry,
    entry.diaryEntry,
    entry.reflection.wentWell,
    entry.reflection.learned,
    entry.morningIntention,
  ];

  return candidates.find((value) => value.trim())?.trim().slice(0, 84) ?? "";
}
