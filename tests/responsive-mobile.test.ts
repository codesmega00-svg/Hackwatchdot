import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Mobile Responsiveness & Multi-Device Optimization", () => {
  const cssPath = path.resolve(__dirname, "../src/index.css");
  const css = fs.readFileSync(cssPath, "utf-8");
  const appPath = path.resolve(__dirname, "../src/App.tsx");
  const appTsx = fs.readFileSync(appPath, "utf-8");
  const livePath = path.resolve(__dirname, "../src/components/Live.tsx");
  const liveTsx = fs.readFileSync(livePath, "utf-8");

  it("defines responsive media queries across tablet and mobile viewports", () => {
    expect(css).toContain("@media (max-width: 980px)");
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("@media (max-width: 420px)");
    expect(css).toContain("@media (max-width: 360px)");
  });

  it("enforces document-level horizontal overflow prevention", () => {
    expect(css).toContain("overflow-x: hidden;");
    expect(css).toContain("max-width: 100vw;");
    expect(css).toContain("max-width: 100%;");
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

  it("configures hero action buttons in a balanced 2x2 grid for mobile layouts", () => {
    expect(css).toContain(".btns.hero-action-btns");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
  });

  it("prevents header text clipping with word-wrap and responsive clamp", () => {
    expect(css).toContain("overflow-wrap: break-word;");
    expect(css).toContain("word-break: break-word;");
  });

  it("points Share on X, Repost, and Copy Link to https://x.com/Hackwatchdot/status/2116403772956225967", () => {
    const targetPostUrl = "https://x.com/Hackwatchdot/status/2116403772956225967";
    const targetTweetId = "2116403772956225967";

    // App.tsx
    expect(appTsx).toContain(targetTweetId);
    expect(appTsx).toContain(`tweet_id=${targetTweetId}`);
    expect(appTsx).toContain(encodeURIComponent(targetPostUrl));
    expect(appTsx).toContain(`const postUrl = "${targetPostUrl}";`);

    // Live.tsx
    expect(liveTsx).toContain(`tweet_id=${targetTweetId}`);
  });
});
