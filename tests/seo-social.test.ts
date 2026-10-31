import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("SEO & Social Sharing Optimization", () => {
  const indexHtmlPath = path.resolve(__dirname, "../index.html");
  const indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
  const robotsPath = path.resolve(__dirname, "../public/robots.txt");
  const robotsTxt = fs.readFileSync(robotsPath, "utf-8");
  const sitemapPath = path.resolve(__dirname, "../public/sitemap.xml");
  const sitemapXml = fs.readFileSync(sitemapPath, "utf-8");
  const manifestPath = path.resolve(__dirname, "../public/site.webmanifest");
  const manifestJson = fs.readFileSync(manifestPath, "utf-8");
  const appTsxPath = path.resolve(__dirname, "../src/App.tsx");
  const appTsx = fs.readFileSync(appTsxPath, "utf-8");
  const fastTxPath = path.resolve(__dirname, "../src/components/FastTransactions.tsx");
  const fastTxTsx = fs.readFileSync(fastTxPath, "utf-8");
  const chatPath = path.resolve(__dirname, "../src/components/Chat.tsx");
  const chatTsx = fs.readFileSync(chatPath, "utf-8");
  const cssPath = path.resolve(__dirname, "../src/index.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  it("contains complete primary SEO tags in index.html", () => {
    expect(indexHtml).toContain("<title>Suspected Binance Hot Wallet Exploiter ($6.3B)");
    expect(indexHtml).toContain('<link rel="canonical" href="https://hackwatch.hackwatch.workers.dev/" />');
    expect(indexHtml).toContain('name="description"');
    expect(indexHtml).toContain('name="keywords"');
    expect(indexHtml).toContain('name="robots" content="index, follow, max-image-preview:large');
    expect(indexHtml).toContain('name="author" content="HackWatch (@Hackwatchdot)"');
  });

  it("defines comprehensive OpenGraph and Twitter Cards metadata", () => {
    // Open Graph
    expect(indexHtml).toContain('property="og:type" content="website"');
    expect(indexHtml).toContain('property="og:url" content="https://hackwatch.hackwatch.workers.dev/"');
    expect(indexHtml).toContain('property="og:title"');
    expect(indexHtml).toContain('property="og:description"');
    expect(indexHtml).toContain('property="og:image" content="https://hackwatch.hackwatch.workers.dev/hackwatch-logo.jpg"');
    expect(indexHtml).toContain('property="og:site_name" content="HackWatch"');

    // Twitter Card
    expect(indexHtml).toContain('name="twitter:card" content="summary_large_image"');
    expect(indexHtml).toContain('name="twitter:site" content="@Hackwatchdot"');
    expect(indexHtml).toContain('name="twitter:creator" content="@Hackwatchdot"');
    expect(indexHtml).toContain('name="twitter:title"');
    expect(indexHtml).toContain('name="twitter:image"');
  });

  it("embeds Schema.org JSON-LD structured data for WebApplication and LiveBlogPosting", () => {
    const jsonLdMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(jsonLdMatch).toBeTruthy();
    const parsed = JSON.parse(jsonLdMatch![1]);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(Array.isArray(parsed["@graph"])).toBe(true);

    const types = parsed["@graph"].map((item: { "@type": string }) => item["@type"]);
    expect(types).toContain("WebApplication");
    expect(types).toContain("LiveBlogPosting");
  });

  it("provides valid robots.txt and sitemap.xml with canonical endpoints", () => {
    expect(robotsTxt).toContain("User-agent: *");
    expect(robotsTxt).toContain("Allow: /");
    expect(robotsTxt).toContain("Sitemap: https://hackwatch.hackwatch.workers.dev/sitemap.xml");

    expect(sitemapXml).toContain("<loc>https://hackwatch.hackwatch.workers.dev/</loc>");
    expect(sitemapXml).toContain("<loc>https://hackwatch.hackwatch.workers.dev/#fasttx</loc>");
    expect(sitemapXml).toContain("<loc>https://hackwatch.hackwatch.workers.dev/#chat</loc>");
  });

  it("provides a valid PWA site.webmanifest", () => {
    const manifest = JSON.parse(manifestJson);
    expect(manifest.name).toContain("HackWatch");
    expect(manifest.short_name).toBe("HackWatch");
    expect(manifest.theme_color).toBe("#080a0f");
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it("implements dynamic document titles across all navigation tabs in App.tsx", () => {
    expect(appTsx).toContain("const TAB_TITLES");
    expect(appTsx).toContain("document.title = TAB_TITLES[tab]");
    expect(appTsx).toContain("Fast Transactions (677 Infected Wallets)");
    expect(appTsx).toContain("EIP-7702 Exploit Contract Analysis");
  });

  it("provides multi-channel viral social sharing in Hero, FastTransactions, and Chat", () => {
    // App.tsx Hero
    expect(appTsx).toContain("t.me/share/url");
    expect(appTsx).toContain("api.whatsapp.com/send");
    expect(appTsx).toContain("navigator.share");

    // FastTransactions.tsx
    expect(fastTxTsx).toContain("handleShareX");
    expect(fastTxTsx).toContain("handleShareTelegram");
    expect(fastTxTsx).toContain("handleShareWhatsApp");
    expect(fastTxTsx).toContain("mini-tx-share-btn");

    // Chat.tsx
    expect(chatTsx).toContain("viral-share-actions-grid");
    expect(chatTsx).toContain("t.me/share/url");
    expect(chatTsx).toContain("api.whatsapp.com/send");
  });

  it("includes responsive styling for viral sharing elements across viewports", () => {
    expect(css).toContain(".hero-viral-strip");
    expect(css).toContain(".viral-chip");
    expect(css).toContain(".mini-tx-share-btn");
    expect(css).toContain(".mini-share-ioc-btn");
  });
});

