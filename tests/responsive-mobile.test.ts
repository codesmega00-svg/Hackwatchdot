import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Mobile Responsiveness & Multi-Device Optimization", () => {
  const cssPath = path.resolve(__dirname, "../src/index.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  it("defines responsive media queries across tablet and mobile viewports", () => {
    expect(css).toContain("@media (max-width: 980px)");
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("@media (max-width: 420px)");
    expect(css).toContain("@media (max-width: 360px)");
  });

  it("includes hide-m and hide-s column visibility classes", () => {
    expect(css).toContain(".hide-m { display: none !important; }");
    expect(css).toContain(".hide-s { display: none !important; }");
  });

  it("configures smooth touch scrolling and hidden scrollbars for mobile tabbar", () => {
    expect(css).toContain("-webkit-overflow-scrolling: touch;");
    expect(css).toContain(".tabbar::-webkit-scrollbar");
    expect(css).toContain("scrollbar-width: none;");
  });

  it("includes mobile address shortening classes and swipe cues", () => {
    expect(css).toContain(".feed-addr-full");
    expect(css).toContain(".feed-addr-short");
    expect(css).toContain(".mobile-swipe-cue");
  });
});

