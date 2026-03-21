import type { ProjectBoardLane } from "./project-board";

export type Project = {
  id: string;
  name: string;
  description: string;
  boardLanes: ProjectBoardLane[];
  createdAt: string;
  updatedAt: string;
};
