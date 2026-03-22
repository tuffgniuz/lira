import { useEffect, useRef, useState } from "react";
import { FolderIcon, PaletteIcon, UserIcon } from "@/components/icons";
import { ActionBar } from "@/components/actions/action-bar";
import { FormField } from "@/components/data-input/form-field";
import { Modal } from "@/components/actions/modal";
import { useDismissibleMenu } from "@/lib/hooks/use-dismissible-menu";
import type { ThemeColorToken } from "@/theme/theme-types";

type SettingsModalProps = {
  activeSection: "theme" | "profile" | "vault";
  onSectionChange: (section: "theme" | "profile" | "vault") => void;
  themes: Array<{
    id: string;
    label: string;
    colors: {
      sidebarSurface: string;
      panelBg: string;
      surfaceElevated: string;
      accent: string;
      textPrimary: string;
      textMuted: string;
    };
  }>;
  pendingThemeId: string;
  accentOptions: Array<{
    id: ThemeColorToken;
    label: string;
    tokenLabel: string;
    color: string;
  }>;
  pendingAccentToken: ThemeColorToken;
  pendingProfileName: string;
  pendingProfilePicture: string;
  pendingVaultPath: string;
  vaultError: string;
  onPreviewTheme: (themeId: string) => void;
  onAccentTokenChange: (token: ThemeColorToken) => void;
  onProfileNameChange: (name: string) => void;
  onProfilePictureChange: (picture: string) => void;
  onVaultPathChange: (path: string) => void;
  onBrowseVault: () => Promise<void>;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function SettingsModal({
  activeSection,
  onSectionChange,
  themes,
  pendingThemeId,
  accentOptions,
  pendingAccentToken,
  pendingProfileName,
  pendingProfilePicture,
  pendingVaultPath,
  vaultError,
  onPreviewTheme,
  onAccentTokenChange,
  onProfileNameChange,
  onProfilePictureChange,
  onVaultPathChange,
  onBrowseVault,
  onClose,
  onConfirm,
}: SettingsModalProps) {
  const [accentMenuOpen, setAccentMenuOpen] = useState(false);
  const [profileImageLabel, setProfileImageLabel] = useState("No image selected");
  const accentMenuRef = useRef<HTMLDivElement | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);
  const selectedAccent =
    accentOptions.find((option) => option.id === pendingAccentToken) ?? accentOptions[0];

  useEffect(() => {
    setAccentMenuOpen(false);
  }, [activeSection, pendingThemeId, pendingAccentToken]);

  useEffect(() => {
    setProfileImageLabel(pendingProfilePicture ? "Image selected" : "No image selected");
  }, [pendingProfilePicture]);

  useDismissibleMenu({
    isOpen: accentMenuOpen,
    containerRef: accentMenuRef,
    onDismiss: () => setAccentMenuOpen(false),
  });

  return (
    <Modal className="settings-modal" ariaLabelledBy="settings-title" onClose={onClose}>
        <aside className="settings-modal__sidebar">
          <div className="settings-modal__sidebar-top">
            <p id="settings-title" className="settings-modal__eyebrow">
              Settings
            </p>
          </div>

          <nav className="settings-nav" aria-label="Settings sections">
            <button
              type="button"
              className={`settings-nav__button ${
                activeSection === "theme" ? "is-active" : ""
              }`}
              onClick={() => onSectionChange("theme")}
            >
              <PaletteIcon className="nav-icon" />
              <span>Theme</span>
            </button>
            <button
              type="button"
              className={`settings-nav__button ${
                activeSection === "profile" ? "is-active" : ""
              }`}
              onClick={() => onSectionChange("profile")}
            >
              <UserIcon className="nav-icon" />
              <span>Profile</span>
            </button>
            <button
              type="button"
              className={`settings-nav__button ${
                activeSection === "vault" ? "is-active" : ""
              }`}
              onClick={() => onSectionChange("vault")}
            >
              <FolderIcon className="nav-icon" />
              <span>Vault</span>
            </button>
          </nav>
        </aside>

        <div className="settings-modal__content">
          {activeSection === "theme" ? (
            <div className="settings-panel">
              <div className="settings-panel__header">
                <div>
                  <p className="settings-modal__eyebrow">Appearance</p>
                  <h3 className="settings-panel__title">Theme</h3>
                </div>
              </div>

              <div className="theme-grid">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-card ${
                      pendingThemeId === theme.id ? "is-selected" : ""
                    }`}
                    onClick={() => onPreviewTheme(theme.id)}
                  >
                    <div className="theme-card__preview">
                      <span
                        className="theme-card__swatch"
                        style={{ backgroundColor: theme.colors.sidebarSurface }}
                      />
                      <span
                        className="theme-card__swatch"
                        style={{ backgroundColor: theme.colors.panelBg }}
                      />
                      <span
                        className="theme-card__swatch"
                        style={{ backgroundColor: theme.colors.surfaceElevated }}
                      />
                      <span
                        className="theme-card__swatch"
                        style={{ backgroundColor: theme.colors.textPrimary }}
                      />
                    </div>
                    <div className="theme-card__copy">
                      <span className="theme-card__label">{theme.label}</span>
                      <span className="theme-card__meta">{theme.id}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="accent-picker">
                <div className="accent-picker__header">
                  <label className="vault-settings__label" htmlFor="theme-accent-trigger">
                    Accent token
                  </label>
                  <p className="accent-picker__hint">
                    Use any token from the selected theme as the accent color.
                  </p>
                </div>

                <div className="accent-select" ref={accentMenuRef}>
                  <button
                    id="theme-accent-trigger"
                    type="button"
                    className={`accent-select__trigger ${
                      accentMenuOpen ? "is-open" : ""
                    }`}
                    aria-haspopup="listbox"
                    aria-expanded={accentMenuOpen}
                    onClick={() => setAccentMenuOpen((current) => !current)}
                  >
                    {selectedAccent ? (
                      <span className="accent-select__value">
                        <span
                          className="accent-select__swatch"
                          style={{ backgroundColor: selectedAccent.color }}
                        />
                        <span>{selectedAccent.label}</span>
                      </span>
                    ) : null}
                    <span className="accent-select__chevron" aria-hidden="true">
                      {accentMenuOpen ? "−" : "+"}
                    </span>
                  </button>

                  {accentMenuOpen ? (
                    <div className="accent-select__menu" role="listbox">
                      {accentOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          role="option"
                          aria-selected={option.id === pendingAccentToken}
                          className={`accent-select__option ${
                            option.id === pendingAccentToken ? "is-selected" : ""
                          }`}
                          onClick={() => {
                            onAccentTokenChange(option.id);
                            setAccentMenuOpen(false);
                          }}
                        >
                          <span
                            className="accent-select__swatch"
                            style={{ backgroundColor: option.color }}
                          />
                          <span className="accent-select__option-copy">
                            <span>{option.label}</span>
                            <span className="accent-select__option-meta">
                              {option.tokenLabel}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : activeSection === "profile" ? (
            <div className="settings-panel">
              <div className="settings-panel__header">
                <div>
                  <p className="settings-modal__eyebrow">Identity</p>
                  <h3 className="settings-panel__title">Profile</h3>
                </div>
              </div>

              <div className="profile-settings">
                <div className="profile-settings__preview">
                  {pendingProfilePicture ? (
                    <img
                      src={pendingProfilePicture}
                      alt=""
                      className="profile-settings__avatar-image"
                    />
                  ) : (
                    <span className="profile-settings__avatar-fallback" aria-hidden="true">
                      {(pendingProfileName.trim() || "U").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="profile-settings__fields">
                  <FormField label="Name" className="vault-settings__field">
                    <input
                      type="text"
                      value={pendingProfileName}
                      onChange={(event) => onProfileNameChange(event.target.value)}
                      className="vault-settings__input ui-input"
                      placeholder="Your name"
                      aria-label="Profile name"
                    />
                  </FormField>

                  <FormField label="Profile picture" className="vault-settings__field">
                    <div className="profile-settings__file-picker">
                      <input
                        ref={profileImageInputRef}
                        type="file"
                        accept="image/*"
                        className="profile-settings__file-input"
                        aria-label="Profile picture"
                        onChange={(event) => {
                          const [file] = Array.from(event.target.files ?? []);

                          if (!file) {
                            return;
                          }

                          setProfileImageLabel(file.name);

                          const reader = new FileReader();

                          reader.onload = () => {
                            if (typeof reader.result === "string") {
                              onProfilePictureChange(reader.result);
                            }
                          };

                          reader.readAsDataURL(file);
                          event.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        className="profile-settings__file-button"
                        onClick={() => profileImageInputRef.current?.click()}
                      >
                        Select image
                      </button>
                      <span className="profile-settings__file-name">{profileImageLabel}</span>
                    </div>
                  </FormField>

                  {pendingProfilePicture ? (
                    <button
                      type="button"
                      className="profile-settings__clear"
                      onClick={() => {
                        onProfilePictureChange("");
                        setProfileImageLabel("No image selected");
                      }}
                    >
                      Remove picture
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="settings-panel">
              <div className="settings-panel__header">
                <div>
                  <p className="settings-modal__eyebrow">Storage</p>
                  <h3 className="settings-panel__title">Vault</h3>
                </div>
              </div>

              <div className="vault-settings">
                <FormField label="Vault path" className="vault-settings__field">
                  <input
                    type="text"
                    value={pendingVaultPath}
                    onChange={(event) => onVaultPathChange(event.target.value)}
                    className="vault-settings__input ui-input"
                    placeholder="/path/to/lira-vault"
                    aria-label="Vault path"
                  />
                </FormField>
                <button
                  type="button"
                  className="vault-settings__browse"
                  onClick={() => void onBrowseVault()}
                >
                  Choose directory
                </button>
                <p className="vault-settings__hint">
                  Vaults stay local-first. Choosing a synced folder later should remain
                  compatible with future sync workflows.
                </p>
                {vaultError ? <p className="vault-settings__error">{vaultError}</p> : null}
              </div>
            </div>
          )}

          <div className="settings-modal__footer">
            <ActionBar>
              <button
                type="button"
                className="settings-modal__confirm"
                onClick={() => void onConfirm()}
              >
                Confirm
              </button>
            </ActionBar>
          </div>
        </div>
    </Modal>
  );
}
