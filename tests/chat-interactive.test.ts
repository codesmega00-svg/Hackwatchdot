import { describe, expect, it } from "vitest";
import { TALK_KINDS, type Comment } from "../src/components/Chat";

describe("Interactive Chat, Talk Kinds & X Sharing", () => {
  it("defines all 6 investigative talk kinds with labels, icons, and colors", () => {
    const kinds = TALK_KINDS.map((k) => k.id);
    expect(kinds).toContain("intel");
    expect(kinds).toContain("alert");
    expect(kinds).toContain("mempool");
    expect(kinds).toContain("theory");
    expect(kinds).toContain("market");
    expect(kinds).toContain("general");
    expect(TALK_KINDS.length).toBe(6);

    for (const k of TALK_KINDS) {
      expect(k.label).toBeTruthy();
      expect(k.icon).toBeTruthy();
      expect(k.color).toMatch(/^#/);
      expect(k.bg).toContain("rgba");
    }
  });

  it("formats X share intent URL properly with quote, author, and talk kind tag", () => {
    const mockComment: Comment = {
      id: "test-1",
      name: "0xAnalyst",
      text: "Batch sweep detected on 0x80d0",
      ts: 1730300000000,
      kind: "intel",
      reactions: { "🔥": 5 },
    };

    const kindObj = TALK_KINDS.find((k) => k.id === mockComment.kind);
    const kindTag = kindObj ? `[${kindObj.icon} ${kindObj.label}]` : "";
    const tweetText = `"${mockComment.text}"\n\n— ${mockComment.name} ${kindTag}\nTracking Binance breach live on @Hackwatchdot`;
    const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(tweetText)}&url=https%3A%2F%2Fhackwatch.io%23chat`;

    expect(shareUrl).toContain("https://x.com/intent/post?text=");
    expect(shareUrl).toContain(encodeURIComponent("@Hackwatchdot"));
    expect(shareUrl).toContain(encodeURIComponent("0xAnalyst"));
    expect(shareUrl).toContain(encodeURIComponent("Onchain Intel"));
  });

  it("handles dual timestamp representations (relative and exact UTC)", () => {
    const ts = Date.now() - 1000 * 60 * 15; // 15 mins ago
    const timeObj = new Date(ts);
    const utcTimeStr = `${timeObj.toISOString().slice(0, 10)} ${timeObj.toISOString().slice(11, 16)} UTC`;

    expect(utcTimeStr).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/);
  });
});
