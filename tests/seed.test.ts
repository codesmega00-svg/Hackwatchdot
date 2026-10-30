import { describe, it, expect } from "vitest";
import seed from "../src/data/seed.json";

describe("Seed Data Points and Integrity", () => {
  it("verifies meta counts match the actual arrays", () => {
    expect(seed.meta).toBeDefined();
    expect(typeof seed.meta.generated).toBe("string");
    expect(typeof seed.meta.snapshot).toBe("string");
    expect(seed.meta.assets).toBe(seed.stack.length);
    expect(seed.meta.events).toBe(seed.history.length);
    expect(seed.meta.wallets).toBe(seed.wallets.length);
  });

  it("verifies stack tokens data points", () => {
    expect(seed.stack.length).toBeGreaterThan(0);

    const symbols = new Set<string>();
    for (const token of seed.stack) {
      expect(typeof token.sym).toBe("string");
      expect(token.sym.length).toBeGreaterThan(0);
      expect(symbols.has(token.sym)).toBe(false); // Ensure unique symbols
      symbols.add(token.sym);

      expect(typeof token.stolen).toBe("number");
      expect(token.stolen).toBeGreaterThanOrEqual(0);

      expect(typeof token.held).toBe("number");
      expect(token.held).toBeGreaterThanOrEqual(0);

      expect(typeof token.price).toBe("number");
      expect(token.price).toBeGreaterThanOrEqual(0);

      expect(typeof token.mcap).toBe("number");
      expect(token.mcap).toBeGreaterThanOrEqual(0);

      expect(typeof token.vol24).toBe("number");
      expect(token.vol24).toBeGreaterThanOrEqual(0);

      expect(typeof token.dec).toBe("number");
      expect(typeof token.stable).toBe("boolean");
    }
  });

  it("verifies history events data points", () => {
    expect(seed.history.length).toBeGreaterThan(0);

    for (const event of seed.history) {
      expect(typeof event.ts).toBe("string");
      expect(Number.isNaN(new Date(event.ts).getTime())).toBe(false);

      expect(typeof event.when).toBe("string");
      expect(typeof event.kind).toBe("string");
      expect(typeof event.sym).toBe("string");

      expect(typeof event.amt).toBe("number");
      expect(event.amt).toBeGreaterThanOrEqual(0);

      expect(typeof event.usd).toBe("number");
      expect(event.usd).toBeGreaterThanOrEqual(0);

      expect(typeof event.wa).toBe("string");
      expect(typeof event.wallet).toBe("string");
    }
  });

  it("verifies wallets data points", () => {
    expect(seed.wallets.length).toBeGreaterThan(0);

    for (const wallet of seed.wallets) {
      expect(typeof wallet.a).toBe("string");
      expect(wallet.a.startsWith("0x")).toBe(true);
      expect(typeof wallet.label).toBe("string");
      expect(typeof wallet.eth).toBe("number");
      expect(wallet.eth).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(wallet.toks)).toBe(true);
    }
  });

  it("verifies Bitcoin onchain graph data points", () => {
    const btc = seed.btc;
    expect(btc).toBeDefined();
    expect(typeof btc.root).toBe("string");
    expect(btc.root.length).toBeGreaterThan(10);
    expect(typeof btc.victim).toBe("string");
    expect(typeof btc.stolen).toBe("number");
    expect(btc.stolen).toBeGreaterThan(0);
    expect(typeof btc.price).toBe("number");
    expect(btc.price).toBeGreaterThan(0);

    // Nodes
    const nodeKeys = Object.keys(btc.nodes);
    expect(nodeKeys.length).toBeGreaterThan(0);
    for (const key of nodeKeys) {
      const node = btc.nodes[key];
      expect(typeof node.bal).toBe("number");
      expect(typeof node.n).toBe("number");
      expect(typeof node.d).toBe("number");
    }

    // Edges
    expect(btc.edges.length).toBeGreaterThan(0);
    for (const edge of btc.edges) {
      expect(typeof edge.src).toBe("string");
      expect(typeof edge.dst).toBe("string");
      expect(typeof edge.btc).toBe("number");
      expect(edge.btc).toBeGreaterThan(0);
      expect(typeof edge.ts).toBe("number");
      expect(typeof edge.tx).toBe("string");
      expect(typeof edge.conf).toBe("boolean");
    }

    // Holders
    const holderKeys = Object.keys(btc.holders);
    expect(holderKeys.length).toBeGreaterThan(0);
    for (const addr of holderKeys) {
      expect(typeof btc.holders[addr]).toBe("number");
      expect(btc.holders[addr]).toBeGreaterThan(0);
    }
  });

  it("verifies Binance market pairs map", () => {
    const pairs = seed.meta.binanceSymbols;
    expect(pairs).toBeDefined();
    const entries = Object.entries(pairs);
    expect(entries.length).toBeGreaterThan(0);

    for (const [sym, pair] of entries) {
      expect(typeof sym).toBe("string");
      expect(typeof pair).toBe("string");
      expect(pair.endsWith("USDT")).toBe(true);
      expect(pair.startsWith(sym)).toBe(true);
    }
  });
});

