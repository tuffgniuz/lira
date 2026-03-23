import type { ReactNode } from "react";
import { FloatingPanel } from "@/components/layout/floating-panel";
import { useCommandPaletteState } from "@/lib/hooks/use-command-palette-state";

export type CommandPaletteItem = {
  id: string;
  label: string;
  meta?: string;
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

export function CommandPalette({
  title,
  placeholder,
  items,
  isOpen,
  emptyMessage,
  onClose,
  onSelect,
}: CommandPaletteProps) {
  const {
    filteredItems,
    handleKeyDown,
    highlightedIndex,
    inputRef,
    query,
    selectIndex,
    setHighlightedIndex,
    setQuery,
  } = useCommandPaletteState({
    items,
    isOpen,
    onClose,
    onSelect,
  });

  if (!isOpen) {
    return null;
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
                <span className="palette-item__content">
                  <span className="palette-item__label">{item.label}</span>
                  {item.meta ? (
                    <span className="palette-item__meta">{item.meta}</span>
                  ) : null}
                </span>
              </button>
            ))
          ) : (
            <p className="palette-empty">{emptyMessage}</p>
          )}
        </div>
    </FloatingPanel>
  );
}
