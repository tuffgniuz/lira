import { getProjectName } from "@/lib/domain/project-relations";
import type { Project } from "@/models/project";
import type { Item } from "@/models/workspace-item";

export type InboxCaptureState = Extract<Item["state"], "inbox" | "someday" | "active" | "archived">;

export type InboxCaptureView = {
  id: string;
  text: string;
  state: InboxCaptureState;
  createdAt: string;
  projectId?: string;
  projectName: string;
  tags: string[];
};

export function buildInboxCaptureViews(items: Item[], projects: Project[]): InboxCaptureView[] {
  return items
    .filter((item): item is Item & { kind: "capture"; state: InboxCaptureState } => {
      return item.kind === "capture" && item.state !== "deleted";
    })
    .map((item) => ({
      id: item.id,
      text: item.content || item.title,
      state: item.state,
      createdAt: item.createdAt,
      projectId: item.projectId,
      projectName: getProjectName(projects, item.projectId, item.project),
      tags: item.tags,
    }));
}
