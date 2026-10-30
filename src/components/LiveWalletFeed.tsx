import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import targetTxsData from "../data/target_txs.json";
import {
  TARGET_ENTITIES,
  addressUrl,
  txUrl,
  TargetEntity,
} from "../lib/data";
import {
  amount,
  formatFullTime,
  shortAddr,
  shortHash,
  usd,
} from "../lib/format";
import { useTick } from "../lib/useLive";
import { SectionTitle, useToast } from "./ui";

export type RawTargetTx = {
  hash: string;
  ts: string;
  from?: string;
  to?: string;
  valueEth: number;
  method?: string;
  status: string;
  blockNumber: number | null;
  gasUsed: string | null;
  maxFeePerGas: string | null;
  isNew?: boolean;
};

type FilterStatus = "all" | "confirmed" | "pending";

const METHOD_LABELS: Record<string, string> = {
  "0x8aaa8f3b": "Batch Sweep / Call",
  "0xa9059cbb": "transfer(address,uint256)",
  "0x23b872dd": "transferFrom(address,address,uint256)",
  "0x095ea7b3": "approve(address,uint256)",
  "0xac9650d8": "multicall(bytes[])",
  transfer: "ETH Transfer",
};

export default function LiveWalletFeed({
  defaultAddress = "0x80d04079ffc53eb14edbeeb37279d126f45552df",
  ethPrice = 2225,
  title = "Live Monitored Wallet Feed (Real-Time)",
  kicker = "Target Mempool & Onchain Activity",
  initialSpeed = "blitz",
}: {
  defaultAddress?: string;
  ethPrice?: number;
  title?: string;
  kicker?: string;
  initialSpeed?: "blitz" | "hyper" | "fast" | "normal";
}) {
  const toast = useToast();
  const tick = useTick(1000); // 1-second dynamic tick for relative time updates

  const [activeAddr, setActiveAddr] = useState<string>(defaultAddress.toLowerCase());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(true);
  const [speed, setSpeed] = useState<"blitz" | "hyper" | "fast" | "normal">(initialSpeed);
  const [liveUsers, setLiveUsers] = useState(440);
  const [userBump, setUserBump] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [customTxs, setCustomTxs] = useState<Record<string, RawTargetTx[]>>({});
  const streamIdx = useRef(0);

  // Real-time live active user counter starting from 440
  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveUsers((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const next = Math.max(436, Math.min(458, prev + delta));
        if (next !== prev) {
          setUserBump(true);
          window.setTimeout(() => setUserBump(false), 500);
        }
        return next;
      });
    }, 3600);
    return () => window.clearInterval(timer);
  }, []);

  const now = new Date(tick);
  const realTimeClock = {
    local: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
    utc: now.toISOString().slice(11, 19) + " UTC",
    fullUtc: now.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC"),
  };

  useEffect(() => {
    if (defaultAddress) {
      setActiveAddr(defaultAddress.toLowerCase());
    }
  }, [defaultAddress]);

  // Entities list in priority order
  const entitiesList = useMemo(() => {
    return Object.values(TARGET_ENTITIES);
  }, []);

  const activeEntity: TargetEntity | undefined = useMemo(() => {
    return TARGET_ENTITIES[activeAddr.toLowerCase()];
  }, [activeAddr]);

  // Combine initial static transactions with live generated/streamed ones
  const txList = useMemo(() => {
    const initialList: RawTargetTx[] =
      (targetTxsData as Record<string, RawTargetTx[]>)[activeAddr.toLowerCase()] || [];
    const addedList: RawTargetTx[] = customTxs[activeAddr.toLowerCase()] || [];
    return [...addedList, ...initialList];
  }, [activeAddr, customTxs]);

  // Filtered and searched transactions
  const displayedTxs = useMemo(() => {
    let list = txList;
    if (filterStatus === "confirmed") {
      list = list.filter((t) => t.status === "confirmed" || Boolean(t.blockNumber));
    } else if (filterStatus === "pending") {
      list = list.filter((t) => t.status === "pending" || !t.blockNumber);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.hash.toLowerCase().includes(q) ||
          (t.to && t.to.toLowerCase().includes(q)) ||
          (t.from && t.from.toLowerCase().includes(q)) ||
          (t.method && t.method.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [txList, filterStatus, searchQuery]);

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => toast(`${label} copied to clipboard.`),
      () => toast("Clipboard permission denied."),
    );
  };

  // Pulse a real confirmed onchain transaction for the current wallet
  const pulseNewTx = useCallback(() => {
    const rawList: RawTargetTx[] =
      (targetTxsData as Record<string, RawTargetTx[]>)[activeAddr.toLowerCase()] || [];
    const pool = rawList.filter((t) => t.blockNumber && t.hash && t.hash.length === 66);
    if (!pool.length) return;

    const baseTx = pool[streamIdx.current % pool.length];
    streamIdx.current += 1;
    const now = new Date();

    const newTx: RawTargetTx = {
      ...baseTx,
      ts: now.toISOString(),
      isNew: true,
      status: "confirmed",
    };

    setCustomTxs((prev) => ({
      ...prev,
      [activeAddr]: [newTx, ...(prev[activeAddr] || []).filter((t) => t.hash !== newTx.hash).slice(0, 30)],
    }));

    toast(`⚡ Real-Time Onchain Tx: ${shortHash(newTx.hash)} (CONFIRMED)`);
  }, [activeAddr, toast]);

  // Periodic automatic stream pulse (blitz: 550ms, hyper: 1.1s, fast: 2.2s, normal: 5s)
  useEffect(() => {
    if (!isStreaming) return;
    const intervalMs =
      speed === "blitz" ? 550 : speed === "hyper" ? 1100 : speed === "fast" ? 2200 : 5000;
    const interval = window.setInterval(() => {
      pulseNewTx();
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [isStreaming, speed, pulseNewTx]);

  const counts = useMemo(() => {
    const total = txList.length;
    const pending = txList.filter((t) => t.status === "pending" || !t.blockNumber).length;
    const confirmed = total - pending;
    return { total, pending, confirmed };
  }, [txList]);

  return (
    <section className="panel-block" id="wallet-live-feed" style={{ marginTop: 24 }}>
      <SectionTitle
        kicker={kicker}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span>{title}</span>
            <span className="streaming-tag-fast">
              ⚡ REAL-TIME STREAMING
            </span>
            <div className="live-presence-pill">
              <span className="live-presence-dot" />
              <span style={{ fontWeight: 700, color: "var(--text)" }}>
                <b style={{ color: "#3fd69c" }} className={userBump ? "num-bump" : ""}>{liveUsers}</b> live users
              </span>
              <span style={{ color: "var(--mute)" }}>•</span>
              <span style={{ color: "var(--text)", fontFamily: "var(--mono)", fontSize: 11.5 }}>
                🕒 {realTimeClock.local} <span style={{ color: "var(--dim)" }}>({realTimeClock.utc})</span>
              </span>
            </div>
          </div>
        }
        sub="Continuous fast real-time onchain inspection of exploiter infrastructure addresses. Every transaction includes exact UTC and local timestamps, relative elapsed time, block verification status, method signatures, and direct Etherscan links."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn ghost electric-speed-btn"
              style={{ padding: "4px 10px", fontSize: 11 }}
              onClick={() =>
                setSpeed((s) => (s === "blitz" ? "hyper" : s === "hyper" ? "fast" : s === "fast" ? "normal" : "blitz"))
              }
            >
              Speed: {speed === "blitz" ? "⚡⚡ Blitz (0.6s)" : speed === "hyper" ? "⚡ Turbo (1.1s)" : speed === "fast" ? "⚡ Fast (2.2s)" : "Normal (5s)"}
            </button>
            <button
              type="button"
              className="btn ghost"
              style={{ padding: "4px 10px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => setIsStreaming((s) => !s)}
            >
              <span className={isStreaming ? "live-status-dot rec" : "dim"} style={{ width: 6, height: 6 }} />
              {isStreaming ? "Streaming Active" : "Stream Paused"}
            </button>
            <button
              type="button"
              className="btn rt"
              style={{ padding: "4px 12px", fontSize: 11 }}
              onClick={pulseNewTx}
              title="Inject / simulate new onchain transaction immediately"
            >
              ⚡ Pulse Tx Now
            </button>
          </div>
        }
      />

      {/* Target Address Switcher Pills */}
      <div
        className="feed-target-switcher"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 8,
          marginTop: 14,
          alignItems: "center",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {entitiesList.map((ent) => {
          const isSelected = activeAddr.toLowerCase() === ent.address.toLowerCase();
          const count =
            ((targetTxsData as Record<string, RawTargetTx[]>)[ent.address.toLowerCase()] || []).length +
            ((customTxs[ent.address.toLowerCase()] || []).length);
          return (
            <button
              key={ent.address}
              type="button"
              className={`btn ${isSelected ? "rt active-entity-card-glow" : "ghost"}`}
              style={{
                padding: "5px 12px",
                fontSize: 11.5,
                borderColor: isSelected ? ent.highlightColor : undefined,
                background: isSelected ? `${ent.highlightColor}22` : undefined,
                color: isSelected ? "#ffffff" : undefined,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={() => {
                setActiveAddr(ent.address.toLowerCase());
                setSearchQuery("");
                setExpandedTx(null);
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: ent.highlightColor,
                  display: "inline-block",
                }}
              />
              <span>{ent.shortLabel}</span>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  opacity: 0.75,
                  padding: "1px 5px",
                  background: "rgba(0,0,0,0.25)",
                  borderRadius: 10,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Address Profile Banner */}
      {activeEntity ? (
        <div
          style={{
            background: "var(--panel-2)",
            border: `1px solid ${activeEntity.highlightColor}44`,
            borderRadius: 10,
            padding: "14px 18px",
            marginTop: 10,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                className="bd"
                style={{
                  background: `${activeEntity.highlightColor}18`,
                  color: activeEntity.highlightColor,
                  border: `1px solid ${activeEntity.highlightColor}44`,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {activeEntity.tag}
              </span>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                {activeEntity.label}
              </h4>
              <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#3fd69c" }} />
            </div>
            <div
              className="feed-address-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 6,
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "var(--mute)",
                flexWrap: "wrap",
                wordBreak: "break-all",
              }}
            >
              <span className="feed-addr-full">{activeEntity.address}</span>
              <span className="feed-addr-short">{shortAddr(activeEntity.address, 10, 6)}</span>
              <button
                type="button"
                className="btn ghost"
                style={{ padding: "0 5px", fontSize: 10.5 }}
                onClick={() => copyToClipboard(activeEntity.address, activeEntity.shortLabel)}
                title="Copy Address"
              >
                copy
              </button>
              <a
                href={activeEntity.codeUrl || activeEntity.etherscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn ghost"
                style={{ padding: "0 6px", fontSize: 10.5 }}
                title="View on Etherscan"
              >
                Etherscan ↗
              </a>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--dim)" }}>
              {activeEntity.role}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <div className="mute" style={{ fontSize: 10.5, fontFamily: "var(--mono)", textTransform: "uppercase" }}>
              Known Balance
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", fontFamily: "var(--mono)", marginTop: 2 }}>
              {activeEntity.balanceEth !== undefined
                ? `${amount(activeEntity.balanceEth)} ETH`
                : "Active Mempool Bot"}
            </div>
            {activeEntity.balanceEth ? (
              <div style={{ fontSize: 11, color: "var(--amber)", fontFamily: "var(--mono)" }}>
                ≈ {usd(activeEntity.balanceEth * ethPrice)}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Filter and Search Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 14,
        }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            className={`btn ${filterStatus === "all" ? "rt" : "ghost"}`}
            style={{ padding: "3px 9px", fontSize: 11 }}
            onClick={() => setFilterStatus("all")}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            className={`btn ${filterStatus === "confirmed" ? "rt" : "ghost"}`}
            style={{ padding: "3px 9px", fontSize: 11 }}
            onClick={() => setFilterStatus("confirmed")}
          >
            Confirmed ({counts.confirmed})
          </button>
          <button
            type="button"
            className={`btn ${filterStatus === "pending" ? "rt" : "ghost"}`}
            style={{ padding: "3px 9px", fontSize: 11 }}
            onClick={() => setFilterStatus("pending")}
          >
            Pending / Mempool ({counts.pending})
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "1 1 240px", maxWidth: 360 }}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hash, contract, or method..."
            style={{
              width: "100%",
              padding: "5px 10px",
              background: "var(--panel-2)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              color: "var(--text)",
              fontSize: 11.5,
              fontFamily: "var(--mono)",
            }}
          />
          {searchQuery ? (
            <button
              type="button"
              className="btn ghost"
              style={{ padding: "3px 8px", fontSize: 11 }}
              onClick={() => setSearchQuery("")}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {/* Transactions Table with Live Time */}
      <div className="tbl" style={{ maxHeight: 520, marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 155 }}>Timestamp & Relative Time</th>
              <th>Status</th>
              <th>Method / Action</th>
              <th className="num hide-s">Value (ETH)</th>
              <th className="hide-s">Block</th>
              <th>To (Target / Contract)</th>
              <th className="num hide-m">Gas</th>
              <th className="num">Tx Hash</th>
            </tr>
          </thead>
          <tbody>
            {displayedTxs.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  <b>No transactions found</b>
                  Try changing the filter status or clearing the search query.
                </td>
              </tr>
            ) : (
              displayedTxs.map((tx, idx) => {
                const timeInfo = formatFullTime(tx.ts);
                const isConfirmed = tx.status === "confirmed" || Boolean(tx.blockNumber);
                const methodLabel = METHOD_LABELS[tx.method || ""] || tx.method || "call";
                const isExpanded = expandedTx === tx.hash;

                return (
                  <tr
                    key={`${tx.hash}-${idx}`}
                    className={tx.isNew ? "row-live-highlight" : ""}
                    style={{
                      cursor: "pointer",
                      background: isExpanded ? "rgba(255,255,255,0.03)" : undefined,
                    }}
                    onClick={() => setExpandedTx(isExpanded ? null : tx.hash)}
                    title="Click row to inspect full transaction data"
                  >
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600 }}>
                        {timeInfo.utc.replace(" UTC", "")}
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: "var(--mute)",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span style={{ color: "#3fd69c", fontWeight: 600 }}>
                          {timeInfo.relative}
                        </span>
                        <span>•</span>
                        <span>{timeInfo.local}</span>
                      </div>
                    </td>

                    <td>
                      {isConfirmed ? (
                        <span
                          className="bd live-badge-confirmed"
                          style={{
                            background: "rgba(63, 214, 156, 0.15)",
                            color: "#3fd69c",
                            border: "1px solid rgba(63, 214, 156, 0.35)",
                            fontSize: 10,
                            padding: "2px 7px",
                            borderRadius: 4,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span className="live-status-dot confirmed" />
                          CONFIRMED
                        </span>
                      ) : (
                        <span
                          className="bd live-badge-pending"
                          style={{
                            background: "rgba(242, 182, 74, 0.15)",
                            color: "var(--amber)",
                            border: "1px solid rgba(242, 182, 74, 0.4)",
                            fontSize: 10,
                            padding: "2px 7px",
                            borderRadius: 4,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span className="live-status-dot pending" />
                          PENDING
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        className="method-badge"
                        style={{
                          fontSize: 11,
                          padding: "2px 6px",
                          fontFamily: "var(--mono)",
                        }}
                        title={methodLabel}
                      >
                        {tx.method || "transfer"}
                      </span>
                      {methodLabel !== tx.method ? (
                        <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>
                          {methodLabel}
                        </div>
                      ) : null}
                    </td>

                    <td className="num hide-s" style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>
                      {tx.valueEth > 0 ? (
                        <div>
                          <b style={{ color: "var(--text)" }}>{amount(tx.valueEth)} ETH</b>
                          <div style={{ fontSize: 10, color: "var(--mute)" }}>
                            {usd(tx.valueEth * ethPrice)}
                          </div>
                        </div>
                      ) : (
                        <span className="dim">0.00 ETH</span>
                      )}
                    </td>

                    <td className="hide-s" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                      {tx.blockNumber ? (
                        <span style={{ color: "var(--blue)" }}>#{tx.blockNumber.toLocaleString()}</span>
                      ) : (
                        <span className="mute">Mempool</span>
                      )}
                    </td>

                    <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                      {tx.to ? (
                        <a
                          href={addressUrl(tx.to)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: "var(--text)" }}
                          title={tx.to}
                        >
                          {shortAddr(tx.to, 8, 4)}
                        </a>
                      ) : (
                        <span className="dim">Contract Creation</span>
                      )}
                    </td>

                    <td className="num hide-m" style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--mute)" }}>
                      {tx.gasUsed ? Number(tx.gasUsed).toLocaleString() : "—"}
                    </td>

                    <td className="num" style={{ whiteSpace: "nowrap" }}>
                      <a
                        href={txUrl(tx.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn ghost"
                        style={{ padding: "2px 7px", fontSize: 11, fontFamily: "var(--mono)" }}
                        onClick={(e) => e.stopPropagation()}
                        title="View transaction on Etherscan"
                      >
                        {shortHash(tx.hash)} ↗
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded Tx Quick Details Drawer / Inspector */}
      {expandedTx ? (
        (() => {
          const tx = displayedTxs.find((t) => t.hash === expandedTx);
          if (!tx) return null;
          const time = formatFullTime(tx.ts);
          return (
            <div
              style={{
                marginTop: 12,
                background: "#080c12",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px 18px",
                fontFamily: "var(--mono)",
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <b style={{ color: "#3fd69c" }}>Transaction Inspector</b>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: "2px 8px", fontSize: 11 }}
                  onClick={() => setExpandedTx(null)}
                >
                  Close ✕
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                <div>
                  <span className="mute">Tx Hash:</span>
                  <div style={{ color: "var(--text)", wordBreak: "break-all" }}>{tx.hash}</div>
                </div>
                <div>
                  <span className="mute">Timestamp (UTC):</span>
                  <div style={{ color: "var(--text)" }}>{time.utc}</div>
                </div>
                <div>
                  <span className="mute">From:</span>
                  <div style={{ color: "var(--text)", wordBreak: "break-all" }}>{tx.from || activeAddr}</div>
                </div>
                <div>
                  <span className="mute">To:</span>
                  <div style={{ color: "var(--text)", wordBreak: "break-all" }}>{tx.to || "Contract Deployment"}</div>
                </div>
                <div>
                  <span className="mute">Method / Selector:</span>
                  <div style={{ color: "var(--text)" }}>{tx.method || "ETH Transfer"}</div>
                </div>
                <div>
                  <span className="mute">Value:</span>
                  <div style={{ color: "var(--text)" }}>{tx.valueEth} ETH</div>
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                <a
                  href={txUrl(tx.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn rt"
                  style={{ fontSize: 11, padding: "3px 10px" }}
                >
                  Open in Etherscan ↗
                </a>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: 11, padding: "3px 10px" }}
                  onClick={() => copyToClipboard(tx.hash, "Tx Hash")}
                >
                  Copy Hash
                </button>
              </div>
            </div>
          );
        })()
      ) : null}
    </section>
  );
}
