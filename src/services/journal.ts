import { invoke } from "@tauri-apps/api/core";
import type { JournalEntry, JournalEntrySummary } from "@/models/journal";

export async function loadJournalEntry(vaultPath: string, date: string) {
  if (!vaultPath) {
    return null as JournalEntry | null;
  }

  return invoke<JournalEntry | null>("load_journal_entry", {
    path: vaultPath,
    date,
  });
}

export async function saveJournalEntry(vaultPath: string, entry: JournalEntry) {
  if (!vaultPath) {
    return;
  }

  await invoke("save_journal_entry", {
    path: vaultPath,
    entry,
  });
}

export async function listJournalEntries(vaultPath: string) {
  if (!vaultPath) {
    return [] as JournalEntrySummary[];
  }

  return invoke<JournalEntrySummary[]>("list_journal_entries", {
    path: vaultPath,
  });
}
