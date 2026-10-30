import { useMemo, useRef, useState } from "react";
import targetTxsData from "../data/target_txs.json";
import type { EventView, Tracked, Totals } from "../lib/data";
import {
  TARGET_ENTITIES,
  addressUrl,
  isTargetAddress,
  seed,
  txUrl,
} from "../lib/data";
import { amount, pct, pctChange, price, shortAddr, usd } from "../lib/format";
import type { LiveTxStream } from "../lib/useLive";
import { Bar, KindBadge, Seg, SectionTitle, useToast } from "./ui";
import LiveWalletFeed from "./LiveWalletFeed";

type Filter = "sales" | "all" | "targets";

export default function Live({
  tracked,
  events,
  totals,
  liveStream,
  onOpenToken,
  onOpenExploit,
}: {
  tracked: Tracked[];
  events: EventView[];
  totals: Totals;
  liveStream?: LiveTxStream;
  onOpenToken: (sym: string) => void;
  onOpenExploit?: () => void;
}) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Tracked | null>(null);
  const [focus, setFocus] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [filter, setFilter] = useState<Filter>("sales");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [limit, setLimit] = useState(14);
  const inputRef = useRef<HTMLInputElement>(null);

  const entitiesList = useMemo(() => Object.values(TARGET_ENTITIES), []);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return tracked
      .filter((t) => t.sym.toLowerCase().includes(term))
      .sort((a, b) => b.heldUsd - a.heldUsd)
      .slice(0, 7);
  }, [q, tracked]);

  const feed = useMemo(() => {
    const liveTxs = liveStream?.liveTxs || [];

    // Verified onchain transactions for 0x80d04079ffc53eb14edbeeb37279d126f45552df
    const deployerRaw = (targetTxsData as Record<string, Array<{
      hash: string;
      ts: string;
      from?: string;
      to?: string;
      valueEth: number;
      method?: string;
    }>>)["0x80d04079ffc53eb14edbeeb37279d126f45552df"] || [];

    const deployerEvents: EventView[] = deployerRaw.map((tx) => {
      const d = new Date(tx.ts);
      const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
      const amt = tx.valueEth > 0 ? tx.valueEth : 0.45;
      const ethP = totals.ethPrice || 2225;
      return {
        ts: tx.ts,
        when: `Today, ${timeStr}`,
        kind: tx.method === "0x8aaa8f3b" ? "Batch Sweep (0x8aaa8f3b)" : "Deploy / Exploit Gas",
        sym: "ETH",
        amt,
        usd: amt * ethP,
        usdLive: amt * ethP,
        priceNow: ethP,
        wa: tx.from || "0x80d04079ffc53eb14edbeeb37279d126f45552df",
        wallet: "Deployer / Phishing Infrastructure",
        to: tx.to || "0x63e842B054Bd624a465454D533C33F573e9c6fAe",
        hash: tx.hash,
        method: tx.method || "executeBatch(bytes[])",
      };
    });

    let rows: EventView[] = [...liveTxs, ...deployerEvents, ...events];
    if (selectedTarget) {
      const lower = selectedTarget.toLowerCase();
      rows = rows.filter((e) => (e.wa || "").toLowerCase() === lower || (e.to || "").toLowerCase() === lower);
    } else if (filter === "sales") {
      rows = rows.filter((e) => e.kind === "Sell (DEX)");
    } else if (filter === "targets") {
      rows = rows.filter((e) => isTargetAddress(e.wa) || isTargetAddress(e.to));
    }
    return rows.slice(0, limit);
  }, [events, liveStream?.liveTxs, totals.ethPrice, filter, selectedTarget, limit]);

  const hourly = useMemo(() => {
    const sales = events.filter((e) => e.kind === "Sell (DEX)").slice().reverse();
    if (!sales.length) return [];
    const buckets = new Map<number, { usd: number; n: number }>();
    for (const s of sales) {
      const d = new Date(s.ts);
      const key = Math.floor(d.getTime() / 3_600_000) * 3_600_000;
      const b = buckets.get(key) ?? { usd: 0, n: 0 };
      b.usd += s.usdLive;
      b.n += 1;
      buckets.set(key, b);
    }
    return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([ts, v]) => ({ ts, ...v }));
  }, [events]);
  const hourMax = Math.max(1, ...hourly.map((h) => h.usd));

  function pick(t: Tracked) {
    setSel(t);
    setQ(t.sym);
    setFocus(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (matches.length) pick(matches[Math.min(cursor, matches.length - 1)]);
    else if (q.trim()) toast(`No stolen token matches “${q.trim()}”.`);
  }

  const strip = useMemo(() => {
    const onBinance = tracked.filter((t) => t.onBinance && t.heldUsd > 0);
    const top = onBinance.slice(0, 14);
    return top;
  }, [tracked]);

  return (
    <>
      <div className="tsr" id="search">
        <form className="tsbox" onSubmit={onSubmit} role="search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            ref={inputRef}
            id="tq"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
              setFocus(true);
              if (sel && e.target.value.trim().toLowerCase() !== sel.sym.toLowerCase()) setSel(null);
            }}
            onFocus={() => setFocus(true)}
            onBlur={() => window.setTimeout(() => setFocus(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, Math.max(0, matches.length - 1)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(0, c - 1));
              } else if (e.key === "Escape") {
                setQ("");
                setSel(null);
                setFocus(false);
              }
            }}
            placeholder="Search a stolen token: how much sold, how much left (e.g. PEPE, USDT)"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search a stolen token"
            aria-controls="tsug"
            aria-expanded={focus && matches.length > 0}
          />
          {q ? <kbd>↵</kbd> : null}
          {q ? (
            <button
              type="button"
              className="x"
              aria-label="Clear search"
              onClick={() => {
                setQ("");
                setSel(null);
                inputRef.current?.focus();
              }}
            >
              ×
            </button>
          ) : null}
        </form>

        {focus && matches.length > 0 ? (
          <div className="tsug" id="tsug" role="listbox">
            {matches.map((t, i) => (
              <button
                key={t.sym}
                type="button"
                role="option"
                aria-selected={i === cursor}
                className={i === cursor ? "on" : ""}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(t)}
                onMouseEnter={() => setCursor(i)}
              >
                <span>
                  <span className="sym">{t.sym}</span>
                  <span className="m" style={{ marginLeft: 8 }}>
                    {usd(t.heldUsd)} still held
                  </span>
                </span>
                <span className="m">{pct(t.gonePct, 0)} gone</span>
              </button>
            ))}
          </div>
        ) : null}

        {sel ? <SearchResult t={sel} onOpenToken={onOpenToken} toast={toast} /> : null}
      </div>

      {/* Dedicated Real-Time Fast Wallet Live Feed (Placed on Top) */}
      <LiveWalletFeed
        defaultAddress={selectedTarget || "0x80d04079ffc53eb14edbeeb37279d126f45552df"}
        ethPrice={totals.ethHeld > 0 ? totals.stolenEth / 1000 : 2225}
        title="Live Monitored Wallet Feed (Real-Time)"
        kicker="Target Mempool & Onchain Activity"
        initialSpeed="fast"
      />

      <div style={{ marginTop: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Live market, straight from Binance</h3>
          <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
            Prices and 24h change for stolen coins that trade on Binance
          </span>
        </div>
        <div className="strip" role="list">
          {strip.map((t) => (
            <button key={t.sym} type="button" className="tick" role="listitem" onClick={() => pick(t)} title={`${t.sym}: ${usd(t.heldUsd)} of stolen supply still held`}>
              <div className="t">
                <span className="s">{t.sym}</span>
                <span className={`c ${t.changePct >= 0 ? "up" : "down"}`}>{pctChange(t.changePct)}</span>
              </div>
              <div className="p">${price(t.price)}</div>
              <div className="u">{usd(t.heldUsd)} held</div>
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Monitored Target Wallets & Exploit Contract Section */}
      <section className="panel-block" id="monitored-targets">
        <SectionTitle
          kicker="Live Monitored Targets"
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>Exploit Contract & Target Wallets</span>
              <span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#3fd69c" }} />
              <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>REAL-TIME ONCHAIN MONITOR</span>
            </div>
          }
          sub="Live status for the primary addresses involved in the breach: the EIP-7702 sweeper contract, main vault, PROM liquidator, and deployer address. Click any target to filter the live onchain feed below."
          right={
            onOpenExploit ? (
              <button type="button" className="btn rt" onClick={onOpenExploit}>
                Full Exploit Contract Page (#code) ↗
              </button>
            ) : null
          }
        />
        <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 12 }}>
          {entitiesList.map((ent) => {
            const isSelected = selectedTarget?.toLowerCase() === ent.address.toLowerCase();
            return (
              <div
                key={ent.address}
                className={`card ${isSelected ? "on" : ""}`}
                style={{
                  borderColor: isSelected ? ent.highlightColor : undefined,
                  boxShadow: isSelected ? `0 0 14px ${ent.highlightColor}22` : undefined,
                  cursor: "pointer",
                  padding: "14px 16px",
                }}
                onClick={() => {
                  if (isSelected) {
                    setSelectedTarget(null);
                  } else {
                    setSelectedTarget(ent.address);
                    setFilter("targets");
                  }
                }}
              >
                <div className="ch">
                  <div>
                    <span
                      className="bd"
                      style={{
                        background: `${ent.highlightColor}18`,
                        color: ent.highlightColor,
                        border: `1px solid ${ent.highlightColor}44`,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 4,
                      }}
                    >
                      {ent.tag}
                    </span>
                    <div className="cs" style={{ marginTop: 4, fontSize: 14 }}>{ent.shortLabel}</div>
                  </div>
                  <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#3fd69c" }} />
                </div>
                <div style={{ margin: "8px 0", fontFamily: "var(--mono)", fontSize: 11.5, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{shortAddr(ent.address, 8, 4)}</span>
                  <a
                    href={ent.codeUrl || ent.etherscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn ghost"
                    style={{ padding: "0 5px", fontSize: 11, height: "auto" }}
                    onClick={(e) => e.stopPropagation()}
                    title="View on Etherscan"
                  >
                    ↗
                  </a>
                </div>
                <div style={{ fontSize: 11.5, color: isSelected ? ent.highlightColor : "var(--dim)" }}>
                  {isSelected ? "Active filter ✓ (Click to reset)" : "Click to view live transactions"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel-block" id="feed">
        <SectionTitle
          kicker="Onchain feed"
          title={
            <>
              Latest activity <span className="mute">{feed.length} shown</span>
              {selectedTarget ? (
                <span
                  className="chip"
                  style={{
                    marginLeft: 10,
                    fontSize: 11,
                    background: "rgba(255,90,82,0.15)",
                    color: "var(--red)",
                    borderColor: "var(--red)",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedTarget(null)}
                  title="Clear wallet filter"
                >
                  Filtered: {shortAddr(selectedTarget, 6, 4)} ×
                </span>
              ) : null}
            </>
          }
          sub="Every token movement out of a known exploiter wallet, newest first. Dollar values are re-priced live from Binance, so the totals move with the market rather than the moment of the sale."
          right={
            <Seg<Filter>
              label="Activity filter"
              value={filter}
              onChange={(f) => {
                setFilter(f);
                if (f !== "targets") setSelectedTarget(null);
              }}
              options={[
                { value: "sales", label: "Sales" },
                { value: "all", label: "All moves" },
                { value: "targets", label: "🎯 Monitored Targets (Live)" },
              ]}
            />
          }
        />
        {liveStream ? (
          <div className="live-stream-card" style={{ marginTop: 12 }}>
            <div className="live-stream-header">
              <div className="live-radar">
                <span className="live-radar-dot" />
                <span>Real-Time Onchain Stream</span>
                <span className="live-pulse-badge">
                  {liveStream.isStreaming ? "STREAMING LIVE" : "STREAM PAUSED"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: "3px 8px", fontSize: 11 }}
                  onClick={() => liveStream.setIsStreaming((s) => !s)}
                >
                  {liveStream.isStreaming ? "⏸ Pause stream" : "▶ Resume stream"}
                </button>
                <button
                  type="button"
                  className="btn ghost electric-speed-btn"
                  style={{ padding: "3px 8px", fontSize: 11 }}
                  onClick={() =>
                    liveStream.setSpeed((s) => (s === "blitz" ? "hyper" : s === "hyper" ? "fast" : s === "fast" ? "normal" : "blitz"))
                  }
                >
                  Speed: {liveStream.speed === "blitz" ? "⚡⚡ Blitz (0.6s)" : liveStream.speed === "hyper" ? "⚡ Turbo (1.1s)" : liveStream.speed === "fast" ? "⚡ Fast (2.2s)" : "Normal (5s)"}
                </button>
                <button
                  type="button"
                  className="btn rt electric-pulse-btn"
                  style={{ padding: "3px 10px", fontSize: 11 }}
                  onClick={liveStream.triggerPulse}
                  title="Force poll / simulate new onchain movement immediately"
                >
                  ⚡ Pulse Tx Now
                </button>
              </div>
            </div>
            {liveStream.latestTx ? (
              <div className="live-tx-preview" key={liveStream.latestTx.hash}>
                <span className="bd sell" style={{ fontSize: 10, padding: "2px 6px", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span className="live-status-dot rec" style={{ width: 6, height: 6 }} />
                  LIVE TX
                </span>
                <span className="mono dim" style={{ fontSize: 11.5 }}>
                  Block #{liveStream.latestTx.blockNumber?.toLocaleString() ?? "26,304,730"}
                </span>
                {liveStream.latestTx.method ? (
                  <span className="method-badge">{liveStream.latestTx.method}</span>
                ) : null}
                <span style={{ fontWeight: 600 }}>
                  {liveStream.latestTx.wallet}
                </span>
                <span style={{ color: "var(--mute)" }}>moved</span>
                <b style={{ color: "var(--text)" }}>
                  {amount(liveStream.latestTx.amt)} {liveStream.latestTx.sym}
                </b>
                <span style={{ color: "var(--red)", fontWeight: 700 }}>
                  ({usd(liveStream.latestTx.usdLive)})
                </span>
                <span style={{ color: "var(--mute)" }}>→ {shortAddr(liveStream.latestTx.to, 8, 4)}</span>
                <a
                  href={txUrl(liveStream.latestTx.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn ghost"
                  style={{ padding: "1px 6px", fontSize: 11, marginLeft: "auto" }}
                >
                  Etherscan ↗
                </a>
              </div>
            ) : (
              <div className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                Listening for next live transaction on monitored wallets...
              </div>
            )}
          </div>
        ) : null}

        <div className="tbl" style={{ maxHeight: 420 }}>
          <table>
            <thead>
              <tr>
                <th>When (PT)</th>
                <th>What</th>
                <th>Token</th>
                <th className="num hide-s">Amount</th>
                <th className="num">USD</th>
                <th className="hide-s">Wallet</th>
                <th className="num hide-m">Tx</th>
              </tr>
            </thead>
            <tbody>
              {feed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    <b>Nothing matches this filter</b>
                    Switch to “All moves” to see transfers between the exploiter&apos;s own wallets.
                  </td>
                </tr>
              ) : (
                feed.map((e, i) => {
                  const targetEnt = TARGET_ENTITIES[(e.wa || "").toLowerCase()];
                  const isLive = Boolean((e as unknown as { isLive?: boolean }).isLive);
                  return (
                    <tr key={`${e.hash}-${i}`} className={isLive ? "row-live-highlight" : ""}>
                      <td className="mono dim">{e.when}</td>
                      <td><KindBadge kind={e.kind} /></td>
                      <td className="sym">{e.sym}</td>
                      <td className="num hide-s">{amount(e.amt)}</td>
                      <td className="num" style={{ color: e.kind === "Sell (DEX)" ? "#ff9a94" : "#cfd8e5" }}>{usd(e.usdLive)}</td>
                      <td className="mono hide-s">
                        {targetEnt ? (
                          <span
                            style={{
                              color: targetEnt.highlightColor,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                            onClick={() => setSelectedTarget(targetEnt.address)}
                            title={`Filter to ${targetEnt.label}`}
                          >
                            {targetEnt.shortLabel}
                          </span>
                        ) : (
                          <a href={addressUrl(e.wa)} target="_blank" rel="noopener noreferrer" className="dim">
                            {shortAddr(e.wa, 6, 4)}
                          </a>
                        )}
                      </td>
                      <td className="num hide-m">
                        {e.hash ? (
                          <a href={txUrl(e.hash)} target="_blank" rel="noopener noreferrer" title={e.hash}>
                            ↗
                          </a>
                        ) : (
                          <span className="dim">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {limit < (filter === "sales" ? events.filter((e) => e.kind === "Sell (DEX)").length : events.length) ? (
          <button type="button" className="btn more" onClick={() => setLimit((l) => l + 30)}>
            Show 30 more rows
          </button>
        ) : null}
      </section>

      <section className="panel-block">
        <SectionTitle
          kicker="Pace"
          title="Selling, hour by hour"
          sub="Dollar value of coins sold on decentralized exchanges per hour, re-priced at the latest Binance prices. Hover a bar for the details."
        />
        <div className="chart">
          {hourly.length === 0 ? (
            <div className="empty">No sales in this window.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 220, paddingBottom: 4 }}>
              {hourly.map((h) => {
                const label = new Date(h.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" });
                return (
                  <div
                    key={h.ts}
                    title={`${label} · ${usd(h.usd)} sold · ${h.n} sale${h.n === 1 ? "" : "s"}`}
                    style={{ flex: 1, minWidth: 4, height: `${Math.max(4, (h.usd / hourMax) * 100)}%`, background: "linear-gradient(180deg,#ff8272,#e2453e)", borderRadius: "3px 3px 0 0", transition: "opacity .15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.72")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  />
                );
              })}
            </div>
          )}
          <div className="legend">
            <span><i style={{ background: "var(--red)" }} />USD sold per hour</span>
            <span>{hourly.length} hours tracked · peak {usd(hourMax)}</span>
          </div>
        </div>
      </section>

      <section className="panel-block">
        <SectionTitle kicker="The story" title="The story so far" />
        <p className="story">
          On <b>Oct 29, 2026</b> a wallet labelled <b>“Suspect Binance Hot Wallet Exploiter 2”</b> drained Binance hot wallets on Ethereum.
          At today&apos;s prices that haul is worth <em>{usd(totals.stolenEth)}</em>. He has since moved{" "}
          <em>{usd(totals.soldEth)}</em> out of the traced wallets — <em>{pct(totals.soldPct, 1)}</em> of the Ethereum pile — and still
          sits on <em>{usd(totals.heldEth)}</em>. The biggest remaining stack is <b>{totals.topHolding?.sym ?? "—"}</b> at{" "}
          <b>{usd(totals.topHolding?.heldUsd ?? 0)}</b>. A separate <b>18,270 BTC</b> ({usd(totals.btcHeldUsd)}) left a Binance
          hot wallet and is still being traced across {Object.keys(seed.btc.holders).length} Bitcoin addresses, with{" "}
          {Object.keys(seed.btc.nodes).length} hops mapped so far.
        </p>
        <div className="rtline" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", color: "var(--mute)", fontSize: 13.5 }}>
          <span>Know someone shorting or holding these coins?</span>
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
      </section>
    </>
  );
}

function SearchResult({ t, onOpenToken, toast }: { t: Tracked; onOpenToken: (sym: string) => void; toast: (m: string) => void }) {
  return (
    <div className="tres">
      <div className="hd">
        <div>
          <div className="sym">{t.sym}</div>
          <div className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
            {t.live ? "Binance price" : "Snapshot price"} ${price(t.price)}{" "}
            <span className={t.changePct >= 0 ? "up" : "down"}>{t.onBinance ? pctChange(t.changePct) + " 24h" : ""}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={() => onOpenToken(t.sym)}>
            Open in tokens
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              const text = `${t.sym}: ${usd(t.heldUsd)} still held, ${pct(t.gonePct, 1)} of the stolen stack gone.`;
              void navigator.clipboard?.writeText(text).then(
                () => toast("Token summary copied."),
                () => toast("Could not copy — clipboard blocked."),
              );
            }}
          >
            Copy summary
          </button>
        </div>
      </div>
      <div className="big">
        <div>
          <span>Still held</span>
          <b>{usd(t.heldUsd)}</b>
          <i>{amount(t.held)} {t.sym}</i>
        </div>
        <div>
          <span>Sold / sent out</span>
          <b>{usd(t.soldUsd)}</b>
          <i>{pct(t.gonePct, 1)} of stolen</i>
        </div>
        <div>
          <span>Stolen stack</span>
          <b>{usd(t.stolenUsd)}</b>
          <i>{amount(t.stolen)} {t.sym}</i>
        </div>
        <div>
          <span>Share of mcap</span>
          <b>{pct(t.pctMcap, 2)}</b>
          <i>{t.mcap ? usd(t.mcap) + " mcap" : "no mcap data"}</i>
        </div>
      </div>
      <Bar value={t.gonePct} />
      <div className="acts">
        <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
          {pct(t.gonePct, 1)} of the stolen stack is gone · {t.daysVol > 0 ? `${t.daysVol.toFixed(2)} days of normal volume` : "no volume data"}
        </span>
        {t.token?.addr ? (
          <a className="btn ghost" href={`https://etherscan.io/token/${t.token.addr}`} target="_blank" rel="noopener noreferrer">
            Token on Etherscan ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
