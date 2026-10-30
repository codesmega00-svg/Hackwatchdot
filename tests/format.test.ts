import { describe, it, expect } from "vitest";
import {
  compact,
  usd,
  usdFull,
  amount,
  price,
  pct,
  pctChange,
  shortAddr,
  timeAgo,
  clock,
  relative,
  shortHash,
  formatFullTime,
} from "../src/lib/format";

describe("Format Module - Numbers and Units", () => {
  it("compact formats scales from Trillions down to sub-unit numbers", () => {
    expect(compact(1.5e12)).toBe("1.50T");
    expect(compact(2.34e9)).toBe("2.34B");
    expect(compact(45.67e6)).toBe("45.67M");
    expect(compact(150_000)).toBe("150K");
    expect(compact(5_432)).toBe("5.4K");
    expect(compact(42.5)).toBe("42.50");
    expect(compact(0.0034)).toBe("0.0034");
    expect(compact(-5.2e6)).toBe("-5.20M");
  });

  it("usd formats currency and handles non-finite", () => {
    expect(usd(1_000_000)).toBe("$1.00M");
    expect(usd(5_400)).toBe("$5.4K");
    expect(usd(-500_000)).toBe("-$500K");
    expect(usd(NaN)).toBe("—");
    expect(usd(Infinity)).toBe("—");
  });

  it("usdFull formats localized currency", () => {
    expect(usdFull(1234.56)).toContain("$1,235");
    expect(usdFull(54.32)).toBe("$54.32");
    expect(usdFull(NaN)).toBe("—");
  });

  it("amount formats with appropriate decimal precision", () => {
    expect(amount(1.5e9)).toBe("1.50B");
    expect(amount(3.2e6)).toBe("3.20M");
    expect(amount(12345)).toBe("12,345");
    expect(amount(12.3456)).toBe("12.35");
    expect(amount(0.0054321)).toBe("0.005432");
    expect(amount(NaN)).toBe("—");
  });

  it("price formats crypto prices based on magnitude", () => {
    expect(price(2345.67)).toBe("2,346");
    expect(price(12.345)).toBe("12.35");
    expect(price(0.12345)).toBe("0.1235");
    expect(price(0.0001234)).toBe("0.0001234");
    expect(price(0)).toBe("—");
    expect(price(NaN)).toBe("—");
  });

  it("pct and pctChange format percentages correctly", () => {
    expect(pct(45.678)).toBe("45.7%");
    expect(pct(NaN)).toBe("—");

    expect(pctChange(3.45)).toBe("+3.45%");
    expect(pctChange(-2.1)).toBe("-2.10%");
    expect(pctChange(0)).toBe("+0.00%");
    expect(pctChange(NaN)).toBe("—");
  });
});

describe("Format Module - Strings and Dates", () => {
  it("shortAddr shortens addresses with head and tail", () => {
    const addr = "0x5227f603c1ee34ce3c06efe6477003bdfccb2f8c";
    expect(shortAddr(addr, 6, 4)).toBe("0x5227…2f8c");
    expect(shortAddr(addr, 8, 5)).toBe("0x5227f6…b2f8c");
    expect(shortAddr("0x123", 6, 4)).toBe("0x123");
    expect(shortAddr("")).toBe("—");
  });

  it("shortHash shortens transaction hashes", () => {
    const hash = "0x9876543210abcdef9876543210abcdef";
    expect(shortHash(hash)).toBe("0x98765432…abcdef");
    expect(shortHash("")).toBe("—");
  });

  it("timeAgo outputs human readable relative elapsed times", () => {
    const now = Date.now();
    expect(timeAgo(now - 5000)).toBe("just now");
    expect(timeAgo(now - 30_000)).toBe("30s ago");
    expect(timeAgo(now - 300_000)).toBe("5m ago");
    expect(timeAgo(now - 7_200_000)).toBe("2h ago");
    expect(timeAgo(now - 172_800_000)).toBe("2d ago");
  });

  it("clock and relative parse dates cleanly", () => {
    const now = Date.now();
    expect(typeof clock(now)).toBe("string");
    expect(clock(now).split(":").length).toBe(3);

    const iso = new Date(now - 60_000).toISOString();
    expect(relative(iso)).toBe("1m ago");
    expect(relative("invalid-date")).toBe("");
  });

  it("formatFullTime formats local, UTC and relative times with error resilience", () => {
    const ts = "2026-10-30T09:46:11.000Z";
    const res = formatFullTime(ts);
    expect(res.utc).toContain("2026-10-30 09:46:11 UTC");
    expect(res.iso).toBe("2026-10-30T09:46:11.000Z");
    expect(typeof res.relative).toBe("string");

    const invalid = formatFullTime("invalid-timestamp");
    expect(invalid.local).toBe("—");
    expect(invalid.utc).toBe("—");
    expect(invalid.relative).toBe("—");
  });
});
