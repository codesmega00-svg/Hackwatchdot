import { describe, expect, it } from "vitest";
import {
  IOCS,
  CHAINS,
  BASE_MOVES,
  NODES,
  NODE_MAP,
  getExplorerUrl,
  getExplorerTxUrl,
  type BlockaidIOC,
} from "../src/components/FastTransactions";

describe("Fast Transactions & 677 Infected Wallets (Blockaid Telemetry)", () => {
  it("loads exactly 677 infected wallets (IOCs) from the Blockaid incident dataset", () => {
    expect(IOCS.length).toBe(677);
  });

  it("verifies multi-chain distribution across all 12 chains", () => {
    const counts: Record<string, number> = {};
    IOCS.forEach((ioc) => {
      ioc.chains.forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });

    expect(counts["tron"]).toBe(376);
    expect(counts["ethereum"]).toBe(263);
    expect(counts["bitcoin"]).toBe(31);
    expect(counts["avalanche"]).toBe(17);
    expect(counts["optimism"]).toBe(5);
    expect(counts["arbitrum"]).toBe(4);
    expect(counts["polygon"]).toBe(3);
    expect(counts["solana"]).toBe(2);
    expect(counts["base"]).toBe(1);
    expect(counts["bsc"]).toBe(1);
    expect(counts["xrp"]).toBe(1);
    expect(counts["near"]).toBe(1);
  });

  it("validates data integrity of every single IOC wallet entry", () => {
    for (const ioc of IOCS) {
      expect(ioc.a).toBeTruthy();
      expect(typeof ioc.a).toBe("string");
      expect(ioc.chains.length).toBeGreaterThan(0);
      expect(ioc.c).toBeTruthy();
      expect(ioc.r).toBeTruthy();
      expect(ioc.s).toBeTruthy();
    }
  });

  it("generates correct block explorer URLs for addresses across different chains", () => {
    const ethAddr = "0x5227f603c1ee34ce3c06efe6477003bdfccb2f8c";
    const tronAddr = "TA9i3JCnLQMuCUT5u1NUcGpKyQpGXgFJhD";
    const btcAddr = "bc1q0mtc2f5agpkvlq6hhahmfr3hlr55kyfjhl2mnm";
    const solAddr = "AffzFDKZbyMiU11zmVBoAqD25ugpr7xoWWyRyGigBEaU";

    expect(getExplorerUrl("ethereum", ethAddr)).toBe(`https://etherscan.io/address/${ethAddr}`);
    expect(getExplorerUrl("tron", tronAddr)).toBe(`https://tronscan.org/#/address/${tronAddr}`);
    expect(getExplorerUrl("bitcoin", btcAddr)).toBe(`https://mempool.space/address/${btcAddr}`);
    expect(getExplorerUrl("solana", solAddr)).toBe(`https://solscan.io/account/${solAddr}`);
    expect(getExplorerUrl("ethereum", undefined)).toBeNull();
  });

  it("generates correct transaction explorer URLs for all major chains", () => {
    const dummyTx = "0xabc1234567890abcdef";
    expect(getExplorerTxUrl("ethereum", dummyTx)).toContain("etherscan.io/tx/");
    expect(getExplorerTxUrl("tron", dummyTx)).toContain("tronscan.org/#/transaction/");
    expect(getExplorerTxUrl("bitcoin", dummyTx)).toContain("mempool.space/tx/");
    expect(getExplorerTxUrl("arbitrum", dummyTx)).toContain("arbiscan.io/tx/");
    expect(getExplorerTxUrl("avalanche", dummyTx)).toContain("snowtrace.io/tx/");
  });

  it("verifies verified BASE_MOVES contains major exploit transfers and detections", () => {
    expect(BASE_MOVES.length).toBeGreaterThanOrEqual(50);

    const chainsInMoves = new Set(BASE_MOVES.map((m) => m.chain));
    expect(chainsInMoves).toContain("ethereum");
    expect(chainsInMoves).toContain("tron");
    expect(chainsInMoves).toContain("bitcoin");
    expect(chainsInMoves).toContain("arbitrum");
    expect(chainsInMoves).toContain("avalanche");

    // Spot-check key moves
    const btcMove = BASE_MOVES.find((m) => m.chain === "bitcoin" && m.amt.includes("18,270"));
    expect(btcMove).toBeDefined();
    expect(btcMove?.from).toBe("btchot");
    expect(btcMove?.to).toBe("peel");

    const ethStashMove = BASE_MOVES.find((m) => m.chain === "ethereum" && m.amt.includes("197,460 ETH"));
    expect(ethStashMove).toBeDefined();
    expect(ethStashMove?.to).toBe("s1");
  });

  it("accurately filters IOCs by chain and search query", () => {
    // Filter by Tron
    const tronOnly = IOCS.filter((ioc) => ioc.chains.includes("tron"));
    expect(tronOnly.length).toBe(376);

    // Search by sweeper
    const sweeperIocs = IOCS.filter((ioc) => ioc.r.toLowerCase().includes("sweeper"));
    expect(sweeperIocs.length).toBeGreaterThan(0);

    // Filter by Bitcoin
    const btcOnly = IOCS.filter((ioc) => ioc.chains.includes("bitcoin"));
    expect(btcOnly.length).toBe(31);
  });
});

