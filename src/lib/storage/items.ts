import { invoke } from "@tauri-apps/api/core";
import type { Item } from "../../models/item";

export async function loadItems(vaultPath: string) {
  if (!vaultPath) {
    return [] as Item[];
  }

  return invoke<Item[]>("load_items", {
    path: vaultPath,
  });
}

export async function saveItems(vaultPath: string, items: Item[]) {
  if (!vaultPath) {
    return;
  }

  await invoke("save_items", {
    path: vaultPath,
    items,
  });
}
