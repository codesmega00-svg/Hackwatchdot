import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  PROTOCOL_FEE_PCT,
  USER_REVERT_PCT,
  DEFAULT_DUST_THRESHOLD_USD,
  PROTOCOL_WALLET,
  LIFI_DIAMOND_ADDRESS,
  PRESET_WALLETS,
  ROBINHOOD_CRYPTO_TOKENS,
  calculateSweepQuote,
  fetchWalletDustTokens,
  DustToken,
} from "../src/lib/dustSweeper";

describe("Robinhood Dust to ETH Sweeper (Page #13) — Real-Time Integration", () => {
  const appPath = path.resolve(__dirname, "../src/App.tsx");
  const appTsx = fs.readFileSync(appPath, "utf-8");
  const componentPath = path.resolve(__dirname, "../src/components/RobinhoodDustSweep.tsx");
  const componentTsx = fs.readFileSync(componentPath, "utf-8");
  const i18nPath = path.resolve(__dirname, "../src/lib/i18n.ts");
  const i18nTs = fs.readFileSync(i18nPath, "utf-8");
  const sitemapPath = path.resolve(__dirname, "../public/sitemap.xml");
  const sitemapXml = fs.readFileSync(sitemapPath, "utf-8");

  it("configures Protocol Fee (20%) and User Revert (80%) constants properly", () => {
    expect(PROTOCOL_FEE_PCT).toBe(0.20);
    expect(USER_REVERT_PCT).toBe(0.80);
    expect(PROTOCOL_FEE_PCT + USER_REVERT_PCT).toBe(1.0);
    expect(DEFAULT_DUST_THRESHOLD_USD).toBe(30.0);
    expect(PROTOCOL_WALLET.toLowerCase()).toBe("0x24fe2677f951493ee42550aa05c55c713de5c556");
    expect(LIFI_DIAMOND_ADDRESS.toLowerCase()).toBe("0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae");
  });

  it("includes Robinhood-listed tokens in catalog", () => {
    const symbols = ROBINHOOD_CRYPTO_TOKENS.map((t) => t.symbol);
    expect(symbols).toContain("PEPE");
    expect(symbols).toContain("SHIB");
    expect(symbols).toContain("UNI");
    expect(symbols).toContain("LINK");
    expect(symbols).toContain("AAVE");
    expect(symbols).toContain("CRV");
    expect(symbols).toContain("POL");
    expect(symbols).toContain("ARB");
  });

  it("returns empty array for invalid or non-hex address without throwing", async () => {
    const emptyResult = await fetchWalletDustTokens("not-an-address", 30.0);
    expect(emptyResult).toEqual([]);
    const emptyResult2 = await fetchWalletDustTokens("0x123", 30.0);
    expect(emptyResult2).toEqual([]);
  });

  it("calculates exact 80/20 fee split and ETH conversion in calculateSweepQuote", () => {
    const sampleTokens: DustToken[] = [
      {
        id: "PEPE-1",
        symbol: "PEPE",
        name: "Pepe",
        address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
        decimals: 18,
        balance: 1000000,
        balanceFormatted: "1.00M",
        priceUsd: 0.0000094,
        valueUsd: 9.40, // < $30
        chain: "Ethereum",
        chainId: 1,
        isRobinhoodListed: true,
        isDust: true,
        logoUrl: "",
        sourceLiquidity: "Uniswap v3",
        rawBalance: "1000000000000000000000000",
      },
      {
        id: "UNI-1",
        symbol: "UNI",
        name: "Uniswap",
        address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        decimals: 18,
        balance: 2,
        balanceFormatted: "2.0000",
        priceUsd: 7.50,
        valueUsd: 15.00, // < $30
        chain: "Ethereum",
        chainId: 1,
        isRobinhoodListed: true,
        isDust: true,
        logoUrl: "",
        sourceLiquidity: "Curve",
        rawBalance: "2000000000000000000",
      },
      {
        id: "CRV-1",
        symbol: "CRV",
        name: "Curve DAO",
        address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
        decimals: 18,
        balance: 10,
        balanceFormatted: "10.0000",
        priceUsd: 0.28,
        valueUsd: 2.80, // < $30
        chain: "Ethereum",
        chainId: 1,
        isRobinhoodListed: true,
        isDust: true,
        logoUrl: "",
        sourceLiquidity: "Uniswap v3",
        rawBalance: "10000000000000000000",
      },
    ];

    const ethPrice = 2500;
    const quote = calculateSweepQuote(sampleTokens, ethPrice);

    // Total = 9.40 + 15.00 + 2.80 = 27.20
    expect(quote.totalDustUsd).toBe(27.20);

    // 20% protocol fee = 27.20 * 0.20 = 5.44
    expect(quote.protocolFeeUsd).toBe(5.44);
    expect(quote.protocolFeeEth).toBeCloseTo(5.44 / 2500, 5);

    // 80% user revert = 27.20 * 0.80 = 21.76
    expect(quote.userRevertUsd).toBe(21.76);
    expect(quote.userRevertEth).toBeCloseTo(21.76 / 2500, 5);

    // Sum matches exactly
    expect(quote.userRevertUsd + quote.protocolFeeUsd).toBeCloseTo(quote.totalDustUsd, 2);
  });

  it("configures Page #13 'dust' tab in App.tsx navigation and document titles", () => {
    expect(appTsx).toContain('{ id: "dust", label: "Robinhood Dust Sweep (#13)", short: "Dust #13" }');
    expect(appTsx).toContain('dust: "Robinhood Dust to ETH Sweeper (< $30) — Tab #13 | HackWatch"');
    expect(appTsx).toContain('{tab === "dust" ? <RobinhoodDustSweep ethPrice={ethPrice} /> : null}');
    expect(appTsx).toContain('case "dust":');
  });

  it("includes official Robinhood Trading API and LI.FI documentation references", () => {
    expect(componentTsx).toContain("https://docs.robinhood.com/crypto/trading/");
    expect(componentTsx).toContain("https://docs.li.fi/introduction/introduction");
    expect(componentTsx).toContain("PAGE #13 · REWARD DUST SWEEPER");
    expect(componentTsx).toContain("80% Reverted to Wallet");
    expect(componentTsx).toContain("20% Protocol Fee");
    expect(componentTsx).toContain("Same-Chain");
  });

  it("includes search bar, live network bar, and real preset wallets in UI", () => {
    expect(componentTsx).toContain("dust-address-input");
    expect(componentTsx).toContain("dust-scan-btn");
    expect(componentTsx).toContain("dust-live-net-bar");
    expect(PRESET_WALLETS.length).toBeGreaterThanOrEqual(3);
    const presetLabels = PRESET_WALLETS.map((p) => p.label);
    expect(presetLabels).toContain("Robinhood Hot Wallet 8");
    expect(presetLabels).toContain("Vitalik Buterin (vitalik.eth)");
  });

  it("translates nav_dust across all supported languages in i18n.ts", () => {
    expect(i18nTs).toContain('nav_dust: "Robinhood Dust Sweep (#13)"');
    expect(i18nTs).toContain('nav_dust: "Robinhood 零钱归集 (#13)"');
    expect(i18nTs).toContain('nav_dust: "Barrer Dust Robinhood (#13)"');
    expect(i18nTs).toContain('nav_dust: "Robinhood ダストスイープ (#13)"');
    expect(i18nTs).toContain('nav_dust: "Robinhood 더스트 스윕 (#13)"');
    expect(i18nTs).toContain('nav_dust: "Robinhood Очистка пыли (#13)"');
  });

  it("includes #dust permalink in sitemap.xml", () => {
    expect(sitemapXml).toContain("<loc>https://hackwatch.hackwatch.workers.dev/#dust</loc>");
  });
});
