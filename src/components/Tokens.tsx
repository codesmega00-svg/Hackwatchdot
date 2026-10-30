import { useMemo, useRef, useState } from "react";
import type { Tracked } from "../lib/data";
import { addressUrl, btcAddressUrl, seed } from "../lib/data";
import { amount, compact, pct, pctChange, price, shortAddr, usd } from "../lib/format";
import { Bar, Kpi, SectionTitle } from "./ui";

type SortKey = "held" | "stolen" | "gone" | "mcap";

export default function Tokens({ tracked }: { tracked: Tracked[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("held");
  const [all, setAll] = useState(false);
  const [showStable, setShowStable] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const cards = useMemo(() => {
    const rows = tracked.filter((t) => t.heldUsd > 0 && (showStable || !t.token?.stable));
    return rows.sort((a, b) => b.pctMcap - a.pctMcap).slice(0, 12);
  }, [tracked, showStable]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = tracked.filter((t) => !term || t.sym.toLowerCase().includes(term));
    const sorted = filtered.slice().sort((a, b) => {
      if (sort === "stolen") return b.stolenUsd - a.stolenUsd;
      if (sort === "gone") return b.gonePct - a.gonePct;
      if (sort === "mcap") return b.mcap - a.mcap;
      return b.heldUsd - a.heldUsd;
    });
    return all ? sorted : sorted.slice(0, 18);
  }, [tracked, q, sort, all]);

  const btc = seed.btc;
  const btcPrice = tracked.find((t) => t.sym === "WBTC")?.price ?? btc.price;
  const btcHeld = Object.values(btc.holders).reduce((s, v) => s + v, 0);
  const btcHeldUsd = btcHeld * btcPrice;
  const btcLast = btc.edges.reduce((m, e) => Math.max(m, e.ts), 0);
  const holders = Object.entries(btc.holders).sort((a, b) => b[1] - a[1]);

  function focusToken(sym: string) {
    setQ(sym);
    setAll(true);
    window.setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  return (
    <>
      <SectionTitle
        kicker="Exposure"
        title="Tokens to watch"
        sub="Stolen tokens still in play, ranked by how big the exploiter's holding is compared to the coin's market cap. Sold-out tokens and stablecoins are hidden. The bar shows how much of the stack has already left the exploiter's wallets."
        right={
          <label className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
            <input type="checkbox" checked={showStable} onChange={(e) => setShowStable(e.target.checked)} style={{ accentColor: "var(--red)" }} />
            Include stablecoins
          </label>
        }
      />
      <div className="cards">
        {cards.map((t) => (
          <button key={t.sym} type="button" className="card" onClick={() => focusToken(t.sym)} title={`Show ${t.sym} in the full token ledger`}>
            <div className="ch">
              <div>
                <div className="cs">{t.sym}</div>
                <div className="cn">{t.token?.stable ? "Stablecoin" : t.onBinance ? "Binance listed" : "Onchain only"}</div>
              </div>
              <div>
                <div className="cp">${price(t.price)}</div>
                <div className={`cg ${t.onBinance ? (t.changePct >= 0 ? "up" : "down") : "dim"}`}>
                  {t.onBinance ? pctChange(t.changePct) : "no pair"}
                </div>
              </div>
            </div>
            <div className="cm">
              <div>
                <span>Still held</span>
                <b>{usd(t.heldUsd)}</b>
              </div>
              <div>
                <span>Share of mcap</span>
                <b>{pct(t.pctMcap, 2)}</b>
              </div>
            </div>
            <Bar value={t.gonePct} />
            <div className="cf">
              <span>{pct(t.gonePct, 1)} gone</span>
              <span>{amount(t.held)} {t.sym}</span>
            </div>
          </button>
        ))}
      </div>

      <section className="panel-block" id="btc">
        <SectionTitle
          kicker="Bitcoin"
          title="Stolen Bitcoin"
          sub={
            <>
              About 18,270 BTC left a Binance hot wallet at 1:20 pm Pacific and landed at{" "}
              <a href={btcAddressUrl(btc.root)} target="_blank" rel="noopener noreferrer">{shortAddr(btc.root, 8, 5)}</a>, which split
              it up within minutes. Unlike USDT, Bitcoin can&apos;t be frozen. This follows every spend forward.
            </>
          }
        />
        <div className="kpis" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))", marginTop: 0, marginBottom: 12 }}>
          <Kpi label="Still in exploiter addresses" value={usd(btcHeldUsd)} sub={`${compact(btcHeld)} of ${compact(btc.stolen)} BTC`} />
          <Kpi label="Left the trail" value={usd((btc.stolen - btcHeld) * btcPrice)} sub={`${compact(btc.stolen - btcHeld)} BTC spent forward`} />
          <Kpi label="Addresses holding it" value={holders.length} sub={`${Object.keys(btc.nodes).length} hops mapped`} />
          <Kpi
            label="Last movement"
            value={btcLast ? new Date(btcLast * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
            sub={btcLast ? new Date(btcLast * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + " Pacific" : ""}
          />
        </div>
        <div className="tbl" style={{ maxHeight: 360 }}>
          <table>
            <thead>
              <tr>
                <th>Address</th>
                <th className="num">BTC</th>
                <th className="num">USD</th>
                <th className="num hide-m">Hops from hack</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {holders.map(([addr, bal]) => {
                const hops = btc.nodes[addr]?.d ?? 0;
                return (
                  <tr key={addr}>
                    <td className="mono">
                      <a href={btcAddressUrl(addr)} target="_blank" rel="noopener noreferrer">{shortAddr(addr, 10, 6)}</a>
                    </td>
                    <td className="num">{amount(bal)}</td>
                    <td className="num">{usd(bal * btcPrice)}</td>
                    <td className="num hide-m">{hops}</td>
                    <td>
                      <span className={`bd ${bal > 0 ? "sent" : "move"}`}>{bal > 0 ? "Holding" : "Spent forward"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-block" id="ledger" ref={tableRef}>
        <SectionTitle
          kicker="Ledger"
          title={<>Every stolen token <span className="mute">{tracked.length} assets</span></>}
          sub="Ranked by dollars still held. Frozen USDT counts as held. USD values use the latest Binance price where the token trades there."
        />
        <div className="toolbar">
          <input
            className="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setAll(false);
            }}
            placeholder="Search token, e.g. PEPE"
            aria-label="Search the token ledger"
            style={{ flex: "1 1 220px", maxWidth: 320 }}
          />
          <label className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 7 }}>
            Sort
            <select className="sel" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort tokens">
              <option value="held">Still held</option>
              <option value="stolen">Stolen value</option>
              <option value="gone">% gone</option>
              <option value="mcap">Market cap</option>
            </select>
          </label>
          <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
            {rows.length} shown
          </span>
        </div>
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Token</th>
                <th className="num">Still held</th>
                <th className="num hide-m">Stolen</th>
                <th className="num">Gone</th>
                <th className="hide-m" style={{ width: "22%" }}></th>
                <th className="num hide-m">Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    <b>No token matches “{q}”</b>
                    Try the ticker exactly as it appears onchain.
                  </td>
                </tr>
              ) : (
                rows.map((t, i) => (
                  <tr key={t.sym}>
                    <td className="mono dim">{i + 1}</td>
                    <td className="sym">
                      {t.token?.addr ? (
                        <a href={`https://etherscan.io/token/${t.token.addr}`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
                          {t.sym}
                        </a>
                      ) : (
                        t.sym
                      )}
                      {t.token?.stable ? <span className="mute" style={{ marginLeft: 6 }}>stable</span> : null}
                    </td>
                    <td className="num">{usd(t.heldUsd)}</td>
                    <td className="num hide-m">{usd(t.stolenUsd)}</td>
                    <td className="num">{pct(t.gonePct, 1)}</td>
                    <td className="hide-m"><Bar value={t.gonePct} /></td>
                    <td className="num hide-m">${price(t.price)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!all && tracked.length > 18 ? (
          <button type="button" className="btn more" onClick={() => setAll(true)}>
            Show all {tracked.length} tokens
          </button>
        ) : null}
      </section>

      <section className="panel-block">
        <SectionTitle
          kicker="Wallets"
          title="Exploiter wallets"
          sub="Every wallet traced from the main exploiter address, ranked by ETH. Tokens worth $10K or more are listed; tokens that were not part of the theft are marked “(new)”."
        />
        <div className="tbl" style={{ maxHeight: 460 }}>
          <table>
            <thead>
              <tr>
                <th>Wallet</th>
                <th className="num">ETH</th>
                <th>Tokens</th>
              </tr>
            </thead>
            <tbody>
              {seed.wallets.map((w) => (
                <tr key={w.a}>
                  <td>
                    <a href={addressUrl(w.a)} target="_blank" rel="noopener noreferrer">{shortAddr(w.a, 8, 6)}</a>{" "}
                    <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 10.5 }}>{w.label}</span>
                  </td>
                  <td className="num">{amount(w.eth)}</td>
                  <td style={{ whiteSpace: "normal" }}>
                    {w.toks.length === 0 ? (
                      <span className="dim">no tokens</span>
                    ) : (
                      <span style={{ display: "inline-flex", gap: 5, flexWrap: "wrap" }}>
                        {w.toks.slice(0, 4).map((tk) => (
                          <span key={tk} className="chip" style={{ cursor: "default" }}>{tk}</span>
                        ))}
                        {w.toks.length > 4 ? <span className="mute" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>+{w.toks.length - 4}</span> : null}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
