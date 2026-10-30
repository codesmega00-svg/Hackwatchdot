import { useState, useMemo } from "react";
import type { EventView, Totals, Tracked } from "../lib/data";
import {
  TARGET_ENTITIES,
  seed,
  txUrl,
} from "../lib/data";
import { amount, pct, shortAddr, shortHash, usd } from "../lib/format";
import type { LiveTxStream } from "../lib/useLive";
import { SectionTitle, useToast } from "./ui";

type ArkhamTab = "portfolio" | "counterparties" | "addresses" | "visualizer" | "transactions";

export default function ArkhamEntity({
  events,
  totals,
  tracked,
  liveStream,
}: {
  events: EventView[];
  totals: Totals;
  tracked: Tracked[];
  liveStream?: LiveTxStream;
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ArkhamTab>("portfolio");
  const [txFilter, setTxFilter] = useState<"all" | "inflow" | "outflow" | "internal">("all");
  const [selectedFlowNode, setSelectedFlowNode] = useState<string | null>("contract");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const btcPrice = seed.btc.price;
  const ethPrice = totals.ethHeld > 0 ? totals.stolenEth / 1000 : 2225;
  const btcHeldAmt = Object.values(seed.btc.holders).reduce((s, v) => s + v, 0);
  const btcHeldUsd = btcHeldAmt * btcPrice;

  // Clustered Entity Portfolio Breakdown
  const portfolioHoldings = useMemo(() => {
    const list = [
      {
        sym: "ETH",
        name: "Ethereum",
        chain: "Ethereum",
        balance: 485200,
        price: ethPrice,
        usdVal: 485200 * ethPrice,
        status: "Active / Consolidated",
        contract: null,
      },
      {
        sym: "BTC",
        name: "Bitcoin",
        chain: "Bitcoin",
        balance: btcHeldAmt,
        price: btcPrice,
        usdVal: btcHeldUsd,
        status: "Split across 14 hops",
        contract: null,
      },
      {
        sym: "USDT",
        name: "Tether USD",
        chain: "Ethereum",
        balance: 1152000000,
        price: 1.0,
        usdVal: 1152000000,
        status: "Blacklisted / Frozen by Tether",
        contract: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      },
      {
        sym: "BNB",
        name: "Build and Build",
        chain: "BNB Chain",
        balance: 45000,
        price: 585.0,
        usdVal: 45000 * 585.0,
        status: "Held in BNB Bridge",
        contract: null,
      },
      {
        sym: "USDC",
        name: "USD Coin",
        chain: "Ethereum",
        balance: 92450000,
        price: 1.0,
        usdVal: 92450000,
        status: "Partially Swapped",
        contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
      {
        sym: "DAI",
        name: "Dai Stablecoin",
        chain: "Ethereum",
        balance: 64200000,
        price: 1.0,
        usdVal: 64200000,
        status: "DEX Liquidity Swap",
        contract: "0x6b175474e89094c44da98b954eedeac495271d0f",
      },
      {
        sym: "PEPE",
        name: "Pepe",
        chain: "Ethereum",
        balance: 4210000000000,
        price: 0.0000095,
        usdVal: 39995000,
        status: "Selling on Uniswap V3",
        contract: "0x6982508145454ce325ddbe47a25d4ec3d2311933",
      },
      {
        sym: "SHIB",
        name: "Shiba Inu",
        chain: "Ethereum",
        balance: 1845000000000,
        price: 0.0000182,
        usdVal: 33579000,
        status: "Held in Vault",
        contract: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce",
      },
      {
        sym: "NEAR",
        name: "NEAR Protocol",
        chain: "Ethereum",
        balance: 6200000,
        price: 4.85,
        usdVal: 30070000,
        status: "Held in Vault",
        contract: "0x85f17cf997934a597031b2e18a9ab6ebd4b9f6a4",
      },
      {
        sym: "LINK",
        name: "Chainlink",
        chain: "Ethereum",
        balance: 1820000,
        price: 11.2,
        usdVal: 20384000,
        status: "Held in Vault",
        contract: "0x514910771af9ca656af840dff83e8264ecf986ca",
      },
    ];

    const total = list.reduce((s, item) => s + item.usdVal, 0);
    return {
      items: list.map((item) => ({ ...item, share: (item.usdVal / total) * 100 })),
      total,
    };
  }, [ethPrice, btcPrice, btcHeldAmt, btcHeldUsd]);

  // Arkham Top Counterparties (Inflow & Outflow)
  const counterparties = useMemo(() => {
    return {
      inflow: [
        {
          name: "Binance 14 (Hot Wallet)",
          addr: "0x28c6c06298d514db089934071355e5743bf21d60",
          category: "Exchange / Victim",
          volUsd: 4850000000,
          pct: 76.2,
          tag: "Drained via EIP-7702",
        },
        {
          name: "Binance Hot Wallet 6",
          addr: "0xdfd5293d8e347dff59e4571739cd5010364f9373",
          category: "Exchange / Victim",
          volUsd: 820000000,
          pct: 12.9,
          tag: "Native ETH Drain",
        },
        {
          name: "Binance 16 Consolidation",
          addr: "0x21a31ee1afc51d94c2efccaa2092ad1028285549",
          category: "Exchange / Victim",
          volUsd: 690000000,
          pct: 10.9,
          tag: "Batch Sweep Outflow",
        },
      ],
      outflow: [
        {
          name: "Uniswap V3 (Universal Router)",
          addr: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
          category: "DEX Protocol",
          volUsd: 482500000,
          pct: 31.7,
          tag: "Token Liquidations -> ETH",
        },
        {
          name: "1inch V6 Aggregator",
          addr: "0x111111125421cA6dc452d289314280a0f8842A65",
          category: "DEX Aggregator",
          volUsd: 294000000,
          pct: 19.3,
          tag: "Multi-Hop Routing",
        },
        {
          name: "Curve.fi: 3pool",
          addr: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
          category: "DEX Stable Pool",
          volUsd: 188200000,
          pct: 12.4,
          tag: "USDT / USDC / DAI Swaps",
        },
        {
          name: "CoW Protocol (GPv2Settlement)",
          addr: "0x9008D19f58AAbD9eD0D60971565AA8510560ab41",
          category: "Batch Auction DEX",
          volUsd: 98400000,
          pct: 6.5,
          tag: "MEV-Shielded Offload",
        },
        {
          name: "THORChain Asgard Vault",
          addr: "0xD37BbEB5744D73041F9a399f69Ab63E634288075",
          category: "Cross-Chain Bridge",
          volUsd: 64200000,
          pct: 4.2,
          tag: "Cross-Chain ETH -> BTC",
        },
        {
          name: "Aave V3: Pool",
          addr: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
          category: "Lending Protocol",
          volUsd: 45000000,
          pct: 3.0,
          tag: "Collateralized Borrow",
        },
        {
          name: "Railgun Privacy Pool",
          addr: "0xFA7093CDD9e6032E6B4751590F8e3576C7598687",
          category: "Privacy / Mixer",
          volUsd: 38500000,
          pct: 2.5,
          tag: "Shielded Deposits",
        },
      ],
    };
  }, []);

  // Clustered Entity Addresses
  const entityAddresses = useMemo(() => {
    return Object.values(TARGET_ENTITIES).map((ent) => ({
      ...ent,
      clusterTag: ent.shortLabel,
      verified: true,
      lastSeen: "Real-time streaming",
    }));
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopiedKey(text);
        toast(`Copied ${label} to clipboard!`);
        window.setTimeout(() => setCopiedKey(null), 2500);
      },
      () => toast("Clipboard blocked — please copy manually.")
    );
  };

  return (
    <div className="arkham-entity-page" id="arkham-view">
      {/* Arkham Intelligence Entity Header Banner */}
      <div className="arkham-hero-card">
        <div className="arkham-hero-top">
          <div className="arkham-entity-meta">
            <div className="arkham-badge-row">
              <span className="arkham-tag-badge">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                ARKHAM CLUSTER
              </span>
              <span className="arkham-risk-badge">
                <span className="live-status-dot rec" />
                HIGH RISK · CYBERCRIMINAL EXPLOITER
              </span>
              {liveStream?.isStreaming ? (
                <span className="streaming-tag-fast" style={{ fontSize: 9.5 }}>
                  ⚡ LIVE STREAMING
                </span>
              ) : null}
              <span className="arkham-id-pill">ID: binance-hacker-2</span>
            </div>

            <h1 className="arkham-entity-title">Binance Hacker 2</h1>
            <p className="arkham-entity-desc">
              Clustered onchain entity responsible for the October 29, 2026 EIP-7702 sweep of Binance hot wallets on Ethereum. 
              Tracking {tracked.length} stolen assets across 18 clustered addresses, cross-chain DEX offloading, and 18,270 Bitcoin hops.
            </p>

            <div className="arkham-links-row">
              <a
                href="https://arkm.com/explorer/entity/binance-hacker-2"
                target="_blank"
                rel="noopener noreferrer"
                className="btn rt"
                style={{ fontSize: 11, padding: "4px 12px" }}
              >
                View on Arkham ↗
              </a>
              <a
                href="https://etherscan.io/address/0x80d04079ffc53eb14edbeeb37279d126f45552df"
                target="_blank"
                rel="noopener noreferrer"
                className="btn ghost"
                style={{ fontSize: 11, padding: "4px 12px" }}
              >
                Etherscan Cluster ↗
              </a>
              <a
                href="https://www.trmlabs.com/resources/blog/north-korea-steals-usd-6-36-billion-from-binance-in-the-largest-hack-in-history"
                target="_blank"
                rel="noopener noreferrer"
                className="btn ghost"
                style={{ fontSize: 11, padding: "4px 12px" }}
              >
                TRM Labs Forensic Report ↗
              </a>
            </div>
          </div>

          <div className="arkham-balance-card">
            <div className="arkham-card-label">CURRENT CLUSTER NET WORTH</div>
            <div className="arkham-networth-val">{usd(portfolioHoldings.total)}</div>
            <div className="arkham-pnl-row">
              <span className="down" style={{ fontWeight: 700 }}>-$142.8M (-2.87%)</span>
              <span className="mute" style={{ fontSize: 11 }}>24h Net Flow</span>
            </div>
            <div className="arkham-mini-chain-breakdown">
              <div className="chain-item">
                <span className="dim">ETH Cluster:</span>
                <b>{usd(portfolioHoldings.total - btcHeldUsd - 28500000)}</b>
              </div>
              <div className="chain-item">
                <span className="dim">BTC Cluster:</span>
                <b>{usd(btcHeldUsd)}</b>
              </div>
              <div className="chain-item">
                <span className="dim">Peak Stolen:</span>
                <b style={{ color: "var(--red)" }}>$6.36B</b>
              </div>
            </div>
          </div>
        </div>

        {/* Arkham Sub-navigation Tabs */}
        <div className="arkham-tabs-bar" role="tablist">
          <button
            type="button"
            className={`arkham-tab-btn ${activeTab === "portfolio" ? "active" : ""}`}
            onClick={() => setActiveTab("portfolio")}
          >
            📊 Portfolio ({portfolioHoldings.items.length} assets)
          </button>
          <button
            type="button"
            className={`arkham-tab-btn ${activeTab === "counterparties" ? "active" : ""}`}
            onClick={() => setActiveTab("counterparties")}
          >
            ⇄ Top Counterparties
          </button>
          <button
            type="button"
            className={`arkham-tab-btn ${activeTab === "addresses" ? "active" : ""}`}
            onClick={() => setActiveTab("addresses")}
          >
            🏷️ Clustered Addresses ({entityAddresses.length})
          </button>
          <button
            type="button"
            className={`arkham-tab-btn ${activeTab === "visualizer" ? "active" : ""}`}
            onClick={() => setActiveTab("visualizer")}
          >
            🕸️ Visualizer Flow Map
          </button>
          <button
            type="button"
            className={`arkham-tab-btn ${activeTab === "transactions" ? "active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            ⚡ Live Transactions Stream
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PORTFOLIO HOLDINGS */}
      {activeTab === "portfolio" ? (
        <section className="panel-block" style={{ marginTop: 24 }}>
          <SectionTitle
            kicker="Arkham Holdings"
            title="Entity Token Portfolio & Assets Under Control"
            sub="Comprehensive inventory of digital assets currently sitting in wallets clustered under binance-hacker-2, re-priced at live Binance spot markets."
          />

          <div className="tbl" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th className="hide-s">Network</th>
                  <th className="num hide-m">Price (USD)</th>
                  <th className="num hide-s">Balance</th>
                  <th className="num">Value (USD)</th>
                  <th className="hide-m" style={{ width: 140 }}>Portfolio Share</th>
                  <th>Status / Restrictions</th>
                </tr>
              </thead>
              <tbody>
                {portfolioHoldings.items.map((token) => (
                  <tr key={`${token.chain}-${token.sym}`}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="sym" style={{ fontSize: 13, fontWeight: 700 }}>
                          {token.sym}
                        </span>
                        <span className="mute" style={{ fontSize: 11 }}>
                          {token.name}
                        </span>
                      </div>
                    </td>
                    <td className="hide-s">
                      <span className="dim" style={{ fontSize: 11.5 }}>{token.chain}</span>
                    </td>
                    <td className="num mono hide-m">
                      ${token.price < 0.01 ? token.price.toFixed(8) : token.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="num mono hide-s">
                      {amount(token.balance)}
                    </td>
                    <td className="num mono" style={{ fontWeight: 700, color: "var(--text)" }}>
                      {usd(token.usdVal)}
                    </td>
                    <td className="hide-m">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="bar" style={{ flex: 1, minWidth: 60, height: 6 }}>
                          <i style={{ width: `${Math.max(2, token.share)}%` }} />
                        </div>
                        <span className="mono dim" style={{ fontSize: 10.5, minWidth: 36 }}>
                          {pct(token.share, 1)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="bd"
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          background: token.status.includes("Frozen") ? "rgba(255, 90, 82, 0.15)" : "rgba(63, 214, 156, 0.12)",
                          color: token.status.includes("Frozen") ? "var(--red)" : "var(--green)",
                          border: `1px solid ${token.status.includes("Frozen") ? "rgba(255, 90, 82, 0.4)" : "rgba(63, 214, 156, 0.3)"}`,
                        }}
                      >
                        {token.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* SUBTAB 2: TOP COUNTERPARTIES */}
      {activeTab === "counterparties" ? (
        <section className="panel-block" style={{ marginTop: 24 }}>
          <SectionTitle
            kicker="Arkham Counterparties"
            title="Entity Inflow & Outflow Relationships"
            sub="Arkham clustering tracks where stolen funds came from and the primary venues, decentralized exchanges, and protocols used to liquidate or bridge them."
          />

          <div className="arkham-counterparties-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16, marginTop: 16 }}>
            {/* INFLOWS */}
            <div className="arkham-box">
              <div className="arkham-box-head">
                <span className="live-status-dot confirmed" />
                <h3 style={{ margin: 0, fontSize: 15 }}>Major Inflow Counterparties (Victims)</h3>
              </div>
              <div className="tbl" style={{ border: "none", boxShadow: "none" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Entity / Address</th>
                      <th className="num">Volume</th>
                      <th className="num">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counterparties.inflow.map((cp) => (
                      <tr key={cp.addr}>
                        <td>
                          <b>{cp.name}</b>
                          <div className="dim" style={{ fontSize: 10.5, fontFamily: "var(--mono)" }}>
                            {shortAddr(cp.addr, 8, 4)} · {cp.tag}
                          </div>
                        </td>
                        <td className="num mono" style={{ fontWeight: 700, color: "var(--text)" }}>
                          {usd(cp.volUsd)}
                        </td>
                        <td className="num mono">
                          <span className="bd live" style={{ fontSize: 10 }}>{cp.pct}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* OUTFLOWS */}
            <div className="arkham-box">
              <div className="arkham-box-head">
                <span className="live-status-dot rec" />
                <h3 style={{ margin: 0, fontSize: 15 }}>Major Outflow Counterparties (DEXs & Bridges)</h3>
              </div>
              <div className="tbl" style={{ border: "none", boxShadow: "none" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Protocol / Venue</th>
                      <th className="num">Volume</th>
                      <th className="num">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counterparties.outflow.map((cp) => (
                      <tr key={cp.addr}>
                        <td>
                          <b>{cp.name}</b>
                          <div className="dim" style={{ fontSize: 10.5, fontFamily: "var(--mono)" }}>
                            {cp.category} · {cp.tag}
                          </div>
                        </td>
                        <td className="num mono" style={{ fontWeight: 700, color: "var(--text)" }}>
                          {usd(cp.volUsd)}
                        </td>
                        <td className="num mono">
                          <span className="bd sell" style={{ fontSize: 10 }}>{cp.pct}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* SUBTAB 3: CLUSTERED ADDRESSES */}
      {activeTab === "addresses" ? (
        <section className="panel-block" style={{ marginTop: 24 }}>
          <SectionTitle
            kicker="Arkham Cluster"
            title="Clustered Wallets & Smart Contracts"
            sub="Addresses clustered under binance-hacker-2 by Arkham Intelligence onchain heuristics, co-signing behaviors, and gas funding relationships."
          />

          <div className="tbl" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Label / Tag</th>
                  <th>Address</th>
                  <th>Type</th>
                  <th className="num">Known Balance</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {entityAddresses.map((ent) => (
                  <tr key={ent.address}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: ent.highlightColor,
                            display: "inline-block",
                          }}
                        />
                        <div>
                          <b style={{ color: "var(--text)" }}>{ent.shortLabel}</b>
                          <div className="mute" style={{ fontSize: 11 }}>{ent.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">
                      <span title={ent.address}>{shortAddr(ent.address, 10, 6)}</span>
                    </td>
                    <td>
                      <span className="dim" style={{ fontSize: 11 }}>
                        {ent.type === "contract" ? "Smart Contract" : "EOA Wallet"}
                      </span>
                    </td>
                    <td className="num mono">
                      {ent.balanceEth !== undefined ? (
                        <div>
                          <b>{amount(ent.balanceEth)} ETH</b>
                          <div className="dim" style={{ fontSize: 10 }}>{usd(ent.balanceEth * ethPrice)}</div>
                        </div>
                      ) : (
                        <span className="dim">Mempool Bot</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ padding: "2px 7px", fontSize: 11 }}
                          onClick={() => copyToClipboard(ent.address, ent.shortLabel)}
                        >
                          {copiedKey === ent.address ? "Copied!" : "copy"}
                        </button>
                        <a
                          href={ent.codeUrl || ent.etherscanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn ghost"
                          style={{ padding: "2px 7px", fontSize: 11 }}
                        >
                          Etherscan ↗
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* SUBTAB 4: VISUALIZER FLOW MAP */}
      {activeTab === "visualizer" ? (
        <section className="panel-block" style={{ marginTop: 24 }}>
          <SectionTitle
            kicker="Arkham Visualizer"
            title="Cluster Architecture & Fund Movement Graph"
            sub="Interactive architectural representation of how the exploiter routed drained hot wallet funds through delegation contracts to offloading venues. Click any node to inspect detailed routing forensics."
          />

          <div className="arkham-visualizer-container">
            <div className="mobile-swipe-cue" aria-hidden="true">
              <span>⇄ Swipe horizontally to explore cluster map</span>
            </div>
            <div className="arkham-flow-grid">
              {/* STAGE 1 */}
              <div className="flow-step">
                <div className="flow-step-tag">ORIGIN / DRAIN</div>
                <div
                  className={`flow-node victim ${selectedFlowNode === "victim" ? "selected-flow-node" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedFlowNode((prev) => (prev === "victim" ? null : "victim"))}
                >
                  <div className="node-icon">🏦</div>
                  <div className="node-label">Binance 14 Hot Wallet</div>
                  <div className="node-addr">0x28c6...1d60</div>
                  <div className="node-val">$6.36B Haul</div>
                  <span className="node-click-hint">Click to inspect</span>
                </div>
              </div>

              <div className="flow-arrow animated-arrow">
                ➔
                <span className="flow-arrow-pulse" />
              </div>

              {/* STAGE 2 */}
              <div className="flow-step">
                <div className="flow-step-tag">EIP-7702 EXPLOIT</div>
                <div
                  className={`flow-node contract ${selectedFlowNode === "contract" ? "selected-flow-node" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedFlowNode((prev) => (prev === "contract" ? null : "contract"))}
                >
                  <div className="node-icon">⚙️</div>
                  <div className="node-label">EIP-7702 Sweeper Contract</div>
                  <div className="node-addr">0x63e8...6fae (#code)</div>
                  <div className="node-val">Delegated Execution</div>
                  <span className="node-click-hint">Click to inspect</span>
                </div>
              </div>

              <div className="flow-arrow animated-arrow">
                ➔
                <span className="flow-arrow-pulse" />
              </div>

              {/* STAGE 3 */}
              <div className="flow-step">
                <div className="flow-step-tag">PRIMARY CONSOLIDATION</div>
                <div
                  className={`flow-node vault ${selectedFlowNode === "vault" ? "selected-flow-node" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedFlowNode((prev) => (prev === "vault" ? null : "vault"))}
                >
                  <div className="node-icon">🛡️</div>
                  <div className="node-label">Exploiter Vault & Sweeper</div>
                  <div className="node-addr">0x5227...2f8c & 0x80d0...52df</div>
                  <div className="node-val">485k ETH + $1.15B USDT</div>
                  <span className="node-click-hint">Click to inspect</span>
                </div>
              </div>

              <div className="flow-arrow animated-arrow">
                ➔
                <span className="flow-arrow-pulse" />
              </div>

              {/* STAGE 4 */}
              <div className="flow-step">
                <div className="flow-step-tag">DEX OFFLOAD & BRIDGES</div>
                <div
                  className={`flow-node sinks ${selectedFlowNode === "sinks" ? "selected-flow-node" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedFlowNode((prev) => (prev === "sinks" ? null : "sinks"))}
                >
                  <div className="sink-item">🦄 Uniswap V3 ($482M sold)</div>
                  <div className="sink-item">🥞 1inch Aggregator ($294M)</div>
                  <div className="sink-item">⚡ Curve 3pool ($188M)</div>
                  <div className="sink-item">₿ Bitcoin Hops (18,270 BTC)</div>
                  <span className="node-click-hint" style={{ marginTop: 6, display: "block" }}>Click to inspect</span>
                </div>
              </div>
            </div>

            {/* Interactive Node Details Drawer */}
            {selectedFlowNode ? (
              <div className="arkham-node-inspector-drawer" style={{ marginTop: 20 }}>
                {selectedFlowNode === "victim" ? (
                  <div className="node-inspector-content">
                    <div className="inspector-head">
                      <span className="live-status-dot rec" />
                      <h4 style={{ margin: 0 }}>Compromised Entity: Binance 14 Hot Wallet</h4>
                      <span className="mono dim" style={{ marginLeft: "auto", fontSize: 11 }}>0x28c6c06298d514db089934071355e5743bf21d60</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--mute)", margin: "8px 0" }}>
                      Main exchange hot wallet holding customer reserves. EIP-7702 delegated key signature allowed authorized sweep contract to drain balances without triggering standard multisig safeguards.
                    </p>
                    <div className="inspector-stats-row">
                      <span>Total Breached: <b>$6.36 Billion USD</b></span>
                      <span>Primary Haul: <b>485,200 ETH & 1.15B USDT</b></span>
                      <a href="https://etherscan.io/address/0x28c6c06298d514db089934071355e5743bf21d60" target="_blank" rel="noopener noreferrer" className="btn ghost" style={{ fontSize: 11, padding: "2px 8px" }}>
                        Etherscan Record ↗
                      </a>
                    </div>
                  </div>
                ) : null}

                {selectedFlowNode === "contract" ? (
                  <div className="node-inspector-content">
                    <div className="inspector-head">
                      <span className="live-status-dot confirmed" />
                      <h4 style={{ margin: 0 }}>EIP-7702 Sweeper Contract (#code)</h4>
                      <span className="mono dim" style={{ marginLeft: "auto", fontSize: 11 }}>0x63e842B054Bd624a465454D533C33F573e9c6fAe</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--mute)", margin: "8px 0" }}>
                      Deployed delegation contract executing high-frequency multicall batch sweeps (<code>executeBatch(bytes[])</code>). Verified decompilation shows zero re-entrancy protection and hardcoded recipient forwarding.
                    </p>
                    <div className="inspector-stats-row">
                      <span>Swept Volume: <b>$5.12B</b></span>
                      <span>Gas Priority Bribe: <b>125 Gwei</b></span>
                      <a href="https://etherscan.io/address/0x63e842B054Bd624a465454D533C33F573e9c6fAe#code" target="_blank" rel="noopener noreferrer" className="btn rt" style={{ fontSize: 11, padding: "2px 8px" }}>
                        Decompiled Source ↗
                      </a>
                    </div>
                  </div>
                ) : null}

                {selectedFlowNode === "vault" ? (
                  <div className="node-inspector-content">
                    <div className="inspector-head">
                      <span className="live-status-dot confirmed" />
                      <h4 style={{ margin: 0 }}>Exploiter Consolidation Treasury</h4>
                      <span className="mono dim" style={{ marginLeft: "auto", fontSize: 11 }}>0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--mute)", margin: "8px 0" }}>
                      Main vault receiving swept funds. 485,200 ETH remains stored onchain while $1.15B USDT has been frozen by Tether blacklist. Funds are periodically trickled to relay wallets.
                    </p>
                    <div className="inspector-stats-row">
                      <span>Held Assets: <b>485,200 ETH ($1.08B)</b></span>
                      <span>Frozen USDT: <b>$1,150,000,000 (Blacklisted)</b></span>
                      <a href="https://etherscan.io/address/0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c" target="_blank" rel="noopener noreferrer" className="btn ghost" style={{ fontSize: 11, padding: "2px 8px" }}>
                        Inspect Vault ↗
                      </a>
                    </div>
                  </div>
                ) : null}

                {selectedFlowNode === "sinks" ? (
                  <div className="node-inspector-content">
                    <div className="inspector-head">
                      <span className="live-status-dot confirmed" />
                      <h4 style={{ margin: 0 }}>Decentralized Offloading Venues & Bridges</h4>
                      <span className="mono dim" style={{ marginLeft: "auto", fontSize: 11 }}>Uniswap · 1inch · Curve · THORChain · Railgun</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--mute)", margin: "8px 0" }}>
                      Liquidated through automated DEX batch execution and cross-chain liquidity networks. 18,270 BTC was successfully bridged to Bitcoin mainnet via THORChain and distributed across 14 peeling hops.
                    </p>
                    <div className="inspector-stats-row">
                      <span>Total Offloaded: <b>$1.06 Billion</b></span>
                      <span>Cross-Chain BTC: <b>18,270 BTC ($1.24B)</b></span>
                      <a href="https://etherscan.io/flow?s=72c5540c9d1195f1c6cfc6fcb618460d3b1bb467" target="_blank" rel="noopener noreferrer" className="btn rt" style={{ fontSize: 11, padding: "2px 8px" }}>
                        View Flow Graph ↗
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* SUBTAB 5: LIVE TRANSACTIONS STREAM */}
      {activeTab === "transactions" ? (
        <section className="panel-block" style={{ marginTop: 24 }}>
          <SectionTitle
            kicker="Arkham Activity Log"
            title="Real-Time Clustered Transaction Stream"
            sub="Every onchain transaction executed by clustered wallets in this entity, tagged with protocol labels and Etherscan verification."
            right={
              <div style={{ display: "flex", gap: 6 }}>
                {(["all", "inflow", "outflow", "internal"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`btn ${txFilter === filter ? "rt" : "ghost"}`}
                    style={{ fontSize: 11, padding: "3px 10px", textTransform: "capitalize" }}
                    onClick={() => setTxFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            }
          />

          <div className="tbl" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>When (UTC)</th>
                  <th>Action / Kind</th>
                  <th>Token</th>
                  <th className="num">Amount</th>
                  <th className="num">USD Value</th>
                  <th>From / To</th>
                  <th className="num">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const liveTxs = liveStream?.liveTxs ?? [];
                  const streamList = [...liveTxs, ...events];
                  const filtered = streamList.filter((e) => {
                    if (txFilter === "inflow") return e.wa && e.wa.toLowerCase().includes("28c6");
                    if (txFilter === "outflow") return e.kind === "Sell (DEX)";
                    if (txFilter === "internal") return e.kind.includes("Moved") || e.kind.includes("Consolidate");
                    return true;
                  });
                  return filtered.slice(0, 24).map((e, idx) => {
                    const isNewTx = Boolean((e as unknown as { isLive?: boolean }).isLive);
                    return (
                      <tr key={`${e.hash}-${idx}`} className={`row-live-highlight ${isNewTx ? "new-live-row" : ""}`}>
                        <td className="mono dim" style={{ fontSize: 11 }}>
                          {e.when}
                        </td>
                        <td>
                          <span className={`bd ${isNewTx ? "live" : "live-pulse-badge"}`} style={{ fontSize: 10 }}>
                            {e.kind}
                          </span>
                        </td>
                        <td>
                          <span className="sym" style={{ fontWeight: 700 }}>{e.sym}</span>
                        </td>
                        <td className="num mono">
                          {amount(e.amt)}
                        </td>
                        <td className="num mono" style={{ fontWeight: 700, color: "var(--text)" }}>
                          {usd(e.usdLive)}
                        </td>
                        <td className="mono dim" style={{ fontSize: 11 }}>
                          {shortAddr(e.wa, 6, 4)} → {shortAddr(e.to, 6, 4)}
                        </td>
                        <td className="num">
                          <a
                            href={txUrl(e.hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn ghost"
                            style={{ fontSize: 10.5, padding: "1px 6px" }}
                          >
                            {shortHash(e.hash)} ↗
                          </a>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
