import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewDocModal } from "./new-doc-modal";

describe("NewDocModal", () => {
  it("keeps fields accessible without rendering visible field labels", () => {
    render(
      <NewDocModal
        isOpen
        onClose={vi.fn()}
        projects={[
          { id: "project-1", name: "Lira" },
          { id: "project-2", name: "Atlas" },
        ]}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Doc title" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lira" })).toBeInTheDocument();

    expect(screen.queryByText("Title")).not.toBeInTheDocument();
    expect(screen.queryByText("Project")).not.toBeInTheDocument();
  });

  it("submits the selected project from project choice buttons", () => {
    const onSubmit = vi.fn();

    render(
      <NewDocModal
        isOpen
        onClose={vi.fn()}
        projects={[{ id: "project-1", name: "Lira" }]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Doc title" }), {
      target: { value: "Architecture notes" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lira" }));
    fireEvent.submit(screen.getByRole("textbox", { name: "Doc title" }).closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Architecture notes",
      body: "",
      projectId: "project-1",
      openDetailOnSuccess: true,
    });
  });

  it("submits from the title field with Enter", () => {
    const onSubmit = vi.fn();

    render(
      <NewDocModal
        isOpen
        onClose={vi.fn()}
        projects={[{ id: "project-1", name: "Lira" }]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Doc title" }), {
      target: { value: "Architecture notes" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Doc title" }), {
      key: "Enter",
    });

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Architecture notes",
      body: "",
      projectId: "",
      openDetailOnSuccess: true,
    });
  });
});
