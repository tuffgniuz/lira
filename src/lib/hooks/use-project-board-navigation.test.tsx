import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectBoardNavigation } from "./use-project-board-navigation";
import { describe, expect, it, vi } from "vitest";

function ProjectBoardNavigationHarness({
  onSelectTask = vi.fn(),
}: {
  onSelectTask?: (taskId: string) => void;
}) {
  const state = useProjectBoardNavigation({
    boardLanes: [
      { id: "lane-backlog", name: "Backlog", order: 0 },
      { id: "lane-doing", name: "Doing", order: 1 },
    ],
    laneGroups: new Map([
      ["lane-backlog", [{ id: "task-newer" }, { id: "task-older" }]],
      ["lane-doing", [{ id: "task-doing" }]],
    ]),
    laneModalOpen: false,
    onSelectTask,
  });

  return (
    <>
      <p data-testid="lane">{state.activeLaneId}</p>
      <p data-testid="task">{state.activeTaskId}</p>
    </>
  );
}

describe("useProjectBoardNavigation", () => {
  it("focuses the first lane by default and moves lane/task focus from keyboard input", () => {
    const onSelectTask = vi.fn();
    render(<ProjectBoardNavigationHarness onSelectTask={onSelectTask} />);

    expect(screen.getByTestId("lane")).toHaveTextContent("lane-backlog");
    expect(screen.getByTestId("task")).toHaveTextContent("task-newer");

    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByTestId("task")).toHaveTextContent("task-older");

    fireEvent.keyDown(window, { key: "l" });
    expect(screen.getByTestId("lane")).toHaveTextContent("lane-doing");
    expect(screen.getByTestId("task")).toHaveTextContent("task-doing");

    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSelectTask).toHaveBeenCalledWith("task-doing");
  });
});
