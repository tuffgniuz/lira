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

export type ThemeColorToken = keyof ThemeTokens["colors"];

export const themeColorTokenOrder: ThemeColorToken[] = [
  "accent",
  "accentHover",
  "focusRing",
  "success",
  "warning",
  "error",
  "activeBg",
  "activeText",
  "textPrimary",
  "textSecondary",
  "textMuted",
  "borderStrong",
  "borderSubtle",
  "hoverBg",
  "panelBg",
  "panelMuted",
  "mainBg",
  "sidebarSurface",
  "sidebarBg",
  "appBg",
];

function hexToRgb(value: string) {
  const normalized = value.trim().replace(/^#/, "");

  if (![3, 6].includes(normalized.length)) {
    return null;
  }

  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return { red, green, blue };
}

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue = 0;

  switch (max) {
    case r:
      hue = (g - b) / delta + (g < b ? 6 : 0);
      break;
    case g:
      hue = (b - r) / delta + 2;
      break;
    default:
      hue = (r - g) / delta + 4;
      break;
  }

  return { hue: hue * 60, saturation, lightness };
}

export function formatThemeColorToken(token: ThemeColorToken) {
  return token
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (value) => value.toUpperCase());
}

export function formatThemeColorName(value: string) {
  const rgb = hexToRgb(value);

  if (!rgb) {
    return "Custom";
  }

  const { hue, saturation, lightness } = rgbToHsl(rgb.red, rgb.green, rgb.blue);

  if (lightness <= 0.08) {
    return "Black";
  }

  if (lightness >= 0.92 && saturation <= 0.08) {
    return "White";
  }

  if (saturation <= 0.12) {
    return "Gray";
  }

  if (hue < 15 || hue >= 345) {
    return "Red";
  }

  if (hue < 40) {
    return "Orange";
  }

  if (hue < 68) {
    return "Yellow";
  }

  if (hue < 160) {
    return "Green";
  }

  if (hue < 200) {
    return "Cyan";
  }

  if (hue < 255) {
    return "Blue";
  }

  if (hue < 290) {
    return "Purple";
  }

  if (hue < 345) {
    return "Magenta";
  }

  return "Custom";
}
