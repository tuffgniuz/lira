import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useDismissibleMenu } from "./use-dismissible-menu";

function DismissibleMenuHarness({
  isOpen = true,
  onDismiss = vi.fn(),
}: {
  isOpen?: boolean;
  onDismiss?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useDismissibleMenu({
    isOpen,
    containerRef,
    onDismiss,
  });

  return (
    <div>
      <div ref={containerRef} data-testid="inside">
        inside
      </div>
      <button type="button" data-testid="outside">
        outside
      </button>
    </div>
  );
}

describe("useDismissibleMenu", () => {
  it("dismisses on outside click and Escape, but not on inside click", () => {
    const onDismiss = vi.fn();

    render(<DismissibleMenuHarness onDismiss={onDismiss} />);

    fireEvent.mouseDown(screen.getByTestId("inside"));
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
