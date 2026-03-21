import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FloatingPanel } from "./floating-panel";

export type CommandPaletteItem = {
  id: string;
  label: string;
  keywords?: string[];
  icon?: ReactNode;
};

type CommandPaletteProps = {
  title: string;
  placeholder: string;
  items: CommandPaletteItem[];
  isOpen: boolean;
  emptyMessage: string;
  onClose: () => void;
  onSelect: (item: CommandPaletteItem) => void;
};

function matchesQuery(item: CommandPaletteItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [item.label, ...(item.keywords ?? [])].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function CommandPalette({
  title,
  placeholder,
  items,
  isOpen,
  emptyMessage,
  onClose,
  onSelect,
}: CommandPaletteProps) {
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

  if (!isOpen) {
    return null;
  }

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

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
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
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <FloatingPanel
      ariaLabelledBy="command-palette-title"
      className="palette-window"
      onClose={onClose}
    >
        <div className="palette-header">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            className="palette-input"
            placeholder={placeholder}
            aria-label={title}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>

        <div className="palette-list" role="listbox" aria-label={title}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`palette-item ${
                  index === highlightedIndex ? "is-highlighted" : ""
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectIndex(index)}
                role="option"
                aria-selected={index === highlightedIndex}
              >
                <span className="palette-item__icon">{item.icon}</span>
                <span className="palette-item__label">{item.label}</span>
              </button>
            ))
          ) : (
            <p className="palette-empty">{emptyMessage}</p>
          )}
        </div>
    </FloatingPanel>
  );
}
