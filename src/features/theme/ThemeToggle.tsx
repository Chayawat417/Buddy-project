import { useState } from "react";
import { useLanguage } from "../../i18n";
import type { TranslationKey } from "../../i18n";
import {
  applyThemePreferences,
  defaultThemePreferences,
  getThemeSelection,
  parseThemeSelection,
  readThemePreferences,
  saveThemePreferences,
} from "./themePreferences";
import type {
  ColorMode,
  ThemePreferences,
  VisualTheme,
} from "./themePreferences";

const themeOptions: ReadonlyArray<{
  value: VisualTheme;
  translationKey: TranslationKey;
}> = [
  { value: "classic", translationKey: "theme.classic" },
  { value: "pit-wall", translationKey: "theme.pitWall" },
  { value: "heritage", translationKey: "theme.heritage" },
  { value: "telemetry", translationKey: "theme.telemetry" },
  { value: "cockpit", translationKey: "theme.cockpit" },
  { value: "editorial", translationKey: "theme.editorial" },
];

const colorModes: ReadonlyArray<{
  value: ColorMode;
  translationKey: TranslationKey;
}> = [
  { value: "light", translationKey: "theme.light" },
  { value: "dark", translationKey: "theme.dark" },
];

function getInitialPreferences(): ThemePreferences {
  let preferences = defaultThemePreferences;
  try {
    preferences = readThemePreferences(window.localStorage);
  } catch {
    // Keep the recommended in-memory defaults when storage is unavailable.
  }
  applyThemePreferences(preferences);
  return preferences;
}

export default function ThemeToggle() {
  const { t } = useLanguage();
  const [preferences, setPreferences] = useState<ThemePreferences>(
    getInitialPreferences,
  );
  const [storageWarning, setStorageWarning] = useState(false);

  function updatePreferences(next: ThemePreferences): void {
    applyThemePreferences(next);
    setPreferences(next);
    try {
      setStorageWarning(!saveThemePreferences(window.localStorage, next));
    } catch {
      setStorageWarning(true);
    }
  }

  function handleSelectionChange(value: string): void {
    const next = parseThemeSelection(value);
    if (next) updatePreferences(next);
  }

  return (
    <div className="theme-toggle">
      <div className="theme-controls">
        <div className="theme-select-control">
          <label className="theme-select-label" htmlFor="theme-selection">
            {t("theme.selectorLabel")}
          </label>
          <select
            className="theme-select"
            id="theme-selection"
            onChange={(event) => handleSelectionChange(event.target.value)}
            value={getThemeSelection(preferences)}
          >
            {themeOptions.map(({ value, translationKey }) => (
              <optgroup key={value} label={t(translationKey)}>
                {colorModes.map((mode) => (
                  <option
                    key={`${value}:${mode.value}`}
                    value={`${value}:${mode.value}`}
                  >
                    {`${t(translationKey)} · ${t(mode.translationKey)}`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      {storageWarning && (
        <span className="theme-warning" role="status">
          {t("theme.storageWarning")}
        </span>
      )}
    </div>
  );
}
