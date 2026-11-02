import { describe, expect, it } from "vitest";
import {
  readSavedLocale,
  saveLocalePreference,
  translate,
} from "./i18n";

describe("language preferences and translations", () => {
  it("uses Thai by default and loads only a supported saved language", () => {
    expect(readSavedLocale({ getItem: () => null })).toBe("th");
    expect(readSavedLocale({ getItem: () => "en" })).toBe("en");
    expect(readSavedLocale({ getItem: () => "fr" })).toBe("th");
    expect(readSavedLocale({ getItem: () => { throw new Error("blocked"); } })).toBe("th");
  });

  it("saves the language preference and reports unavailable storage", () => {
    let savedValue = "";
    expect(
      saveLocalePreference({
        setItem: (_key, value) => {
          savedValue = value;
        },
      }, "en"),
    ).toBe(true);
    expect(savedValue).toBe("en");
    expect(
      saveLocalePreference({
        setItem: () => {
          throw new Error("blocked");
        },
      }, "th"),
    ).toBe(false);
  });

  it("translates strings and interpolates user-provided values", () => {
    expect(translate("en", "budget.eyebrow", { name: "Alex" })).toBe(
      "Budget for Alex",
    );
    expect(translate("th", "budget.eyebrow", { name: "Alex" })).toBe(
      "งบประมาณของ Alex",
    );
  });
});
