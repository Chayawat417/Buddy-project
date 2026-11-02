export type VisualTheme =
  | "classic"
  | "pit-wall"
  | "heritage"
  | "telemetry"
  | "cockpit"
  | "editorial";
export type ColorMode = "light" | "dark";
export type ThemeSelection = `${VisualTheme}:${ColorMode}`;

export interface ThemePreferences {
  visualTheme: VisualTheme;
  colorMode: ColorMode;
}

const visualThemeStorageKey = "buddy-visual-theme";
const colorModeStorageKey = "buddy-theme";

export const defaultThemePreferences: ThemePreferences = {
  visualTheme: "pit-wall",
  colorMode: "light",
};

const metaThemeColors: Record<VisualTheme, Record<ColorMode, string>> = {
  classic: { light: "#f5f6f7", dark: "#171a1d" },
  "pit-wall": { light: "#f4f5f2", dark: "#151b21" },
  heritage: { light: "#f2efe6", dark: "#171d19" },
  telemetry: { light: "#f3f6f8", dark: "#101a23" },
  cockpit: { light: "#f1f3f5", dark: "#14171a" },
  editorial: { light: "#f3f1ec", dark: "#18171a" },
};

export function getThemeSelection({
  visualTheme,
  colorMode,
}: ThemePreferences): ThemeSelection {
  return `${visualTheme}:${colorMode}`;
}

export function parseThemeSelection(value: string): ThemePreferences | null {
  const [visualTheme, colorMode] = value.split(":");
  if (
    (visualTheme !== "classic" &&
      visualTheme !== "pit-wall" &&
      visualTheme !== "heritage" &&
      visualTheme !== "telemetry" &&
      visualTheme !== "cockpit" &&
      visualTheme !== "editorial") ||
    (colorMode !== "light" && colorMode !== "dark")
  ) {
    return null;
  }

  return { visualTheme, colorMode };
}

export function readThemePreferences(
  storage: Pick<Storage, "getItem">,
): ThemePreferences {
  try {
    const savedVisualTheme = storage.getItem(visualThemeStorageKey);
    const savedColorMode = storage.getItem(colorModeStorageKey);

    return {
      visualTheme:
        savedVisualTheme === "classic" ||
        savedVisualTheme === "heritage" ||
        savedVisualTheme === "telemetry" ||
        savedVisualTheme === "cockpit" ||
        savedVisualTheme === "editorial"
          ? savedVisualTheme
          : "pit-wall",
      colorMode: savedColorMode === "dark" ? "dark" : "light",
    };
  } catch {
    return defaultThemePreferences;
  }
}

export function saveThemePreferences(
  storage: Pick<Storage, "setItem">,
  preferences: ThemePreferences,
): boolean {
  let saved = true;

  try {
    storage.setItem(visualThemeStorageKey, preferences.visualTheme);
  } catch {
    saved = false;
  }

  try {
    storage.setItem(colorModeStorageKey, preferences.colorMode);
  } catch {
    saved = false;
  }

  return saved;
}

export function getMetaThemeColor({
  visualTheme,
  colorMode,
}: ThemePreferences): string {
  return metaThemeColors[visualTheme][colorMode];
}

export function applyThemePreferences(preferences: ThemePreferences): void {
  const root = document.documentElement;
  root.dataset.theme = preferences.visualTheme;
  root.dataset.colorMode = preferences.colorMode;

  const themeColor = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (themeColor) {
    themeColor.content = getMetaThemeColor(preferences);
  }
}
