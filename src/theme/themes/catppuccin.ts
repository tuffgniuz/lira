import type { ThemeTokens } from "../theme-types";

export const catppuccinTheme: ThemeTokens = {
  id: "catppuccin",
  label: "Catppuccin",
  colors: {
    appBg: "#1e1e2e",
    sidebarBg: "#181825",
    sidebarSurface: "#24273a",
    mainBg: "#1a1b26",
    panelBg: "#24273a",
    panelMuted: "#1f2335",
    borderSubtle: "#313244",
    borderStrong: "#45475a",
    textPrimary: "#cdd6f4",
    textSecondary: "#bac2de",
    textMuted: "#a6adc8",
    accent: "#8caaee",
    accentHover: "#b4befe",
    activeBg: "#313244",
    activeText: "#eff1f5",
    hoverBg: "#2a2b3c",
    focusRing: "#f5c2e7",
    success: "#a6e3a1",
    warning: "#f9e2af",
    error: "#f38ba8",
  },
  shadow: {
    panel: "0 24px 60px rgba(0, 0, 0, 0.34)",
  },
  radius: {
    sm: "10px",
    md: "16px",
    lg: "24px",
  },
};
