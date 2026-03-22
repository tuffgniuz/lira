import { useEffect, useRef } from "react";
import { Vim, getCM } from "@replit/codemirror-vim";
import type { EditorView } from "@codemirror/view";

function getVimEditor(view: EditorView) {
  return getCM(view) as {
    state?: { vim?: { insertMode?: boolean } };
    on?: (eventName: string, listener: (event: { mode?: string }) => void) => void;
    off?: (eventName: string, listener: (event: { mode?: string }) => void) => void;
  };
}

function syncVimModeAttribute(view: EditorView) {
  const cm = getVimEditor(view);
  view.dom.dataset.vimMode = cm.state?.vim?.insertMode ? "insert" : "normal";
}

function attachVimModeTracking(view: EditorView) {
  const cm = getVimEditor(view);
  const handleModeChange = (event: { mode?: string }) => {
    view.dom.dataset.vimMode = event.mode === "insert" ? "insert" : "normal";
  };

  syncVimModeAttribute(view);

  if (typeof cm.on === "function") {
    cm.on("vim-mode-change", handleModeChange);
  }

  return () => {
    if (typeof cm.off === "function") {
      cm.off("vim-mode-change", handleModeChange);
    }
  };
}

function focusEditorInInsertMode(view: EditorView) {
  view.focus();

  const cm = getVimEditor(view);

  if (!cm.state?.vim?.insertMode) {
    (Vim.handleKey as unknown as (editor: unknown, key: string) => void)(cm, "i");
    view.dom.dataset.vimMode = "insert";
    return;
  }

  syncVimModeAttribute(view);
}

export function useTaskDescriptionEditor(focusKey: string) {
  const editorViewRef = useRef<EditorView | null>(null);
  const vimModeCleanupRef = useRef<(() => void) | null>(null);

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

    focusEditorInInsertMode(editorViewRef.current);
  }, [focusKey]);

  function handleEditorCreate(view: EditorView) {
    editorViewRef.current = view;
    vimModeCleanupRef.current?.();
    vimModeCleanupRef.current = attachVimModeTracking(view);
    focusEditorInInsertMode(view);
  }

  function handleEditorUpdate(view: EditorView) {
    syncVimModeAttribute(view);
  }

  return {
    handleEditorCreate,
    handleEditorUpdate,
  };
}
