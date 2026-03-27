import type { ProjectBoardLane } from "./project-board";

export type ProjectTaskTemplateFieldType = "text" | "boolean" | "number" | "date";

export type ProjectTaskTemplateField = {
  id: string;
  key: string;
  label: string;
  type: ProjectTaskTemplateFieldType;
};

export type ProjectTaskTemplate = {
  descriptionTemplate: string;
  fields: ProjectTaskTemplateField[];
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  hasKanbanBoard: boolean;
  taskTemplate?: ProjectTaskTemplate;
  boardLanes: ProjectBoardLane[];
  createdAt: string;
  updatedAt: string;
};
