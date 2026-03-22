import { invoke } from "@tauri-apps/api/core";
import type { UserProfile } from "@/models/profile";

export async function loadProfile(vaultPath: string) {
  if (!vaultPath) {
    return null as UserProfile | null;
  }

  return invoke<UserProfile | null>("load_profile", {
    path: vaultPath,
  });
}

export async function saveProfile(vaultPath: string, profile: UserProfile) {
  if (!vaultPath) {
    return;
  }

  await invoke("save_profile", {
    path: vaultPath,
    profile,
  });
}
