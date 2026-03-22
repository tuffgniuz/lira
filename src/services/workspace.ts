import { invoke } from "@tauri-apps/api/core";
import type { WorkspaceItem } from "@/models/workspace-item";

export async function loadWorkspaceItems(vaultPath: string) {
  if (!vaultPath) {
    return [] as WorkspaceItem[];
  }

  return invoke<WorkspaceItem[]>("load_workspace_items", {
    path: vaultPath,
  });
}

export async function replaceWorkspaceItems(vaultPath: string, items: WorkspaceItem[]) {
  if (!vaultPath) {
    return;
  }

  await invoke("replace_workspace_items", {
    path: vaultPath,
    items,
  });
}
