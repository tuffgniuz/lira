import type { ThemeTokens } from "../theme-types";

export const harborTheme: ThemeTokens = {
  id: "harbor",
  label: "Harbor",
  colors: {
    appBg: "#25282f",
    sidebarBg: "#24272d",
    sidebarSurface: "#2e333b",
    mainBg: "#282828",
    panelBg: "#2d3137",
    panelMuted: "#262a30",
    borderSubtle: "#39414c",
    borderStrong: "#4b5768",
    textPrimary: "#e6e9ef",
    textSecondary: "#cbd2dc",
    textMuted: "#98a3b3",
    accent: "#7aa2c9",
    accentHover: "#8eb4d8",
    activeBg: "#343c47",
    activeText: "#f5f7fb",
    hoverBg: "#313844",
    focusRing: "#88bfd5",
    success: "#88b48f",
    warning: "#d7ab63",
    error: "#d47c7c",
  },
  shadow: {
    panel: "0 24px 60px rgba(4, 8, 14, 0.4)",
  },
  radius: {
    sm: "10px",
    md: "16px",
    lg: "24px",
  },
};
