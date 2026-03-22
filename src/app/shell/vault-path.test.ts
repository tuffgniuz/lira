import { describe, expect, it } from "vitest";
import {
  defaultDevelopmentVaultPath,
  getInitialVaultPath,
  shouldAutoInitializeDevelopmentVault,
} from "./vault-path";

describe("vault-path", () => {
  it("uses the stored vault path when present", () => {
    expect(getInitialVaultPath("/real/vault", true)).toBe("/real/vault");
  });

  it("uses a development default only in development when storage is empty", () => {
    expect(getInitialVaultPath("", true)).toBe(defaultDevelopmentVaultPath);
    expect(getInitialVaultPath("", false)).toBe("");
  });

  it("only auto-initializes the development vault when no stored path exists", () => {
    expect(shouldAutoInitializeDevelopmentVault("", true)).toBe(true);
    expect(shouldAutoInitializeDevelopmentVault("/real/vault", true)).toBe(false);
    expect(shouldAutoInitializeDevelopmentVault("", false)).toBe(false);
  });
});
