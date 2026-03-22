import { useEffect } from "react";

export function useJournalDraftAutosave({
  draft,
  savedValue,
  onSave,
  delayMs = 600,
}: {
  draft: string;
  savedValue: string;
  onSave: (value: string) => void;
  delayMs?: number;
}) {
  useEffect(() => {
    const trimmedDraft = draft.trim();
    const trimmedValue = savedValue.trim();

    if (trimmedDraft === trimmedValue) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onSave(trimmedDraft);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, draft, onSave, savedValue]);
}
