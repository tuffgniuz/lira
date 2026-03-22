import { describe, expect, it } from "vitest";
import { readStoredVaultPath, vaultPathStorageKey } from "./navigation";

function createStorage(initialValues: Record<string, string>): Storage {
  const store = new Map(Object.entries(initialValues));

  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("navigation storage", () => {
  it("reads the current vault path key when present", () => {
    const storage = createStorage({
      [vaultPathStorageKey]: "/real/vault",
    });

    expect(readStoredVaultPath(storage)).toBe("/real/vault");
  });

  it("migrates a previous app vault path key that shares the same suffix", () => {
    const storage = createStorage({
      "legacy.vault-path": "/legacy/vault",
    });

    expect(readStoredVaultPath(storage)).toBe("/legacy/vault");
    expect(storage.getItem(vaultPathStorageKey)).toBe("/legacy/vault");
  });
});
