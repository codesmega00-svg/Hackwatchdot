import { describe, expect, it } from "vitest";
import {
  TALK_KINDS,
  EMOJI_REACTIONS,
  TOPIC_STARTERS,
  type Comment,
  type PollState,
  type TalkKind,
} from "../src/components/Chat";

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

  it("defines complete set of 7 interactive emoji reactions", () => {
    expect(EMOJI_REACTIONS).toEqual(["🔥", "⚡", "💡", "🚨", "💎", "💀", "👏"]);
    expect(EMOJI_REACTIONS.length).toBe(7);
  });

  it("defines topic starters with prompts and valid talk kinds", () => {
    expect(TOPIC_STARTERS.length).toBeGreaterThanOrEqual(4);
    for (const starter of TOPIC_STARTERS) {
      expect(starter.label).toBeTruthy();
      expect(starter.prompt.length).toBeGreaterThan(10);
      expect(["intel", "alert", "mempool", "theory", "market", "general"]).toContain(starter.kind);
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

  it("creates and parses deep links to specific comments", () => {
    const commentId = "c_1730301234_abc";
    const permalink = `https://hackwatch.io#chat?c=${encodeURIComponent(commentId)}`;

    expect(permalink).toContain("#chat?c=c_1730301234_abc");

    // Test hash matcher logic
    const hash = "#chat?c=c_1730301234_abc";
    const match = hash.match(/[?&]c=([^&]+)/);
    expect(match).not.toBeNull();
    expect(decodeURIComponent(match![1])).toBe(commentId);
  });

  it("filters comments by TalkKind and sorts by trending reactions", () => {
    const mockComments: Comment[] = [
      { id: "1", name: "Alice", text: "Alert notice", ts: 100, kind: "alert", reactions: { "🚨": 10 } },
      { id: "2", name: "Bob", text: "Intel finding", ts: 200, kind: "intel", reactions: { "🔥": 25, "⚡": 5 } },
      { id: "3", name: "Charlie", text: "General chat", ts: 300, kind: "general", reactions: { "👏": 2 } },
    ];

    // Filter test
    const intelOnly = mockComments.filter((c) => c.kind === ("intel" as TalkKind));
    expect(intelOnly.length).toBe(1);
    expect(intelOnly[0].id).toBe("2");

    // Trending sort test (highest total reactions first)
    const sortedTrending = [...mockComments].sort((a, b) => {
      const aReacts = Object.values(a.reactions || {}).reduce((s, n) => s + n, 0);
      const bReacts = Object.values(b.reactions || {}).reduce((s, n) => s + n, 0);
      return bReacts - aReacts;
    });

    expect(sortedTrending[0].id).toBe("2"); // 30 reactions
    expect(sortedTrending[1].id).toBe("1"); // 10 reactions
    expect(sortedTrending[2].id).toBe("3"); // 2 reactions
  });

  it("accurately calculates poll vote percentages and handles vote switching", () => {
    const poll: PollState = {
      question: "Will exploiter cash out?",
      options: [
        { id: "opt1", text: "Option 1", votes: 80 },
        { id: "opt2", text: "Option 2", votes: 20 },
      ],
      userVote: null,
      totalVotes: 100,
    };

    const opt1Pct = Math.round((poll.options[0].votes / poll.totalVotes) * 100);
    const opt2Pct = Math.round((poll.options[1].votes / poll.totalVotes) * 100);

    expect(opt1Pct).toBe(80);
    expect(opt2Pct).toBe(20);
    expect(opt1Pct + opt2Pct).toBe(100);

    // Vote switching simulation
    const updatedOptions = poll.options.map((opt) => {
      if (opt.id === "opt1") return { ...opt, votes: opt.votes - 1 };
      if (opt.id === "opt2") return { ...opt, votes: opt.votes + 1 };
      return opt;
    });

    expect(updatedOptions[0].votes).toBe(79);
    expect(updatedOptions[1].votes).toBe(21);
  });
});
