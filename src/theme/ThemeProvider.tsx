import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { applyTheme } from "./apply-theme";
import type { ThemeTokens } from "./theme-types";
import { builtInThemes, defaultThemeId } from "./themes";

type ThemeContextValue = {
  activeThemeId: string;
  themes: ThemeTokens[];
  previewTheme: (themeId: string) => void;
  applyThemeSelection: (themeId: string) => void;
  resetPreview: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getThemeById(themeId: string) {
  return builtInThemes.find((theme) => theme.id === themeId) ?? builtInThemes[0];
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [activeThemeId, setActiveThemeId] = useState(defaultThemeId);

  useEffect(() => {
    applyTheme(getThemeById(activeThemeId));
  }, [activeThemeId]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      activeThemeId,
      themes: builtInThemes,
      previewTheme: (themeId: string) => {
        applyTheme(getThemeById(themeId));
      },
      applyThemeSelection: (themeId: string) => {
        setActiveThemeId(themeId);
      },
      resetPreview: () => {
        applyTheme(getThemeById(activeThemeId));
      },
    }),
    [activeThemeId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
