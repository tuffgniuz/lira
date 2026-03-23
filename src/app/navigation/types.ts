import type { ComponentType } from "react";

export type ViewId =
  | "dashboard"
  | "inbox"
  | "docs"
  | "goals"
  | "tasks"
  | "projects";

export type NavItem = {
  id: Exclude<ViewId, "dashboard">;
  label: string;
  icon: ComponentType<{ className?: string }>;
};
