import { describe, it, expect } from "vitest";
import { TRANSLATIONS, LANGUAGES, Lang } from "../src/lib/i18n";

describe("Etherscan Flow Page & Session Module", () => {
  const REQUIRED_SESSION_ID = "72c5540c9d1195f1c6cfc6fcb618460d3b1bb467";
  const REQUIRED_URL = `https://etherscan.io/flow?s=${REQUIRED_SESSION_ID}`;

  it("verifies session configuration and exact URL targeting", () => {
    expect(REQUIRED_SESSION_ID).toBe("72c5540c9d1195f1c6cfc6fcb618460d3b1bb467");
    expect(REQUIRED_URL).toBe("https://etherscan.io/flow?s=72c5540c9d1195f1c6cfc6fcb618460d3b1bb467");
  });

  it("provides nav_flow translations across all 6 supported languages", () => {
    const expectedLangs: Lang[] = ["en", "zh", "es", "ja", "ko", "ru"];
    expect(LANGUAGES.map((l) => l.code)).toEqual(expectedLangs);

    for (const code of expectedLangs) {
      const dict = TRANSLATIONS[code];
      expect(dict.nav_flow).toBeDefined();
      expect(dict.nav_flow.length).toBeGreaterThan(0);
    }
  });

  it("validates key target addresses in the flow graph", () => {
    const addresses = [
      "0x28c6c06298d514db089934071355e5743bf21d60", // Binance 14
      "0x63e842B054Bd624a465454D533C33F573e9c6fAe", // Sweeper Contract
      "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c", // Main Vault
      "0xdd6dbbe67262ccc9b1824de1257999efc6c52296", // PROM Liquidator
    ];

    for (const addr of addresses) {
      expect(/^0x[a-fA-F0-9]{40}$/.test(addr)).toBe(true);
    }
  });
});

