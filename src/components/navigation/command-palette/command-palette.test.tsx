import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./command-palette";

const items = [
  { id: "inbox", label: "Capture Inbox" },
  { id: "goals", label: "Goals" },
  { id: "tasks", label: "Tasks" },
];

function renderCommandPalette() {
  const onClose = vi.fn();
  const onSelect = vi.fn();

  render(
    <CommandPalette
      title="Go To Page"
      placeholder="go to page"
      items={items}
      isOpen
      emptyMessage="No pages match that query."
      onClose={onClose}
      onSelect={onSelect}
    />,
  );

  const input = screen.getByRole("textbox", { name: "Go To Page" });
  const listbox = screen.getByRole("listbox", { name: "Go To Page" });

  return {
    input,
    listbox,
    onClose,
    onSelect,
  };
}

function expectHighlightedOption(label: string) {
  const listbox = screen.getByRole("listbox", { name: "Go To Page" });
  const option = within(listbox).getByRole("option", { name: label });
  expect(option).toHaveAttribute("aria-selected", "true");
}

describe("CommandPalette", () => {
  it("moves through the list with Ctrl+N and Ctrl+P", () => {
    const { input } = renderCommandPalette();

    expectHighlightedOption("Capture Inbox");

    fireEvent.keyDown(input, { key: "n", ctrlKey: true });
    expectHighlightedOption("Goals");

    fireEvent.keyDown(input, { key: "p", ctrlKey: true });
    expectHighlightedOption("Capture Inbox");
  });

  it("cycles through the list with Tab and Shift+Tab while keeping focus in the input", () => {
    const { input } = renderCommandPalette();
    input.focus();

    fireEvent.keyDown(input, { key: "Tab" });
    expectHighlightedOption("Goals");
    expect(input).toHaveFocus();

    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expectHighlightedOption("Capture Inbox");
    expect(input).toHaveFocus();
  });

  it("selects the currently highlighted item after palette navigation", () => {
    const { input, onSelect } = renderCommandPalette();

    fireEvent.keyDown(input, { key: "Tab" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "goals",
        label: "Goals",
      }),
    );
  });
});
