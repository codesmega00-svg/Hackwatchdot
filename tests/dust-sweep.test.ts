import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  PROTOCOL_FEE_PCT,
  USER_REVERT_PCT,
  DEFAULT_DUST_THRESHOLD_USD,
  PROTOCOL_WALLET,
  LIFI_DIAMOND_ADDRESS,
  ROBINHOOD_DIAMOND_ADDRESS,
  SUPPORTED_CHAINS,
  CHAIN_LIST,
  PRESET_WALLETS,
  ROBINHOOD_CRYPTO_TOKENS,
  ROBINHOOD_CHAIN_TOKENS,
  calculateSweepQuote,
  fetchWalletDustTokens,
  DustToken,
} from "../src/lib/dustSweeper";

describe("Robinhood Dust to ETH Sweeper (Page #13) — Real-Time Multi-Chain Integration", () => {
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
    expect(ROBINHOOD_DIAMOND_ADDRESS.toLowerCase()).toBe("0xb477751b76cf82d00a686a1232f5fcd772414af3");
  });

  it("configures Robinhood Chain (4663) and all supported multi-chain networks", () => {
    expect(SUPPORTED_CHAINS[4663]).toBeDefined();
    expect(SUPPORTED_CHAINS[4663].name).toBe("Robinhood Chain");
    expect(SUPPORTED_CHAINS[4663].nativeSymbol).toBe("ETH");
    expect(SUPPORTED_CHAINS[4663].diamondAddress).toBe(ROBINHOOD_DIAMOND_ADDRESS);
    expect(SUPPORTED_CHAINS[4663].rpcUrls[0]).toContain("rpc.mainnet.chain.robinhood.com");

    expect(SUPPORTED_CHAINS[1]).toBeDefined(); // Ethereum Mainnet
    expect(SUPPORTED_CHAINS[8453]).toBeDefined(); // Base
    expect(SUPPORTED_CHAINS[42161]).toBeDefined(); // Arbitrum One
    expect(SUPPORTED_CHAINS[137]).toBeDefined(); // Polygon
    expect(SUPPORTED_CHAINS[10]).toBeDefined(); // OP Mainnet

    expect(CHAIN_LIST.length).toBe(6);
    expect(CHAIN_LIST[0].id).toBe(4663); // Robinhood Chain first
  });

  it("includes Robinhood Chain listed tokens and Ethereum listed tokens in catalog", () => {
    const rhSymbols = ROBINHOOD_CHAIN_TOKENS.map((t) => t.symbol);
    expect(rhSymbols).toContain("LINK");
    expect(rhSymbols).toContain("cbBTC");
    expect(rhSymbols).toContain("USDe");
    expect(rhSymbols).toContain("USDG");
    expect(rhSymbols).toContain("LIT");
    expect(rhSymbols).toContain("ENA");

    const ethSymbols = ROBINHOOD_CRYPTO_TOKENS.map((t) => t.symbol);
    expect(ethSymbols).toContain("PEPE");
    expect(ethSymbols).toContain("SHIB");
    expect(ethSymbols).toContain("UNI");
    expect(ethSymbols).toContain("LINK");
    expect(ethSymbols).toContain("AAVE");
    expect(ethSymbols).toContain("CRV");
  });

  it("returns empty array for invalid or non-hex address without throwing", async () => {
    const emptyResult = await fetchWalletDustTokens("not-an-address", 30.0);
    expect(emptyResult).toEqual([]);
    const emptyResult2 = await fetchWalletDustTokens("0x123", 30.0);
    expect(emptyResult2).toEqual([]);
  });

  it("calculates exact 80/20 fee split and per-chain summaries in calculateSweepQuote", () => {
    const sampleTokens: DustToken[] = [
      {
        id: "LINK-4663-1",
        symbol: "LINK",
        name: "ChainLink Token",
        address: "0x492641F648a4986844848E0beFE66D14817bCE34",
        decimals: 18,
        balance: 1.0,
        balanceFormatted: "1.0000",
        priceUsd: 11.20,
        valueUsd: 11.20, // < $30
        chain: "Robinhood",
        chainId: 4663,
        isRobinhoodListed: true,
        isDust: true,
        logoUrl: "",
        sourceLiquidity: "Robinhood LI.FI Pool",
        rawBalance: "1000000000000000000",
      },
      {
        id: "UNI-1-1",
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
        id: "CRV-1-1",
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

    // Total = 11.20 + 15.00 + 2.80 = 29.00
    expect(quote.totalDustUsd).toBe(29.00);

    // 20% protocol fee = 29.00 * 0.20 = 5.80
    expect(quote.protocolFeeUsd).toBe(5.80);
    expect(quote.protocolFeeEth).toBeCloseTo(5.80 / 2500, 5);

    // 80% user revert = 29.00 * 0.80 = 23.20
    expect(quote.userRevertUsd).toBe(23.20);
    expect(quote.userRevertEth).toBeCloseTo(23.20 / 2500, 5);

    // Multi-chain summary grouping
    expect(quote.chainSummary).toBeDefined();
    expect(quote.chainSummary?.length).toBe(2);
    const rhSummary = quote.chainSummary?.find((c) => c.chainId === 4663);
    expect(rhSummary?.dustUsd).toBe(11.20);
    const ethSummary = quote.chainSummary?.find((c) => c.chainId === 1);
    expect(ethSummary?.dustUsd).toBe(17.80);
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
    expect(componentTsx).toContain("80% reverts directly back to your wallet");
    expect(componentTsx).toContain("20% protocol fee");
    expect(componentTsx).toContain("Same-Chain");
  });

  it("includes multi-chain selector, search bar, and real preset wallets in UI", () => {
    expect(componentTsx).toContain("dust-chain-selector-bar");
    expect(componentTsx).toContain("dust-chain-btn");
    expect(componentTsx).toContain("dust-address-input");
    expect(componentTsx).toContain("dust-scan-btn");
    expect(componentTsx).toContain("dust-refresh-icon-btn");
    expect(componentTsx).toContain("dust-scanning-loader");
    expect(PRESET_WALLETS.length).toBeGreaterThanOrEqual(3);
    const presetLabels = PRESET_WALLETS.map((p) => p.label);
    expect(presetLabels).toContain("RH Active Bot (0x0ce7...)");
    expect(presetLabels).toContain("Hot Sweeper (0x370A...)");
    expect(presetLabels).toContain("Queried Wallet (0xbb9a...)");
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
