import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { describe, expect, it } from "vitest";
import { useTaskDetailNavigation } from "./use-task-detail-navigation";

function TaskDetailNavigationHarness({
  vimMode,
  includeUnrelatedFatCursor = false,
}: {
  vimMode: "insert" | "normal";
  includeUnrelatedFatCursor?: boolean;
}) {
  const containerRef = useTaskDetailNavigation();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    for (const element of [titleRef.current, fieldRef.current]) {
      if (!element) {
        continue;
      }

      Object.defineProperty(element, "offsetParent", {
        configurable: true,
        get: () => document.body,
      });
    }
  }, []);

  return (
    <>
      {includeUnrelatedFatCursor ? <div className="cm-fat-cursor" aria-hidden="true" /> : null}
      <div ref={containerRef}>
        <textarea ref={titleRef} aria-label="Task title" />
        <div className="cm-editor" data-vim-mode={vimMode}>
          <div className="cm-content" contentEditable aria-label="Task description editor" />
        </div>
        <input ref={fieldRef} aria-label="Task field" />
      </div>
    </>
  );
}

describe("useTaskDetailNavigation", () => {
  it("keeps focus in the active editor when that editor is in vim insert mode", () => {
    render(<TaskDetailNavigationHarness vimMode="insert" includeUnrelatedFatCursor />);

    const editorContent = screen.getByLabelText("Task description editor");
    const field = screen.getByRole("textbox", { name: "Task field" });

    editorContent.focus();
    fireEvent.keyDown(editorContent, { key: "n", ctrlKey: true });

    expect(editorContent).toHaveFocus();
    expect(field).not.toHaveFocus();
  });

  it("uses the active editor vim mode to allow navigation in normal mode", () => {
    render(<TaskDetailNavigationHarness vimMode="normal" />);

    const editorContent = screen.getByLabelText("Task description editor");
    const field = screen.getByRole("textbox", { name: "Task field" });

    editorContent.focus();
    fireEvent.keyDown(editorContent, { key: "n", ctrlKey: true });

    expect(field).toHaveFocus();
  });
});
