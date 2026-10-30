import { useMemo, useState } from "react";
import type { EventView, Totals } from "../lib/data";
import { addressUrl, txUrl } from "../lib/data";
import { amount, pct, shortAddr, usd } from "../lib/format";
import { KindBadge, SectionTitle, Seg, useToast } from "./ui";

type Kind = "sell" | "all";

export default function Sales({ events, totals }: { events: EventView[]; totals: Totals }) {
  const [kind, setKind] = useState<Kind>("sell");
  const [token, setToken] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [hover, setHover] = useState<number | null>(null);
  const toast = useToast();

  const sales = useMemo(() => events.filter((e) => e.kind === "Sell (DEX)").slice().reverse(), [events]);

  const series = useMemo(() => {
    let run = 0;
    return sales.map((e) => {
      run += e.usdLive;
      return { ts: new Date(e.ts).getTime(), cum: run, usd: e.usdLive };
    });
  }, [sales]);

  const max = Math.max(1, series.length ? series[series.length - 1].cum : 1);
  const W = 1000;
  const H = 200;
  const path = series
    .map((p, i) => {
      const x = series.length === 1 ? W : (i / (series.length - 1)) * W;
      const y = H - (p.cum / max) * H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = path ? `${path} L${W},${H} L0,${H} Z` : "";

  const ticks = useMemo(() => {
    if (!series.length) return [];
    const first = series[0].ts;
    const last = series[series.length - 1].ts;
    return [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      f,
      label: new Date(first + (last - first) * f).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" }),
    }));
  }, [series]);

  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) counts.set(e.sym, (counts.get(e.sym) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s]) => s);
  }, [events]);

  const rows = useMemo(() => {
    let list = events;
    if (kind === "sell") list = list.filter((e) => e.kind === "Sell (DEX)");
    if (token) list = list.filter((e) => e.sym === token);
    return list;
  }, [events, kind, token]);

  const shown = rows.slice(0, limit);
  const hoverPoint = hover !== null ? series[hover] : null;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!series.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(f * (series.length - 1)));
  }

  return (
    <>
      <SectionTitle
        kicker="Volume"
        title="Cumulative sales since the hack"
        sub="Dollar value of everything sold on decentralized exchanges, re-priced at the latest Binance prices. Times are Pacific."
        right={
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ fontSize: 24, color: "var(--text)" }}>{usd(totals.soldEth)}</div>
            <div className="mute" style={{ fontFamily: "var(--mono)", fontSize: 10.5 }}>{pct(totals.soldPct, 2)} of the Ethereum haul moved out</div>
          </div>
        }
      />
      <div className="chart">
        <div style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${W} ${H + 22}`} preserveAspectRatio="none" onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Cumulative dollar value sold since the hack">
            <defs>
              <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff5a52" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#ff5a52" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g className="grid">
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <line key={f} x1={0} x2={W} y1={H - f * H} y2={H - f * H} />
              ))}
            </g>
            {path ? <path className="area" d={area} /> : null}
            {path ? <path className="line" d={path} vectorEffect="non-scaling-stroke" /> : null}
            {series.length > 0 ? (
              <g>
                <circle
                  cx={W}
                  cy={H - (series[series.length - 1].cum / max) * H}
                  r={4}
                  fill="var(--red)"
                />
                <circle
                  cx={W}
                  cy={H - (series[series.length - 1].cum / max) * H}
                  r={4}
                  fill="none"
                  stroke="var(--red)"
                  strokeWidth={2}
                  className="chart-radar-point"
                />
              </g>
            ) : null}
            {hover !== null && series[hover] ? (
              <g>
                <line
                  x1={(hover / Math.max(1, series.length - 1)) * W}
                  x2={(hover / Math.max(1, series.length - 1)) * W}
                  y1={0}
                  y2={H}
                  stroke="rgba(255,255,255,0.28)"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={(hover / Math.max(1, series.length - 1)) * W}
                  cy={H - (series[hover].cum / max) * H}
                  r={4}
                  fill="#fff"
                  stroke="#ff5a52"
                  strokeWidth={2}
                />
              </g>
            ) : null}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--dim)" }}>
            {ticks.map((t) => (
              <span key={t.f}>{t.label}</span>
            ))}
          </div>
          {hoverPoint ? (
            <div className="toast" style={{ position: "absolute", top: 6, left: 8, pointerEvents: "none" }}>
              {usd(hoverPoint.cum)} cumulative · {new Date(hoverPoint.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          ) : null}
        </div>
        <div className="legend">
          <span><i style={{ background: "var(--red)" }} />Cumulative USD sold</span>
          <span>{sales.length.toLocaleString()} sales · hover the line for a moment in time</span>
        </div>
      </div>

      <section className="panel-block" id="salesec">
        <SectionTitle
          kicker="Ledger"
          title="Every sale and transfer"
          sub="Newest first. “% of stack” is the sale as a share of the full stolen amount of that token. USD is re-priced live from Binance."
          right={<Seg<Kind> label="Event type" value={kind} onChange={setKind} options={[{ value: "sell", label: "Sales" }, { value: "all", label: "All moves" }]} />}
        />
        <div className="toolbar">
          <span className="chiprow">
            <button type="button" className={`chip ${token === null ? "on" : ""}`} onClick={() => setToken(null)}>All tokens</button>
            {chips.map((s) => (
              <button key={s} type="button" className={`chip ${token === s ? "on" : ""}`} onClick={() => setToken(token === s ? null : s)}>
                {s}
              </button>
            ))}
          </span>
          <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11, marginLeft: "auto" }}>
            {rows.length.toLocaleString()} events
          </span>
        </div>
        <div className="tbl" style={{ maxHeight: 560 }}>
          <table>
            <thead>
              <tr>
                <th>When (PT)</th>
                <th className="hide-s">What</th>
                <th>Token</th>
                <th className="num hide-s">Amount</th>
                <th className="num">USD</th>
                <th className="num">% of stack</th>
                <th className="hide-m">Wallet</th>
                <th className="num hide-m">Tx</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    <b>No events for this filter</b>
                    Clear the token chip or switch to “All moves”.
                  </td>
                </tr>
              ) : (
                shown.map((e, i) => {
                  const stolen = totals.topHolding && e.sym === totals.topHolding.sym ? totals.topHolding.stolen : null;
                  const stackPct = stolen ? (e.amt / stolen) * 100 : null;
                  return (
                    <tr key={`${e.hash}-${i}`}>
                      <td className="mono dim">{e.when}</td>
                      <td className="hide-s"><KindBadge kind={e.kind} /></td>
                      <td className="sym">{e.sym}</td>
                      <td className="num hide-s">{amount(e.amt)}</td>
                      <td className="num">{usd(e.usdLive)}</td>
                      <td className="num">{stackPct !== null ? pct(stackPct, 2) : "—"}</td>
                      <td className="mono hide-m">
                        <a href={addressUrl(e.wa)} target="_blank" rel="noopener noreferrer" className="dim">{shortAddr(e.wa, 6, 4)}</a>
                      </td>
                      <td className="num hide-m">
                        {e.hash ? <a href={txUrl(e.hash)} target="_blank" rel="noopener noreferrer" title={e.hash}>↗</a> : <span className="dim">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="tfoot">
          <span>Showing {shown.length.toLocaleString()} of {rows.length.toLocaleString()}</span>
          <span style={{ display: "flex", gap: 8 }}>
            {limit < rows.length ? (
              <button type="button" className="btn" onClick={() => setLimit((l) => l + 50)}>Load 50 more</button>
            ) : null}
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                const csv = rows
                  .slice(0, 500)
                  .map((e) => [e.when, e.kind, e.sym, e.amt, e.usdLive.toFixed(2), e.wa, e.hash].join(","))
                  .join("\n");
                void navigator.clipboard?.writeText(`when,kind,token,amount,usd,wallet,tx\n${csv}`).then(
                  () => toast("Copied 500 rows as CSV."),
                  () => toast("Clipboard blocked by the browser."),
                );
              }}
            >
              Copy CSV
            </button>
          </span>
        </div>
      </section>
    </>
  );
}
