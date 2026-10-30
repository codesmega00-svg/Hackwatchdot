import { useMemo, useState } from "react";
import type { Tracked } from "../lib/data";
import { pct, pctChange, price, usd } from "../lib/format";
import { SectionTitle, Seg } from "./ui";

type SortKey = "share" | "held" | "days";

export default function Pressure({ tracked }: { tracked: Tracked[] }) {
  const [onlyBinance, setOnlyBinance] = useState<"all" | "binance">("all");
  const [sort, setSort] = useState<SortKey>("share");
  const [all, setAll] = useState(false);

  const rows = useMemo(() => {
    const base = tracked.filter((t) => !t.token?.stable && t.held > 0 && (onlyBinance === "all" || t.onBinance));
    return base.sort((a, b) => {
      if (sort === "held") return b.heldUsd - a.heldUsd;
      if (sort === "days") return b.daysVol - a.daysVol;
      return b.pctMcap - a.pctMcap;
    });
  }, [tracked, onlyBinance, sort]);

  const top = rows.slice(0, 6);
  const maxShare = Math.max(0.0001, ...top.map((t) => t.pctMcap));
  const visible = all ? rows : rows.slice(0, 16);

  return (
    <>
      <SectionTitle
        kicker="Sell pressure"
        title="Sell pressure ranking"
        sub="Tokens the exploiter still holds, ranked by the holding as a share of the coin's market cap. “Days of volume” is the holding divided by normal 24 hour trading volume (live from Binance): above 1 means one day of selling would equal a full day of the whole market's trading."
      />
      <div className="toolbar">
        <Seg<"all" | "binance">
          label="Market filter"
          value={onlyBinance}
          onChange={setOnlyBinance}
          options={[
            { value: "all", label: "All tokens" },
            { value: "binance", label: "Only Binance-listed" },
          ]}
        />
        <label className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 7 }}>
          Rank by
          <select className="sel" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Rank tokens by">
            <option value="share">Share of market cap</option>
            <option value="held">Holding size</option>
            <option value="days">Days of volume</option>
          </select>
        </label>
        <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11, marginLeft: "auto" }}>
          {rows.length} tokens in play
        </span>
      </div>

      <div className="plist">
        {top.map((t, i) => (
          <div key={t.sym} className="prow" title={`${t.sym} holding is ${pct(t.pctMcap, 2)} of market cap`}>
            <span className="rank">{String(i + 1).padStart(2, "0")}</span>
            <span className="sym">{t.sym}</span>
            <div className="sbar">
              <i style={{ width: `${Math.max(1.5, (t.pctMcap / maxShare) * 100)}%` }} />
            </div>
            <span className="val">{pct(t.pctMcap, 2)} of mcap</span>
          </div>
        ))}
        {top.length === 0 ? <div className="empty">No tokens match this filter.</div> : null}
      </div>

      <div className="tbl">
        <table>
          <thead>
            <tr>
              <th className="hide-s">#</th>
              <th className="stick">Token</th>
              <th className="num">Exploiter holds</th>
              <th className="num">Sold so far</th>
              <th className="num hide-m">Market cap</th>
              <th className="num">Share of mcap</th>
              <th className="num">Days of volume</th>
              <th className="num">Binance 24h</th>
              <th className="hide-m">Stack status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t, i) => {
              const status = t.gonePct >= 90 ? { cls: "move", label: "Nearly sold out" } : t.gonePct >= 50 ? { cls: "sell", label: "Selling" } : { cls: "sent", label: "Holding" };
              return (
                <tr key={t.sym}>
                  <td className="mono dim hide-s">{i + 1}</td>
                  <td className="sym stick">{t.sym}</td>
                  <td className="num">{usd(t.heldUsd)}</td>
                  <td className="num">{usd(t.soldUsd)}</td>
                  <td className="num hide-m">{t.mcap ? usd(t.mcap) : "—"}</td>
                  <td className="num">{pct(t.pctMcap, 2)}</td>
                  <td className="num">{t.daysVol > 0 ? t.daysVol.toFixed(2) : "—"}</td>
                  <td className="num">
                    {t.onBinance ? (
                      <>
                        ${price(t.price)}{" "}
                        <span className={t.changePct >= 0 ? "up" : "down"} style={{ fontSize: 11 }}>{pctChange(t.changePct)}</span>
                      </>
                    ) : (
                      <span className="dim">no pair</span>
                    )}
                  </td>
                  <td className="hide-m">
                    <span className={`bd ${status.cls}`}>{status.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!all && rows.length > 16 ? (
        <button type="button" className="btn more" onClick={() => setAll(true)}>
          Show all {rows.length}
        </button>
      ) : null}
    </>
  );
}
