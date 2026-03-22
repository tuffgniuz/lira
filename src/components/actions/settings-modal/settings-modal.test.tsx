import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsModal } from "./settings-modal";

describe("SettingsModal", () => {
  const baseProps = {
    onSectionChange: vi.fn(),
    themes: [],
    pendingThemeId: "",
    accentOptions: [],
    pendingAccentToken: "accent" as never,
    pendingProfileName: "User",
    pendingProfilePicture: "",
    pendingVaultPath: "",
    vaultError: "",
    onPreviewTheme: vi.fn(),
    onAccentTokenChange: vi.fn(),
    onProfileNameChange: vi.fn(),
    onProfilePictureChange: vi.fn(),
    onVaultPathChange: vi.fn(),
    onBrowseVault: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
  };

  it("displays the provided vault path in the vault settings field", () => {
    render(
      <SettingsModal
        activeSection="vault"
        {...baseProps}
        pendingVaultPath="~/.lira-dev-vault"
      />,
    );

    expect(screen.getByLabelText("Vault path")).toHaveValue("~/.lira-dev-vault");
  });

  it("uses a custom image picker button in profile settings", () => {
    render(<SettingsModal activeSection="profile" {...baseProps} />);

    expect(screen.getByRole("button", { name: "Select image" })).toBeInTheDocument();
    expect(screen.getByText("No image selected")).toBeInTheDocument();
    expect(screen.getByLabelText("Profile picture")).toHaveAttribute("type", "file");
  });
});
