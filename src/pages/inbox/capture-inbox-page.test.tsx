import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CaptureInboxPage } from "./capture-inbox-page";

describe("CaptureInboxPage", () => {
  it("shows capture-specific columns and does not offer an unsupported document conversion", () => {
    render(
      <CaptureInboxPage
        captures={[
          {
            id: "capture-1",
            text: "Build a browser",
            state: "inbox",
            createdAt: "2026-03-21T12:00:00.000Z",
            projectName: "Lira",
            tags: ["research"],
          },
        ]}
        onConvertCaptureToTask={vi.fn()}
        onConvertCaptureToGoal={vi.fn()}
        onUpdateCaptureState={vi.fn()}
        onDeleteCapture={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    expect(screen.queryByRole("columnheader", { name: "Kind" })).not.toBeInTheDocument();
    expect(screen.getByText("Lira")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Document" })).not.toBeInTheDocument();
  });

  it("confirms task conversion through the capture-specific action", () => {
    const onConvertCaptureToTask = vi.fn();

    render(
      <CaptureInboxPage
        captures={[
          {
            id: "capture-1",
            text: "Build a browser",
            state: "inbox",
            createdAt: "2026-03-21T12:00:00.000Z",
            projectName: "",
            tags: [],
          },
        ]}
        onConvertCaptureToTask={onConvertCaptureToTask}
        onConvertCaptureToGoal={vi.fn()}
        onUpdateCaptureState={vi.fn()}
        onDeleteCapture={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Task" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConvertCaptureToTask).toHaveBeenCalledWith("capture-1");
  });
});
