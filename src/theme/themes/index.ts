import { catppuccinTheme } from "./catppuccin";
import type { ThemeTokens } from "../theme-types";
import { gruvboxMaterialTheme } from "./gruvboxMaterial";
import { nordTheme } from "./nord";
import { oneDarkTheme } from "./oneDark";

export const builtInThemes: ThemeTokens[] = [
  gruvboxMaterialTheme,
  catppuccinTheme,
  nordTheme,
  oneDarkTheme,
];

export const defaultThemeId = gruvboxMaterialTheme.id;
