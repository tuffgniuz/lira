import { invoke } from "@tauri-apps/api/core";
import type { Project } from "@/models/project";

export async function loadProjects(vaultPath: string) {
  if (!vaultPath) {
    return [] as Project[];
  }

  return invoke<Project[]>("load_projects", {
    path: vaultPath,
  });
}

export async function saveProjects(vaultPath: string, projects: Project[]) {
  if (!vaultPath) {
    return;
  }

  await invoke("save_projects", {
    path: vaultPath,
    projects,
  });
}
