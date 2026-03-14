import { invoke } from "@tauri-apps/api/core";
import type { CaptureItem } from "../../models/capture";

export async function loadInboxItems(vaultPath: string) {
  if (!vaultPath) {
    return [] as CaptureItem[];
  }

  return invoke<CaptureItem[]>("load_inbox_items", {
    path: vaultPath,
  });
}

export async function saveInboxItems(vaultPath: string, items: CaptureItem[]) {
  if (!vaultPath) {
    return;
  }

  await invoke("save_inbox_items", {
    path: vaultPath,
    items,
  });
}
