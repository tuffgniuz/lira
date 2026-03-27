import { useEffect, useRef, useState } from "react";
import { Vim, getCM } from "@replit/codemirror-vim";
import type { EditorView } from "@codemirror/view";

export type VimMode = "insert" | "normal" | "visual";

function getVimEditor(view: EditorView) {
  return getCM(view) as {
    state?: { vim?: { insertMode?: boolean } };
    on?: (eventName: string, listener: (event: { mode?: string }) => void) => void;
    off?: (eventName: string, listener: (event: { mode?: string }) => void) => void;
  };
}

function normalizeVimMode(mode?: string, insertMode = false): VimMode {
  if (mode?.startsWith("visual")) {
    return "visual";
  }

  if (mode === "insert" || insertMode) {
    return "insert";
  }

  return "normal";
}

function syncVimModeAttribute(
  view: EditorView,
  setVimMode: (mode: VimMode) => void,
) {
  const cm = getVimEditor(view);
  const vimMode = normalizeVimMode(undefined, cm.state?.vim?.insertMode);
  view.dom.dataset.vimMode = vimMode;
  setVimMode(vimMode);
}

function attachVimModeTracking(
  view: EditorView,
  setVimMode: (mode: VimMode) => void,
) {
  const cm = getVimEditor(view);
  const handleModeChange = (event: { mode?: string }) => {
    const vimMode = normalizeVimMode(event.mode, cm.state?.vim?.insertMode);
    view.dom.dataset.vimMode = vimMode;
    setVimMode(vimMode);
  };

  syncVimModeAttribute(view, setVimMode);

  if (typeof cm.on === "function") {
    cm.on("vim-mode-change", handleModeChange);
  }

  return () => {
    if (typeof cm.off === "function") {
      cm.off("vim-mode-change", handleModeChange);
    }
  };
}

function focusEditorInInsertMode(
  view: EditorView,
  setVimMode: (mode: VimMode) => void,
) {
  view.focus();

  const cm = getVimEditor(view);

  if (!cm.state?.vim?.insertMode) {
    (Vim.handleKey as unknown as (editor: unknown, key: string) => void)(cm, "i");
    view.dom.dataset.vimMode = "insert";
    setVimMode("insert");
    return;
  }

  syncVimModeAttribute(view, setVimMode);
}

export function useVimEditor(focusKey: string) {
  const editorViewRef = useRef<EditorView | null>(null);
  const vimModeCleanupRef = useRef<(() => void) | null>(null);
  const [vimMode, setVimMode] = useState<VimMode>("insert");

  useEffect(() => {
    return () => {
      vimModeCleanupRef.current?.();
      vimModeCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!editorViewRef.current) {
      return;
    }

    focusEditorInInsertMode(editorViewRef.current, setVimMode);
  }, [focusKey]);

  function handleEditorCreate(view: EditorView) {
    editorViewRef.current = view;
    vimModeCleanupRef.current?.();
    vimModeCleanupRef.current = attachVimModeTracking(view, setVimMode);
    focusEditorInInsertMode(view, setVimMode);

    view.dom.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.key === "z" && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
        // Handle native Vim z z, z t, z b by checking the next key shortly after
        // This is a bit of a hack since we don't have direct access to the Vim command stream here,
        // but it ensures the parent scroller follows the Vim intent.
        setTimeout(() => handleEditorUpdate(view), 10);
      }

      if (event.key === "Enter" && event.altKey) {
        // Legacy support/alternative
        centerCursor(view);
      }

      if (event.key === "z" && event.altKey) {
        event.preventDefault();
        centerCursor(view);
      }
    });
  }

  function centerCursor(view: EditorView) {
    if (view.state.selection.main.head === undefined) return;
    const cursor = view.coordsAtPos(view.state.selection.main.head);
    const scroller = view.scrollDOM.closest(".main-panel");
    if (cursor && scroller) {
      const rect = scroller.getBoundingClientRect();
      const viewportCenter = rect.top + (rect.height / 2);
      scroller.scrollBy({
        top: cursor.top - viewportCenter,
        behavior: "smooth",
      });
    }
  }

  function handleEditorUpdate(view: EditorView) {
    syncVimModeAttribute(view, setVimMode);

    if (view.state.selection.main.head !== undefined) {
      const cursor = view.coordsAtPos(view.state.selection.main.head);
      if (cursor) {
        const scroller = view.scrollDOM.closest(".main-panel");
        if (scroller) {
          const rect = scroller.getBoundingClientRect();
          // Keep the cursor centered within a 30% vertical window
          const topThreshold = rect.top + (rect.height * 0.25);
          const bottomThreshold = rect.top + (rect.height * 0.55);

          if (cursor.bottom > bottomThreshold) {
            scroller.scrollTop += (cursor.bottom - bottomThreshold);
          } else if (cursor.top < topThreshold) {
            scroller.scrollTop -= (topThreshold - cursor.top);
          }
        }
      }
    }
  }

  return {
    handleEditorCreate,
    handleEditorUpdate,
    vimMode,
  };
}
