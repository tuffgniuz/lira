import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FloatingPanel } from "./floating-panel";

function FloatingPanelHarness({
  isOpen,
  onClose = vi.fn(),
}: {
  isOpen: boolean;
  onClose?: () => void;
}) {
  return (
    <div>
      <button type="button">Return target</button>
      {isOpen ? (
        <FloatingPanel ariaLabelledBy="floating-panel-title" onClose={onClose}>
          <h2 id="floating-panel-title">Panel</h2>
          <button type="button">First action</button>
          <button type="button">Second action</button>
        </FloatingPanel>
      ) : null}
    </div>
  );
}

describe("FloatingPanel", () => {
  it("restores focus to the previously focused element when the panel closes", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<FloatingPanelHarness isOpen={false} onClose={onClose} />);

    const returnTarget = screen.getByRole("button", { name: "Return target" });
    returnTarget.focus();
    expect(document.activeElement).toBe(returnTarget);

    rerender(<FloatingPanelHarness isOpen onClose={onClose} />);
    expect(await screen.findByRole("button", { name: "First action" })).toHaveFocus();

    rerender(<FloatingPanelHarness isOpen={false} onClose={onClose} />);

    await waitFor(() => {
      expect(document.activeElement).toBe(returnTarget);
    });
  });

  it("closes on Escape and still restores focus after the parent unmounts it", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<FloatingPanelHarness isOpen={false} onClose={onClose} />);

    const returnTarget = screen.getByRole("button", { name: "Return target" });
    returnTarget.focus();

    rerender(<FloatingPanelHarness isOpen onClose={onClose} />);
    const firstAction = await screen.findByRole("button", { name: "First action" });
    fireEvent.keyDown(firstAction, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<FloatingPanelHarness isOpen={false} onClose={onClose} />);

    await waitFor(() => {
      expect(document.activeElement).toBe(returnTarget);
    });
  });
});
