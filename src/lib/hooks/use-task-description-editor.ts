import { useEffect, useRef, useState } from "react";
import { Vim, getCM } from "@replit/codemirror-vim";
import type { EditorView } from "@codemirror/view";

export type TaskDescriptionVimMode = "insert" | "normal" | "visual";

function getVimEditor(view: EditorView) {
  return getCM(view) as {
    state?: { vim?: { insertMode?: boolean } };
    on?: (eventName: string, listener: (event: { mode?: string }) => void) => void;
    off?: (eventName: string, listener: (event: { mode?: string }) => void) => void;
  };
}

function normalizeVimMode(mode?: string, insertMode = false): TaskDescriptionVimMode {
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
  setVimMode: (mode: TaskDescriptionVimMode) => void,
) {
  const cm = getVimEditor(view);
  const vimMode = normalizeVimMode(undefined, cm.state?.vim?.insertMode);
  view.dom.dataset.vimMode = vimMode;
  setVimMode(vimMode);
}

function attachVimModeTracking(
  view: EditorView,
  setVimMode: (mode: TaskDescriptionVimMode) => void,
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
  setVimMode: (mode: TaskDescriptionVimMode) => void,
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

export function useTaskDescriptionEditor(focusKey: string) {
  const editorViewRef = useRef<EditorView | null>(null);
  const vimModeCleanupRef = useRef<(() => void) | null>(null);
  const [vimMode, setVimMode] = useState<TaskDescriptionVimMode>("insert");

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
  }

  function handleEditorUpdate(view: EditorView) {
    syncVimModeAttribute(view, setVimMode);
  }

  return {
    handleEditorCreate,
    handleEditorUpdate,
    vimMode,
  };
}
