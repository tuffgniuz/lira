import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickCaptureModal } from "./quick-capture-modal";

describe("QuickCaptureModal", () => {
  it("keeps the input accessible without rendering a visible field label", () => {
    render(<QuickCaptureModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: "Capture a thought" })).toBeInTheDocument();
    expect(screen.queryByText("Capture")).not.toBeInTheDocument();
  });
});
