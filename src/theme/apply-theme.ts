import type { ThemeTokens } from "./theme-types";

export function applyTheme(theme: ThemeTokens) {
  const root = document.documentElement;

  root.dataset.theme = theme.id;
  root.style.setProperty("--color-app-bg", theme.colors.appBg);
  root.style.setProperty("--color-sidebar-bg", theme.colors.sidebarBg);
  root.style.setProperty("--color-sidebar-surface", theme.colors.sidebarSurface);
  root.style.setProperty("--color-main-bg", theme.colors.mainBg);
  root.style.setProperty("--color-panel-bg", theme.colors.panelBg);
  root.style.setProperty("--color-panel-muted", theme.colors.panelMuted);
  root.style.setProperty("--color-border-subtle", theme.colors.borderSubtle);
  root.style.setProperty("--color-border-strong", theme.colors.borderStrong);
  root.style.setProperty("--color-text-primary", theme.colors.textPrimary);
  root.style.setProperty("--color-text-secondary", theme.colors.textSecondary);
  root.style.setProperty("--color-text-muted", theme.colors.textMuted);
  root.style.setProperty("--color-accent", theme.colors.accent);
  root.style.setProperty("--color-accent-hover", theme.colors.accentHover);
  root.style.setProperty("--color-active-bg", theme.colors.activeBg);
  root.style.setProperty("--color-active-text", theme.colors.activeText);
  root.style.setProperty("--color-hover-bg", theme.colors.hoverBg);
  root.style.setProperty("--color-focus-ring", theme.colors.focusRing);
  root.style.setProperty("--color-success", theme.colors.success);
  root.style.setProperty("--color-warning", theme.colors.warning);
  root.style.setProperty("--color-error", theme.colors.error);
  root.style.setProperty("--shadow-panel", theme.shadow.panel);
  root.style.setProperty("--radius-sm", theme.radius.sm);
  root.style.setProperty("--radius-md", theme.radius.md);
  root.style.setProperty("--radius-lg", theme.radius.lg);
}
