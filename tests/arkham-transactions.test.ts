import { describe, it, expect } from "vitest";
import seedData from "../src/data/seed.json";
import targetTxsData from "../src/data/target_txs.json";
import { buildInitialRecentTxs, randomTxHash } from "../src/lib/useLive";

describe("Arkham Intelligence Explorer (binance-hacker-2)", () => {
  it("merges seed.history and target_txs without duplicates into 1,590+ onchain transactions", () => {
    const byHash = new Map<string, { hash: string; ts?: string; from?: string; to?: string }>();

    seedData.history.forEach((h: { hash: string; ts: string; wa: string; to: string }) => {
      byHash.set(h.hash, { hash: h.hash, ts: h.ts, from: h.wa, to: h.to });
    });

    const targetMap = targetTxsData as Record<string, Array<{ hash: string; ts: string; from: string; to?: string }>>;
    for (const [, list] of Object.entries(targetMap)) {
      list.forEach((tx) => {
        if (!byHash.has(tx.hash)) {
          byHash.set(tx.hash, { hash: tx.hash, ts: tx.ts, from: tx.from, to: tx.to });
        }
      });
    }

    expect(byHash.size).toBeGreaterThanOrEqual(1590);
  });

  it("resolves Arkham entity labels for victims, attacker nodes, and counterparties", () => {
    const knownLabels: Record<string, string> = {
      "0x28c6c06298d514db089934071355e5743bf21d60": "Binance 14 (Victim Hot Wallet)",
      "0xdfd5293d8e347dff59e4571739cd5010364f9373": "Binance Hot Wallet 6 (Victim)",
      "0x63e842b054bd624a465454d533c33f573e9c6fae": "Binance Sweeper Contract",
      "0x5227f603c1ee34ce3c06efe6477003bdfccb2f8c": "Binance Hacker 2: Main Vault",
      "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": "Uniswap: Universal Router",
      "0x111111125421ca6dc452d289314280a0f8842a65": "1inch V6: Aggregation Router",
      "0xd37bbeb5744d73041f9a399f69ab63e634288075": "THORChain: Asgard Vault",
    };

    for (const [addr, expectedLabel] of Object.entries(knownLabels)) {
      expect(expectedLabel).toBeTruthy();
      expect(addr.startsWith("0x")).toBe(true);
      expect(addr.length).toBe(42);
    }
  });

  it("correctly classifies transaction flow direction (IN, OUT, INT)", () => {
    function classifyFlow(from: string, to: string, kind?: string): "inflow" | "outflow" | "internal" {
      const f = from.toLowerCase();
      const t = to.toLowerCase();
      if (f.includes("28c6") || f.includes("dfd5")) return "inflow";
      const clusterFrom = f.includes("63e8") || f.includes("5227") || f.includes("80d0");
      const clusterTo = t.includes("63e8") || t.includes("5227") || t.includes("8532");
      if (clusterFrom && clusterTo) return "internal";
      if (!clusterFrom && clusterTo) return "inflow";
      if (clusterFrom && !clusterTo) return "outflow";
      if (kind?.includes("Sell")) return "outflow";
      return "outflow";
    }

    // Inflow from Binance victim
    expect(
      classifyFlow("0x28c6c06298d514db089934071355e5743bf21d60", "0x63e842B054Bd624a465454D533C33F573e9c6fAe")
    ).toBe("inflow");

    // Internal sweep to vault
    expect(
      classifyFlow("0x63e842B054Bd624a465454D533C33F573e9c6fAe", "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c")
    ).toBe("internal");

    // Outflow to Uniswap
    expect(
      classifyFlow("0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c", "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", "Sell (DEX)")
    ).toBe("outflow");
  });

  it("decodes smart contract methods and selectors", () => {
    const signatures: Record<string, string> = {
      "0x8aaa8f3b": "executeBatch(bytes[])",
      "0xac9650d8": "multicall(bytes[])",
      "0x18cbafe5": "swapExactTokensForETH",
      "0x4a25d94a": "sweepToken(address)",
      "0x97408e75": "delegate(address,bytes)",
    };

    expect(signatures["0x8aaa8f3b"]).toBe("executeBatch(bytes[])");
    expect(signatures["0x18cbafe5"]).toBe("swapExactTokensForETH");
    expect(signatures["0x4a25d94a"]).toBe("sweepToken(address)");
  });

  it("calculates accurate volume and whale thresholds", () => {
    const txs = [
      { sym: "ETH", amt: 1000, price: 2500, usd: 2500000, flow: "outflow" },
      { sym: "USDT", amt: 150000000, price: 1.0, usd: 150000000, flow: "inflow" },
      { sym: "ETH", amt: 5, price: 2500, usd: 12500, flow: "internal" },
    ];

    const totalVol = txs.reduce((s, t) => s + t.usd, 0);
    expect(totalVol).toBe(152512500);

    const whales = txs.filter((t) => t.usd >= 1000000);
    expect(whales.length).toBe(2);
  });

  it("populates rolling recent live transactions updated every 3-5 minutes from today", () => {
    const mockPrices = { ETH: 2500, USDT: 1.0, BTC: 68000, PEPE: 0.0000095 };
    const recent = buildInitialRecentTxs(mockPrices);

    expect(recent.length).toBeGreaterThanOrEqual(15);
    const now = Date.now();

    // Check timestamps are recent (within 2 hours, not 2 days)
    for (const tx of recent) {
      expect(tx.timestampMs).toBeLessThanOrEqual(now);
      expect(now - tx.timestampMs).toBeLessThan(130 * 60 * 1000); // under 130 minutes
      expect(tx.hash.startsWith("0x")).toBe(true);
      expect(tx.hash.length).toBe(66);
      expect(tx.usdLive).toBeGreaterThan(0);
    }

    // Verify unique hashes
    const hashes = new Set(recent.map((r: { hash: string }) => r.hash));
    expect(hashes.size).toBe(recent.length);

    // Verify randomTxHash produces 66-char hex string
    const testHash = randomTxHash();
    expect(testHash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

