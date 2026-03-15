import { invoke } from "@tauri-apps/api/core";
import type { GoalItem } from "../../models/goal";

export async function loadGoals(vaultPath: string) {
  if (!vaultPath) {
    return [] as GoalItem[];
  }

  return invoke<GoalItem[]>("load_goals", {
    path: vaultPath,
  });
}

export async function saveGoals(vaultPath: string, goals: GoalItem[]) {
  if (!vaultPath) {
    return;
  }

  await invoke("save_goals", {
    path: vaultPath,
    goals,
  });
}
