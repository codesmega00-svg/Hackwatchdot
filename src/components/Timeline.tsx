import { useMemo, useState } from "react";
import type { EventView } from "../lib/data";
import { txUrl } from "../lib/data";
import { amount, usd } from "../lib/format";
import { KindBadge, SectionTitle, Seg } from "./ui";

type Filter = "key" | "big" | "sale" | "all";

const COLOR: Record<string, string> = {
  "Sell (DEX)": "var(--red)",
  "Sent out": "var(--blue)",
  Bridge: "var(--amber)",
  "Deposit (Aave)": "var(--violet)",
  "Moved to own wallet": "var(--mute)",
  "Moved to his own wallet": "var(--mute)",
  "Contract Exploit": "var(--red)",
  "EIP-7702 Delegation": "var(--amber)",
  "Deploy / Phish": "var(--violet)",
};

export default function Timeline({ events }: { events: EventView[] }) {
  const [filter, setFilter] = useState<Filter>("sale");
  const [hover, setHover] = useState<EventView | null>(null);
  const [limit, setLimit] = useState(26);

  const filtered = useMemo(() => {
    const asc = events.slice().reverse();
    if (filter === "key") return asc.filter((e) => (e.kind === "Sell (DEX)" && e.usdLive >= 5_000_000) || e.kind === "Bridge" || e.kind === "Deposit (Aave)");
    if (filter === "big") return asc.filter((e) => e.kind === "Sell (DEX)" && e.usdLive >= 100_000);
    if (filter === "sale") return asc.filter((e) => e.kind === "Sell (DEX)");
    return asc;
  }, [events, filter]);

  const lanes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of filtered) counts.set(e.sym, (counts.get(e.sym) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([s]) => s);
  }, [filtered]);

  const span = useMemo(() => {
    if (!filtered.length) return { min: 0, max: 1 };
    const times = filtered.map((e) => new Date(e.ts).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    return { min, max: max === min ? min + 3_600_000 : max };
  }, [filtered]);

  const marks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    f,
    label: new Date(span.min + (span.max - span.min) * f).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" }),
  }));

  const maxUsd = Math.max(1, ...filtered.map((e) => e.usdLive));
  const list = filtered.slice().reverse().slice(0, limit);

  return (
    <>
      <SectionTitle
        kicker="Sequence"
        title="Timeline"
        sub="Every tracked movement since the hack, in order. Times are Pacific. Each lane is a coin and every event is a dot — bigger dots are bigger sales. Hover a dot for details, click to open it on Etherscan."
      />

      <div className="toolbar">
        <Seg<Filter>
          label="Timeline filter"
          value={filter}
          onChange={(f) => setFilter(f)}
          options={[
            { value: "key", label: "Key moments" },
            { value: "big", label: "Sales over $100K" },
            { value: "sale", label: "Every sale" },
            { value: "all", label: "Everything" },
          ]}
        />
        <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11, marginLeft: "auto" }}>
          {filtered.length.toLocaleString()} events · {lanes.length} lanes
        </span>
      </div>

      <div className="tlwrap" style={{ minHeight: 120 }}>
        {filtered.length === 0 ? (
          <div className="empty">
            <b>Nothing in this lane yet</b>
            Switch the filter to “Everything” to widen the window.
          </div>
        ) : (
          <>
            <div style={{ minHeight: 26, marginBottom: 6 }}>
              {hover ? (
                <div className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11.5, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <KindBadge kind={hover.kind} />
                  <b style={{ color: "var(--text)" }}>{hover.sym}</b>
                  <span>{amount(hover.amt)}</span>
                  <span style={{ color: "var(--red)" }}>{usd(hover.usdLive)}</span>
                  <span>{hover.when}</span>
                </div>
              ) : (
                <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>Hover a dot to identify it</span>
              )}
            </div>
            <div className="tll">
              {lanes.map((sym) => {
                const row = filtered.filter((e) => e.sym === sym);
                return (
                  <div className="tlrow" key={sym}>
                    <div className="lab">{sym}</div>
                    <div className="tlbar">
                      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", borderTop: "1px solid var(--line-soft)" }} />
                      {row.map((e, i) => {
                        const f = (new Date(e.ts).getTime() - span.min) / (span.max - span.min);
                        const size = 4 + Math.min(12, (e.usdLive / maxUsd) * 12);
                        return (
                          <a
                            key={`${e.hash}-${i}`}
                            className="tldot"
                            href={txUrl(e.hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onMouseEnter={() => setHover(e)}
                            onMouseLeave={() => setHover(null)}
                            onFocus={() => setHover(e)}
                            onBlur={() => setHover(null)}
                            style={{
                              left: `${Math.min(99.5, Math.max(0.5, f * 100))}%`,
                              width: size,
                              height: size,
                              background: COLOR[e.kind] ?? "var(--mute)",
                              top: `${45 + (i % 3) * 5}%`,
                            }}
                            aria-label={`${e.kind} of ${amount(e.amt)} ${e.sym} — ${e.when}, ${usd(e.usdLive)}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="tlscale">
              <div />
              <div className="marks">
                {marks.map((m) => (
                  <span key={m.f} style={{ left: `${m.f * 100}%` }}>{m.label}</span>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="tlkey">
          <span><i style={{ background: "var(--red)" }} />Sold on an exchange</span>
          <span><i style={{ background: "var(--blue)" }} />Sent out</span>
          <span><i style={{ background: "var(--amber)" }} />Bridged</span>
          <span><i style={{ background: "var(--violet)" }} />Aave deposit</span>
          <span><i style={{ background: "var(--mute)" }} />Moved between his own wallets</span>
        </div>
      </div>

      <section className="panel-block">
        <SectionTitle kicker="Chronology" title="In order, newest first" />
        <div className="tbl" style={{ maxHeight: 520 }}>
          <table>
            <thead>
              <tr>
                <th>When (PT)</th>
                <th>What</th>
                <th>Token</th>
                <th className="num hide-s">Amount</th>
                <th className="num">USD</th>
                <th className="num hide-m">Tx</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e, i) => (
                <tr key={`${e.hash}-${i}`}>
                  <td className="mono dim">{e.when}</td>
                  <td><KindBadge kind={e.kind} /></td>
                  <td className="sym">{e.sym}</td>
                  <td className="num hide-s">{amount(e.amt)}</td>
                  <td className="num">{usd(e.usdLive)}</td>
                  <td className="num hide-m">
                    {e.hash ? <a href={txUrl(e.hash)} target="_blank" rel="noopener noreferrer" title={e.hash}>↗</a> : <span className="dim">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {limit < filtered.length ? (
          <button type="button" className="btn more" onClick={() => setLimit((l) => l + 40)}>
            Show 40 older events
          </button>
        ) : null}
      </section>
    </>
  );
}
