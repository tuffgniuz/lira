export type ProjectBoardLane = {
  id: string;
  name: string;
  order: number;
};

export function defaultProjectBoardLanes(projectId: string): ProjectBoardLane[] {
  return [
    {
      id: `${projectId}-lane-to-do`,
      name: "To Do",
      order: 0,
    },
    {
      id: `${projectId}-lane-in-progress`,
      name: "In Progress",
      order: 1,
    },
    {
      id: `${projectId}-lane-done`,
      name: "Done",
      order: 2,
    },
  ];
}

export function createProjectBoardLaneId(projectId: string, name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${projectId}-lane-${slug || Date.now().toString()}`;
}
