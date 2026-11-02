import { describe, expect, it, vi } from "vitest";
import {
  applyThemePreferences,
  defaultThemePreferences,
  getMetaThemeColor,
  getThemeSelection,
  parseThemeSelection,
  readThemePreferences,
  saveThemePreferences,
} from "./themePreferences";

describe("theme preferences", () => {
  it("uses the recommended theme by default and loads supported saved choices", () => {
    expect(readThemePreferences({ getItem: () => null })).toEqual(
      defaultThemePreferences,
    );
    expect(
      readThemePreferences({
        getItem: (key) =>
          key === "buddy-visual-theme" ? "heritage" : "dark",
      }),
    ).toEqual({ visualTheme: "heritage", colorMode: "dark" });
    expect(
      readThemePreferences({
        getItem: (key) =>
          key === "buddy-visual-theme" ? "classic" : "light",
      }),
    ).toEqual({ visualTheme: "classic", colorMode: "light" });
    expect(
      readThemePreferences({
        getItem: (key) =>
          key === "buddy-visual-theme" ? "cockpit" : "dark",
      }),
    ).toEqual({ visualTheme: "cockpit", colorMode: "dark" });
    expect(
      readThemePreferences({
        getItem: (key) =>
          key === "buddy-visual-theme" ? "editorial" : "light",
      }),
    ).toEqual({ visualTheme: "editorial", colorMode: "light" });
  });

  it("falls back safely for unsupported values or unavailable storage", () => {
    expect(
      readThemePreferences({
        getItem: (key) =>
          key === "buddy-visual-theme" ? "unknown" : "sepia",
      }),
    ).toEqual(defaultThemePreferences);
    expect(
      readThemePreferences({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toEqual(defaultThemePreferences);
  });

  it("saves the visual theme and color mode under separate preference keys", () => {
    const saved = new Map<string, string>();
    expect(
      saveThemePreferences(
        {
          setItem: (key, value) => saved.set(key, value),
        },
        { visualTheme: "telemetry", colorMode: "dark" },
      ),
    ).toBe(true);
    expect(saved).toEqual(
      new Map([
        ["buddy-visual-theme", "telemetry"],
        ["buddy-theme", "dark"],
      ]),
    );
  });

  it("maps every theme and color mode to a single dropdown selection", () => {
    const themes = [
      "classic",
      "pit-wall",
      "heritage",
      "telemetry",
      "cockpit",
      "editorial",
    ] as const;
    const modes = ["light", "dark"] as const;

    for (const visualTheme of themes) {
      for (const colorMode of modes) {
        const preferences = { visualTheme, colorMode };
        const selection = getThemeSelection(preferences);

        expect(parseThemeSelection(selection)).toEqual(preferences);
      }
    }

    expect(parseThemeSelection("unknown:dark")).toBeNull();
    expect(parseThemeSelection("classic:sepia")).toBeNull();
  });

  it("reports storage failures without preventing the other preference from saving", () => {
    const savedKeys: string[] = [];
    expect(
      saveThemePreferences(
        {
          setItem: (key) => {
            if (key === "buddy-visual-theme") throw new Error("blocked");
            savedKeys.push(key);
          },
        },
        { visualTheme: "heritage", colorMode: "dark" },
      ),
    ).toBe(false);
    expect(savedKeys).toEqual(["buddy-theme"]);
  });

  it("uses each selected theme and mode for browser chrome", () => {
    expect(
      getMetaThemeColor({ visualTheme: "heritage", colorMode: "dark" }),
    ).toBe("#171d19");
    expect(
      getMetaThemeColor({ visualTheme: "classic", colorMode: "light" }),
    ).toBe("#f5f6f7");
    expect(
      getMetaThemeColor({ visualTheme: "classic", colorMode: "dark" }),
    ).toBe("#171a1d");
    expect(
      getMetaThemeColor({ visualTheme: "cockpit", colorMode: "light" }),
    ).toBe("#f1f3f5");
    expect(
      getMetaThemeColor({ visualTheme: "cockpit", colorMode: "dark" }),
    ).toBe("#14171a");
    expect(
      getMetaThemeColor({ visualTheme: "editorial", colorMode: "light" }),
    ).toBe("#f3f1ec");
    expect(
      getMetaThemeColor({ visualTheme: "editorial", colorMode: "dark" }),
    ).toBe("#18171a");
  });

  it("applies both preferences to the document and theme-color metadata", () => {
    const dataset: DOMStringMap = {};
    const meta = { content: "" };
    vi.stubGlobal("document", {
      documentElement: { dataset },
      querySelector: (selector: string) =>
        selector === 'meta[name="theme-color"]' ? meta : null,
    });

    try {
      applyThemePreferences({ visualTheme: "cockpit", colorMode: "dark" });
      expect(dataset.theme).toBe("cockpit");
      expect(dataset.colorMode).toBe("dark");
      expect(meta.content).toBe("#14171a");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
