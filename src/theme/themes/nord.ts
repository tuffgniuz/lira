import type { ThemeTokens } from "../theme-types";

export const nordTheme: ThemeTokens = {
  id: "nord",
  label: "Nord",
  colors: {
    appBg: "#242933",
    sidebarBg: "#2b3240",
    sidebarSurface: "#313b4c",
    mainBg: "#272f3b",
    panelBg: "#2f3948",
    panelMuted: "#262f3b",
    borderSubtle: "#445064",
    borderStrong: "#596983",
    textPrimary: "#e5e9f0",
    textSecondary: "#d8dee9",
    textMuted: "#a9b4c4",
    accent: "#88c0d0",
    accentHover: "#8fbcbb",
    activeBg: "#3b4659",
    activeText: "#f4f7fb",
    hoverBg: "#394558",
    focusRing: "#81a1c1",
    success: "#a3be8c",
    warning: "#ebcb8b",
    error: "#bf616a",
  },
  shadow: {
    panel: "0 24px 60px rgba(7, 11, 18, 0.38)",
  },
  radius: {
    sm: "10px",
    md: "16px",
    lg: "24px",
  },
};
