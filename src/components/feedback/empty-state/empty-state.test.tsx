import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";
import { Kbd } from "@/components/data-display/kbd";

describe("EmptyState", () => {
  it("renders a centered developer-oriented illustration by default without panel chrome", () => {
    render(
      <EmptyState
        badge="Inbox"
        title="No captured thoughts yet"
        copy={
          <>
            Use <Kbd>n</Kbd> <Kbd>i</Kbd> to capture something from anywhere in the app.
          </>
        }
      />,
    );

    expect(screen.getByTestId("empty-state-illustration")).toBeInTheDocument();
    expect(screen.getByText("No captured thoughts yet")).toBeInTheDocument();
    expect(screen.getByText(/Use/)).toBeInTheDocument();
    expect(screen.getAllByText("n")[0]).toBeInTheDocument();
    expect(screen.getAllByText("i")[0]).toBeInTheDocument();
    expect(screen.getByTestId("empty-state-root")).not.toHaveClass("ui-panel");
  });
});
