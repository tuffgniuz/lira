import type { Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";

function hasProjectScope(item: Item) {
  return item.goalScope?.projectId;
}

export function getProjectName(projects: Project[], projectId?: string, fallbackName = "") {
  if (!projectId) {
    return fallbackName;
  }

  return projects.find((project) => project.id === projectId)?.name ?? fallbackName;
}

export function attachProjectIdsFromNames(items: Item[], projects: Project[]) {
  const projectIdsByName = new Map(projects.map((project) => [project.name, project.id]));

  let changed = false;
  const nextItems = items.map((item) => {
    if (item.projectId || !item.project) {
      return item;
    }

    const projectId = projectIdsByName.get(item.project);

    if (!projectId) {
      return item;
    }

    changed = true;

    return {
      ...item,
      projectId,
    };
  });

  return changed ? nextItems : items;
}

export function clearProjectReferences(items: Item[], projectId: string) {
  let changed = false;

  const nextItems = items.map((item) => {
    if (item.kind === "task" && item.projectId === projectId) {
      changed = true;
      return {
        ...item,
        projectId: undefined,
        project: "",
      };
    }

    if (item.kind === "goal" && hasProjectScope(item) === projectId) {
      changed = true;
      const nextGoalScope = { ...item.goalScope };
      delete nextGoalScope.projectId;

      return {
        ...item,
        goalScope:
          nextGoalScope.tag || nextGoalScope.taskIds?.length ? nextGoalScope : undefined,
      };
    }

    return item;
  });

  return changed ? nextItems : items;
}
