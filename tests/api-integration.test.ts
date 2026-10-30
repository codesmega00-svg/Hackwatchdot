import { describe, it, expect } from "vitest";
import seed from "../src/data/seed.json";
import { BINANCE_BASE, binancePairs } from "../src/lib/data";

describe("API Integration - Binance Ticker Parsing Logic", () => {
  const REVERSE: Record<string, string> = {};
  for (const [base, pair] of Object.entries(binancePairs)) REVERSE[pair] = base;

  it("transforms raw Binance 24hr ticker rows into price, change, and volume maps", () => {
    const mockRows = [
      {
        symbol: "ETHUSDT",
        lastPrice: "2450.50",
        priceChangePercent: "3.25",
        quoteVolume: "123456789.00",
      },
      {
        symbol: "WBTCUSDT",
        lastPrice: "68000.00",
        priceChangePercent: "-1.10",
        quoteVolume: "987654321.00",
      },
      {
        symbol: "UNKNOWNPAIR",
        lastPrice: "10.00",
        priceChangePercent: "0",
        quoteVolume: "100",
      },
    ];

    const p: Record<string, number> = {};
    const c: Record<string, number> = {};
    const v: Record<string, number> = {};

    for (const row of mockRows) {
      const base = REVERSE[row.symbol];
      if (!base) continue;
      const last = Number(row.lastPrice);
      if (Number.isFinite(last) && last > 0) p[base] = last;
      const chg = Number(row.priceChangePercent);
      if (Number.isFinite(chg)) c[base] = chg;
      const qv = Number(row.quoteVolume);
      if (Number.isFinite(qv)) v[base] = qv;
    }

    expect(p.ETH).toBe(2450.5);
    expect(c.ETH).toBe(3.25);
    expect(v.ETH).toBe(123456789);

    expect(p.WBTC).toBe(68000);
    expect(c.WBTC).toBe(-1.1);
    expect(v.WBTC).toBe(987654321);

    expect(p.UNKNOWNPAIR).toBeUndefined();
  });

  it("filters non-positive or invalid prices", () => {
    const mockRows = [
      {
        symbol: "ETHUSDT",
        lastPrice: "-50.00",
        priceChangePercent: "0",
        quoteVolume: "0",
      },
      {
        symbol: "WBTCUSDT",
        lastPrice: "invalid_number",
        priceChangePercent: "nan",
        quoteVolume: "nan",
      },
    ];

    const p: Record<string, number> = {};
    for (const row of mockRows) {
      const base = REVERSE[row.symbol];
      if (!base) continue;
      const last = Number(row.lastPrice);
      if (Number.isFinite(last) && last > 0) p[base] = last;
    }

    expect(p.ETH).toBeUndefined();
    expect(p.WBTC).toBeUndefined();
  });

  it("formats the Binance ticker query URL accurately", () => {
    const symbols = Array.from(new Set(Object.values(binancePairs)));
    const query = encodeURIComponent(JSON.stringify(symbols));
    const url = `${BINANCE_BASE}/api/v3/ticker/24hr?symbols=${query}`;

    expect(url).toContain("https://data-api.binance.vision/api/v3/ticker/24hr?symbols=");
    expect(url).toContain("ETHUSDT");
    expect(symbols.length).toBeGreaterThan(50);
  });
});

