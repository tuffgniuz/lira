import { useEffect, useRef, useState } from "react";
import { FolderIcon, PaletteIcon, UserIcon } from "../../app/icons";
import type { ThemeColorToken } from "../../theme/theme-types";

type SettingsModalProps = {
  activeSection: "theme" | "profile" | "vault";
  onSectionChange: (section: "theme" | "profile" | "vault") => void;
  themes: Array<{
    id: string;
    label: string;
    colors: {
      sidebarSurface: string;
      panelBg: string;
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
  const accentMenuRef = useRef<HTMLDivElement | null>(null);
  const selectedAccent =
    accentOptions.find((option) => option.id === pendingAccentToken) ?? accentOptions[0];

  useEffect(() => {
    setAccentMenuOpen(false);
  }, [activeSection, pendingThemeId, pendingAccentToken]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!accentMenuRef.current?.contains(event.target as Node)) {
        setAccentMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccentMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="settings-modal__backdrop" role="presentation" onClick={onClose}>
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
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
                        style={{ backgroundColor: theme.colors.accent }}
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
                  <label className="vault-settings__field">
                    <span className="vault-settings__label">Name</span>
                    <input
                      type="text"
                      value={pendingProfileName}
                      onChange={(event) => onProfileNameChange(event.target.value)}
                      className="vault-settings__input"
                      placeholder="Your name"
                      aria-label="Profile name"
                    />
                  </label>

                  <label className="vault-settings__field">
                    <span className="vault-settings__label">Profile picture</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="profile-settings__file-input"
                      onChange={(event) => {
                        const [file] = Array.from(event.target.files ?? []);

                        if (!file) {
                          return;
                        }

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
                  </label>

                  {pendingProfilePicture ? (
                    <button
                      type="button"
                      className="profile-settings__clear"
                      onClick={() => onProfilePictureChange("")}
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
                <label className="vault-settings__field">
                  <span className="vault-settings__label">Vault path</span>
                  <input
                    type="text"
                    value={pendingVaultPath}
                    onChange={(event) => onVaultPathChange(event.target.value)}
                    className="vault-settings__input"
                    placeholder="/path/to/kenchi-vault"
                    aria-label="Vault path"
                  />
                </label>
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
            <button
              type="button"
              className="settings-modal__confirm"
              onClick={() => void onConfirm()}
            >
              Confirm
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
