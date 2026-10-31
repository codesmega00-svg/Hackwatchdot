import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Page 12: Follow All Tasks & Claim $5,000 Reward Desk", () => {
  const appPath = path.resolve(__dirname, "../src/App.tsx");
  const appTsx = fs.readFileSync(appPath, "utf-8");
  const rewardsPath = path.resolve(__dirname, "../src/components/RewardsTask.tsx");
  const rewardsTsx = fs.readFileSync(rewardsPath, "utf-8");
  const sitemapPath = path.resolve(__dirname, "../public/sitemap.xml");
  const sitemapXml = fs.readFileSync(sitemapPath, "utf-8");
  const i18nPath = path.resolve(__dirname, "../src/lib/i18n.ts");
  const i18nTs = fs.readFileSync(i18nPath, "utf-8");
  const cssPath = path.resolve(__dirname, "../src/index.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  it("configures page 12 'rewards' tab in App.tsx navigation and document titles", () => {
    expect(appTsx).toContain('{ id: "rewards", label: "Claim $5,000 Reward", short: "$5K Bounty" }');
    expect(appTsx).toContain('rewards: "Claim $5,000 Community Reward — Complete Tasks | HackWatch"');
    expect(appTsx).toContain('{tab === "rewards" ? <RewardsTask /> : null}');
    expect(appTsx).toContain('import RewardsTask from "./components/RewardsTask";');
  });

  it("includes all 8 required tasks with target links, Telegram subscription, and Twitter intents", () => {
    const targetUrl = "https://x.com/Hackwatchdot/status/2116403772956225967";
    const targetTweetId = "2116403772956225967";
    const telegramUrl = "https://t.me/hackwatchdot";

    // Task 1: Follow on X
    expect(rewardsTsx).toContain("Task 1: Follow @Hackwatchdot on X");
    expect(rewardsTsx).toContain("https://x.com/Hackwatchdot");
    expect(rewardsTsx).toContain("https://x.com/intent/follow?screen_name=Hackwatchdot");

    // Task 2: Subscribe Telegram
    expect(rewardsTsx).toContain("Task 2: Subscribe Telegram Channel");
    expect(rewardsTsx).toContain(telegramUrl);

    // Task 3: Like
    expect(rewardsTsx).toContain("Task 3: Like the Main Investigation Post");
    expect(rewardsTsx).toContain("tweet_id=");
    expect(rewardsTsx).toContain(targetTweetId);
    expect(rewardsTsx).toContain(targetUrl);

    // Task 4: Comment
    expect(rewardsTsx).toContain("Task 4: Comment on the Investigation Post");
    expect(rewardsTsx).toContain("in_reply_to=");

    // Task 5: Repost
    expect(rewardsTsx).toContain("Task 5: Repost (Retweet) the Post");
    expect(rewardsTsx).toContain("intent/retweet?tweet_id=");

    // Task 6: Share
    expect(rewardsTsx).toContain("Task 6: Share the Post");
    expect(rewardsTsx).toContain("t.me/share/url");

    // Task 7: Tag 2 Friends
    expect(rewardsTsx).toContain("Task 7: Tag 2 Friends on the Post");

    // Task 8: Submit ERC-20 Wallet
    expect(rewardsTsx).toContain("Task 8: Submit Your ERC-20 / ETH Wallet Address");
    expect(rewardsTsx).toContain("erc-wallet-input");
  });

  it("validates ERC-20 Ethereum address format strictly", () => {
    const regex = /^0x[a-fA-F0-9]{40}$/;
    expect(regex.test("0x71a2B890F34bC1a3c74E21D71b9B2eD95c2192b4")).toBe(true);
    expect(regex.test("0x24fe06d9bf2737604313f8c8531d044f2fbcc556")).toBe(true);
    expect(regex.test("0x123")).toBe(false);
    expect(regex.test("not-a-wallet")).toBe(false);
    expect(regex.test("71a2B890F34bC1a3c74E21D71b9B2eD95c2192b4")).toBe(false); // missing 0x
  });

  it("includes persistent ticket generation and sharing mechanism", () => {
    expect(rewardsTsx).toContain("HW-5000-");
    expect(rewardsTsx).toContain("VERIFIED ENTRY TICKET");
    expect(rewardsTsx).toContain("shareProofOnX");
    expect(rewardsTsx).toContain("hackwatch.bounty_v1");
  });

  it("updates sitemap.xml to include #rewards canonical permalink", () => {
    expect(sitemapXml).toContain("<loc>https://hackwatch.hackwatch.workers.dev/#rewards</loc>");
  });

  it("translates nav_rewards across supported languages in i18n.ts", () => {
    expect(i18nTs).toContain('nav_rewards: "Claim $5,000 Reward"');
    expect(i18nTs).toContain('nav_rewards: "领取 $5,000 奖励"');
    expect(i18nTs).toContain('nav_rewards: "Reclamar $5,000"');
    expect(i18nTs).toContain('nav_rewards: "$5,000報酬を獲得"');
    expect(i18nTs).toContain('nav_rewards: "$5,000 보상 받기"');
    expect(i18nTs).toContain('nav_rewards: "Награда $5,000"');
  });

  it("contains complete CSS responsive and theme styles for the bounty desk", () => {
    expect(css).toContain(".rewards-page-wrap");
    expect(css).toContain(".rewards-hero-card");
    expect(css).toContain(".bounty-ticket-card");
    expect(css).toContain(".task-card");
    expect(css).toContain(".wallet-submission-card");
    expect(css).toContain(".recent-claims-card");
    expect(css).toContain(".bounty-pill");
  });
});
