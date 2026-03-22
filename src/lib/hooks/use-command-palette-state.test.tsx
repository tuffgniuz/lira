import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCommandPaletteState } from "./use-command-palette-state";

function CommandPaletteStateHarness({
  isOpen = true,
  onClose = vi.fn(),
  onSelect = vi.fn(),
}: {
  isOpen?: boolean;
  onClose?: () => void;
  onSelect?: (item: { id: string; label: string }) => void;
}) {
  const state = useCommandPaletteState({
    items: [
      { id: "one", label: "Inbox" },
      { id: "two", label: "Projects" },
      { id: "three", label: "Tasks" },
    ],
    isOpen,
    onClose,
    onSelect,
  });

  return (
    <>
      <input
        aria-label="Palette query"
        ref={state.inputRef}
        value={state.query}
        onChange={(event) => state.setQuery(event.target.value)}
        onKeyDown={state.handleKeyDown}
      />
      <p data-testid="highlighted-index">{state.highlightedIndex}</p>
      <ul>
        {state.filteredItems.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </>
  );
}

describe("useCommandPaletteState", () => {
  it("filters items from the query and resets the highlight when the query changes", () => {
    render(<CommandPaletteStateHarness />);

    fireEvent.keyDown(screen.getByLabelText("Palette query"), { key: "ArrowDown" });
    expect(screen.getByTestId("highlighted-index")).toHaveTextContent("1");

    fireEvent.change(screen.getByLabelText("Palette query"), {
      target: { value: "proj" },
    });

    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.queryByText("Inbox")).not.toBeInTheDocument();
    expect(screen.getByTestId("highlighted-index")).toHaveTextContent("0");
  });

  it("selects the highlighted item on Enter and closes on Escape", () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    render(<CommandPaletteStateHarness onClose={onClose} onSelect={onSelect} />);

    fireEvent.keyDown(screen.getByLabelText("Palette query"), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByLabelText("Palette query"), { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith({
      id: "two",
      label: "Projects",
    });

    fireEvent.keyDown(screen.getByLabelText("Palette query"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
