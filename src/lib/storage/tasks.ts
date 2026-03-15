import { invoke } from "@tauri-apps/api/core";
import type { TaskItem } from "../../models/task";

export async function loadTasks(vaultPath: string) {
  if (!vaultPath) {
    return [] as TaskItem[];
  }

  return invoke<TaskItem[]>("load_tasks", {
    path: vaultPath,
  });
}

export async function saveTasks(vaultPath: string, tasks: TaskItem[]) {
  if (!vaultPath) {
    return;
  }

  await invoke("save_tasks", {
    path: vaultPath,
    tasks,
  });
}
