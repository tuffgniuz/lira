import type { ThemeTokens } from "../theme-types";

export const oneDarkTheme: ThemeTokens = {
  id: "one-dark",
  label: "One Dark",
  colors: {
    appBg: "#1f232b",
    sidebarBg: "#232833",
    sidebarSurface: "#2a303b",
    mainBg: "#222731",
    panelBg: "#2c323c",
    panelMuted: "#232933",
    borderSubtle: "#3b4454",
    borderStrong: "#4f5b70",
    textPrimary: "#d7dae0",
    textSecondary: "#c8ccd4",
    textMuted: "#8d96a7",
    accent: "#98c379",
    accentHover: "#7fc1a5",
    activeBg: "#394150",
    activeText: "#f3f4f7",
    hoverBg: "#333b49",
    focusRing: "#e5c07b",
    success: "#98c379",
    warning: "#e5c07b",
    error: "#e06c75",
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
