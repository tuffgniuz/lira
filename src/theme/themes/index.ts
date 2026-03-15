import { catppuccinTheme } from "./catppuccin";
import type { ThemeTokens } from "../theme-types";
import { gruvboxMaterialTheme } from "./gruvbox-material";
import { harborTheme } from "./harbor";
import { nordTheme } from "./nord";
import { oneDarkTheme } from "./one-dark";

export const builtInThemes: ThemeTokens[] = [
  gruvboxMaterialTheme,
  harborTheme,
  catppuccinTheme,
  nordTheme,
  oneDarkTheme,
];

export const defaultThemeId = gruvboxMaterialTheme.id;
