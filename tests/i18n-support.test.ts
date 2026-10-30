import { describe, it, expect } from "vitest";
import { LANGUAGES, TRANSLATIONS, SUPPORT_WALLETS, Lang } from "../src/lib/i18n";

describe("I18n & Support Wallets Module", () => {
  it("provides valid translation sets for all 6 supported languages", () => {
    const expectedLangs: Lang[] = ["en", "zh", "es", "ja", "ko", "ru"];
    expect(LANGUAGES.map((l) => l.code)).toEqual(expectedLangs);

    for (const code of expectedLangs) {
      const dict = TRANSLATIONS[code];
      expect(dict).toBeDefined();
      expect(dict.announcement_alert).toBeTruthy();
      expect(dict.announcement_support).toBeTruthy();
      expect(dict.copy_eth).toBeTruthy();
      expect(dict.copy_sol).toBeTruthy();
      expect(dict.support_work_title).toBeTruthy();
      expect(dict.support_eth_card).toBeTruthy();
      expect(dict.support_sol_card).toBeTruthy();
    }
  });

  it("has exact required support wallet addresses configured", () => {
    expect(SUPPORT_WALLETS.eth).toBe("0x24fe2677F951493eE42550Aa05c55c713de5c556");
    expect(SUPPORT_WALLETS.sol).toBe("j97dcwBGKVgUPAtkegjviNaBB27SPz4Thbtsgg83Djq");

    // ETH format check (0x followed by 40 hex chars)
    expect(/^0x[a-fA-F0-9]{40}$/.test(SUPPORT_WALLETS.eth)).toBe(true);

    // SOL format check (base58, 32-44 characters)
    expect(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(SUPPORT_WALLETS.sol)).toBe(true);
  });
});
