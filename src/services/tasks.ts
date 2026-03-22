import { invoke } from "@tauri-apps/api/core";

export type PersistedTask = {
  id: string;
  title: string;
  description: string | null;
  lifecycleStatus: "active" | "archived" | "deleted";
  isCompleted: boolean;
  scheduleBucket: "inbox" | "today" | "upcoming" | "someday" | "none";
  priority: number | null;
  dueAt: string | null;
  completedAt: string | null;
  estimateMinutes: number | null;
  projectId: string | null;
  projectLaneId: string | null;
  sourceCaptureId: string | null;
  customFieldValues: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export async function updateTask(vaultPath: string, task: PersistedTask) {
  if (!vaultPath) {
    return;
  }

  await invoke("update_task", {
    path: vaultPath,
    task,
  });
}
