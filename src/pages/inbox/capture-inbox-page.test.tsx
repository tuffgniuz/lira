import { fireEvent, render, screen, within } from "@testing-library/react";
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
            projectId: "",
            projectName: "Lira",
            tags: ["research"],
          },
        ]}
        projects={[]}
        onCreateCapture={vi.fn()}
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
            projectId: "",
            projectName: "",
            tags: [],
          },
        ]}
        projects={[
          { id: "project-1", name: "Lira" },
          { id: "project-2", name: "Atlas" },
        ]}
        onCreateCapture={vi.fn()}
        onConvertCaptureToTask={onConvertCaptureToTask}
        onConvertCaptureToGoal={vi.fn()}
        onUpdateCaptureState={vi.fn()}
        onDeleteCapture={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Task" }));
    expect(screen.getByText("Select project")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lira" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConvertCaptureToTask).toHaveBeenCalledWith("capture-1", "project-1");
  });

  it("supports keyboard navigation and action shortcuts for captures", () => {
    const onConvertCaptureToTask = vi.fn();
    const onConvertCaptureToGoal = vi.fn();
    const onUpdateCaptureState = vi.fn();

    render(
      <CaptureInboxPage
        captures={[
          {
            id: "capture-1",
            text: "Build a browser",
            state: "inbox",
            createdAt: "2026-03-21T12:00:00.000Z",
            projectId: "",
            projectName: "",
            tags: [],
          },
          {
            id: "capture-2",
            text: "Design a shell",
            state: "inbox",
            createdAt: "2026-03-22T12:00:00.000Z",
            projectId: "project-1",
            projectName: "Lira",
            tags: ["ui"],
          },
        ]}
        projects={[
          { id: "project-1", name: "Lira" },
          { id: "project-2", name: "Atlas" },
        ]}
        onCreateCapture={vi.fn()}
        onConvertCaptureToTask={onConvertCaptureToTask}
        onConvertCaptureToGoal={onConvertCaptureToGoal}
        onUpdateCaptureState={onUpdateCaptureState}
        onDeleteCapture={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    expect(screen.getByRole("row", { name: /Build a browser/i })).toHaveClass("is-active");

    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByRole("row", { name: /Design a shell/i })).toHaveClass("is-active");

    fireEvent.keyDown(window, { key: "t" });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConvertCaptureToTask).toHaveBeenCalledWith("capture-2", "project-1");

    fireEvent.keyDown(window, { key: "g" });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConvertCaptureToGoal).toHaveBeenCalledWith("capture-2", "project-1");

    fireEvent.keyDown(window, { key: "s" });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onUpdateCaptureState).toHaveBeenCalledWith("capture-2", "someday");

    fireEvent.keyDown(window, { key: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onUpdateCaptureState).toHaveBeenCalledWith("capture-2", "archived");
  });

  it("opens delete confirmation with d d for the selected capture", () => {
    const onDeleteCapture = vi.fn();

    render(
      <CaptureInboxPage
        captures={[
          {
            id: "capture-1",
            text: "Build a browser",
            state: "inbox",
            createdAt: "2026-03-21T12:00:00.000Z",
            projectId: "",
            projectName: "",
            tags: [],
          },
          {
            id: "capture-2",
            text: "Design a shell",
            state: "inbox",
            createdAt: "2026-03-22T12:00:00.000Z",
            projectId: "",
            projectName: "Lira",
            tags: ["ui"],
          },
        ]}
        projects={[]}
        onCreateCapture={vi.fn()}
        onConvertCaptureToTask={vi.fn()}
        onConvertCaptureToGoal={vi.fn()}
        onUpdateCaptureState={vi.fn()}
        onDeleteCapture={onDeleteCapture}
        onNotify={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: "j" });
    fireEvent.keyDown(window, { key: "d" });
    fireEvent.keyDown(window, { key: "d" });

    expect(screen.getByText("Delete item")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onDeleteCapture).toHaveBeenCalledWith("capture-2");
  });

  it("switches inbox filters with number keys", () => {
    render(
      <CaptureInboxPage
        captures={[
          {
            id: "capture-1",
            text: "Inbox item",
            state: "inbox",
            createdAt: "2026-03-21T12:00:00.000Z",
            projectId: "",
            projectName: "",
            tags: [],
          },
          {
            id: "capture-2",
            text: "Someday item",
            state: "someday",
            createdAt: "2026-03-22T12:00:00.000Z",
            projectId: "",
            projectName: "",
            tags: [],
          },
          {
            id: "capture-3",
            text: "Archived item",
            state: "archived",
            createdAt: "2026-03-23T12:00:00.000Z",
            projectId: "",
            projectName: "",
            tags: [],
          },
        ]}
        projects={[]}
        onCreateCapture={vi.fn()}
        onConvertCaptureToTask={vi.fn()}
        onConvertCaptureToGoal={vi.fn()}
        onUpdateCaptureState={vi.fn()}
        onDeleteCapture={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    const filters = screen.getByLabelText("Inbox filters");

    expect(within(filters).getByRole("button", { name: "Inbox" })).toHaveClass("inbox-filter--active");
    expect(screen.getByText("Inbox item")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "2" });
    expect(within(filters).getByRole("button", { name: "Someday" })).toHaveClass("inbox-filter--active");
    expect(screen.getByText("Someday item")).toBeInTheDocument();
    expect(screen.queryByText("Inbox item")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "3" });
    expect(within(filters).getByRole("button", { name: "Archived" })).toHaveClass("inbox-filter--active");
    expect(screen.getByText("Archived item")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "4" });
    expect(within(filters).getByRole("button", { name: "All" })).toHaveClass("inbox-filter--active");
    expect(screen.getByText("Inbox item")).toBeInTheDocument();
    expect(screen.getByText("Someday item")).toBeInTheDocument();
    expect(screen.getByText("Archived item")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "1" });
    expect(within(filters).getByRole("button", { name: "Inbox" })).toHaveClass("inbox-filter--active");
    expect(screen.getByText("Inbox item")).toBeInTheDocument();
    expect(screen.queryByText("Someday item")).not.toBeInTheDocument();
  });

  it("shows a count badge for each inbox filter", () => {
    render(
      <CaptureInboxPage
        captures={[
          {
            id: "capture-1",
            text: "Inbox item",
            state: "inbox",
            createdAt: "2026-03-21T12:00:00.000Z",
            projectId: "",
            projectName: "",
            tags: [],
          },
          {
            id: "capture-2",
            text: "Second inbox item",
            state: "inbox",
            createdAt: "2026-03-22T12:00:00.000Z",
            projectId: "",
            projectName: "",
            tags: [],
          },
          {
            id: "capture-3",
            text: "Someday item",
            state: "someday",
            createdAt: "2026-03-23T12:00:00.000Z",
            projectId: "",
            projectName: "",
            tags: [],
          },
          {
            id: "capture-4",
            text: "Archived item",
            state: "archived",
            createdAt: "2026-03-24T12:00:00.000Z",
            projectId: "",
            projectName: "",
            tags: [],
          },
        ]}
        projects={[]}
        onCreateCapture={vi.fn()}
        onConvertCaptureToTask={vi.fn()}
        onConvertCaptureToGoal={vi.fn()}
        onUpdateCaptureState={vi.fn()}
        onDeleteCapture={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    const filters = screen.getByLabelText("Inbox filters");

    expect(within(within(filters).getByRole("button", { name: "Inbox" })).getByText("2")).toBeInTheDocument();
    expect(within(within(filters).getByRole("button", { name: "Someday" })).getByText("1")).toBeInTheDocument();
    expect(within(within(filters).getByRole("button", { name: "Archived" })).getByText("1")).toBeInTheDocument();
    expect(within(within(filters).getByRole("button", { name: "All" })).getByText("4")).toBeInTheDocument();
  });

  it("creates a new capture inline with n", () => {
    const onCreateCapture = vi.fn();

    render(
      <CaptureInboxPage
        captures={[
          {
            id: "capture-1",
            text: "Existing capture",
            state: "inbox",
            createdAt: "2026-03-21T12:00:00.000Z",
            projectId: "",
            projectName: "",
            tags: [],
          },
        ]}
        projects={[]}
        onCreateCapture={onCreateCapture}
        onConvertCaptureToTask={vi.fn()}
        onConvertCaptureToGoal={vi.fn()}
        onUpdateCaptureState={vi.fn()}
        onDeleteCapture={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: "n" });

    const draftInput = screen.getByRole("textbox", { name: "New capture text" });
    fireEvent.change(draftInput, {
      target: { value: "Capture from inbox page" },
    });
    fireEvent.keyDown(draftInput, { key: "Enter" });

    expect(onCreateCapture).toHaveBeenCalledWith("Capture from inbox page");
  });
});
