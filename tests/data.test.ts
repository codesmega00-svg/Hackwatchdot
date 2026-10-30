import { describe, it, expect } from "vitest";
import {
  seed,
  snapshotPrice,
  kindMeta,
  txUrl,
  tokenUrl,
  addressUrl,
  btcAddressUrl,
  contractCodeUrl,
  KEY_ADDRESSES,
  TARGET_ENTITIES,
  getTargetEntity,
  isTargetAddress,
  buildTracked,
  buildEvents,
  buildTotals,
  binancePairs,
} from "../src/lib/data";

describe("Data Module - Helper Functions", () => {
  it("snapshotPrice returns correct price for existing and non-existing tokens", () => {
    // ETH should exist in stack or BTC in btc
    const btcPrice = snapshotPrice("BTC");
    expect(btcPrice).toBe(seed.btc.price);
    expect(btcPrice).toBeGreaterThan(0);

    const firstToken = seed.stack[0];
    expect(snapshotPrice(firstToken.sym)).toBe(firstToken.price);

    // Non-existent token should return 0
    expect(snapshotPrice("NON_EXISTENT_TOKEN_12345")).toBe(0);
  });

  it("kindMeta returns correct metadata for all known event kinds", () => {
    expect(kindMeta("Sell (DEX)")).toEqual({ label: "Sold", cls: "sell" });
    expect(kindMeta("Sent out")).toEqual({ label: "Sent out", cls: "sent" });
    expect(kindMeta("Moved to own wallet")).toEqual({ label: "Own wallet", cls: "move" });
    expect(kindMeta("Moved to his own wallet")).toEqual({ label: "Own wallet", cls: "move" });
    expect(kindMeta("Bridge")).toEqual({ label: "Bridged", cls: "bridge" });
    expect(kindMeta("Deposit (Aave)")).toEqual({ label: "Aave", cls: "deposit" });

    // Fallback for unknown kind
    expect(kindMeta("Unknown Action")).toEqual({ label: "Unknown Action", cls: "move" });

    // Exploit and infrastructure kinds
    expect(kindMeta("Contract Exploit")).toEqual({ label: "Exploit", cls: "sell" });
    expect(kindMeta("EIP-7702 Delegation")).toEqual({ label: "EIP-7702", cls: "bridge" });
    expect(kindMeta("Deploy / Phish")).toEqual({ label: "Phish/Deploy", cls: "deposit" });
  });

  it("URL generator functions format URLs accurately", () => {
    const hash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const ethAddr = "0x5227f603c1ee34ce3c06efe6477003bdfccb2f8c";
    const btcAddr = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

    expect(txUrl(hash)).toBe(`https://etherscan.io/tx/${hash}`);
    expect(addressUrl(ethAddr)).toBe(`https://etherscan.io/address/${ethAddr}`);
    expect(tokenUrl(ethAddr)).toBe(`https://etherscan.io/token/${ethAddr}`);
    expect(tokenUrl("")).toBe("https://etherscan.io");
    expect(tokenUrl("not-hex")).toBe("https://etherscan.io");
    expect(btcAddressUrl(btcAddr)).toBe(`https://mempool.space/address/${btcAddr}`);
    expect(contractCodeUrl("0x63e842B054Bd624a465454D533C33F573e9c6fAe")).toBe(
      "https://etherscan.io/address/0x63e842B054Bd624a465454D533C33F573e9c6fAe#code"
    );
  });

  it("correctly identifies and resolves key monitored addresses and exploit contract", () => {
    expect(KEY_ADDRESSES.EXPLOIT_CONTRACT).toBe("0x63e842B054Bd624a465454D533C33F573e9c6fAe");
    expect(KEY_ADDRESSES.MAIN_EXPLOITER).toBe("0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c");
    expect(KEY_ADDRESSES.PROM_RECEIVER).toBe("0xdd6dbbe67262ccc9b1824de1257999efc6c52296");
    expect(KEY_ADDRESSES.DEPLOYER_PHISHING).toBe("0x80d04079ffc53eb14edbeeb37279d126f45552df");

    // Case-insensitive lookups
    expect(isTargetAddress("0x63e842b054bd624a465454d533c33f573e9c6fae")).toBe(true);
    expect(isTargetAddress("0x63e842B054Bd624a465454D533C33F573e9c6fAe")).toBe(true);
    expect(isTargetAddress("0x80d04079ffc53eb14edbeeb37279d126f45552df")).toBe(true);
    expect(isTargetAddress("0x0000000000000000000000000000000000000000")).toBe(false);
    expect(isTargetAddress("")).toBe(false);

    const contractMeta = getTargetEntity("0x63e842B054Bd624a465454D533C33F573e9c6fAe");
    expect(contractMeta).toBeDefined();
    expect(contractMeta?.type).toBe("contract");
    expect(contractMeta?.codeUrl).toContain("#code");

    const phishingMeta = getTargetEntity("0x80d04079ffc53eb14edbeeb37279d126f45552df");
    expect(phishingMeta).toBeDefined();
    expect(phishingMeta?.shortLabel).toBe("Phishing / Deployer");
  });
});

describe("Data Module - buildTracked", () => {
  it("correctly integrates live prices and calculates metrics", () => {
    const mockPrices = { ETH: 3000, USDC: 1.0 };
    const mockChanges = { ETH: 5.5, USDC: 0.1 };
    const mockVolumes = { ETH: 500000000, USDC: 1000000000 };

    const tracked = buildTracked(mockPrices, mockChanges, mockVolumes);

    expect(Array.isArray(tracked)).toBe(true);
    expect(tracked.length).toBe(seed.stack.length);

    // Tracked items must be sorted descending by heldUsd
    for (let i = 0; i < tracked.length - 1; i++) {
      expect(tracked[i].heldUsd).toBeGreaterThanOrEqual(tracked[i + 1].heldUsd);
    }

    // Check specific calculations for ETH if present
    const eth = tracked.find((t) => t.sym === "ETH");
    if (eth) {
      expect(eth.price).toBe(3000);
      expect(eth.changePct).toBe(5.5);
      expect(eth.vol24).toBe(500000000);
      expect(eth.live).toBe(true);
      expect(eth.heldUsd).toBeCloseTo(eth.held * 3000, 2);
      expect(eth.stolenUsd).toBeCloseTo(eth.stolen * 3000, 2);
      expect(eth.soldUsd).toBeCloseTo(Math.max(0, eth.stolenUsd - eth.heldUsd), 2);
      expect(eth.onBinance).toBe(Boolean(binancePairs["ETH"]));
    }
  });

  it("handles fallback to snapshot price when live price is missing or zero", () => {
    const tracked = buildTracked({}, {}, {});
    for (const t of tracked) {
      expect(t.live).toBe(false);
      expect(t.price).toBe(t.token?.price);
      expect(t.changePct).toBe(0);
    }
  });

  it("safely handles tokens with 0 market cap or 0 24h volume without NaN/Infinity", () => {
    const tracked = buildTracked({}, {}, {});
    for (const t of tracked) {
      expect(Number.isFinite(t.heldUsd)).toBe(true);
      expect(Number.isFinite(t.stolenUsd)).toBe(true);
      expect(Number.isFinite(t.soldUsd)).toBe(true);
      expect(Number.isFinite(t.gonePct)).toBe(true);
      expect(Number.isFinite(t.pctMcap)).toBe(true);
      expect(Number.isFinite(t.daysVol)).toBe(true);
    }
  });
});

describe("Data Module - buildEvents", () => {
  it("transforms history with live prices and fallback", () => {
    const mockPrices = { ETH: 3000 };
    const events = buildEvents(mockPrices);

    expect(events.length).toBe(seed.history.length);
    for (const e of events) {
      expect(Number.isFinite(e.usdLive)).toBe(true);
      expect(Number.isFinite(e.priceNow)).toBe(true);
      if (mockPrices[e.sym]) {
        expect(e.priceNow).toBe(mockPrices[e.sym]);
        expect(e.usdLive).toBeCloseTo(e.amt * mockPrices[e.sym], 2);
      }
    }
  });
});

describe("Data Module - buildTotals", () => {
  it("calculates totals accurately", () => {
    const tracked = buildTracked({}, {}, {});
    const events = buildEvents({});
    const ethPrice = 2500;
    const btcPrice = 65000;

    const totals = buildTotals(tracked, events, ethPrice, btcPrice);

    expect(totals.stolenEth).toBeGreaterThan(0);
    expect(totals.heldEth).toBeGreaterThan(0);
    expect(totals.soldEth).toBeCloseTo(Math.max(0, totals.stolenEth - totals.heldEth), 2);
    expect(totals.soldPct).toBeCloseTo(((totals.stolenEth - totals.heldEth) / totals.stolenEth) * 100, 2);
    expect(totals.ethPrice).toBe(ethPrice);
    expect(totals.btcPrice).toBe(btcPrice);
    expect(totals.btcHeldUsd).toBeCloseTo(totals.btcHeld * btcPrice, 2);
    expect(totals.topHolding).toBe(tracked[0]);

    if (events.some((e) => e.kind === "Sell (DEX)")) {
      expect(totals.lastSale).not.toBeNull();
      expect(totals.lastSale?.kind).toBe("Sell (DEX)");
    }
  });
});

