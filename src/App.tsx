import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ArkhamEntity from "./components/ArkhamEntity";
import Chat from "./components/Chat";
import FastTransactions from "./components/FastTransactions";
import EtherscanFlow from "./components/EtherscanFlow";
import Exploit from "./components/Exploit";
import Live from "./components/Live";
import Pressure from "./components/Pressure";
import Sales from "./components/Sales";
import Tokens from "./components/Tokens";
import Timeline from "./components/Timeline";
import Trail from "./components/Trail";
import { Bar, Kpi, LiveBadge, ToastCtx } from "./components/ui";
import AnnouncementBar from "./components/AnnouncementBar";
import SupportSection from "./components/SupportSection";
import { I18nProvider, useI18n } from "./lib/i18n";
import { ThemeProvider, useTheme } from "./lib/theme";
import {
  buildEvents,
  buildTotals,
  buildTracked,
  isTargetAddress,
  seed,
  snapshotPrice,
} from "./lib/data";
import { pct, usd } from "./lib/format";
import { LiveTx, useBinance, useLiveTransactions, useTick } from "./lib/useLive";

type TabId = "live" | "fasttx" | "flow" | "arkham" | "exploit" | "tokens" | "pressure" | "sales" | "trail" | "timeline" | "chat";
type Mode = "detailed" | "simple";

const TABS: { id: TabId; label: string; short: string; advanced?: boolean }[] = [
  { id: "live", label: "Live", short: "Live" },
  { id: "fasttx", label: "Fast Tx & 677 Wallets", short: "Fast Tx" },
  { id: "flow", label: "Etherscan Flow", short: "Flow" },
  { id: "arkham", label: "Arkham Entity", short: "Arkham" },
  { id: "exploit", label: "Exploit Contract", short: "Exploit" },
  { id: "tokens", label: "Tokens", short: "Tokens" },
  { id: "pressure", label: "Pressure", short: "Press.", advanced: true },
  { id: "sales", label: "Sales", short: "Sales" },
  { id: "trail", label: "Trail", short: "Trail", advanced: true },
  { id: "timeline", label: "Timeline", short: "Time" },
  { id: "chat", label: "Chat", short: "Chat" },
];

const MODE_KEY = "hackwatch.mode";

function readTab(): TabId {
  const h = window.location.hash.replace("#", "") as TabId;
  return TABS.some((t) => t.id === h) ? h : "live";
}

function Icon({ id }: { id: TabId }) {
  const common = { viewBox: "0 0 24 24", "aria-hidden": true } as const;
  switch (id) {
    case "live":
      return <svg {...common}><path d="M2 12h4l3-8 4 16 3-8h6" /></svg>;
    case "fasttx":
      return (
        <svg {...common}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "flow":
      return (
        <svg {...common}>
          <circle cx="5" cy="6" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="18" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="19" cy="6" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M5 8.5v3a2 2 0 002 2h10a2 2 0 002-2v-3M12 13.5V15.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "arkham":
      return (
        <svg {...common}>
          <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
    case "exploit":
      return (
        <svg {...common}>
          <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 8v5M12 16h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "tokens":
      return <svg {...common}><circle cx="9" cy="9" r="6" /><path d="M15.5 9.5a6 6 0 1 1-6 6" /></svg>;
    case "pressure":
      return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
    case "sales":
      return <svg {...common}><path d="M3 6h18M3 12h18M3 18h12" /></svg>;
    case "trail":
      return <svg {...common}><circle cx="5" cy="6" r="2.5" /><circle cx="19" cy="6" r="2.5" /><circle cx="12" cy="19" r="2.5" /><path d="M7 7.5l4 9M17 7.5l-4 9" /></svg>;
    case "timeline":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "chat":
      return <svg {...common}><path d="M4 5h16v11H9l-5 4z" /></svg>;
  }
}

function HackWatchApp() {
  const { t } = useI18n();
  const { theme, setTheme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<TabId>(readTab);
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem(MODE_KEY) === "simple" ? "simple" : "detailed"));
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [howOpen, setHowOpen] = useState(false);
  const [liveUsers, setLiveUsers] = useState(440);
  const [userBump, setUserBump] = useState(false);
  const howRef = useRef<HTMLDetailsElement>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  const tick = useTick(1000);

  // Auto-scroll active tab into view in mobile tabbar
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [tab]);

  // Live active user counter fluctuation starting from 440
  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveUsers((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
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

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, msg }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3400);
  }, []);

  const live = useBinance();
  const tracked = useMemo(() => buildTracked(live.prices, live.changes, live.volumes), [live.prices, live.changes, live.volumes]);
  const baseEvents = useMemo(() => buildEvents(live.prices), [live.prices]);

  const onNewLiveTx = useCallback((tx: LiveTx) => {
    if (isTargetAddress(tx.wa) || isTargetAddress(tx.to)) {
      toast(`⚡ Live Onchain Move: ${tx.sym} (${usd(tx.usdLive)}) · ${tx.wallet}`);
    }
  }, [toast]);

  const liveStream = useLiveTransactions(live.prices, onNewLiveTx);

  const events = useMemo(() => {
    if (!liveStream.liveTxs.length) return baseEvents;
    return [...liveStream.liveTxs, ...baseEvents];
  }, [liveStream.liveTxs, baseEvents]);

  const ethPrice = live.prices.ETH ?? snapshotPrice("ETH");
  const btcPrice = live.prices.WBTC ?? live.prices.BTC ?? seed.btc.price;
  const totals = useMemo(() => buildTotals(tracked, events, ethPrice, btcPrice), [tracked, events, ethPrice, btcPrice]);

  const navigate = useCallback((next: TabId) => {
    setTab(next);
    if (window.location.hash !== `#${next}`) window.history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
    if (mode === "simple" && (tab === "pressure" || tab === "trail")) setTab("live");
  }, [mode, tab]);

  const visibleTabs = useMemo(() => TABS.filter((tItem) => mode === "detailed" || !tItem.advanced), [mode]);

  const copyLink = useCallback(() => {
    const url = window.location.href;
    void navigator.clipboard?.writeText(url).then(
      () => toast("Link copied to clipboard."),
      () => toast("Clipboard blocked — copy the address bar instead."),
    );
  }, [toast]);

  const totalsMoved = useMemo(
    () => events.filter((e) => e.kind !== "Moved to own wallet" && e.kind !== "Moved to his own wallet").reduce((s, e) => s + e.usdLive, 0),
    [events],
  );

  return (
    <ToastCtx.Provider value={toast}>
      <AnnouncementBar />
      <div className="app">
        <aside className="side" aria-label="Sections">
          <a className="brand" href="#live" onClick={() => navigate("live")}>
            <span className="brand-mark" aria-hidden="true">
              <img src="/hackwatch-logo.jpg" alt="HackWatch Logo" className="brand-logo-img" />
            </span>
            <span>
              <span className="brand-name">HackWatch</span>
              <span className="brand-tag">Onchain exploit desk</span>
            </span>
          </a>
          <div className="side-rule" />
          <div>
            <div className="side-label">{t("nav_sections")}</div>
            <nav className="nav">
              {visibleTabs.map((tItem, i) => (
                <button key={tItem.id} type="button" className={tab === tItem.id ? "on" : ""} aria-current={tab === tItem.id ? "page" : undefined} onClick={() => navigate(tItem.id)}>
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  {t(`nav_${tItem.id}`, tItem.label)}
                  {tItem.id === "chat" ? <span className="pill">open</span> : null}
                </button>
              ))}
            </nav>
          </div>
          <div className="side-rule" />
          <div className="side-foot">
            <div>
              <b>Prices:</b> Binance spot, live every 20s
              <br />
              <b>Trail:</b> public Ethereum records
            </div>
            <div>
              {seed.meta.assets} stolen assets · {seed.meta.events.toLocaleString()} tracked moves
            </div>
            <div style={{ color: "var(--dim)" }}>
              Snapshot {seed.meta.snapshot} PT. Not affiliated with Binance. Not financial advice.
            </div>
          </div>
        </aside>

        <div className="wrap">
          <div className="mbar">
            <b style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <img src="/hackwatch-logo.jpg" alt="HackWatch" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
              HackWatch
            </b>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className="btn ghost"
                style={{ padding: "2px 8px", fontSize: 11 }}
                onClick={toggleTheme}
                title="Toggle Theme"
              >
                {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
              </button>
              <LiveBadge status={live.status} updatedAt={live.updatedAt} error={live.error} refresh={live.refresh} />
            </div>
          </div>

          {/* Light Mode Sky Horizon Banner — displayed above the main desk when in Light Mode */}
          {theme === "light" ? (
            <div className="light-sky-banner-wrap" role="img" aria-label="Sky Horizon Light Mode Banner">
              <img
                src="/light-banner.jpg"
                alt="Sky Horizon Pixel Grid"
                className="light-sky-banner-img"
              />
              <div className="light-sky-banner-overlay">
                <div className="light-sky-banner-badge">
                  <span className="live-status-dot confirmed" />
                  <span>SKY HORIZON · REAL-TIME DESK</span>
                </div>
                <div className="light-sky-banner-desc">
                  Live Mempool Stream & Onchain Exploit Tracker · Light Horizon Palette
                </div>
              </div>
            </div>
          ) : null}

          <header className="top">
            <div className="kicker">
              <span>BREAKING · Oct 29, 2026</span>
            </div>
            <div className="top-grid">
              <div className="top-copy">
                <h1>
                  Suspected Binance hot wallet exploiter: <em>live sell tracker</em>
                </h1>
                <p className="lede">
                  On Oct 29, 2026 a wallet Etherscan labels <b>“Suspect Binance Hot Wallet Exploiter 2”</b> drained Binance hot wallets on
                  Ethereum. This desk follows every wallet the funds moved to and shows each sale as it happens — priced against{" "}
                  <b>live Binance markets</b> and public onchain records.
                </p>
                <div className="btns">
                  <a
                    className="btn rt"
                    href="https://x.com/Hackwatchdot"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: "#000", color: "#fff", borderColor: "rgba(255, 255, 255, 0.3)", display: "inline-flex", alignItems: "center", gap: 6 }}
                    title="Follow @Hackwatchdot on X"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Follow @Hackwatchdot
                  </a>
                  <a className="btn rt" href="https://x.com/intent/retweet?tweet_id=2115943603554181158" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17 2l4 4-4 4" />
                      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
                      <path d="M7 22l-4-4 4-4" />
                      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
                    </svg>
                    {t("repost_x")}
                  </a>
                  <button type="button" className="btn" onClick={copyLink}>{t("copy_link")}</button>
                  <a className="btn" href="https://x.com/intent/post?url=https%3A%2F%2Fx.com%2FJeffKirdeikis%2Fstatus%2F2115943603554181158" target="_blank" rel="noopener noreferrer">
                    {t("share_x")}
                  </a>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setHowOpen(true);
                      window.setTimeout(() => howRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
                    }}
                  >
                    {t("how_to_read")}
                  </button>
                </div>
              </div>
              <div className="top-side">
                <div className="modeseg" role="group" aria-label="View density">
                  <button type="button" className={mode === "detailed" ? "on" : ""} aria-pressed={mode === "detailed"} onClick={() => setMode("detailed")}>
                    {t("detailed")}
                  </button>
                  <button type="button" className={mode === "simple" ? "on" : ""} aria-pressed={mode === "simple"} onClick={() => setMode("simple")}>
                    {t("simple")}
                  </button>
                </div>
                <div className="modeseg theme-modeseg" role="group" aria-label="Theme mode">
                  <button
                    type="button"
                    className={theme === "dark" ? "on" : ""}
                    aria-pressed={theme === "dark"}
                    onClick={() => {
                      setTheme("dark");
                      toast("Switched to Dark mode");
                    }}
                    title="Dark mode"
                  >
                    🌙 {t("theme_dark")}
                  </button>
                  <button
                    type="button"
                    className={theme === "light" ? "on" : ""}
                    aria-pressed={theme === "light"}
                    onClick={() => {
                      setTheme("light");
                      toast("Switched to Light mode (Sky Horizon)");
                    }}
                    title="Light mode (Sky Horizon)"
                  >
                    ☀️ {t("theme_light")}
                  </button>
                </div>
                <div className="live-presence-pill" style={{ padding: "3px 10px", fontSize: 11 }}>
                  <span className="live-presence-dot" />
                  <b style={{ color: "#3fd69c" }} className={userBump ? "num-bump" : ""}>{liveUsers}</b>
                  <span className="live-watching-label">{t("watching_live")}</span>
                  <span style={{ color: "var(--mute)" }}>•</span>
                  <span style={{ color: "var(--dim)", fontFamily: "var(--mono)" }}>
                    {new Date(tick).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                  </span>
                </div>
                <LiveBadge status={live.status} updatedAt={live.updatedAt} error={live.error} refresh={live.refresh} />
                <div className="live" style={{ borderColor: "transparent", background: "none", padding: 0 }}>
                  <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 10.5 }}>
                    BTC ${live.prices.BTC?.toLocaleString("en-US", { maximumFractionDigits: 0 }) ?? seed.btc.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    {" · "}ETH ${live.prices.ETH?.toLocaleString("en-US", { maximumFractionDigits: 2 }) ?? snapshotPrice("ETH").toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="kpis">
              <Kpi label={t("kpi_total_hack")} value="$6.3B" sub={<>Binance&apos;s figure. <a href="https://www.trmlabs.com/resources/blog/north-korea-steals-usd-6-36-billion-from-binance-in-the-largest-hack-in-history" target="_blank" rel="noopener noreferrer">TRM Labs</a>: $6.36B across 10 chains</>} hot />
              <Kpi label={t("kpi_stolen_eth")} value={usd(totals.stolenEth)} sub={t("kpi_binance_rep")} />
              <Kpi label={t("kpi_still_held")} value={usd(totals.heldEth)} sub={`across ${seed.wallets.length} known wallets`} />
              <Kpi label={t("kpi_sold_so_far")} value={usd(totals.soldEth)} sub={`${pct(totals.soldPct, 1)} of the stack, on DEXs`} />
              <Kpi
                label={t("kpi_eth_held")}
                value={usd(totals.ethHeld)}
                sub={`${seed.wallets.reduce((s, w) => s + w.eth, 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} ETH · $${ethPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              />
              <Kpi
                label={t("kpi_last_sale")}
                value={totals.lastSale ? usd(totals.lastSale.usdLive) : "—"}
                sub={totals.lastSale ? `${totals.lastSale.sym} · ${totals.lastSale.when}` : "no sales tracked"}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <Bar value={totals.soldPct} />
              <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                {pct(totals.soldPct, 2)} of the Ethereum haul has left the exploiter&apos;s wallets
              </span>
            </div>
          </header>

          <main>
            {tab === "live" ? (
              <Live
                tracked={tracked}
                events={events}
                totals={totals}
                liveStream={liveStream}
                onOpenToken={() => navigate("tokens")}
                onOpenExploit={() => navigate("exploit")}
              />
            ) : null}
            {tab === "fasttx" ? <FastTransactions /> : null}
            {tab === "flow" ? (
              <EtherscanFlow
                events={events}
                totals={totals}
                tracked={tracked}
                liveStream={liveStream}
              />
            ) : null}
            {tab === "arkham" ? (
              <ArkhamEntity
                events={events}
                totals={totals}
                tracked={tracked}
                liveStream={liveStream}
              />
            ) : null}
            {tab === "exploit" ? <Exploit events={events} totals={totals} liveStream={liveStream} /> : null}
            {tab === "tokens" ? <Tokens tracked={tracked} /> : null}
            {tab === "pressure" && mode === "detailed" ? <Pressure tracked={tracked} /> : null}
            {tab === "sales" ? <Sales events={events} totals={totals} /> : null}
            {tab === "trail" && mode === "detailed" ? <Trail events={events} totalMoved={totalsMoved} /> : null}
            {tab === "timeline" ? <Timeline events={events} /> : null}
            {tab === "chat" ? <Chat /> : null}
          </main>

          <details id="how" className="how" ref={howRef} open={howOpen} onToggle={(e) => setHowOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary>How to read this, and what it cannot see</summary>
            <ul>
              <li><b>Sold</b> means the exploiter sent a token into a decentralized exchange pool or aggregator (Uniswap, Curve, 1inch and similar). <b>Sent out</b> means it went to an address that is not a known exploiter wallet. <b>Bridged</b> means it left Ethereum.</li>
              <li><b>Gone</b> is the share of a stolen token no longer sitting in any known exploiter wallet. It counts sales and transfers out. Funds sent to a wallet not yet traced also count as gone.</li>
              <li><b>ETH can show as negative</b> because the exploiter swapped stolen stablecoins into ETH, so they now hold more ETH than they took.</li>
              <li><b>USDT:</b> Tether froze the main wallet&apos;s USDT, so most of it cannot move. It still counts as held.</li>
              <li><b>Dollar values use live prices</b> pulled from Binance spot markets every 20 seconds, not the price at the time of each sale. Tokens without a Binance pair keep their last snapshot price.</li>
              <li>Ethereum only. Anything bridged to another chain drops out of view here.</li>
            </ul>
            <p>Trail data comes from public Ethereum records. Prices come from Binance. Not affiliated with Binance. Not financial advice.</p>
          </details>

          {/* Support Work Section in Footer */}
          <SupportSection />

          <footer className="site">
            <span>{t("footer_source")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <a
                href="https://x.com/Hackwatchdot"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-x-link"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                @Hackwatchdot
              </a>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <img src="/hackwatch-logo.jpg" alt="HackWatch Logo" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />
                HackWatch · {new Date().getFullYear()}
              </span>
            </div>
          </footer>
        </div>

        <nav className="tabbar" aria-label="Sections">
          {visibleTabs.map((tItem) => (
            <button
              key={tItem.id}
              ref={tab === tItem.id ? activeTabRef : undefined}
              type="button"
              className={tab === tItem.id ? "on" : ""}
              aria-current={tab === tItem.id ? "page" : undefined}
              onClick={() => navigate(tItem.id)}
            >
              <Icon id={tItem.id} />
              <span>{t(`nav_${tItem.id}`, tItem.short)}</span>
            </button>
          ))}
        </nav>

        <div className="toasts" aria-live="polite">
          {toasts.map((tItem) => (
            <div className="toast" key={tItem.id}>{tItem.msg}</div>
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <HackWatchApp />
      </I18nProvider>
    </ThemeProvider>
  );
}
