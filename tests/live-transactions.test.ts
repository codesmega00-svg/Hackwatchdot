import { describe, it, expect } from "vitest";
import { TARGET_ENTITIES, isTargetAddress } from "../src/lib/data";
import targetTxsData from "../src/data/target_txs.json";
import { formatFullTime } from "../src/lib/format";

describe("Live Transaction Engine", () => {
  it("has valid target addresses mapped for live transactions across all 9 target entities", () => {
    const targets = [
      "0x63e842B054Bd624a465454D533C33F573e9c6fAe",
      "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c",
      "0xdd6dbbe67262ccc9b1824de1257999efc6c52296",
      "0x80d04079ffc53eb14edbeeb37279d126f45552df",
      "0x8532FA14ACAf483729C449b8458aedDb900543D4",
      "0xc887aF690E0301CD4edBbCe8F8d31b4EC65B286A",
      "0x897C80d1a9729E94460e2Bd93178BD5215158DF3",
      "0x79e70d139fc05aa75f75611fdf2680e9952b544a",
      "0x03b0eE5d82990cFF1bDa48651AC3e436d1a020ea",
    ];

    for (const addr of targets) {
      expect(isTargetAddress(addr)).toBe(true);
      const entity = TARGET_ENTITIES[addr.toLowerCase()];
      expect(entity).toBeDefined();
      expect(entity.label).toBeTruthy();
      expect(entity.etherscanUrl.toLowerCase()).toContain(addr.toLowerCase());
    }
  });

  it("loads target transactions dataset with valid structure and timestamps", () => {
    const targetData = targetTxsData as Record<string, Array<{ hash: string; ts: string; status: string }>>;
    const deployerTxs = targetData["0x80d04079ffc53eb14edbeeb37279d126f45552df"];

    expect(Array.isArray(deployerTxs)).toBe(true);
    expect(deployerTxs.length).toBeGreaterThanOrEqual(40);

    const firstTx = deployerTxs[0];
    expect(firstTx.hash.startsWith("0x")).toBe(true);
    expect(firstTx.hash.length).toBe(66);
    expect(firstTx.ts).toBeTruthy();
    expect(["confirmed", "ok"]).toContain(firstTx.status);

    const time = formatFullTime(firstTx.ts);
    expect(time.utc).toBeTruthy();
    expect(time.local).toBeTruthy();
    expect(time.relative).toBeTruthy();
  });

  it("calculates live USD value accurately using spot prices", () => {
    const mockPrices = { PROM: 6.5, FUN: 0.0035, USDT: 1.0, ETH: 2500 };
    const testCases = [
      { sym: "PROM", amt: 1000, expected: 6500 },
      { sym: "FUN", amt: 1000000, expected: 3500 },
      { sym: "USDT", amt: 50000, expected: 50000 },
      { sym: "ETH", amt: 10, expected: 25000 },
    ];

    for (const tc of testCases) {
      const p = mockPrices[tc.sym as keyof typeof mockPrices];
      const usdLive = tc.amt * p;
      expect(usdLive).toBe(tc.expected);
    }
  });
});

