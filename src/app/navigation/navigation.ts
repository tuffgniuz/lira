import type { NavItem, ViewId } from "./types";
import {
  BookOpenIcon,
  CheckSquareIcon,
  InboxIcon,
  LayersIcon,
  TargetIcon,
} from "@/components/icons";

export const vaultPathStorageKey = "lira.vault-path";

function findStoredValueBySuffix(storage: Storage, suffix: string) {
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (!key?.endsWith(suffix)) {
      continue;
    }

    const value = storage.getItem(key)?.trim();

    if (value) {
      storage.setItem(vaultPathStorageKey, value);
      return value;
    }
  }

  return null;
}

export function readStoredVaultPath(storage: Storage) {
  const currentValue = storage.getItem(vaultPathStorageKey)?.trim();

  if (currentValue) {
    return currentValue;
  }

  return findStoredValueBySuffix(storage, ".vault-path");
}

export const navigationItems: NavItem[] = [
  { id: "inbox", label: "Capture Inbox", icon: InboxIcon },
  { id: "goals", label: "Goals", icon: TargetIcon },
  { id: "tasks", label: "Tasks", icon: CheckSquareIcon },
  { id: "projects", label: "Projects", icon: LayersIcon },
  { id: "journaling", label: "Journaling", icon: BookOpenIcon },
];

export const viewTitles: Record<ViewId, string> = {
  dashboard: "Dashboard",
  inbox: "Capture Inbox",
  goals: "Goals",
  tasks: "Tasks",
  projects: "Projects",
  journaling: "Journaling",
};
