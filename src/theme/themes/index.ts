import { catppuccinTheme } from "./catppuccin";
import type { ThemeTokens } from "../theme-types";
import { harborTheme } from "./harbor";
import { nordTheme } from "./nord";
import { oneDarkTheme } from "./one-dark";
import { rozejinTheme } from "./rozejin";

export const builtInThemes: ThemeTokens[] = [
  rozejinTheme,
  harborTheme,
  catppuccinTheme,
  nordTheme,
  oneDarkTheme,
];

export const defaultThemeId = rozejinTheme.id;
