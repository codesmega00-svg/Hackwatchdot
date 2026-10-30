import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { registerAppAction } from "../lib/app-actions";
import { useTick } from "../lib/useLive";
import { timeAgo } from "../lib/format";
import { SectionTitle, useToast } from "./ui";

type Comment = { id: string; name: string; text: string; ts: number; mine?: boolean };

const KEY = "hackwatch.comments.v1";
const RATE = "hackwatch.lastpost.v1";
const NAME = "hackwatch.name.v1";
const COOLDOWN = 30_000;

const SEEDS: Comment[] = [
  { id: "s1", name: "dune_watcher", text: "The pace of the WLD sales is the thing to watch. Clean tracker, thanks for keeping it live.", ts: Date.now() - 1000 * 60 * 74 },
  { id: "s2", name: "anon", text: "18,270 BTC and there is no way to freeze it. That is the scary part of this whole thing.", ts: Date.now() - 1000 * 60 * 41 },
  { id: "s3", name: "0xfollower", text: "Does anyone know whether Tether actually froze the main wallet yet, or is that still pending?", ts: Date.now() - 1000 * 60 * 12 },
];

function loadComments(): Comment[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEEDS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEEDS;
    return parsed.filter((c): c is Comment => typeof c?.text === "string" && typeof c?.ts === "number").slice(0, 300);
  } catch {
    return SEEDS;
  }
}

export default function Chat() {
  const [comments, setComments] = useState<Comment[]>(loadComments);
  const [name, setName] = useState(() => localStorage.getItem(NAME) ?? "");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [lastPost, setLastPost] = useState<number>(() => Number(localStorage.getItem(RATE) ?? 0));
  const now = useTick(1000);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(comments.slice(0, 300)));
    } catch {
      /* storage full or blocked — comments stay in memory */
    }
  }, [comments]);

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
    toast("Comment posted.");
    inputRef.current?.focus();
    return true;
  }, [text, name, remaining, toast]);

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

  const count = useMemo(() => comments.length, [comments]);

  return (
    <>
      <SectionTitle
        kicker="Open thread"
        title={<>Comments <span className="mute">{count} posts</span></>}
        sub="Say whatever you want. Anonymous, public, one comment every 30 seconds. Links and wallet addresses are blocked to keep “fund recovery” scammers out. Comments are stored in this browser."
      />

      <div className="rtline" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", color: "var(--mute)", fontSize: 13.5, marginBottom: 14 }}>
        <span>Talking about it on X too? Follow updates & repost:</span>
        <a
          className="btn rt"
          href="https://x.com/Hackwatchdot"
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: "#000", color: "#fff", borderColor: "rgba(255, 255, 255, 0.3)", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Follow @Hackwatchdot
        </a>
        <a className="btn ghost" href="https://x.com/intent/retweet?tweet_id=2115943603554181158" target="_blank" rel="noopener noreferrer">
          Repost on X
        </a>
      </div>

      <div className="chat">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void post();
          }}
          autoComplete="off"
        >
          <input
            id="cname"
            value={name}
            maxLength={24}
            placeholder="Name (optional)"
            aria-label="Name"
            onChange={(e) => setName(e.target.value)}
          />
          <input
            id="ctext"
            ref={inputRef}
            value={text}
            maxLength={280}
            placeholder="Write a comment"
            aria-label="Comment"
            onChange={(e) => {
              setText(e.target.value);
              if (msg) setMsg("");
            }}
          />
          <button className="btn rt" id="csend" type="submit" disabled={remaining > 0}>
            {remaining > 0 ? `${remaining}s` : "Post"}
          </button>
          <div className="cmsg" id="cmsg" role="status" aria-live="polite">
            {msg ? msg : remaining > 0 ? `Cooldown: ${remaining}s until you can post again.` : `${280 - text.length} characters left`}
          </div>
        </form>
        <div className="clist" id="clist">
          {comments.length === 0 ? (
            <div className="empty">
              <b>No comments yet</b>
              Be the first to say something.
            </div>
          ) : (
            comments.map((c) => (
              <div className="comment chat-msg-entry" key={c.id}>
                <div className="av" aria-hidden="true">{(c.name || "a").slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="chd">
                    <b>{c.name || "anon"}</b>
                    <time dateTime={new Date(c.ts).toISOString()}>{timeAgo(c.ts)}</time>
                    {c.mine ? (
                      <button
                        type="button"
                        onClick={() => setComments((prev) => prev.filter((x) => x.id !== c.id))}
                        style={{ marginLeft: "auto", background: "none", border: 0, color: "var(--dim)", fontSize: 11, cursor: "pointer", fontFamily: "var(--mono)" }}
                        aria-label="Delete your comment"
                      >
                        delete
                      </button>
                    ) : null}
                  </div>
                  <p>{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
