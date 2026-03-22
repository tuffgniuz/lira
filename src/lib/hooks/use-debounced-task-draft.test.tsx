import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDebouncedTaskDraft } from "./use-debounced-task-draft";

function DebouncedTaskDraftHarness({
  taskId = "task-1",
  initialContent = "Initial content",
  onCommit = vi.fn(),
}: {
  taskId?: string;
  initialContent?: string;
  onCommit?: (value: string) => void;
}) {
  const { draftContent, setDraftContent, commitDraft } = useDebouncedTaskDraft({
    taskId,
    initialContent,
    delayMs: 350,
    onCommit,
  });

  return (
    <>
      <textarea
        aria-label="task draft"
        value={draftContent}
        onChange={(event) => setDraftContent(event.target.value)}
      />
      <button type="button" onClick={commitDraft}>
        Commit
      </button>
    </>
  );
}

describe("useDebouncedTaskDraft", () => {
  it("debounces draft commits and resets for a new task id", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const view = render(<DebouncedTaskDraftHarness onCommit={onCommit} />);

    fireEvent.change(screen.getByLabelText("task draft"), {
      target: { value: "Updated content" },
    });

    vi.advanceTimersByTime(349);
    expect(onCommit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onCommit).toHaveBeenCalledWith("Updated content");

    view.rerender(
      <DebouncedTaskDraftHarness
        taskId="task-2"
        initialContent="Task two content"
        onCommit={onCommit}
      />,
    );

    expect(screen.getByLabelText("task draft")).toHaveValue("Task two content");
    vi.useRealTimers();
  });
});
