import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export type CommandPaletteStateItem = {
  id: string;
  label: string;
  keywords?: string[];
  icon?: ReactNode;
};

function matchesQuery(item: CommandPaletteStateItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [item.label, ...(item.keywords ?? [])].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function useCommandPaletteState<TItem extends CommandPaletteStateItem>({
  items,
  isOpen,
  onClose,
  onSelect,
}: {
  items: TItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: TItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesQuery(item, query)),
    [items, query],
  );

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setHighlightedIndex(0);
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  function selectIndex(index: number) {
    const item = filteredItems[index];

    if (!item) {
      return;
    }

    onSelect(item);
    setQuery("");
    setHighlightedIndex(0);
  }

  function moveHighlightedIndex(offset: 1 | -1) {
    setHighlightedIndex((current) =>
      filteredItems.length === 0
        ? 0
        : (current + offset + filteredItems.length) % filteredItems.length,
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const loweredKey = event.key.toLowerCase();
    const moveNext =
      event.key === "ArrowDown" ||
      (!event.metaKey && !event.altKey && event.ctrlKey && loweredKey === "n") ||
      (!event.metaKey && !event.altKey && !event.ctrlKey && event.key === "Tab" && !event.shiftKey);
    const movePrevious =
      event.key === "ArrowUp" ||
      (!event.metaKey && !event.altKey && event.ctrlKey && loweredKey === "p") ||
      (!event.metaKey && !event.altKey && !event.ctrlKey && event.key === "Tab" && event.shiftKey);

    if (moveNext) {
      event.preventDefault();
      if (event.key === "Tab") {
        event.stopPropagation();
        inputRef.current?.focus();
      }
      moveHighlightedIndex(1);
      return;
    }

    if (movePrevious) {
      event.preventDefault();
      if (event.key === "Tab") {
        event.stopPropagation();
        inputRef.current?.focus();
      }
      moveHighlightedIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectIndex(highlightedIndex);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return {
    filteredItems,
    handleKeyDown,
    highlightedIndex,
    inputRef,
    query,
    selectIndex,
    setHighlightedIndex,
    setQuery,
  };
}
