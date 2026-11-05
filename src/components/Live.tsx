import { useMemo, useRef, useState } from "react";
import type { EventView, Tracked, Totals } from "../lib/data";
import {
  TARGET_ENTITIES,
  seed,
} from "../lib/data";
import { amount, pct, pctChange, price, shortAddr, usd } from "../lib/format";
import type { LiveTxStream } from "../lib/useLive";
import { Bar, SectionTitle, useToast } from "./ui";
import LiveWalletFeed from "./LiveWalletFeed";
import ArkhamEntity from "./ArkhamEntity";

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
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
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
      {/* Live View Navigation & Arkham Real-Time Explorer Shortcuts */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "0 0 16px", flexWrap: "wrap" }}>
        <a
          href="#arkham-entity-live-explorer"
          className="btn rt"
          style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, padding: "7px 14px" }}
        >
          <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#3fd69c" }} />
          ⚡ Arkham Live Explorer (1,600+ Txs)
        </a>
        <a
          href="#wallet-live-feed"
          className="btn ghost"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "7px 14px" }}
        >
          🎯 Target Mempool Feed
        </a>
        <button
          type="button"
          className={`btn ${selectedTarget?.toLowerCase() === "0x5227f603c1ee34ce3c06efe6477003bdfccb2f8c" ? "rt" : "ghost"}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12,
            padding: "7px 14px",
            borderColor: "rgba(255, 90, 82, 0.5)",
            background: selectedTarget?.toLowerCase() === "0x5227f603c1ee34ce3c06efe6477003bdfccb2f8c" ? "rgba(255, 90, 82, 0.2)" : undefined,
          }}
          onClick={() => {
            setSelectedTarget("0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c");
            const el = document.getElementById("wallet-live-feed");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          title="Filter and show all transfers for Main Vault (0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c)"
        >
          <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff5a52" }} />
          💰 Main Vault Transfers (550+ Onchain)
        </button>
        <a
          href="#monitored-targets"
          className="btn ghost"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "7px 14px" }}
        >
          🏷️ Monitored Targets
        </a>
        <a
          href="https://arkm.com/explorer/entity/binance-hacker-2"
          target="_blank"
          rel="noopener noreferrer"
          className="btn ghost"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            padding: "7px 14px",
            marginLeft: "auto",
            color: "#3fd69c",
            borderColor: "rgba(63, 214, 156, 0.4)",
          }}
          title="Open official Binance Hacker 2 entity on Arkham Intelligence"
        >
          Official Arkham Entity ↗
        </a>
      </div>

      {/* Official Arkham Intelligence Multi-Chain Live Transfers Explorer (Top Hero Section) */}
      <section style={{ marginBottom: 20 }} id="arkham-entity-live-explorer">
        <ArkhamEntity
          events={events}
          totals={totals}
          tracked={tracked}
          liveStream={liveStream}
          filterAddress={selectedTarget}
          onClearFilterAddress={() => setSelectedTarget(null)}
        />
      </section>

      {/* Dedicated Real-Time Fast Wallet Live Feed */}
      <LiveWalletFeed
        defaultAddress={selectedTarget || "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c"}
        ethPrice={tracked.find((t) => t.sym === "ETH")?.price || 2225}
        title="Live Monitored Wallet Feed (Real-Time)"
        kicker="Target Mempool & Onchain Activity"
        initialSpeed="fast"
      />

      {/* Stolen Token Search */}
      <div className="tsr" id="search" style={{ marginTop: 24 }}>
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
                    const el = document.getElementById("arkham-entity-live-explorer");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
          <a
            className="btn ghost"
            href="https://x.com/intent/retweet?tweet_id=2116403772956225967"
            target="_blank"
            rel="noopener noreferrer"
            title="Repost on X: https://x.com/Hackwatchdot/status/2116403772956225967"
          >
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
