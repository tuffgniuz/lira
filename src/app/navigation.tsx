import type { NavItem, ViewId } from "./types";
import {
  BookOpenIcon,
  CalendarIcon,
  CheckSquareIcon,
  InboxIcon,
  LayersIcon,
  TargetIcon,
} from "./icons";

export const pageSequence = ["g", "t", "p"];
export const newInboxItemSequence = ["n", "i"];
export const newGoalSequence = ["n", "g"];
export const newTaskSequence = ["n", "t"];
export const vaultPathStorageKey = "kenchi.vault-path";

export const navigationItems: NavItem[] = [
  { id: "inbox", label: "Capture Inbox", icon: InboxIcon },
  { id: "goals", label: "Goals", icon: TargetIcon },
  { id: "tasks", label: "Tasks", icon: CheckSquareIcon },
  { id: "projects", label: "Projects", icon: LayersIcon },
  { id: "journaling", label: "Journaling", icon: BookOpenIcon },
  { id: "calendar", label: "Calendar", icon: CalendarIcon },
];

export const viewTitles: Record<ViewId, string> = {
  dashboard: "Dashboard",
  inbox: "Capture Inbox",
  goals: "Goals",
  tasks: "Tasks",
  projects: "Projects",
  journaling: "Journaling",
  calendar: "Calendar",
};
