import { useEffect, useRef, useState } from "react";

export function useDebouncedTaskDraft({
  taskId,
  initialContent,
  syncKey,
  delayMs = 350,
  onCommit,
}: {
  taskId: string;
  initialContent: string;
  syncKey?: string;
  delayMs?: number;
  onCommit: (value: string) => void;
}) {
  const [draftContent, setDraftValue] = useState(initialContent);
  const latestDraftContentRef = useRef(initialContent);
  const lastSubmittedContentRef = useRef(initialContent);
  const debounceTimeoutRef = useRef<number | null>(null);

  function commitDraft() {
    const nextContent = latestDraftContentRef.current;

    if (nextContent === lastSubmittedContentRef.current) {
      return;
    }

    lastSubmittedContentRef.current = nextContent;
    onCommit(nextContent);
  }

  function setDraftContent(value: string) {
    latestDraftContentRef.current = value;
    setDraftValue(value);
  }

  useEffect(() => {
    setDraftValue(initialContent);
    latestDraftContentRef.current = initialContent;
    lastSubmittedContentRef.current = initialContent;

    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, [initialContent, syncKey, taskId]);

  useEffect(() => {
    if (draftContent === lastSubmittedContentRef.current) {
      return;
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      debounceTimeoutRef.current = null;
      commitDraft();
    }, delayMs);

    return () => {
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [delayMs, draftContent, taskId]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      commitDraft();
    };
  }, [taskId]);

  return {
    commitDraft,
    draftContent,
    setDraftContent,
  };
}
