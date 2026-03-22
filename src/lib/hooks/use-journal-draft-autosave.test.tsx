import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useJournalDraftAutosave } from "./use-journal-draft-autosave";

function JournalDraftAutosaveHarness({
  draft,
  savedValue,
  onSave,
}: {
  draft: string;
  savedValue: string;
  onSave: (value: string) => void;
}) {
  useJournalDraftAutosave({
    draft,
    savedValue,
    onSave,
    delayMs: 600,
  });

  return null;
}

describe("useJournalDraftAutosave", () => {
  it("debounces saves for changed drafts and trims the value", () => {
    vi.useFakeTimers();
    const onSave = vi.fn();

    render(
      <JournalDraftAutosaveHarness
        draft="  Ship the journal flow  "
        savedValue=""
        onSave={onSave}
      />,
    );

    vi.advanceTimersByTime(599);
    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onSave).toHaveBeenCalledWith("Ship the journal flow");
    vi.useRealTimers();
  });

  it("does not save when the trimmed draft already matches the saved value", () => {
    vi.useFakeTimers();
    const onSave = vi.fn();

    render(
      <JournalDraftAutosaveHarness
        draft=" Ship the journal flow "
        savedValue="Ship the journal flow"
        onSave={onSave}
      />,
    );

    vi.runAllTimers();
    expect(onSave).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
