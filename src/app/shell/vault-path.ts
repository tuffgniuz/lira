export const defaultDevelopmentVaultPath = "~/.lira-dev-vault";

export function getInitialVaultPath(storedVaultPath: string | null, isDevelopment: boolean) {
  const normalizedStoredVaultPath = storedVaultPath?.trim() ?? "";

  if (normalizedStoredVaultPath) {
    return normalizedStoredVaultPath;
  }

  if (isDevelopment) {
    return defaultDevelopmentVaultPath;
  }

  return "";
}

export function shouldAutoInitializeDevelopmentVault(
  storedVaultPath: string | null,
  isDevelopment: boolean,
) {
  const normalizedStoredVaultPath = storedVaultPath?.trim() ?? "";
  return isDevelopment && !normalizedStoredVaultPath;
}
