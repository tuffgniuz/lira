export type ThemeTokens = {
  id: string;
  label: string;
  colors: {
    appBg: string;
    sidebarBg: string;
    sidebarSurface: string;
    mainBg: string;
    panelBg: string;
    panelMuted: string;
    borderSubtle: string;
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    activeBg: string;
    activeText: string;
    hoverBg: string;
    focusRing: string;
    success: string;
    warning: string;
    error: string;
  };
  shadow: {
    panel: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
};
