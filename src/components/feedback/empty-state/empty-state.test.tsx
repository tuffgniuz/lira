import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders a centered developer-oriented illustration by default without panel chrome", () => {
    render(
      <EmptyState
        badge="Inbox"
        title="No captured thoughts yet"
        copy="Use `n i` to capture something from anywhere in the app."
      />,
    );

    expect(screen.getByTestId("empty-state-illustration")).toBeInTheDocument();
    expect(screen.getByText("No captured thoughts yet")).toBeInTheDocument();
    expect(screen.getByText("Use `n i` to capture something from anywhere in the app.")).toBeInTheDocument();
    expect(screen.getByTestId("empty-state-root")).not.toHaveClass("ui-panel");
  });
});
