import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { registerAppAction } from "../lib/app-actions";
import { useTick } from "../lib/useLive";
import { timeAgo } from "../lib/format";
import { SectionTitle, useToast } from "./ui";

export type TalkKind = "intel" | "alert" | "mempool" | "theory" | "market" | "general";

export interface Comment {
  id: string;
  name: string;
  text: string;
  ts: number;
  mine?: boolean;
  kind?: TalkKind;
  reactions?: Record<string, number>;
}

export const TALK_KINDS: { id: TalkKind; label: string; icon: string; color: string; bg: string }[] = [
  { id: "intel", label: "Onchain Intel", icon: "🔍", color: "#67a9ff", bg: "rgba(103, 169, 255, 0.15)" },
  { id: "alert", label: "Security Alert", icon: "🚨", color: "#ff5a52", bg: "rgba(255, 90, 82, 0.15)" },
  { id: "mempool", label: "Mempool Bot", icon: "⚡", color: "#f2b64a", bg: "rgba(242, 182, 74, 0.15)" },
  { id: "theory", label: "Theory & Clues", icon: "💡", color: "#a68cff", bg: "rgba(166, 140, 255, 0.15)" },
  { id: "market", label: "Market Impact", icon: "📊", color: "#3fd69c", bg: "rgba(63, 214, 156, 0.15)" },
  { id: "general", label: "General Talk", icon: "💬", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)" },
];

const EMOJI_REACTIONS = ["🔥", "⚡", "💡", "🚨", "👏"] as const;

const TOPIC_STARTERS = [
  { label: "⚡ 0x80d0 Deployer batch sweep", prompt: "Notice how 0x80d0...52df is executing executeBatch calls across multiple victim slots?", kind: "mempool" as TalkKind },
  { label: "🔍 18,270 BTC peeling chain", prompt: "Tracing the 18,270 BTC hops through Thorchain: are any UTXOs consolidating yet?", kind: "intel" as TalkKind },
  { label: "🚨 $1.15B frozen USDT status", prompt: "Tether's blacklist on 0x5227...2f8c has successfully locked $1.15B USDT from moving.", kind: "alert" as TalkKind },
  { label: "📊 PROM & FUN DEX liquidity", prompt: "Uniswap V3 and Curve pools absorbed over $17M in FUN & PROM dumping in initial hours.", kind: "market" as TalkKind },
];

const KEY = "hackwatch.comments.v2";
const RATE = "hackwatch.lastpost.v1";
const NAME = "hackwatch.name.v1";
const REACTIONS_KEY = "hackwatch.user_reactions.v1";
const COOLDOWN = 30_000;

const SEEDS: Comment[] = [
  {
    id: "s1",
    name: "0xArkhamDetective",
    text: "The sweeper implementation at 0x63e8...6fAe executed batch sweeps using function selector 0x8aaa8f3b. They funded the deployer with 38.4M in gas prep.",
    ts: Date.now() - 1000 * 60 * 18,
    kind: "intel",
    reactions: { "🔥": 14, "⚡": 9 },
  },
  {
    id: "s2",
    name: "MempoolWatch_Node",
    text: "Mempool alert: 0x80d0...52df just pushed 3 new transactions with maxPriorityFeePerGas set to 20 Gwei. Bot is actively sweeping.",
    ts: Date.now() - 1000 * 60 * 34,
    kind: "mempool",
    reactions: { "⚡": 22, "🚨": 8 },
  },
  {
    id: "s3",
    name: "defi_sentinel",
    text: "Tether blacklisted the main vault 0x5227...2f8c containing $1.15B USDT. The tokens are locked and cannot be swapped on Uniswap or Curve.",
    ts: Date.now() - 1000 * 60 * 52,
    kind: "alert",
    reactions: { "🚨": 31, "💡": 12 },
  },
  {
    id: "s4",
    name: "SatoshiTracker",
    text: "18,270 BTC moved into Thorchain bridges and peeled across 14 hops. Because BTC UTXOs have no freeze function, this cannot be reversed onchain.",
    ts: Date.now() - 1000 * 60 * 85,
    kind: "theory",
    reactions: { "💡": 19, "🔥": 11 },
  },
  {
    id: "s5",
    name: "DEX_Liquidity_Risk",
    text: "Heavy sell pressure on FUN and PROM. Look at the curve 3pool and Uniswap V3 pools — exploiter dumped 4.2B FUN in minutes.",
    ts: Date.now() - 1000 * 60 * 110,
    kind: "market",
    reactions: { "📊": 15, "⚡": 7 },
  },
  {
    id: "s6",
    name: "anon_researcher",
    text: "Cleanest live desk for tracking the breach. Seeing the Etherscan Flow session linked alongside Arkham cluster is incredible.",
    ts: Date.now() - 1000 * 60 * 140,
    kind: "general",
    reactions: { "👏": 28, "🔥": 17 },
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

export default function Chat() {
  const [comments, setComments] = useState<Comment[]>(loadComments);
  const [name, setName] = useState(() => localStorage.getItem(NAME) ?? "");
  const [text, setText] = useState("");
  const [selectedKind, setSelectedKind] = useState<TalkKind>("intel");
  const [filterKind, setFilterKind] = useState<"all" | TalkKind>("all");
  const [userReactions, setUserReactions] = useState<Record<string, string[]>>(loadUserReactions);
  const [msg, setMsg] = useState("");
  const [lastPost, setLastPost] = useState<number>(() => Number(localStorage.getItem(RATE) ?? 0));
  const [onlineUsers] = useState(142);
  const now = useTick(1000);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

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

  const toggleReaction = useCallback((commentId: string, emoji: string) => {
    const hasReacted = userReactions[commentId]?.includes(emoji);

    setUserReactions((prev) => {
      const current = prev[commentId] || [];
      const updated = hasReacted ? current.filter((e) => e !== emoji) : [...current, emoji];
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
  }, [userReactions]);

  const shareOnX = useCallback((c: Comment) => {
    const kindObj = TALK_KINDS.find((k) => k.id === c.kind);
    const kindTag = kindObj ? `[${kindObj.icon} ${kindObj.label}]` : "";
    const tweetText = `"${c.text}"\n\n— ${c.name || "anon"} ${kindTag}\nTracking Binance breach live on @Hackwatchdot`;
    const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(tweetText)}&url=https%3A%2F%2Fhackwatch.io%23chat`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    toast("Opening X to share comment...");
  }, [toast]);

  const copyQuote = useCallback((c: Comment) => {
    const kindObj = TALK_KINDS.find((k) => k.id === c.kind);
    const kindTag = kindObj ? `[${kindObj.label}] ` : "";
    const quoteStr = `"${c.text}" — ${c.name || "anon"} ${kindTag}(HackWatch onchain desk)`;
    void navigator.clipboard?.writeText(quoteStr).then(
      () => toast("Quote copied to clipboard!"),
      () => toast("Clipboard blocked — select and copy text manually.")
    );
  }, [toast]);

  const replyTo = useCallback((author: string) => {
    setText((prev) => (prev ? `@${author} ${prev}` : `@${author} `));
    inputRef.current?.focus();
  }, []);

  // Filtered comments
  const filteredComments = useMemo(() => {
    if (filterKind === "all") return comments;
    return comments.filter((c) => c.kind === filterKind);
  }, [comments, filterKind]);

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
      <SectionTitle
        kicker="Open Thread"
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span>Investigator Chat & Community Intel</span>
            <span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#3fd69c" }} />
            <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
              {comments.length} posts
            </span>
          </div>
        }
        sub="Public collaborative onchain desk. Share wallet clues, transaction anomalies, and sell velocity analysis. Instant one-click sharing to X, dual UTC & relative timestamps, and topic categorization."
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="live-presence-pill" style={{ padding: "3px 10px", fontSize: 11 }}>
              <span className="live-presence-dot" />
              <b style={{ color: "#3fd69c" }}>{onlineUsers}</b>
              <span className="live-watching-label">investigators online</span>
            </div>
            <a
              className="btn rt"
              href="https://x.com/Hackwatchdot"
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: "#000", color: "#fff", borderColor: "rgba(255, 255, 255, 0.3)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, padding: "4px 10px" }}
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

        {/* Talk Kinds Filter Bar */}
        <div className="chat-filter-bar">
          <span className="chat-filter-title">Filter by Talk:</span>
          <button
            type="button"
            className={`chat-filter-chip ${filterKind === "all" ? "active" : ""}`}
            onClick={() => setFilterKind("all")}
          >
            All Talks ({kindCounts.all || 0})
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

        {/* Comments Feed */}
        <div className="clist" id="clist">
          {filteredComments.length === 0 ? (
            <div className="empty" style={{ padding: "32px 20px" }}>
              <b>No comments found for this topic</b>
              Switch to "All Talks" or be the first to post under this category.
            </div>
          ) : (
            filteredComments.map((c) => {
              const kindObj = TALK_KINDS.find((k) => k.id === c.kind) || TALK_KINDS[0];
              const userReactedList = userReactions[c.id] || [];
              const timeObj = new Date(c.ts);
              const utcTimeStr = `${timeObj.toISOString().slice(0, 10)} ${timeObj.toISOString().slice(11, 16)} UTC`;
              const localTimeStr = timeObj.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

              return (
                <div className="comment chat-msg-entry" key={c.id}>
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
                              onClick={() => toggleReaction(c.id, emoji)}
                              title={`React with ${emoji}`}
                            >
                              <span>{emoji}</span>
                              {count > 0 ? <span className="reaction-count">{count}</span> : null}
                            </button>
                          );
                        })}
                      </div>

                      {/* Action Buttons: Share on X, Copy Quote, Reply */}
                      <div className="chat-actions-row">
                        {/* Share on X Button */}
                        <button
                          type="button"
                          className="chat-action-btn x-share-btn"
                          onClick={() => shareOnX(c)}
                          title="Share this comment directly on X"
                        >
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          <span>Share on X</span>
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
    </>
  );
}
