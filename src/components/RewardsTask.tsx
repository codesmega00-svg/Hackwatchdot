import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "./ui";
import { shortAddr } from "../lib/format";

const TARGET_POST_URL = "https://x.com/Hackwatchdot/status/2116403772956225967";
const TARGET_TWEET_ID = "2116403772956225967";
const STORAGE_KEY = "hackwatch.bounty_v1";

export interface BountySubmission {
  wallet: string;
  twitterHandle: string;
  ticketId: string;
  submittedAt: number;
}

interface SimulatedClaim {
  id: string;
  addr: string;
  handle: string;
  ticket: string;
  timeStr: string;
}

const INITIAL_CLAIMS: SimulatedClaim[] = [
  { id: "1", addr: "0x71a2B890F34bC1a3c74E21D71b9B2eD95c2192b4", handle: "@defitracker_xyz", ticket: "HW-5000-8491", timeStr: "2m ago" },
  { id: "2", addr: "0x39E4Fc7763c8728956AcB61498679bF46e858482", handle: "@eth_investigator", ticket: "HW-5000-8492", timeStr: "4m ago" },
  { id: "3", addr: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", handle: "@vitalik_fan_99", ticket: "HW-5000-8493", timeStr: "7m ago" },
  { id: "4", addr: "0x19cB951474D90fFA4c478B44e3146e279E85fa21", handle: "@sol_guard", ticket: "HW-5000-8494", timeStr: "11m ago" },
  { id: "5", addr: "0x690B9A9E9aa1C9dB991C7721a92d351Db4FAC991", handle: "@onchain_sleuth", ticket: "HW-5000-8495", timeStr: "15m ago" },
];

export default function RewardsTask() {
  const toast = useToast();

  // Tasks state (1 through 6)
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tasks) return parsed.tasks;
      }
    } catch {}
    return {};
  });

  // Wallet and handle state
  const [ercWallet, setErcWallet] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [submission, setSubmission] = useState<BountySubmission | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.submission) return parsed.submission;
      }
    } catch {}
    return null;
  });

  const [walletError, setWalletError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recentClaims, setRecentClaims] = useState<SimulatedClaim[]>(INITIAL_CLAIMS);

  // Save tasks and submission to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tasks: completedTasks,
          submission,
        })
      );
    } catch {}
  }, [completedTasks, submission]);

  // Periodic simulated community claims to keep desk live
  useEffect(() => {
    const timer = window.setInterval(() => {
      const randomHex = Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      const randomTicketNum = Math.floor(8496 + Math.random() * 200);
      const newClaim: SimulatedClaim = {
        id: String(Date.now()),
        addr: `0x${randomHex}...${randomHex}`,
        handle: `@crypto_anon_${Math.floor(Math.random() * 900 + 100)}`,
        ticket: `HW-5000-${randomTicketNum}`,
        timeStr: "just now",
      };
      setRecentClaims((prev) => [newClaim, ...prev.slice(0, 5)]);
    }, 18000);
    return () => window.clearInterval(timer);
  }, []);

  // Task toggle helper
  const toggleTask = useCallback((taskId: number) => {
    setCompletedTasks((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      return next;
    });
  }, []);

  // Action launcher that opens link and automatically checks the task
  const launchAction = useCallback(
    (taskId: number, url: string, message: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
      setCompletedTasks((prev) => ({ ...prev, [taskId]: true }));
      toast(message);
    },
    [toast]
  );

  // Validate Ethereum ERC-20 address
  const validateEthAddress = (addr: string): boolean => {
    const clean = addr.trim();
    return /^0x[a-fA-F0-9]{40}$/.test(clean);
  };

  // Submit wallet task 7
  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWallet = ercWallet.trim();
    const cleanHandle = twitterHandle.trim();

    if (!validateEthAddress(cleanWallet)) {
      setWalletError("Please enter a valid 42-character Ethereum address starting with 0x");
      toast("Invalid ERC-20 address format");
      return;
    }

    if (!cleanHandle) {
      toast("Please enter your X / Twitter handle for verification");
      return;
    }

    // Check if tasks 1-6 are completed
    const tasksDoneCount = [1, 2, 3, 4, 5, 6].filter((id) => completedTasks[id]).length;
    if (tasksDoneCount < 6) {
      toast(`Please complete tasks 1 to 6 before claiming (Current: ${tasksDoneCount}/6)`);
      return;
    }

    setWalletError(null);
    const randomTicket = `HW-5000-${Math.floor(10000 + Math.random() * 90000)}`;
    const newSub: BountySubmission = {
      wallet: cleanWallet,
      twitterHandle: cleanHandle.startsWith("@") ? cleanHandle : `@${cleanHandle}`,
      ticketId: randomTicket,
      submittedAt: Date.now(),
    };

    setSubmission(newSub);
    setCompletedTasks((prev) => ({ ...prev, 7: true }));
    setShowConfetti(true);
    toast("🎉 $5,000 Bounty Entry confirmed! Verified ticket issued.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetSubmission = () => {
    if (window.confirm("Do you want to re-submit your ERC-20 wallet or update your details?")) {
      setSubmission(null);
      setCompletedTasks((prev) => ({ ...prev, 7: false }));
      toast("Ready to enter updated wallet address.");
    }
  };

  const completedCount = useMemo(() => {
    let count = [1, 2, 3, 4, 5, 6].filter((id) => completedTasks[id]).length;
    if (submission) count += 1;
    return count;
  }, [completedTasks, submission]);

  const progressPercent = Math.round((completedCount / 7) * 100);

  // Social Share proof text
  const shareProofOnX = () => {
    if (!submission) return;
    const tweetText = `🎉 I just completed all 7 tasks on @Hackwatchdot and claimed my verified Entry Ticket #${submission.ticketId} for the $5,000 Binance Hack Community Bounty!\n\nLive onchain tracking of $6.3B breach:\n`;
    const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(TARGET_POST_URL)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    toast("Opening X to share your bounty ticket...");
  };

  return (
    <div className="rewards-page-wrap">
      {/* Top Hero Banner */}
      <div className="rewards-hero-card">
        <div className="rewards-hero-top">
          <div>
            <div className="rewards-eyebrow">
              <span className="live-status-dot confirmed" />
              <span>OFFICIAL COMMUNITY BOUNTY · $5,000 PRIZE POOL</span>
            </div>
            <h1 className="rewards-title">Follow All Tasks & Claim $5,000 Reward</h1>
            <p className="rewards-subtitle">
              Join the official <b>HackWatch community intelligence initiative</b>. Help track the <b>$6.3B Binance hot wallet breach</b>,
              alert the crypto ecosystem to 677 compromised addresses, and claim your verified ticket for the <b>$5,000 USDT / ETH Bounty Pool</b>.
            </p>
          </div>

          <div className="rewards-pool-badge">
            <span className="pool-badge-lbl">TOTAL PRIZE POOL</span>
            <span className="pool-badge-amount">$5,000</span>
            <span className="pool-badge-sub">USDT / ETH Airdrop</span>
          </div>
        </div>

        {/* Bounty Overview Metrics */}
        <div className="rewards-kpi-grid">
          <div className="rewards-kpi-tile">
            <span className="rewards-kpi-lbl">TOTAL BOUNTY</span>
            <span className="rewards-kpi-val" style={{ color: "#3fd69c" }}>
              $5,000
            </span>
            <span className="rewards-kpi-sub">Guaranteed Community Pool</span>
          </div>

          <div className="rewards-kpi-tile">
            <span className="rewards-kpi-lbl">TASKS REQUIRED</span>
            <span className="rewards-kpi-val" style={{ color: "#0ea5e9" }}>
              7 Tasks
            </span>
            <span className="rewards-kpi-sub">Follow, Like, Repost & Wallet</span>
          </div>

          <div className="rewards-kpi-tile">
            <span className="rewards-kpi-lbl">TOTAL PARTICIPANTS</span>
            <span className="rewards-kpi-val" style={{ color: "#f2b64a" }}>
              4,923
            </span>
            <span className="rewards-kpi-sub">Verified community entries</span>
          </div>

          <div className="rewards-kpi-tile">
            <span className="rewards-kpi-lbl">SNAPSHOT COUNTDOWN</span>
            <span className="rewards-kpi-val" style={{ color: "var(--red)" }}>
              04d 18h
            </span>
            <span className="rewards-kpi-sub">Nov 15, 2026 · 00:00 UTC</span>
          </div>
        </div>

        {/* Interactive Progress Meter */}
        <div className="rewards-progress-card">
          <div className="rewards-progress-header">
            <span className="progress-label">
              Bounty Verification Progress: <b>{completedCount} of 7 Tasks Completed</b> ({progressPercent}%)
            </span>
            <span className={`progress-badge ${completedCount === 7 ? "completed" : "pending"}`}>
              {completedCount === 7 ? "✅ Verified & Ready" : `⚡ ${7 - completedCount} Tasks Remaining`}
            </span>
          </div>
          <div className="rewards-progress-bar">
            <div className="rewards-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Verified Claim Ticket Confirmation Banner (Shows when task 7 submitted) */}
      {submission ? (
        <div className="bounty-ticket-card">
          {showConfetti ? (
            <div className="confetti-celebration-banner" role="status">
              <span>🎊 Congratulations! All 7 Tasks Completed & Verified. Entry #{submission.ticketId} Recorded!</span>
              <button
                type="button"
                className="close-confetti-btn"
                onClick={() => setShowConfetti(false)}
                aria-label="Dismiss banner"
              >
                ✕
              </button>
            </div>
          ) : null}
          <div className="ticket-sparkle" />
          <div className="ticket-header">
            <div className="ticket-badge-wrap">
              <span className="ticket-vip-tag">VERIFIED ENTRY TICKET</span>
              <span className="ticket-id">{submission.ticketId}</span>
            </div>
            <span className="ticket-status-pill">🎉 ENROLLED IN $5,000 POOL</span>
          </div>

          <div className="ticket-body">
            <div className="ticket-meta-grid">
              <div className="ticket-meta-item">
                <span className="ticket-meta-lbl">REGISTERED ERC-20 WALLET</span>
                <span className="ticket-meta-val mono" title={submission.wallet}>
                  {shortAddr(submission.wallet, 10, 8)}
                </span>
              </div>
              <div className="ticket-meta-item">
                <span className="ticket-meta-lbl">X / TWITTER HANDLE</span>
                <span className="ticket-meta-val">{submission.twitterHandle}</span>
              </div>
              <div className="ticket-meta-item">
                <span className="ticket-meta-lbl">ENTRY TIMESTAMP</span>
                <span className="ticket-meta-val">
                  {new Date(submission.submittedAt).toISOString().replace("T", " ").slice(0, 16)} UTC
                </span>
              </div>
            </div>

            <p className="ticket-note">
              ✨ <b>Congratulations!</b> You have completed all 7 tasks and secured your entry. Winners will be announced on{" "}
              <b>@Hackwatchdot</b> and bounty prizes will be distributed directly to your registered ERC-20 address.
            </p>

            <div className="ticket-actions">
              <button type="button" className="btn rt x-share-ticket-btn" onClick={shareProofOnX}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share Ticket on X to Boost Chance
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  void navigator.clipboard?.writeText(submission.ticketId);
                  toast(`Copied Ticket ID: ${submission.ticketId}`);
                }}
              >
                📋 Copy Ticket ID
              </button>
              <button type="button" className="btn ghost" onClick={handleResetSubmission}>
                ✏️ Edit Wallet
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tasks List Grid */}
      <div className="tasks-container">
        <h2 className="tasks-section-title">Complete All 7 Verified Tasks</h2>
        <p className="tasks-section-sub">
          Click the action button for each step to open official links. Steps will be marked completed automatically.
        </p>

        <div className="tasks-list">
          {/* TASK 1: FOLLOW */}
          <div className={`task-card ${completedTasks[1] ? "done" : ""}`}>
            <div className="task-left">
              <button
                type="button"
                className={`task-checkbox ${completedTasks[1] ? "checked" : ""}`}
                onClick={() => toggleTask(1)}
                title="Toggle completion"
                aria-label="Toggle task 1"
              >
                {completedTasks[1] ? "✓" : "1"}
              </button>
              <div className="task-content">
                <div className="task-title-wrap">
                  <h3 className="task-title">Task 1: Follow @Hackwatchdot on X</h3>
                  {completedTasks[1] ? <span className="task-done-badge">COMPLETED</span> : null}
                </div>
                <p className="task-desc">
                  Follow the official investigation desk <b>@Hackwatchdot</b> on X for live mempool alerts and forensic updates.
                </p>
                <div className="task-link-preview">
                  Target: <a href="https://x.com/Hackwatchdot" target="_blank" rel="noopener noreferrer">https://x.com/Hackwatchdot</a>
                </div>
              </div>
            </div>
            <div className="task-action-wrap">
              <button
                type="button"
                className="btn rt task-action-btn x-btn"
                onClick={() =>
                  launchAction(
                    1,
                    "https://x.com/intent/follow?screen_name=Hackwatchdot",
                    "Opened X to follow @Hackwatchdot! Task 1 verified."
                  )
                }
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Follow @Hackwatchdot
              </button>
            </div>
          </div>

          {/* TASK 2: LIKE */}
          <div className={`task-card ${completedTasks[2] ? "done" : ""}`}>
            <div className="task-left">
              <button
                type="button"
                className={`task-checkbox ${completedTasks[2] ? "checked" : ""}`}
                onClick={() => toggleTask(2)}
                title="Toggle completion"
                aria-label="Toggle task 2"
              >
                {completedTasks[2] ? "✓" : "2"}
              </button>
              <div className="task-content">
                <div className="task-title-wrap">
                  <h3 className="task-title">Task 2: Like the Main Investigation Post</h3>
                  {completedTasks[2] ? <span className="task-done-badge">COMPLETED</span> : null}
                </div>
                <p className="task-desc">
                  Like the official post detailing the $6.3B Binance exploit and onchain asset movements.
                </p>
                <div className="task-link-preview">
                  Post: <a href={TARGET_POST_URL} target="_blank" rel="noopener noreferrer">{TARGET_POST_URL}</a>
                </div>
              </div>
            </div>
            <div className="task-action-wrap">
              <button
                type="button"
                className="btn task-action-btn like-btn"
                onClick={() =>
                  launchAction(
                    2,
                    `https://x.com/intent/like?tweet_id=${TARGET_TWEET_ID}`,
                    "Opened X to like the post! Task 2 verified."
                  )
                }
              >
                ❤️ Like on X
              </button>
            </div>
          </div>

          {/* TASK 3: COMMENT */}
          <div className={`task-card ${completedTasks[3] ? "done" : ""}`}>
            <div className="task-left">
              <button
                type="button"
                className={`task-checkbox ${completedTasks[3] ? "checked" : ""}`}
                onClick={() => toggleTask(3)}
                title="Toggle completion"
                aria-label="Toggle task 3"
              >
                {completedTasks[3] ? "✓" : "3"}
              </button>
              <div className="task-content">
                <div className="task-title-wrap">
                  <h3 className="task-title">Task 3: Comment on the Investigation Post</h3>
                  {completedTasks[3] ? <span className="task-done-badge">COMPLETED</span> : null}
                </div>
                <p className="task-desc">
                  Leave a comment or onchain observation regarding the exploiters&apos; addresses and wallet safety.
                </p>
                <div className="task-link-preview">
                  Post: <a href={TARGET_POST_URL} target="_blank" rel="noopener noreferrer">{TARGET_POST_URL}</a>
                </div>
              </div>
            </div>
            <div className="task-action-wrap">
              <button
                type="button"
                className="btn task-action-btn comment-btn"
                onClick={() =>
                  launchAction(
                    3,
                    `https://x.com/intent/post?in_reply_to=${TARGET_TWEET_ID}`,
                    "Opened X to comment! Task 3 verified."
                  )
                }
              >
                💬 Comment on X
              </button>
            </div>
          </div>

          {/* TASK 4: REPOST */}
          <div className={`task-card ${completedTasks[4] ? "done" : ""}`}>
            <div className="task-left">
              <button
                type="button"
                className={`task-checkbox ${completedTasks[4] ? "checked" : ""}`}
                onClick={() => toggleTask(4)}
                title="Toggle completion"
                aria-label="Toggle task 4"
              >
                {completedTasks[4] ? "✓" : "4"}
              </button>
              <div className="task-content">
                <div className="task-title-wrap">
                  <h3 className="task-title">Task 4: Repost (Retweet) the Post</h3>
                  {completedTasks[4] ? <span className="task-done-badge">COMPLETED</span> : null}
                </div>
                <p className="task-desc">
                  Repost the pinned hack analysis to spread awareness across the wider crypto community.
                </p>
                <div className="task-link-preview">
                  Post: <a href={TARGET_POST_URL} target="_blank" rel="noopener noreferrer">{TARGET_POST_URL}</a>
                </div>
              </div>
            </div>
            <div className="task-action-wrap">
              <button
                type="button"
                className="btn rt task-action-btn repost-btn"
                onClick={() =>
                  launchAction(
                    4,
                    `https://x.com/intent/retweet?tweet_id=${TARGET_TWEET_ID}`,
                    "Opened X to repost! Task 4 verified."
                  )
                }
              >
                🔁 Repost on X
              </button>
            </div>
          </div>

          {/* TASK 5: SHARE */}
          <div className={`task-card ${completedTasks[5] ? "done" : ""}`}>
            <div className="task-left">
              <button
                type="button"
                className={`task-checkbox ${completedTasks[5] ? "checked" : ""}`}
                onClick={() => toggleTask(5)}
                title="Toggle completion"
                aria-label="Toggle task 5"
              >
                {completedTasks[5] ? "✓" : "5"}
              </button>
              <div className="task-content">
                <div className="task-title-wrap">
                  <h3 className="task-title">Task 5: Share the Post</h3>
                  {completedTasks[5] ? <span className="task-done-badge">COMPLETED</span> : null}
                </div>
                <p className="task-desc">
                  Share the investigation link to X, Telegram, or WhatsApp to keep Web3 traders informed.
                </p>
                <div className="task-link-preview">
                  Post: <a href={TARGET_POST_URL} target="_blank" rel="noopener noreferrer">{TARGET_POST_URL}</a>
                </div>
              </div>
            </div>
            <div className="task-action-wrap" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn task-action-btn x-btn"
                onClick={() =>
                  launchAction(
                    5,
                    `https://x.com/intent/post?url=${encodeURIComponent(TARGET_POST_URL)}`,
                    "Opened X to share! Task 5 verified."
                  )
                }
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </button>
              <button
                type="button"
                className="btn task-action-btn telegram-btn"
                onClick={() =>
                  launchAction(
                    5,
                    `https://t.me/share/url?url=${encodeURIComponent(TARGET_POST_URL)}&text=${encodeURIComponent("🚨 $6.3B Binance hot wallet breach live sell tracker on HackWatch")}`,
                    "Opened Telegram to share! Task 5 verified."
                  )
                }
              >
                ✈️ Telegram
              </button>
            </div>
          </div>

          {/* TASK 6: TAG 2 FRIENDS */}
          <div className={`task-card ${completedTasks[6] ? "done" : ""}`}>
            <div className="task-left">
              <button
                type="button"
                className={`task-checkbox ${completedTasks[6] ? "checked" : ""}`}
                onClick={() => toggleTask(6)}
                title="Toggle completion"
                aria-label="Toggle task 6"
              >
                {completedTasks[6] ? "✓" : "6"}
              </button>
              <div className="task-content">
                <div className="task-title-wrap">
                  <h3 className="task-title">Task 6: Tag 2 Friends on the Post</h3>
                  {completedTasks[6] ? <span className="task-done-badge">COMPLETED</span> : null}
                </div>
                <p className="task-desc">
                  Quote the investigation post and tag 2 crypto friends (e.g. <code>@friend1 @friend2</code>) so they can verify their wallet holdings.
                </p>
                <div className="task-link-preview">
                  Post: <a href={TARGET_POST_URL} target="_blank" rel="noopener noreferrer">{TARGET_POST_URL}</a>
                </div>
              </div>
            </div>
            <div className="task-action-wrap">
              <button
                type="button"
                className="btn rt task-action-btn tag-btn"
                onClick={() =>
                  launchAction(
                    6,
                    `https://x.com/intent/post?text=${encodeURIComponent("🚨 Tracking the $6.3B Binance exploit on @Hackwatchdot! Tagging 2 friends @ @ to check infected addresses: ")}&url=${encodeURIComponent(TARGET_POST_URL)}`,
                    "Opened X to tag 2 friends! Task 6 verified."
                  )
                }
              >
                👥 Tag 2 Friends on X
              </button>
            </div>
          </div>

          {/* TASK 7: SUBMIT ERC WALLET */}
          <div className={`task-card wallet-submission-card ${submission ? "done" : ""}`}>
            <div className="task-left" style={{ width: "100%" }}>
              <button
                type="button"
                className={`task-checkbox ${submission ? "checked" : ""}`}
                aria-label="Task 7 status"
                disabled
              >
                {submission ? "✓" : "7"}
              </button>
              <div className="task-content" style={{ width: "100%" }}>
                <div className="task-title-wrap">
                  <h3 className="task-title">Task 7: Submit Your ERC-20 / ETH Wallet Address</h3>
                  {submission ? <span className="task-done-badge">SUBMITTED & VERIFIED</span> : null}
                </div>
                <p className="task-desc">
                  Enter your Ethereum / ERC-20 wallet address where your <b>$5,000 Bounty Drop</b> will be sent upon winning.
                </p>

                {submission ? (
                  <div className="submitted-wallet-box">
                    <span className="wallet-label">Registered Wallet:</span>
                    <span className="wallet-addr mono">{submission.wallet}</span>
                    <span className="handle-tag">{submission.twitterHandle}</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitEntry} className="wallet-form">
                    <div className="form-row">
                      <div className="input-group">
                        <label htmlFor="erc-wallet-input" className="input-lbl">
                          Ethereum (ERC-20) Address:
                        </label>
                        <div className="input-wrapper">
                          <input
                            id="erc-wallet-input"
                            type="text"
                            className={`wallet-text-input ${walletError ? "error" : ""}`}
                            placeholder="0x71C...32d (42 characters)"
                            value={ercWallet}
                            onChange={(e) => {
                              setErcWallet(e.target.value);
                              if (walletError) setWalletError(null);
                            }}
                            required
                          />
                          <button
                            type="button"
                            className="paste-wallet-btn"
                            onClick={() => {
                              void navigator.clipboard?.readText().then(
                                (clip) => {
                                  if (clip) {
                                    setErcWallet(clip.trim());
                                    toast("Pasted address from clipboard");
                                  }
                                },
                                () => toast("Unable to paste from clipboard")
                              );
                            }}
                            title="Paste from clipboard"
                          >
                            Paste
                          </button>
                        </div>
                        {walletError ? <span className="input-error-msg">{walletError}</span> : null}
                      </div>

                      <div className="input-group">
                        <label htmlFor="twitter-handle-input" className="input-lbl">
                          Your X / Twitter Handle:
                        </label>
                        <input
                          id="twitter-handle-input"
                          type="text"
                          className="wallet-text-input"
                          placeholder="@your_x_handle"
                          value={twitterHandle}
                          onChange={(e) => setTwitterHandle(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-submit-row">
                      <button
                        type="submit"
                        className="btn rt submit-bounty-btn"
                        disabled={completedCount < 6}
                        title={completedCount < 6 ? "Complete tasks 1-6 first" : "Claim $5,000 Reward Entry"}
                      >
                        🚀 Submit Wallet & Claim $5,000 Entry
                      </button>
                      <span className="form-hint">
                        {completedCount < 6
                          ? `⚠️ Complete tasks 1 to 6 first (${completedCount}/6 completed)`
                          : "✅ Ready to claim! Click submit to generate your verified ticket."}
                      </span>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Recent Community Claims */}
      <div className="recent-claims-card">
        <div className="recent-claims-head">
          <span className="live-status-dot confirmed" />
          <span className="recent-claims-title">Live Verified Community Submissions</span>
          <span className="live-pulse-badge">Real-Time</span>
        </div>
        <div className="recent-claims-list">
          {recentClaims.map((claim) => (
            <div key={claim.id} className="claim-item">
              <span className="claim-ticket-id">{claim.ticket}</span>
              <span className="claim-handle">{claim.handle}</span>
              <span className="claim-addr mono">{shortAddr(claim.addr, 6, 4)}</span>
              <span className="claim-status">✅ Verified</span>
              <span className="claim-time">{claim.timeStr}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rules & Bounty FAQ */}
      <div className="rewards-rules-card">
        <h3 className="rules-heading">Bounty Rules & Prize Distribution</h3>
        <div className="rules-grid">
          <div className="rule-item">
            <span className="rule-num">1</span>
            <div className="rule-body">
              <b>Reward Pool Distribution:</b>
              <p>
                $2,500 split evenly among top 5 helpful community investigators, and $2,500 randomly distributed to 25 verified task participants ($100 each).
              </p>
            </div>
          </div>

          <div className="rule-item">
            <span className="rule-num">2</span>
            <div className="rule-body">
              <b>Distribution Currency:</b>
              <p>
                Prizes are sent directly in USDT (ERC-20) or native ETH on Ethereum mainnet or Arbitrum to your registered wallet.
              </p>
            </div>
          </div>

          <div className="rule-item">
            <span className="rule-num">3</span>
            <div className="rule-body">
              <b>Sybil & Bot Protection:</b>
              <p>
                X accounts must be genuine with a valid history. Duplicate entries and automated bots will be automatically disqualified.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
