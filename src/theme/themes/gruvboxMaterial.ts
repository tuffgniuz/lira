import type { ThemeTokens } from "../theme-types";

export const gruvboxMaterialTheme: ThemeTokens = {
  id: "gruvbox-material",
  label: "Gruvbox Material",
  colors: {
    appBg: "#1d2021",
    sidebarBg: "#202523",
    sidebarSurface: "#282828",
    mainBg: "#242827",
    panelBg: "#2b2f2e",
    panelMuted: "#232827",
    borderSubtle: "#3a403d",
    borderStrong: "#4c5350",
    textPrimary: "#ebdbb2",
    textSecondary: "#d4c39c",
    textMuted: "#a89984",
    accent: "#a9b665",
    accentHover: "#c0ca75",
    activeBg: "#3c4841",
    activeText: "#f9f5d7",
    hoverBg: "#333938",
    focusRing: "#d8a657",
    success: "#a9b665",
    warning: "#d8a657",
    error: "#ea6962",
  },
  shadow: {
    panel: "0 24px 60px rgba(0, 0, 0, 0.35)",
  },
  radius: {
    sm: "10px",
    md: "16px",
    lg: "24px",
  },
};
