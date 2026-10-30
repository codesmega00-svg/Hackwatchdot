import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { registerAppAction } from "../lib/app-actions";
import { useTick } from "../lib/useLive";
import { timeAgo } from "../lib/format";
import { SectionTitle, useToast } from "./ui";

export type TalkKind = "intel" | "alert" | "mempool" | "theory" | "market" | "general";
export type SortOption = "latest" | "trending" | "intel";

export interface Comment {
  id: string;
  name: string;
  text: string;
  ts: number;
  mine?: boolean;
  kind?: TalkKind;
  reactions?: Record<string, number>;
}

export interface PollState {
  question: string;
  options: { id: string; text: string; votes: number }[];
  userVote: string | null;
  totalVotes: number;
}

export const TALK_KINDS: { id: TalkKind; label: string; icon: string; color: string; bg: string }[] = [
  { id: "intel", label: "Onchain Intel", icon: "🔍", color: "#67a9ff", bg: "rgba(103, 169, 255, 0.15)" },
  { id: "alert", label: "Security Alert", icon: "🚨", color: "#ff5a52", bg: "rgba(255, 90, 82, 0.15)" },
  { id: "mempool", label: "Mempool Bot", icon: "⚡", color: "#f2b64a", bg: "rgba(242, 182, 74, 0.15)" },
  { id: "theory", label: "Theory & Clues", icon: "💡", color: "#a68cff", bg: "rgba(166, 140, 255, 0.15)" },
  { id: "market", label: "Market Impact", icon: "📊", color: "#3fd69c", bg: "rgba(63, 214, 156, 0.15)" },
  { id: "general", label: "General Talk", icon: "💬", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)" },
];

export const EMOJI_REACTIONS = ["🔥", "⚡", "💡", "🚨", "💎", "💀", "👏"] as const;

export const TOPIC_STARTERS = [
  { label: "⚡ 0x80d0 Deployer batch sweep", prompt: "Notice how 0x80d0...52df is executing executeBatch calls across multiple victim slots?", kind: "mempool" as TalkKind },
  { label: "🔍 18,270 BTC peeling chain", prompt: "Tracing the 18,270 BTC hops through Thorchain: are any UTXOs consolidating yet?", kind: "intel" as TalkKind },
  { label: "🚨 $1.15B frozen USDT status", prompt: "Tether's blacklist on 0x5227...2f8c has successfully locked $1.15B USDT from moving.", kind: "alert" as TalkKind },
  { label: "📊 PROM & FUN DEX liquidity", prompt: "Uniswap V3 and Curve pools absorbed over $17M in FUN & PROM dumping in initial hours.", kind: "market" as TalkKind },
];

const INITIAL_POLL: PollState = {
  question: "Will the exploiter successfully cash out the 18,270 BTC ($1.24B) through cross-chain hops?",
  options: [
    { id: "flagged", text: "🔴 No — Peeling chain will be blacklisted by major centralized exchanges & mixers", votes: 842 },
    { id: "laundered", text: "🟢 Yes — Atomic swaps, Thorchain routing & decentralized liquidity will work", votes: 721 },
    { id: "frozen", text: "🟡 Partial — Coordinated law enforcement & whitehats will freeze >50%", votes: 384 },
  ],
  userVote: null,
  totalVotes: 1947,
};

const KEY = "hackwatch.comments.v2";
const RATE = "hackwatch.lastpost.v1";
const NAME = "hackwatch.name.v1";
const REACTIONS_KEY = "hackwatch.user_reactions.v1";
const POLL_KEY = "hackwatch.poll.v1";
const COOLDOWN = 30_000;

const SEEDS: Comment[] = [
  {
    id: "s1",
    name: "0xArkhamDetective",
    text: "The sweeper implementation at 0x63e8...6fAe executed batch sweeps using function selector 0x8aaa8f3b. They funded the deployer with 38.4M in gas prep.",
    ts: Date.now() - 1000 * 60 * 18,
    kind: "intel",
    reactions: { "🔥": 28, "⚡": 19, "💡": 14 },
  },
  {
    id: "s2",
    name: "MempoolWatch_Node",
    text: "Mempool alert: 0x80d0...52df just pushed 3 new transactions with maxPriorityFeePerGas set to 20 Gwei. Bot is actively sweeping.",
    ts: Date.now() - 1000 * 60 * 34,
    kind: "mempool",
    reactions: { "⚡": 42, "🚨": 24 },
  },
  {
    id: "s3",
    name: "defi_sentinel",
    text: "Tether blacklisted the main vault 0x5227...2f8c containing $1.15B USDT. The tokens are locked and cannot be swapped on Uniswap or Curve.",
    ts: Date.now() - 1000 * 60 * 52,
    kind: "alert",
    reactions: { "🚨": 56, "💡": 22, "🔥": 18 },
  },
  {
    id: "s4",
    name: "SatoshiTracker",
    text: "18,270 BTC moved into Thorchain bridges and peeled across 14 hops. Because BTC UTXOs have no freeze function, this cannot be reversed onchain.",
    ts: Date.now() - 1000 * 60 * 85,
    kind: "theory",
    reactions: { "💡": 34, "🔥": 29, "💀": 12 },
  },
  {
    id: "s5",
    name: "DEX_Liquidity_Risk",
    text: "Heavy sell pressure on FUN and PROM. Look at the curve 3pool and Uniswap V3 pools — exploiter dumped 4.2B FUN in minutes.",
    ts: Date.now() - 1000 * 60 * 110,
    kind: "market",
    reactions: { "📊": 25, "⚡": 15 },
  },
  {
    id: "s6",
    name: "anon_researcher",
    text: "Cleanest live desk for tracking the breach. Seeing the Etherscan Flow session linked alongside Arkham cluster is incredible.",
    ts: Date.now() - 1000 * 60 * 140,
    kind: "general",
    reactions: { "👏": 48, "🔥": 33, "💎": 20 },
  },
];

function loadComments(): Comment[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEEDS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return SEEDS;
    return parsed.filter((c): c is Comment => typeof c?.text === "string" && typeof c?.ts === "number").slice(0, 300);
  } catch {
    return SEEDS;
  }
}

function loadUserReactions(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadPoll(): PollState {
  try {
    const raw = localStorage.getItem(POLL_KEY);
    if (!raw) return INITIAL_POLL;
    const parsed = JSON.parse(raw);
    return { ...INITIAL_POLL, ...parsed };
  } catch {
    return INITIAL_POLL;
  }
}

export default function Chat() {
  const [comments, setComments] = useState<Comment[]>(loadComments);
  const [name, setName] = useState(() => localStorage.getItem(NAME) ?? "");
  const [text, setText] = useState("");
  const [selectedKind, setSelectedKind] = useState<TalkKind>("intel");
  const [filterKind, setFilterKind] = useState<"all" | TalkKind>("all");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [userReactions, setUserReactions] = useState<Record<string, string[]>>(loadUserReactions);
  const [poll, setPoll] = useState<PollState>(loadPoll);
  const [msg, setMsg] = useState("");
  const [lastPost, setLastPost] = useState<number>(() => Number(localStorage.getItem(RATE) ?? 0));
  const [onlineUsers] = useState(158);
  const [activeShareModalComment, setActiveShareModalComment] = useState<Comment | null>(null);
  const [floatingBursts, setFloatingBursts] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);

  const now = useTick(1000);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Deep linking to comment on mount: e.g. #chat?c=s1 or ?c=s1
  useEffect(() => {
    try {
      const hash = window.location.hash;
      const match = hash.match(/[?&]c=([^&]+)/) || window.location.search.match(/[?&]c=([^&]+)/);
      if (match && match[1]) {
        const targetId = decodeURIComponent(match[1]);
        setHighlightedCommentId(targetId);
        window.setTimeout(() => {
          const el = document.getElementById(`comment-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 300);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(comments.slice(0, 300)));
    } catch {
      /* storage full or blocked */
    }
  }, [comments]);

  useEffect(() => {
    try {
      localStorage.setItem(REACTIONS_KEY, JSON.stringify(userReactions));
    } catch {
      /* storage full or blocked */
    }
  }, [userReactions]);

  useEffect(() => {
    try {
      localStorage.setItem(POLL_KEY, JSON.stringify(poll));
    } catch {
      /* storage full or blocked */
    }
  }, [poll]);

  const remaining = Math.max(0, Math.ceil((lastPost + COOLDOWN - now) / 1000));

  const post = useCallback(() => {
    const body = text.trim();
    if (body.length < 3) {
      setMsg("Write at least 3 characters.");
      return false;
    }
    if (/(https?:\/\/|www\.|\b0x[a-f0-9]{8,}\b|\.com\b)/i.test(body)) {
      setMsg("Links and wallet addresses are blocked to keep recovery scammers out.");
      return false;
    }
    if (remaining > 0) {
      setMsg(`Slow down — one comment every 30 seconds. ${remaining}s to go.`);
      return false;
    }
    const clean = body.slice(0, 280);
    const comment: Comment = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim().slice(0, 24) || "anon",
      text: clean,
      ts: Date.now(),
      mine: true,
      kind: selectedKind,
      reactions: {},
    };
    setComments((prev) => [comment, ...prev]);
    setText("");
    setMsg("");
    setLastPost(Date.now());
    try {
      localStorage.setItem(RATE, String(Date.now()));
      localStorage.setItem(NAME, name.trim().slice(0, 24));
    } catch {
      /* ignore */
    }
    toast(`Comment posted under ${TALK_KINDS.find((k) => k.id === selectedKind)?.label || "Discussion"}.`);
    inputRef.current?.focus();
    return true;
  }, [text, name, remaining, selectedKind, toast]);

  // Handle reaction with particle burst
  const toggleReaction = useCallback(
    (commentId: string, emoji: string, e?: React.MouseEvent) => {
      const hasReacted = userReactions[commentId]?.includes(emoji);

      // Trigger floating reaction burst
      if (e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const burstId = `${Date.now()}_${Math.random()}`;
        setFloatingBursts((prev) => [...prev, { id: burstId, emoji, x: rect.left + rect.width / 2, y: rect.top - 10 }]);
        window.setTimeout(() => {
          setFloatingBursts((prev) => prev.filter((b) => b.id !== burstId));
        }, 900);
      }

      setUserReactions((prev) => {
        const current = prev[commentId] || [];
        const updated = hasReacted ? current.filter((item) => item !== emoji) : [...current, emoji];
        return { ...prev, [commentId]: updated };
      });

      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          const currentCount = c.reactions?.[emoji] ?? 0;
          const nextCount = hasReacted ? Math.max(0, currentCount - 1) : currentCount + 1;
          const updatedReactions = { ...c.reactions };
          if (nextCount > 0) {
            updatedReactions[emoji] = nextCount;
          } else {
            delete updatedReactions[emoji];
          }
          return { ...c, reactions: updatedReactions };
        })
      );
    },
    [userReactions]
  );

  // Voting in community poll
  const voteInPoll = useCallback((optionId: string) => {
    setPoll((prev) => {
      if (prev.userVote === optionId) return prev; // Already voted this option
      const oldVote = prev.userVote;
      const updatedOptions = prev.options.map((opt) => {
        if (opt.id === optionId) {
          return { ...opt, votes: opt.votes + 1 };
        }
        if (opt.id === oldVote) {
          return { ...opt, votes: Math.max(0, opt.votes - 1) };
        }
        return opt;
      });
      const updatedTotal = oldVote ? prev.totalVotes : prev.totalVotes + 1;
      return {
        ...prev,
        options: updatedOptions,
        userVote: optionId,
        totalVotes: updatedTotal,
      };
    });
    toast("Vote recorded! Live onchain community sentiment updated.");
  }, [toast]);

  // Viral Sharing Links
  const getViralTweetText = useCallback((c: Comment) => {
    const kindObj = TALK_KINDS.find((k) => k.id === c.kind);
    const kindTag = kindObj ? `[${kindObj.icon} ${kindObj.label}]` : "";
    return `⚡ BREAKING INTEL: "${c.text}"\n\n— ${c.name || "anon"} ${kindTag}\n\nLive onchain tracking on @Hackwatchdot #BinanceHack #CryptoHacks`;
  }, []);

  const getCommentPermalink = useCallback((commentId: string) => {
    return `https://hackwatch.io#chat?c=${encodeURIComponent(commentId)}`;
  }, []);

  const shareOnX = useCallback((c: Comment) => {
    const tweetText = getViralTweetText(c);
    const permalink = getCommentPermalink(c.id);
    const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(permalink)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    toast("Opening X to share comment...");
  }, [getViralTweetText, getCommentPermalink, toast]);

  const sharePollOnX = useCallback(() => {
    const topOption = [...poll.options].sort((a, b) => b.votes - a.votes)[0];
    const tweetText = `📊 COMMUNITY ONCHAIN POLL: "${poll.question}"\n\nLeading sentiment: ${topOption.text} (${Math.round((topOption.votes / poll.totalVotes) * 100)}% of ${poll.totalVotes.toLocaleString()} votes)\n\nVote live on @Hackwatchdot:`;
    const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(tweetText)}&url=https%3A%2F%2Fhackwatch.io%23chat`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    toast("Sharing investigation poll on X...");
  }, [poll, toast]);

  const copyCommentLink = useCallback((commentId: string) => {
    const permalink = getCommentPermalink(commentId);
    void navigator.clipboard?.writeText(permalink).then(
      () => toast("Viral direct link copied to clipboard!"),
      () => toast("Clipboard blocked — copy link manually.")
    );
  }, [getCommentPermalink, toast]);

  const copyQuote = useCallback((c: Comment) => {
    const kindObj = TALK_KINDS.find((k) => k.id === c.kind);
    const kindTag = kindObj ? `[${kindObj.label}] ` : "";
    const quoteStr = `"${c.text}" — ${c.name || "anon"} ${kindTag}(HackWatch Onchain Desk)\n${getCommentPermalink(c.id)}`;
    void navigator.clipboard?.writeText(quoteStr).then(
      () => toast("Formatted quote with link copied!"),
      () => toast("Clipboard blocked — select and copy manually.")
    );
  }, [getCommentPermalink, toast]);

  const replyTo = useCallback((author: string) => {
    setText((prev) => (prev ? `@${author} ${prev}` : `@${author} `));
    inputRef.current?.focus();
  }, []);

  // Filtered and sorted comments
  const processedComments = useMemo(() => {
    let list = comments;
    if (filterKind !== "all") {
      list = list.filter((c) => c.kind === filterKind);
    }
    if (sortBy === "trending") {
      list = [...list].sort((a, b) => {
        const aReacts = Object.values(a.reactions || {}).reduce((s, n) => s + n, 0);
        const bReacts = Object.values(b.reactions || {}).reduce((s, n) => s + n, 0);
        return bReacts - aReacts;
      });
    } else if (sortBy === "intel") {
      list = [...list].sort((a, b) => {
        if (a.kind === "intel" && b.kind !== "intel") return -1;
        if (b.kind === "intel" && a.kind !== "intel") return 1;
        return b.ts - a.ts;
      });
    }
    return list;
  }, [comments, filterKind, sortBy]);

  // Counts per talk kind
  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = { all: comments.length };
    for (const c of comments) {
      const k = c.kind || "general";
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [comments]);

  useEffect(() => {
    const registration = registerAppAction({
      name: "post_comment",
      description: "Post a comment to the HackWatch live comment thread.",
      inputSchema: {
        type: "object",
        properties: {
          comment: {
            type: "string",
            title: "Comment text",
            minLength: 3,
            maxLength: 280,
          },
          author: {
            type: "string",
            title: "Author display name",
            maxLength: 24,
          },
        },
        required: ["comment"],
        additionalProperties: false,
      },
      parse: (input: unknown) => {
        const obj = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
        const comment = typeof obj.comment === "string" ? obj.comment.trim() : "";
        const author = typeof obj.author === "string" ? obj.author.trim() : "";
        if (comment.length < 3) throw new Error("Write at least 3 characters.");
        if (/(https?:\/\/|www\.|\b0x[a-f0-9]{8,}\b|\.com\b)/i.test(comment)) {
          throw new Error("Links and wallet addresses are blocked to keep recovery scammers out.");
        }
        return { comment: comment.slice(0, 280), author: author.slice(0, 24) || "anon" };
      },
      execute: (input) => {
        const newComment: Comment = {
          id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: input.author,
          text: input.comment,
          ts: Date.now(),
          mine: true,
          kind: "intel",
          reactions: {},
        };
        setComments((prev) => [newComment, ...prev]);
        setLastPost(Date.now());
        try {
          localStorage.setItem(RATE, String(Date.now()));
          localStorage.setItem(NAME, input.author);
        } catch {
          /* ignore */
        }
        toast("Comment posted.");
        return { ok: true, comment: newComment };
      },
    });
    return registration.dispose;
  }, [toast]);

  return (
    <>
      {/* Floating Reaction Bursts Container */}
      <div className="floating-bursts-container" aria-hidden="true">
        {floatingBursts.map((b) => (
          <div
            key={b.id}
            className="floating-reaction-burst"
            style={{ left: b.x, top: b.y }}
          >
            <span>+1</span>
            <span>{b.emoji}</span>
          </div>
        ))}
      </div>

      <SectionTitle
        kicker="Collaborative Intel Room"
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span>Investigator Chat & Viral Intel Hub</span>
            <span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#3fd69c" }} />
            <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
              {comments.length} posts
            </span>
          </div>
        }
        sub="Public collaborative onchain desk. Share wallet clues, transaction anomalies, and sell velocity analysis. Instant one-click sharing to X, dual UTC & relative timestamps, deep links, and live community sentiment polls."
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="live-presence-pill" style={{ padding: "4px 11px", fontSize: 11 }}>
              <span className="live-presence-dot" />
              <b style={{ color: "#3fd69c" }}>{onlineUsers}</b>
              <span className="live-watching-label">investigators online</span>
            </div>
            <a
              className="btn rt"
              href="https://x.com/Hackwatchdot"
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: "#000", color: "#fff", borderColor: "rgba(255, 255, 255, 0.3)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, padding: "5px 12px" }}
              title="Follow @Hackwatchdot on X"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Follow @Hackwatchdot
            </a>
          </div>
        }
      />

      {/* Interactive Community Investigation Poll */}
      <section className="viral-poll-card">
        <div className="viral-poll-head">
          <div className="viral-poll-badge">
            <span className="live-status-dot confirmed" />
            <span>LIVE INVESTIGATION POLL</span>
          </div>
          <span className="viral-poll-count mono dim">
            {poll.totalVotes.toLocaleString()} analysts voted
          </span>
          <button
            type="button"
            className="btn ghost viral-poll-share-btn"
            onClick={sharePollOnX}
            title="Share this live poll result to X"
          >
            <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share Poll on X
          </button>
        </div>

        <h4 className="viral-poll-question">{poll.question}</h4>

        <div className="viral-poll-options">
          {poll.options.map((opt) => {
            const pctVal = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
            const isUserPick = poll.userVote === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`viral-poll-option-btn ${isUserPick ? "user-voted" : ""}`}
                onClick={() => voteInPoll(opt.id)}
              >
                <div className="viral-poll-progress" style={{ width: `${pctVal}%` }} />
                <div className="viral-poll-option-content">
                  <span className="viral-poll-option-text">
                    {opt.text} {isUserPick ? <b className="voted-tag">✓ Your Vote</b> : null}
                  </span>
                  <span className="viral-poll-option-pct mono">
                    {pctVal}% ({opt.votes.toLocaleString()})
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick Topic Starter Chips */}
      <div className="chat-topic-starters">
        <span className="chat-topic-label">Quick Prompts:</span>
        {TOPIC_STARTERS.map((item) => (
          <button
            key={item.label}
            type="button"
            className="chat-topic-pill"
            onClick={() => {
              setText(item.prompt);
              setSelectedKind(item.kind);
              inputRef.current?.focus();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Chat Container */}
      <div className="chat">
        {/* Composer Form */}
        <form
          className="chat-composer-form"
          onSubmit={(e) => {
            e.preventDefault();
            void post();
          }}
          autoComplete="off"
        >
          <div className="chat-composer-top-row">
            <input
              id="cname"
              value={name}
              maxLength={24}
              placeholder="Your handle (e.g. 0xAnalyst)"
              aria-label="Name"
              onChange={(e) => setName(e.target.value)}
              className="chat-input-name"
            />

            {/* Talk Kind Selector */}
            <div className="chat-kind-selector-wrap">
              <span className="chat-kind-selector-label">Kind of Talk:</span>
              <div className="chat-kind-buttons">
                {TALK_KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    className={`chat-kind-btn ${selectedKind === k.id ? "active" : ""}`}
                    style={{
                      borderColor: selectedKind === k.id ? k.color : undefined,
                      color: selectedKind === k.id ? k.color : undefined,
                      background: selectedKind === k.id ? k.bg : undefined,
                    }}
                    onClick={() => setSelectedKind(k.id)}
                  >
                    <span>{k.icon}</span>
                    <span>{k.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="chat-composer-input-row">
            <input
              id="ctext"
              ref={inputRef}
              value={text}
              maxLength={280}
              placeholder="Share an onchain finding, transaction pattern, or question..."
              aria-label="Comment"
              onChange={(e) => {
                setText(e.target.value);
                if (msg) setMsg("");
              }}
              className="chat-input-text"
            />
            <button className="btn rt chat-submit-btn" id="csend" type="submit" disabled={remaining > 0}>
              {remaining > 0 ? `Wait ${remaining}s` : "Post Comment"}
            </button>
          </div>

          <div className="chat-composer-footer">
            <div className="cmsg" id="cmsg" role="status" aria-live="polite">
              {msg ? (
                <span style={{ color: "var(--red)" }}>{msg}</span>
              ) : remaining > 0 ? (
                `Cooldown: ${remaining}s until your next post.`
              ) : (
                `${280 - text.length} characters left · Markdown supported`
              )}
            </div>
          </div>
        </form>

        {/* Talk Kinds & Sorting Filter Bar */}
        <div className="chat-filter-bar">
          <div className="chat-filter-group-left">
            <span className="chat-filter-title">Filter Talk:</span>
            <button
              type="button"
              className={`chat-filter-chip ${filterKind === "all" ? "active" : ""}`}
              onClick={() => setFilterKind("all")}
            >
              All ({kindCounts.all || 0})
            </button>
            {TALK_KINDS.map((k) => {
              const count = kindCounts[k.id] || 0;
              const isActive = filterKind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  className={`chat-filter-chip ${isActive ? "active" : ""}`}
                  style={{
                    borderColor: isActive ? k.color : undefined,
                    color: isActive ? k.color : undefined,
                    background: isActive ? k.bg : undefined,
                  }}
                  onClick={() => setFilterKind(k.id)}
                >
                  <span>{k.icon}</span>
                  <span>{k.label}</span>
                  <span className="chat-filter-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Sort Control */}
          <div className="chat-filter-group-right">
            <span className="chat-filter-title">Sort:</span>
            <button
              type="button"
              className={`chat-sort-btn ${sortBy === "latest" ? "active" : ""}`}
              onClick={() => setSortBy("latest")}
            >
              ⚡ Latest
            </button>
            <button
              type="button"
              className={`chat-sort-btn ${sortBy === "trending" ? "active" : ""}`}
              onClick={() => setSortBy("trending")}
            >
              🔥 Hot / Reacted
            </button>
            <button
              type="button"
              className={`chat-sort-btn ${sortBy === "intel" ? "active" : ""}`}
              onClick={() => setSortBy("intel")}
            >
              🔍 Top Intel
            </button>
          </div>
        </div>

        {/* Comments Feed */}
        <div className="clist" id="clist">
          {processedComments.length === 0 ? (
            <div className="empty" style={{ padding: "32px 20px" }}>
              <b>No comments found for this topic</b>
              Switch to "All Talks" or be the first to post under this category.
            </div>
          ) : (
            processedComments.map((c) => {
              const kindObj = TALK_KINDS.find((k) => k.id === c.kind) || TALK_KINDS[0];
              const userReactedList = userReactions[c.id] || [];
              const timeObj = new Date(c.ts);
              const utcTimeStr = `${timeObj.toISOString().slice(0, 10)} ${timeObj.toISOString().slice(11, 16)} UTC`;
              const localTimeStr = timeObj.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
              const isHighlighted = highlightedCommentId === c.id;

              return (
                <div
                  className={`comment chat-msg-entry ${isHighlighted ? "highlighted-comment" : ""}`}
                  key={c.id}
                  id={`comment-${c.id}`}
                >
                  {/* Avatar */}
                  <div className="av" aria-hidden="true" style={{ borderColor: `${kindObj.color}44`, color: kindObj.color }}>
                    {(c.name || "A").slice(0, 2).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header: Author + Kind Badge + Dual Timestamps + Delete */}
                    <div className="chd">
                      <b>{c.name || "anon"}</b>

                      {/* Kind of Talk Badge */}
                      <span
                        className="chat-kind-badge"
                        style={{
                          color: kindObj.color,
                          background: kindObj.bg,
                          borderColor: `${kindObj.color}44`,
                        }}
                      >
                        <span>{kindObj.icon}</span>
                        <span>{kindObj.label}</span>
                      </span>

                      {/* Dual Timestamps */}
                      <span className="chat-timestamp-group" title={`Local: ${localTimeStr} · Exact: ${utcTimeStr}`}>
                        <time dateTime={timeObj.toISOString()} className="chat-time-relative">
                          {timeAgo(c.ts)}
                        </time>
                        <span className="chat-time-sep">•</span>
                        <span className="chat-time-exact mono">{utcTimeStr}</span>
                      </span>

                      {/* Delete button for user's own comments */}
                      {c.mine ? (
                        <button
                          type="button"
                          onClick={() => setComments((prev) => prev.filter((x) => x.id !== c.id))}
                          className="chat-delete-btn"
                          aria-label="Delete your comment"
                        >
                          delete
                        </button>
                      ) : null}
                    </div>

                    {/* Comment Body */}
                    <p className="chat-comment-text">{c.text}</p>

                    {/* Interactive Footer: Reactions + Share on X + Copy Quote + Reply */}
                    <div className="chat-comment-footer">
                      {/* Emoji Reactions Row */}
                      <div className="chat-reactions-row">
                        {EMOJI_REACTIONS.map((emoji) => {
                          const count = c.reactions?.[emoji] ?? 0;
                          const hasReacted = userReactedList.includes(emoji);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              className={`chat-reaction-btn ${hasReacted ? "reacted" : ""} ${count > 0 ? "has-count" : ""}`}
                              onClick={(e) => toggleReaction(c.id, emoji, e)}
                              title={`React with ${emoji}`}
                            >
                              <span>{emoji}</span>
                              {count > 0 ? <span className="reaction-count">{count}</span> : null}
                            </button>
                          );
                        })}
                      </div>

                      {/* Viral Action Buttons: Share Card Modal, Share on X, Copy Link, Quote, Reply */}
                      <div className="chat-actions-row">
                        {/* Viral Share Card Trigger */}
                        <button
                          type="button"
                          className="chat-action-btn viral-card-btn"
                          onClick={() => setActiveShareModalComment(c)}
                          title="Open Viral Share Card"
                        >
                          🚀 Share Card
                        </button>

                        {/* Direct Share on X Button */}
                        <button
                          type="button"
                          className="chat-action-btn x-share-btn"
                          onClick={() => shareOnX(c)}
                          title="Share directly on X (Twitter)"
                        >
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          <span>𝕏 Post</span>
                        </button>

                        {/* Copy Permalink */}
                        <button
                          type="button"
                          className="chat-action-btn"
                          onClick={() => copyCommentLink(c.id)}
                          title="Copy direct permalink to this comment"
                        >
                          🔗 Link
                        </button>

                        {/* Copy Quote Button */}
                        <button
                          type="button"
                          className="chat-action-btn"
                          onClick={() => copyQuote(c)}
                          title="Copy formatted quote to clipboard"
                        >
                          📋 Quote
                        </button>

                        {/* Reply Button */}
                        <button
                          type="button"
                          className="chat-action-btn"
                          onClick={() => replyTo(c.name || "anon")}
                          title={`Reply to ${c.name || "anon"}`}
                        >
                          ↩ Reply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Viral Share Card Modal Popup */}
      {activeShareModalComment ? (
        <div
          className="viral-modal-overlay"
          onClick={() => setActiveShareModalComment(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="viral-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="viral-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="live-status-dot confirmed" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Viral Share Card</h3>
              </div>
              <button
                type="button"
                className="btn ghost"
                style={{ padding: "2px 8px", fontSize: 12 }}
                onClick={() => setActiveShareModalComment(null)}
              >
                ✕ Close
              </button>
            </div>

            {/* Preview Card */}
            <div className="viral-card-preview">
              <div className="viral-card-preview-top">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img
                    src="/hackwatch-logo.jpg"
                    alt="HackWatch"
                    style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                  />
                  <div>
                    <b style={{ fontSize: 13, color: "#fff" }}>{activeShareModalComment.name || "anon"}</b>
                    <span className="mono dim" style={{ fontSize: 10, display: "block" }}>
                      via HackWatch Live Desk
                    </span>
                  </div>
                </div>
                {(() => {
                  const k = TALK_KINDS.find((x) => x.id === activeShareModalComment.kind) || TALK_KINDS[0];
                  return (
                    <span
                      className="chat-kind-badge"
                      style={{ color: k.color, background: k.bg, borderColor: `${k.color}44` }}
                    >
                      {k.icon} {k.label}
                    </span>
                  );
                })()}
              </div>

              <blockquote className="viral-card-quote">
                "{activeShareModalComment.text}"
              </blockquote>

              <div className="viral-card-preview-foot">
                <span className="mono dim" style={{ fontSize: 10.5 }}>
                  {new Date(activeShareModalComment.ts).toISOString().replace("T", " ").slice(0, 16)} UTC
                </span>
                <span className="viral-card-watermark">hackwatch.io/desk</span>
              </div>
            </div>

            {/* Viral Share Actions Grid */}
            <div className="viral-share-actions-grid">
              <button
                type="button"
                className="btn rt viral-share-btn x-btn"
                onClick={() => {
                  shareOnX(activeShareModalComment);
                  setActiveShareModalComment(null);
                }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Post on X (Twitter)
              </button>

              <button
                type="button"
                className="btn viral-share-btn telegram-btn"
                onClick={() => {
                  const url = `https://t.me/share/url?url=${encodeURIComponent(getCommentPermalink(activeShareModalComment.id))}&text=${encodeURIComponent(activeShareModalComment.text)}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                  toast("Opening Telegram...");
                  setActiveShareModalComment(null);
                }}
              >
                ✈️ Share on Telegram
              </button>

              <button
                type="button"
                className="btn viral-share-btn whatsapp-btn"
                onClick={() => {
                  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`"${activeShareModalComment.text}"\n\nRead more on HackWatch: ${getCommentPermalink(activeShareModalComment.id)}`)}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                  toast("Opening WhatsApp...");
                  setActiveShareModalComment(null);
                }}
              >
                💬 Share on WhatsApp
              </button>

              <button
                type="button"
                className="btn viral-share-btn copy-link-btn"
                onClick={() => {
                  copyCommentLink(activeShareModalComment.id);
                  setActiveShareModalComment(null);
                }}
              >
                🔗 Copy Direct Link
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
