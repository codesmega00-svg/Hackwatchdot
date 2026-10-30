import { useMemo, useState } from "react";
import type { EventView } from "../lib/data";
import { addressUrl, kindMeta } from "../lib/data";
import { amount, pct, shortAddr, usd } from "../lib/format";
import { Bar, KindBadge, SectionTitle } from "./ui";

const CATEGORIES: { label: string; kinds: string[]; cls: string; note: string }[] = [
  { label: "Sold on DEXs", kinds: ["Sell (DEX)"], cls: "sell", note: "Swapped into pools and aggregators" },
  { label: "Sent out", kinds: ["Sent out"], cls: "sent", note: "Wallets not yet identified" },
  { label: "Internal moves", kinds: ["Moved to own wallet", "Moved to his own wallet"], cls: "move", note: "Between exploiter wallets" },
  { label: "Bridged", kinds: ["Bridge"], cls: "bridge", note: "Left Ethereum entirely" },
  { label: "Aave", kinds: ["Deposit (Aave)"], cls: "deposit", note: "Deposited as collateral" },
  { label: "Exploit Sweeps", kinds: ["Contract Exploit", "EIP-7702 Delegation"], cls: "sell", note: "Drained via EIP-7702 sweeper contract" },
  { label: "Deployer / Phish", kinds: ["Deploy / Phish"], cls: "deposit", note: "Attacker deployer & phishing calls" },
];

export default function Trail({ events, totalMoved }: { events: EventView[]; totalMoved: number }) {
  const [all, setAll] = useState(false);

  const cats = useMemo(
    () =>
      CATEGORIES.map((c) => {
        const rows = events.filter((e) => c.kinds.includes(e.kind));
        return { ...c, usd: rows.reduce((s, e) => s + e.usdLive, 0), n: rows.length };
      }).sort((a, b) => b.usd - a.usd),
    [events],
  );

  const dests = useMemo(() => {
    const map = new Map<string, { to: string; usd: number; n: number; kinds: Set<string>; toks: Map<string, number>; last: string; ts: string }>();
    for (const e of events) {
      if (!e.to) continue;
      const key = e.to.toLowerCase();
      const cur = map.get(key) ?? { to: e.to, usd: 0, n: 0, kinds: new Set<string>(), toks: new Map<string, number>(), last: e.when, ts: e.ts };
      cur.usd += e.usdLive;
      cur.n += 1;
      cur.kinds.add(e.kind);
      cur.toks.set(e.sym, (cur.toks.get(e.sym) ?? 0) + e.amt);
      if (new Date(e.ts) > new Date(cur.ts)) {
        cur.ts = e.ts;
        cur.last = e.when;
      }
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.usd - a.usd);
  }, [events]);

  const shown = all ? dests : dests.slice(0, 12);
  const maxCat = Math.max(1, ...cats.map((c) => c.usd));

  return (
    <>
      <SectionTitle
        kicker="Destination"
        title="Where the money went"
        sub="Everything that has left the exploiter's known wallets, grouped by where it went. Destination rows aggregate every transfer to the same address, valued at the latest Binance prices. Exchange and bridge rows stay at zero until funds actually go there."
      />

      <div className="trail">
        {cats.map((c) => (
          <div key={c.label} className="dest">
            <div className="dh">
              <span className="dt">{c.label}</span>
              <span className="dv">{usd(c.usd)}</span>
            </div>
            <div className="ds">{c.n.toLocaleString()} events · {totalMoved > 0 ? pct((c.usd / totalMoved) * 100, 1) : "0%"} of flow</div>
            <Bar value={(c.usd / maxCat) * 100} cls={c.cls === "sell" ? "" : c.cls === "sent" ? "bl" : "g"} />
            <div className="ds" style={{ marginTop: 8, color: "var(--dim)" }}>{c.note}</div>
          </div>
        ))}
      </div>

      <div className="tbl">
        <table>
          <thead>
            <tr>
              <th>Destination</th>
              <th className="hide-m">Type</th>
              <th className="hide-m">What went there</th>
              <th className="num">USD</th>
              <th>Status now</th>
              <th className="num hide-m">Last</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((d) => {
              const kind = [...d.kinds][0];
              const meta = kindMeta(kind);
              const status =
                kind === "Bridge"
                  ? { cls: "bridge", label: "Off Ethereum" }
                  : kind === "Sell (DEX)"
                    ? { cls: "sell", label: "DEX pool" }
                    : kind === "Deposit (Aave)"
                      ? { cls: "deposit", label: "Aave market" }
                      : kind.includes("own")
                        ? { cls: "move", label: "Exploiter wallet" }
                        : { cls: "sent", label: "Unlabelled wallet" };
              const toks = [...d.toks.entries()].slice(0, 3);
              return (
                <tr key={d.to}>
                  <td className="mono">
                    <a href={addressUrl(d.to)} target="_blank" rel="noopener noreferrer">{shortAddr(d.to, 8, 6)}</a>
                  </td>
                  <td className="hide-m"><span className={`bd ${meta.cls}`}>{meta.label}</span></td>
                  <td className="hide-m" style={{ whiteSpace: "normal" }}>
                    {toks.map(([sym, amt]) => (
                      <span key={sym} className="chip" style={{ cursor: "default", marginRight: 4 }}>{amount(amt)} {sym}</span>
                    ))}
                    {d.toks.size > 3 ? <span className="dim">+{d.toks.size - 3}</span> : null}
                  </td>
                  <td className="num">{usd(d.usd)}</td>
                  <td><span className={`bd ${status.cls}`}>{status.label}</span></td>
                  <td className="num hide-m dim">{d.last}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!all && dests.length > 12 ? (
        <button type="button" className="btn more" onClick={() => setAll(true)}>
          Show all {dests.length} destinations
        </button>
      ) : null}

      <div className="vz" style={{ marginTop: 20 }}>
        <h3>Event mix</h3>
        <p className="q">Every tracked movement since the hack, split by what actually happened onchain.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((c) => {
            const n = events.filter((e) => c.kinds.includes(e.kind)).length;
            return (
              <span key={c.label} className="chip" style={{ cursor: "default", display: "inline-flex", gap: 7, alignItems: "center" }}>
                <KindBadge kind={c.kinds[0]} /> {n.toLocaleString()}
              </span>
            );
          })}
        </div>
        <p className="q" style={{ marginTop: 12, marginBottom: 0, color: "var(--dim)", fontSize: 12.5 }}>
          Destination labels are inferred from the onchain event that produced them. An “unlabelled wallet” is an ordinary address with no
          public label — it has not necessarily cashed out. Data comes from public Ethereum records; not affiliated with Binance.
        </p>
      </div>
    </>
  );
}
