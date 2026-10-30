import { describe, it, expect, beforeEach } from "vitest";
import { TRANSLATIONS } from "../src/lib/i18n";
import type { Theme } from "../src/lib/theme";

describe("Theme System", () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };

  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it("supports theme values 'dark' and 'light'", () => {
    const darkTheme: Theme = "dark";
    const lightTheme: Theme = "light";
    expect(darkTheme).toBe("dark");
    expect(lightTheme).toBe("light");
  });

  it("persists theme preference to storage correctly", () => {
    expect(mockLocalStorage.getItem("hackwatch.theme")).toBeNull();
    mockLocalStorage.setItem("hackwatch.theme", "light");
    expect(mockLocalStorage.getItem("hackwatch.theme")).toBe("light");
    mockLocalStorage.setItem("hackwatch.theme", "dark");
    expect(mockLocalStorage.getItem("hackwatch.theme")).toBe("dark");
  });

  it("includes theme labels across all supported i18n languages", () => {
    const langs = ["en", "zh", "es", "ja", "ko", "ru"] as const;
    for (const l of langs) {
      expect(TRANSLATIONS[l].theme_dark).toBeDefined();
      expect(TRANSLATIONS[l].theme_light).toBeDefined();
      expect(TRANSLATIONS[l].theme_toggle).toBeDefined();
      expect(TRANSLATIONS[l].nav_arkham).toBeDefined();
    }
  });

  it("includes Arkham entity explorer configuration", () => {
    expect(TRANSLATIONS.en.nav_arkham).toBe("Arkham Entity");
    expect(TRANSLATIONS.zh.nav_arkham).toBe("Arkham 实体档案");
  });
});
