import type { ComponentType } from "react";

export type ViewId =
  | "dashboard"
  | "inbox"
  | "goals"
  | "tasks"
  | "projects"
  | "journaling";

export type NavItem = {
  id: Exclude<ViewId, "dashboard">;
  label: string;
  icon: ComponentType<{ className?: string }>;
};
