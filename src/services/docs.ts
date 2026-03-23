import { invoke } from "@tauri-apps/api/core";
import type { Doc } from "@/models/doc";

export async function loadDocs(vaultPath: string) {
  if (!vaultPath) {
    return [] as Doc[];
  }

  return invoke<Doc[]>("list_docs", {
    path: vaultPath,
  });
}

export async function createDoc(vaultPath: string, doc: Doc) {
  if (!vaultPath) {
    return doc;
  }

  return invoke<Doc>("create_doc", {
    path: vaultPath,
    doc,
  });
}

export async function updateDoc(vaultPath: string, doc: Doc) {
  if (!vaultPath) {
    return doc;
  }

  return invoke<Doc>("update_doc", {
    path: vaultPath,
    doc,
  });
}

export async function deleteDoc(vaultPath: string, id: string) {
  if (!vaultPath) {
    return;
  }

  await invoke("delete_doc", {
    path: vaultPath,
    id,
  });
}
