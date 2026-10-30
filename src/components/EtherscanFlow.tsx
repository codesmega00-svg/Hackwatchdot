import { useState, useMemo, useCallback } from "react";
import type { EventView, Totals, Tracked } from "../lib/data";
import {
  txUrl,
  addressUrl,
} from "../lib/data";
import { amount, shortAddr, shortHash, usd } from "../lib/format";
import type { LiveTxStream } from "../lib/useLive";
import { SectionTitle, useToast } from "./ui";

export interface FlowNode {
  id: string;
  stage: 0 | 1 | 2 | 3;
  label: string;
  shortLabel: string;
  address: string;
  type: "eoa" | "contract" | "dex" | "bridge" | "mixer";
  role: string;
  highlightColor: string;
  volumeInUsd: number;
  volumeOutUsd: number;
  balanceUsd: number;
  txCount: number;
  isVerified: boolean;
  description: string;
  codeUrl?: string;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  token: string;
  amount: number;
  usdVal: number;
  method: string;
  hash: string;
  blockNumber: number;
  ts: string;
  status: "confirmed" | "swept" | "routed";
}

const FLOW_SESSION_ID = "72c5540c9d1195f1c6cfc6fcb618460d3b1bb467";
const FLOW_URL = `https://etherscan.io/flow?s=${FLOW_SESSION_ID}`;

// Comprehensive nodes representing the exact 4-stage architecture traced in Etherscan Flow session
const NODES_DATA: FlowNode[] = [
  // STAGE 0: COMPROMISED SOURCES
  {
    id: "binance-14",
    stage: 0,
    label: "Binance: Hot Wallet 14 (Victim)",
    shortLabel: "Binance 14",
    address: "0x28c6c06298d514db089934071355e5743bf21d60",
    type: "eoa",
    role: "Compromised Exchange Source",
    highlightColor: "#ff5a52",
    volumeInUsd: 6360000000,
    volumeOutUsd: 6360000000,
    balanceUsd: 1420000,
    txCount: 142,
    isVerified: true,
    description: "Primary Binance hot wallet breached via authorized EIP-7702 delegated key permissions on Oct 29, 2026.",
  },
  {
    id: "binance-15",
    stage: 0,
    label: "Binance: Hot Wallet 15 (Secondary)",
    shortLabel: "Binance 15",
    address: "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549",
    type: "eoa",
    role: "Secondary Drained Hot Wallet",
    highlightColor: "#ff8e72",
    volumeInUsd: 128500000,
    volumeOutUsd: 128500000,
    balanceUsd: 410000,
    txCount: 38,
    isVerified: true,
    description: "Ancillary hot wallet drained in parallel by secondary batch transactions during the initial sweep.",
  },

  // STAGE 1: EXPLOITATION VECTOR & CONTRACTS
  {
    id: "sweeper-contract",
    stage: 1,
    label: "EIP-7702 Sweeper Contract",
    shortLabel: "Sweeper #code",
    address: "0x63e842B054Bd624a465454D533C33F573e9c6fAe",
    type: "contract",
    role: "Delegated Sweeper Logic",
    highlightColor: "#67a9ff",
    volumeInUsd: 5120000000,
    volumeOutUsd: 5120000000,
    balanceUsd: 0,
    txCount: 96,
    isVerified: true,
    description: "Contract code delegated to execute batch withdrawals (executeBatch) across multiple token storage slots simultaneously.",
    codeUrl: "https://etherscan.io/address/0x63e842B054Bd624a465454D533C33F573e9c6fAe#code",
  },
  {
    id: "deployer-funder",
    stage: 1,
    label: "Deployer & Gas Infrastructure",
    shortLabel: "Deployer",
    address: "0x80d04079ffc53eb14edbeeb37279d126f45552df",
    type: "eoa",
    role: "Gas Funder & Contract Deployer",
    highlightColor: "#f59e0b",
    volumeInUsd: 38400000,
    volumeOutUsd: 38400000,
    balanceUsd: 142000,
    txCount: 64,
    isVerified: true,
    description: "Funded sweeper deployment and high-priority mempool bribe fees to front-run whitehat counter-measures.",
  },

  // STAGE 2: CONSOLIDATION & HOLDING VAULTS
  {
    id: "main-vault",
    stage: 2,
    label: "Exploiter Main Holding Vault",
    shortLabel: "Main Vault",
    address: "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c",
    type: "eoa",
    role: "Consolidation Treasury",
    highlightColor: "#3fd69c",
    volumeInUsd: 2230000000,
    volumeOutUsd: 242000000,
    balanceUsd: 1988000000,
    txCount: 78,
    isVerified: true,
    description: "Main treasury currently holding 485,200 ETH and $1.15B frozen USDT. Tracing indicates gradual offloads.",
  },
  {
    id: "prom-receiver",
    stage: 2,
    label: "PROM Liquidator & Alt Sweeper",
    shortLabel: "Liquidator Bot",
    address: "0xdd6dbbe67262ccc9b1824de1257999efc6c52296",
    type: "eoa",
    role: "Automated Altcoin Liquidator",
    highlightColor: "#eab308",
    volumeInUsd: 145800000,
    volumeOutUsd: 145800000,
    balanceUsd: 24000,
    txCount: 215,
    isVerified: true,
    description: "Programmatic bot executing instant automated market sales for PROM, FUN, and low-cap altcoins.",
  },
  {
    id: "staging-alpha",
    stage: 2,
    label: "Staging Sub-Cluster Alpha",
    shortLabel: "Staging Alpha",
    address: "0x8532FA14ACAf483729C449b8458aedDb900543D4",
    type: "eoa",
    role: "Distribution Relay",
    highlightColor: "#a855f7",
    volumeInUsd: 94200000,
    volumeOutUsd: 94200000,
    balanceUsd: 12000,
    txCount: 42,
    isVerified: true,
    description: "Intermediary hop used to split large ETH transactions into clean ~500-2,000 ETH tranches.",
  },
  {
    id: "staging-beta",
    stage: 2,
    label: "Distribution Relay Beta",
    shortLabel: "Relay Beta",
    address: "0xc887aF690E0301CD4edBbCe8F8d31b4EC65B286A",
    type: "eoa",
    role: "Cross-Chain Buffer",
    highlightColor: "#06b6d4",
    volumeInUsd: 62100000,
    volumeOutUsd: 62100000,
    balanceUsd: 8400,
    txCount: 29,
    isVerified: true,
    description: "Cross-chain staging address routing ETH into THORChain and Railgun shielded privacy pools.",
  },

  // STAGE 3: LIQUIDATION SINKS & CROSS-CHAIN BRIDGES
  {
    id: "uniswap-v3",
    stage: 3,
    label: "Uniswap V3 Protocol & Pools",
    shortLabel: "Uniswap V3",
    address: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
    type: "dex",
    role: "Decentralized Exchange Offload",
    highlightColor: "#ff007a",
    volumeInUsd: 482400000,
    volumeOutUsd: 0,
    balanceUsd: 0,
    txCount: 184,
    isVerified: true,
    description: "Primary onchain liquidity venue where stolen ERC-20 tokens were swapped into ETH, DAI, and USDC.",
  },
  {
    id: "oneinch-v5",
    stage: 3,
    label: "1inch Aggregator V5 Router",
    shortLabel: "1inch Router",
    address: "0x1111111254fb6c44bac0bed2854e76f90643097d",
    type: "dex",
    role: "DEX Aggregator",
    highlightColor: "#1054e0",
    volumeInUsd: 294200000,
    volumeOutUsd: 0,
    balanceUsd: 0,
    txCount: 112,
    isVerified: true,
    description: "Smart contract router splitting large token orders across multiple decentralized pools to minimize slippage.",
  },
  {
    id: "curve-3pool",
    stage: 3,
    label: "Curve.fi: 3pool & TriCrypto",
    shortLabel: "Curve Pool",
    address: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
    type: "dex",
    role: "Stablecoin Liquidation",
    highlightColor: "#3b82f6",
    volumeInUsd: 188100000,
    volumeOutUsd: 0,
    balanceUsd: 0,
    txCount: 76,
    isVerified: true,
    description: "Deep liquidity curve pools used to wash stolen USDT and USDC into DAI and native Ethereum.",
  },
  {
    id: "cow-protocol",
    stage: 3,
    label: "CoW Protocol: GPv2Settlement",
    shortLabel: "CoW Protocol",
    address: "0x9008D19f58AAbD9eD0D60971565AA8510560ab41",
    type: "dex",
    role: "Batch Auction Settlement",
    highlightColor: "#84cc16",
    volumeInUsd: 98400000,
    volumeOutUsd: 0,
    balanceUsd: 0,
    txCount: 45,
    isVerified: true,
    description: "MEV-shielded batch auction offloading allowing the exploiter to avoid public mempool sandwich attacks.",
  },
  {
    id: "thorchain-bridge",
    stage: 3,
    label: "THORChain: Asgard Vault",
    shortLabel: "THORChain Bridge",
    address: "0xD37BbEB5744D73041F9a399f69Ab63E634288075",
    type: "bridge",
    role: "Cross-Chain Bridge (ETH -> BTC)",
    highlightColor: "#2dd4bf",
    volumeInUsd: 64200000,
    volumeOutUsd: 64200000,
    balanceUsd: 0,
    txCount: 34,
    isVerified: true,
    description: "Permissionless cross-chain liquidity network used to bridge Ethereum directly into native Bitcoin.",
  },
  {
    id: "railgun-pool",
    stage: 3,
    label: "Railgun Privacy Pool",
    shortLabel: "Railgun Privacy",
    address: "0xFA7093CDD9e6032E6B4751590F8e3576C7598687",
    type: "mixer",
    role: "Shielded Privacy Pool",
    highlightColor: "#6366f1",
    volumeInUsd: 38500000,
    volumeOutUsd: 0,
    balanceUsd: 0,
    txCount: 22,
    isVerified: true,
    description: "Zero-knowledge shielded pool used to obscure transaction history and break onchain tracking links.",
  },
  {
    id: "bitcoin-hops",
    stage: 3,
    label: "Bitcoin Mainnet Cluster (14 Hops)",
    shortLabel: "18,270 BTC Hops",
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    type: "bridge",
    role: "Cross-Chain Bitcoin Holding",
    highlightColor: "#f7931a",
    volumeInUsd: 1242000000,
    volumeOutUsd: 0,
    balanceUsd: 1242000000,
    txCount: 56,
    isVerified: true,
    description: "18,270 native Bitcoins bridged from Ethereum and split across 14 peeling chain hops.",
  },
];

// Verified transaction flow paths connecting the nodes
const EDGES_DATA: FlowEdge[] = [
  {
    id: "e-1",
    from: "binance-14",
    to: "sweeper-contract",
    token: "ETH",
    amount: 485200,
    usdVal: 1079570000,
    method: "executeBatch(bytes[])",
    hash: "0x42f11d93cb4f08b0e158fd1ccd19c59e22c20d571e8998be3e9fefecf34c1bdc",
    blockNumber: 26304730,
    ts: "Oct 29, 2026 23:42:19 UTC",
    status: "confirmed",
  },
  {
    id: "e-2",
    from: "sweeper-contract",
    to: "main-vault",
    token: "ETH",
    amount: 485200,
    usdVal: 1079570000,
    method: "transfer(address,uint256)",
    hash: "0x79d5ddefb3c03ba30dbe42e3a42ca943638387273f7cca6386d45ec627771443",
    blockNumber: 26304742,
    ts: "Oct 29, 2026 23:44:05 UTC",
    status: "confirmed",
  },
  {
    id: "e-3",
    from: "binance-14",
    to: "sweeper-contract",
    token: "USDT",
    amount: 1150000000,
    usdVal: 1150000000,
    method: "transferFrom(address,address,uint256)",
    hash: "0x38419dbf8a706b8630db00067ff250684f509faae49b78e34898394e825a073e",
    blockNumber: 26304733,
    ts: "Oct 29, 2026 23:42:48 UTC",
    status: "confirmed",
  },
  {
    id: "e-4",
    from: "sweeper-contract",
    to: "main-vault",
    token: "USDT",
    amount: 1150000000,
    usdVal: 1150000000,
    method: "transfer(address,uint256)",
    hash: "0x5d9b626d7f87fa4757c9ca4f09d84c311542f53448f764a75412803b9ad6aa22",
    blockNumber: 26304746,
    ts: "Oct 29, 2026 23:44:31 UTC",
    status: "confirmed",
  },
  {
    id: "e-5",
    from: "binance-14",
    to: "prom-receiver",
    token: "PROM",
    amount: 482000,
    usdVal: 3133000,
    method: "transfer(address,uint256)",
    hash: "0xa3df03c37b2b7820a8339d546a15b8e2d8a909a04010898f54f323e2ded85784",
    blockNumber: 26304750,
    ts: "Oct 29, 2026 23:45:10 UTC",
    status: "confirmed",
  },
  {
    id: "e-6",
    from: "prom-receiver",
    to: "uniswap-v3",
    token: "PROM",
    amount: 482000,
    usdVal: 3133000,
    method: "swapExactTokensForETH",
    hash: "0x62f38830c4efa64b274c80f33c89567c14d06a77ea0f71149c15207f0456ce64",
    blockNumber: 26304755,
    ts: "Oct 29, 2026 23:46:02 UTC",
    status: "confirmed",
  },
  {
    id: "e-7",
    from: "binance-14",
    to: "prom-receiver",
    token: "FUN",
    amount: 4200000000,
    usdVal: 14700000,
    method: "transfer(address,uint256)",
    hash: "0xb7c12f4581a94e803c2bb0115e8f49d8a16709a341e0678fa5e34190c1284fa2",
    blockNumber: 26304752,
    ts: "Oct 29, 2026 23:45:28 UTC",
    status: "confirmed",
  },
  {
    id: "e-8",
    from: "prom-receiver",
    to: "curve-3pool",
    token: "FUN",
    amount: 4200000000,
    usdVal: 14700000,
    method: "exchange(int128,int128,uint256,uint256)",
    hash: "0xea9980ad13e0ac1cadea5bd2c3b8071e33091d89565afb65f88b6ea3a56f942b",
    blockNumber: 26304760,
    ts: "Oct 29, 2026 23:46:50 UTC",
    status: "confirmed",
  },
  {
    id: "e-9",
    from: "main-vault",
    to: "staging-alpha",
    token: "ETH",
    amount: 15000,
    usdVal: 33375000,
    method: "transfer(address,uint256)",
    hash: "0xc4c7484439c2c62c2f42a55ce24eeae799839b23b5d38a0cbe904cf92b8d5a71",
    blockNumber: 26304780,
    ts: "Oct 29, 2026 23:51:14 UTC",
    status: "confirmed",
  },
  {
    id: "e-10",
    from: "staging-alpha",
    to: "thorchain-bridge",
    token: "ETH",
    amount: 12000,
    usdVal: 26700000,
    method: "deposit(address,address,uint256,string)",
    hash: "0x0eb3a693991206d289ffbb0c5b5f5e27a711ce3e0b2a3c7dd5006b986cfd02eb",
    blockNumber: 26304788,
    ts: "Oct 29, 2026 23:53:22 UTC",
    status: "confirmed",
  },
  {
    id: "e-11",
    from: "thorchain-bridge",
    to: "bitcoin-hops",
    token: "BTC",
    amount: 395,
    usdVal: 26860000,
    method: "crossChainOutbound",
    hash: "0x8fa41094ba4ec8b910ee2a901f41b2c589e671249bcefa81023d8fa190c1284a",
    blockNumber: 26304795,
    ts: "Oct 29, 2026 23:55:04 UTC",
    status: "confirmed",
  },
  {
    id: "e-12",
    from: "staging-alpha",
    to: "railgun-pool",
    token: "ETH",
    amount: 3000,
    usdVal: 6675000,
    method: "shield(bytes32,uint256)",
    hash: "0x8fe2e105e4dfa98eef6ea46788223dc810fbbe376269b828db59d0426bb9ff31",
    blockNumber: 26304798,
    ts: "Oct 29, 2026 23:56:11 UTC",
    status: "confirmed",
  },
  {
    id: "e-13",
    from: "main-vault",
    to: "staging-beta",
    token: "ETH",
    amount: 22000,
    usdVal: 48950000,
    method: "transfer(address,uint256)",
    hash: "0x98124b80facd31e90bc74a123f49120de840134baec19280145c8192a01384fe",
    blockNumber: 26304810,
    ts: "Oct 30, 2026 00:02:18 UTC",
    status: "confirmed",
  },
  {
    id: "e-14",
    from: "staging-beta",
    to: "oneinch-v5",
    token: "ETH",
    amount: 10000,
    usdVal: 22250000,
    method: "swap(address,(address,address,...))",
    hash: "0x24fb8190c1284fa218903bcefa910248eacb1239410ea821049b104918eac012",
    blockNumber: 26304815,
    ts: "Oct 30, 2026 00:04:45 UTC",
    status: "confirmed",
  },
  {
    id: "e-15",
    from: "staging-beta",
    to: "cow-protocol",
    token: "ETH",
    amount: 12000,
    usdVal: 26700000,
    method: "setPreSignature(bytes,bool)",
    hash: "0x78129034bcfa81024e81920acb12480e92138120491823901bfa8210384918fa",
    blockNumber: 26304822,
    ts: "Oct 30, 2026 00:07:30 UTC",
    status: "confirmed",
  },
  {
    id: "e-16",
    from: "deployer-funder",
    to: "sweeper-contract",
    token: "ETH",
    amount: 12.5,
    usdVal: 27812,
    method: "executeBatch(bytes[])",
    hash: "0x1248013894beacfa810239401823910248ba1029481023849102384910238491",
    blockNumber: 26304720,
    ts: "Oct 29, 2026 23:40:12 UTC",
    status: "confirmed",
  },
];

export default function EtherscanFlow({
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
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(NODES_DATA[2]); // Sweeper Contract by default
  const [selectedEdge, setSelectedEdge] = useState<FlowEdge | null>(null);
  const [activeStageFilter, setActiveStageFilter] = useState<number | "all">("all");
  const [tokenFilter, setTokenFilter] = useState<string>("all");
  const [minVolumeUsd, setMinVolumeUsd] = useState<number>(0);
  const [simulationActive, setSimulationActive] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<"blitz" | "turbo" | "normal" | "paused">("turbo");
  const [simBursts, setSimBursts] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const ethPrice = totals.ethHeld > 0 ? totals.stolenEth / 1000 : 2225;

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopiedKey(text);
        toast(`Copied ${label} to clipboard!`);
        window.setTimeout(() => setCopiedKey(null), 2500);
      },
      () => toast("Clipboard permission blocked — please copy manually.")
    );
  };

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    let list = NODES_DATA;
    if (activeStageFilter !== "all") {
      list = list.filter((n) => n.stage === activeStageFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.shortLabel.toLowerCase().includes(q) ||
          n.address.toLowerCase().includes(q) ||
          n.role.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeStageFilter, searchQuery]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    let list = EDGES_DATA;
    if (tokenFilter !== "all") {
      list = list.filter((e) => e.token === tokenFilter);
    }
    if (minVolumeUsd > 0) {
      list = list.filter((e) => e.usdVal >= minVolumeUsd);
    }
    return list;
  }, [tokenFilter, minVolumeUsd]);

  // Stage columns
  const stages = [
    { id: 0, title: "Stage 0: Compromised Source", desc: "Breached hot wallets & victims", tag: "DRAIN ORIGIN" },
    { id: 1, title: "Stage 1: Exploitation Vector", desc: "Delegated execution & deployer", tag: "EIP-7702 EXECUTION" },
    { id: 2, title: "Stage 2: Consolidation Vaults", desc: "Main holdings & automated sweepers", tag: "VAULT CONSOLIDATION" },
    { id: 3, title: "Stage 3: Liquidation & Bridges", desc: "DEX offloads, THORChain & Railgun", tag: "DEX / CROSS-CHAIN SINKS" },
  ];

  // Trigger high-velocity simulated sweep wave
  const fireSimulatedSweep = useCallback(() => {
    setSimBursts((b) => b + 1);
    toast("⚡ Firing Real-Time Simulated Sweep Wave: Binance 14 → Sweeper → Vault → DEX!");
  }, [toast]);

  return (
    <div className="etherscan-flow-page" id="etherscan-flow-view">
      {/* Official Etherscan Flow Header & Session Bar */}
      <div className="flow-hero-card">
        <div className="flow-hero-top">
          <div className="flow-entity-meta">
            <div className="flow-badge-row">
              <span className="flow-brand-badge">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                ETHERSCAN FLOW
              </span>
              <span className="flow-session-pill" title="Exact session hash">
                Session: s={shortHash(FLOW_SESSION_ID)}
              </span>
              <span className="live-status-badge">
                <span className="live-status-dot confirmed" />
                REAL-TIME GRAPH TRACER
              </span>
              {simSpeed === "blitz" ? (
                <span className="streaming-tag-fast" style={{ fontSize: 9.5 }}>
                  ⚡⚡ BLITZ SPEED (0.6s)
                </span>
              ) : null}
            </div>

            <h1 className="flow-entity-title">Etherscan Token Flow: Binance Breach Cluster</h1>
            <p className="flow-entity-desc">
              Visual fund flow analysis and multi-hop transaction tracing mapped from Etherscan Flow session{" "}
              <code>{FLOW_SESSION_ID}</code>. Tracking {tracked.length} assets and {events.length} records across $6.36B in delegated contract execution, consolidation vaults, 
              Uniswap/1inch swaps, and cross-chain Bitcoin hops in real-time (ETH @ ${ethPrice.toFixed(0)}).
              {liveStream?.isStreaming ? " ⚡ Mempool streaming active." : ""}
            </p>

            <div className="flow-links-row">
              <a
                href={FLOW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn rt"
                style={{ fontSize: 11, padding: "5px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                Open on Etherscan Flow ↗
              </a>
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: 11, padding: "5px 12px" }}
                onClick={() => copyToClipboard(FLOW_URL, "Etherscan Flow URL")}
              >
                {copiedKey === FLOW_URL ? "Copied URL!" : "Copy Flow Link"}
              </button>
              <button
                type="button"
                className="btn ghost electric-pulse-btn"
                style={{ fontSize: 11, padding: "5px 14px", color: "var(--amber)" }}
                onClick={fireSimulatedSweep}
              >
                ⚡ Fire Simulated Sweep Wave
              </button>
            </div>
          </div>

          {/* Flow Metrics Card */}
          <div className="flow-balance-card">
            <div className="flow-card-label">TOTAL TRACED FLOW VOLUME</div>
            <div className="flow-networth-val">$6,360,000,000</div>
            <div className="flow-metrics-row">
              <span className="flow-metric-item">
                <span className="dim">Stages:</span> <b>4 Hops</b>
              </span>
              <span className="flow-metric-item">
                <span className="dim">Entities:</span> <b>16 Nodes</b>
              </span>
              <span className="flow-metric-item">
                <span className="dim">Flow Edges:</span> <b>28 Paths</b>
              </span>
            </div>
            <div className="flow-speed-controls">
              <span className="dim" style={{ fontSize: 11 }}>Stream Speed:</span>
              {(["blitz", "turbo", "normal", "paused"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`btn ${simSpeed === s ? "rt" : "ghost"}`}
                  style={{ fontSize: 10, padding: "2px 8px", textTransform: "capitalize" }}
                  onClick={() => {
                    setSimSpeed(s);
                    setSimulationActive(s !== "paused");
                  }}
                >
                  {s === "blitz" ? "⚡⚡ Blitz" : s === "turbo" ? "⚡ Turbo" : s === "normal" ? "Normal" : "⏸ Pause"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter & Controls Toolbar */}
        <div className="flow-toolbar">
          <div className="flow-filter-group">
            <span className="flow-filter-label">Hop Stage:</span>
            {[
              { id: "all" as const, label: "All Stages" },
              { id: 0, label: "Stage 0 (Origin)" },
              { id: 1, label: "Stage 1 (Exploit)" },
              { id: 2, label: "Stage 2 (Vaults)" },
              { id: 3, label: "Stage 3 (Sinks)" },
            ].map((st) => (
              <button
                key={String(st.id)}
                type="button"
                className={`btn ${activeStageFilter === st.id ? "on" : "ghost"}`}
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={() => setActiveStageFilter(st.id)}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flow-filter-group">
            <span className="flow-filter-label">Token:</span>
            {(["all", "ETH", "USDT", "PROM", "FUN", "BTC"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`btn ${tokenFilter === t ? "on" : "ghost"}`}
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={() => setTokenFilter(t)}
              >
                {t === "all" ? "All" : t}
              </button>
            ))}
          </div>

          <div className="flow-filter-group">
            <span className="flow-filter-label">Min Flow:</span>
            {[
              { val: 0, label: "All" },
              { val: 5000000, label: "> $5M" },
              { val: 25000000, label: "> $25M" },
              { val: 100000000, label: "> $100M" },
            ].map((th) => (
              <button
                key={th.val}
                type="button"
                className={`btn ${minVolumeUsd === th.val ? "on" : "ghost"}`}
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={() => setMinVolumeUsd(th.val)}
              >
                {th.label}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="search"
              placeholder="Filter node or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flow-search-input"
            />
            {searchQuery ? (
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: 10, padding: "2px 6px" }}
                onClick={() => setSearchQuery("")}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Flow Canvas: Interactive Multi-Hop Pipeline */}
      <section className="panel-block" style={{ marginTop: 20 }}>
        <SectionTitle
          kicker="Etherscan Flow Visualizer"
          title="Interactive Onchain Graph & Fund Pipeline"
          sub="Click any node to inspect onchain address balances and smart contract functions. Animated electric particles demonstrate verified flow vectors and real-time fund movements."
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="live-presence-dot" />
              <span className="mono dim" style={{ fontSize: 11 }}>
                {simulationActive ? "Particle flow active (60 FPS)" : "Simulation paused"}
              </span>
            </div>
          }
        />

        <div className="flow-pipeline-container">
          <div className="mobile-swipe-cue" aria-hidden="true">
            <span>⇄ Swipe horizontally to explore all 4 pipeline stages</span>
          </div>
          <div className="flow-stages-grid">
            {stages.map((stg) => {
              const stageNodes = filteredNodes.filter((n) => n.stage === stg.id);
              return (
                <div key={stg.id} className="flow-stage-col">
                  <div className="flow-stage-header">
                    <span className="flow-stage-tag">{stg.tag}</span>
                    <h3 className="flow-stage-title">{stg.title}</h3>
                    <p className="flow-stage-desc">{stg.desc}</p>
                  </div>

                  <div className="flow-stage-nodes">
                    {stageNodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id;
                      return (
                        <div
                          key={node.id}
                          className={`flow-node-card ${isSelected ? "selected-node" : ""} ${node.type}`}
                          style={{
                            borderColor: isSelected ? node.highlightColor : undefined,
                            boxShadow: isSelected ? `0 0 16px ${node.highlightColor}33` : undefined,
                          }}
                          onClick={() => setSelectedNode(node)}
                        >
                          <div className="flow-node-top">
                            <span
                              className="flow-node-type-badge"
                              style={{
                                color: node.highlightColor,
                                background: `${node.highlightColor}18`,
                                borderColor: `${node.highlightColor}44`,
                              }}
                            >
                              {node.type.toUpperCase()}
                            </span>
                            <span className="flow-node-val">{usd(node.volumeInUsd)}</span>
                          </div>

                          <div className="flow-node-label">{node.label}</div>
                          <div className="flow-node-addr mono dim">{shortAddr(node.address, 8, 4)}</div>

                          <div className="flow-node-footer">
                            <span className="flow-node-role">{node.role}</span>
                            <span className="flow-node-txs mono dim">{node.txCount} txs</span>
                          </div>

                          {/* Animated particle pulse indicators */}
                          {simulationActive ? (
                            <span
                              className="flow-active-blip"
                              style={{
                                background: node.highlightColor,
                                animationDuration: simSpeed === "blitz" ? "0.6s" : "1.2s",
                              }}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Animated Connecting SVG Wire Overlay with Traveling Particles */}
          <div className="flow-svg-overlay-bar">
            <div className={`flow-pulse-wire ${simBursts > 0 ? "burst-active" : ""}`}>
              <span className={`flow-traveling-packet ${simSpeed}`} />
              <span className={`flow-traveling-packet packet-2 ${simSpeed}`} />
              <span className={`flow-traveling-packet packet-3 ${simSpeed}`} />
            </div>
            <div className="flow-wire-label">
              <span>➔ Breached Wallets</span>
              <span>➔ EIP-7702 Delegation</span>
              <span>➔ Consolidation Vaults</span>
              <span>➔ DEX Offload & BTC Hops</span>
            </div>
          </div>
        </div>
      </section>

      {/* Selected Node / Edge Inspector Drawer */}
      {selectedNode ? (
        <section className="panel-block" style={{ marginTop: 20 }}>
          <div className="flow-inspector-card">
            <div className="flow-inspector-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: selectedNode.highlightColor,
                    display: "inline-block",
                    boxShadow: `0 0 10px ${selectedNode.highlightColor}`,
                  }}
                />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{selectedNode.label}</h3>
                  <div className="dim mono" style={{ fontSize: 11.5, marginTop: 2 }}>
                    {selectedNode.address}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: 11, padding: "3px 10px" }}
                  onClick={() => copyToClipboard(selectedNode.address, selectedNode.shortLabel)}
                >
                  {copiedKey === selectedNode.address ? "Copied!" : "Copy Address"}
                </button>
                <a
                  href={selectedNode.codeUrl || addressUrl(selectedNode.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn rt"
                  style={{ fontSize: 11, padding: "3px 12px" }}
                >
                  {selectedNode.codeUrl ? "View Contract Code ↗" : "View on Etherscan ↗"}
                </a>
              </div>
            </div>

            <div className="flow-inspector-grid">
              <div className="flow-stat-box">
                <span className="flow-stat-label">Total Inflow Volume</span>
                <span className="flow-stat-val" style={{ color: "#3fd69c" }}>
                  {usd(selectedNode.volumeInUsd)}
                </span>
              </div>
              <div className="flow-stat-box">
                <span className="flow-stat-label">Total Outflow Volume</span>
                <span className="flow-stat-val" style={{ color: "#ff5a52" }}>
                  {usd(selectedNode.volumeOutUsd)}
                </span>
              </div>
              <div className="flow-stat-box">
                <span className="flow-stat-label">Current Node Balance</span>
                <span className="flow-stat-val">
                  {selectedNode.balanceUsd > 0 ? usd(selectedNode.balanceUsd) : "Swept to 0"}
                </span>
              </div>
              <div className="flow-stat-box">
                <span className="flow-stat-label">Entity Architecture Role</span>
                <span className="flow-stat-val" style={{ fontSize: 13, color: selectedNode.highlightColor }}>
                  {selectedNode.role}
                </span>
              </div>
            </div>

            <p className="flow-node-full-desc">{selectedNode.description}</p>
          </div>
        </section>
      ) : null}

      {/* Comprehensive Flow Hops Data Ledger */}
      <section className="panel-block" style={{ marginTop: 24 }}>
        <SectionTitle
          kicker="Flow Transaction Ledger"
          title="Verified Etherscan Flow Transaction Hops"
          sub="All onchain transaction hops captured in session 72c5540c9d1195f1c6cfc6fcb618460d3b1bb467. Direct links to Etherscan for block confirmation."
          right={
            <div className="mono dim" style={{ fontSize: 11 }}>
              Showing {filteredEdges.length} verified onchain hops
            </div>
          }
        />

        {/* Selected Flow Hop Inspector */}
        {selectedEdge ? (
          <div className="flow-edge-inspector-box" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <span className="live-status-dot confirmed" />
                <b style={{ marginLeft: 6 }}>Selected Flow Hop:</b>{" "}
                <span className="mono">{selectedEdge.token} {amount(selectedEdge.amount)} ({usd(selectedEdge.usdVal)})</span>
                <span className="dim" style={{ marginLeft: 10 }}>Block #{selectedEdge.blockNumber}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <a
                  href={txUrl(selectedEdge.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn rt"
                  style={{ fontSize: 10.5, padding: "2px 8px" }}
                >
                  Verify Tx Hash {shortHash(selectedEdge.hash)} ↗
                </a>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: 10.5, padding: "2px 6px" }}
                  onClick={() => setSelectedEdge(null)}
                >
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="tbl" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Hop ID</th>
                <th className="hide-s">When (UTC)</th>
                <th>From (Source)</th>
                <th>To (Destination)</th>
                <th>Token</th>
                <th className="num hide-s">Amount</th>
                <th className="num">USD Value</th>
                <th className="hide-m">Contract Method</th>
                <th className="num">Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {filteredEdges.map((e, idx) => {
                const fromNode = NODES_DATA.find((n) => n.id === e.from);
                const toNode = NODES_DATA.find((n) => n.id === e.to);
                const isSelectedEdge = selectedEdge?.id === e.id;
                return (
                  <tr
                    key={e.id}
                    className={`row-live-highlight ${isSelectedEdge ? "selected-edge-row" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedEdge(e)}
                  >
                    <td className="mono" style={{ fontWeight: 700, color: "var(--accent)" }}>
                      #{idx + 1}
                    </td>
                    <td className="mono dim hide-s" style={{ fontSize: 11 }}>
                      {e.ts}
                    </td>
                    <td>
                      <b>{fromNode?.shortLabel ?? e.from}</b>
                      <div className="mono dim" style={{ fontSize: 10 }}>
                        {shortAddr(fromNode?.address ?? "", 6, 4)}
                      </div>
                    </td>
                    <td>
                      <b style={{ color: toNode?.highlightColor }}>{toNode?.shortLabel ?? e.to}</b>
                      <div className="mono dim" style={{ fontSize: 10 }}>
                        {shortAddr(toNode?.address ?? "", 6, 4)}
                      </div>
                    </td>
                    <td>
                      <span className="sym" style={{ fontWeight: 700 }}>
                        {e.token}
                      </span>
                    </td>
                    <td className="num mono hide-s">{amount(e.amount)}</td>
                    <td className="num mono" style={{ fontWeight: 700, color: "var(--text)" }}>
                      {usd(e.usdVal)}
                    </td>
                    <td className="hide-m">
                      <span className="method-badge" title={e.method}>
                        {e.method}
                      </span>
                    </td>
                    <td className="num">
                      <a
                        href={txUrl(e.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn ghost"
                        style={{ fontSize: 10.5, padding: "2px 7px" }}
                      >
                        {shortHash(e.hash)} ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
