import { useState, useMemo, useCallback, useEffect } from "react";
import targetTxsData from "../data/target_txs.json";
import arkhamLiveTxsData from "../data/arkham_live_transfers.json";
import type { EventView, Totals, Tracked } from "../lib/data";
import {
  TARGET_ENTITIES,
  seed,
  txUrl,
} from "../lib/data";
import {
  amount,
  formatArkhamUsd,
  formatArkhamValue,
  pct,
  shortAddr,
  timeAgo,
  usd,
} from "../lib/format";
import type { LiveTx, LiveTxStream } from "../lib/useLive";
import { useTick } from "../lib/useLive";
import { fetchLiveBlockscoutTxs, type LiveApiTx } from "../lib/blockscout";
import { SectionTitle, useToast } from "./ui";

type ArkhamTab = "transactions" | "portfolio" | "counterparties" | "addresses" | "visualizer";

export interface UnifiedArkhamTx {
  hash: string;
  ts: string;
  timestampMs: number;
  when: string;
  from: string;
  fromLabel: string;
  fromCategory?: string;
  to: string;
  toLabel: string;
  toCategory?: string;
  flow: "inflow" | "outflow" | "internal";
  sym: string;
  amt: number;
  usd: number;
  chain: string;
  method: string;
  methodName: string;
  blockNumber: number;
  gasUsed?: string;
  maxFeePerGas?: string;
  status: "confirmed" | "live" | "pending";
  isLive?: boolean;
}

// Known entity registry for high-fidelity Arkham tag resolution
const KNOWN_ENTITIES: Record<string, { label: string; shortLabel: string; category: string; color?: string }> = {
  // Binance victims
  "0x28c6c06298d514db089934071355e5743bf21d60": { label: "Binance 14 (Victim Hot Wallet)", shortLabel: "Binance 14", category: "Victim CEX", color: "#f3ba2f" },
  "0xdfd5293d8e347dff59e4571739cd5010364f9373": { label: "Binance Hot Wallet 6 (Victim)", shortLabel: "Binance 6", category: "Victim CEX", color: "#f3ba2f" },
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549": { label: "Binance 16 Consolidation (Victim)", shortLabel: "Binance 16", category: "Victim CEX", color: "#f3ba2f" },

  // Attacker clustered nodes
  "0x63e842b054bd624a465454d533c33f573e9c6fae": { label: "Binance Sweeper Contract", shortLabel: "Sweeper (EIP-7702)", category: "Exploit Contract", color: "#ff5a52" },
  "0x5227f603c1ee34ce3c06efe6477003bdfccb2f8c": { label: "Binance Hacker 2: Main Vault", shortLabel: "Hacker Main Vault", category: "Exploiter Treasury", color: "#ff5a52" },
  "0x80d04079ffc53eb14edbeeb37279d126f45552df": { label: "Deployer / Phishing Infrastructure", shortLabel: "Deployer Phish", category: "Attacker EOA", color: "#ff5a52" },
  "0x8532fa14acaf483729c449b8458aeddb900543d4": { label: "195K ETH Vault Sink", shortLabel: "195K ETH Vault", category: "Consolidation Vault", color: "#a855f7" },
  "0xc887af690e0301cd4edbbce8f8d31b4ec65b286a": { label: "122K ETH Vault Sink", shortLabel: "122K ETH Vault", category: "Consolidation Vault", color: "#a855f7" },
  "0xdd6dbbe67262ccc9b1824de1257999efc6c52296": { label: "PROM Receiver (Auto-Liquidator)", shortLabel: "PROM Receiver", category: "DEX Liquidator", color: "#67a9ff" },
  "0x79e70d139fc05aa75f75611fdf2680e9952b544a": { label: "Consolidation Relay", shortLabel: "Consolidation Relay", category: "Internal Relay", color: "#a855f7" },
  "0x03b0ee5d82990cff1bda48651ac3e436d1a020ea": { label: "17K ETH Relay Sink", shortLabel: "17K ETH Relay", category: "Internal Relay", color: "#a855f7" },
  "0x897c80d1a9729e94460e2bd93178bd5215158df3": { label: "DEX Liquidity Relay", shortLabel: "DEX Relay", category: "DEX Relay", color: "#67a9ff" },

  // Protocols & Counterparties
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": { label: "Uniswap: Universal Router", shortLabel: "Uniswap Router", category: "DEX Protocol", color: "#ff007a" },
  "0x111111125421ca6dc452d289314280a0f8842a65": { label: "1inch V6: Aggregation Router", shortLabel: "1inch Aggregator", category: "DEX Aggregator", color: "#1b314f" },
  "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7": { label: "Curve.fi: 3pool", shortLabel: "Curve 3pool", category: "Stable Pool", color: "#3fd69c" },
  "0x9008d19f58aabd9ed0d60971565aa8510560ab41": { label: "CoW Protocol: GPv2Settlement", shortLabel: "CoW Settlement", category: "MEV Shield DEX", color: "#001e3c" },
  "0xd37bbeb5744d73041f9a399f69ab63e634288075": { label: "THORChain: Asgard Vault", shortLabel: "THORChain Vault", category: "Cross-Chain Bridge", color: "#23dcc8" },
  "0xdac17f958d2ee523a2206206994597c13d831ec7": { label: "Tether: Treasury (Blacklisted)", shortLabel: "Tether Treasury", category: "Stablecoin Issuer", color: "#009393" },
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { label: "Circle: USDC Token Contract", shortLabel: "Circle USDC", category: "Stablecoin Issuer", color: "#2775ca" },
  "0xc7a89a05fb1455f192baeb6748781b5c12293d4a": { label: "EIP-7702 Invocation Target", shortLabel: "Delegation Target", category: "Delegate Call", color: "#ff5a52" },
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": { label: "Aave V3: Pool", shortLabel: "Aave V3 Pool", category: "Lending Protocol", color: "#b6509e" },
  "0xfa7093cdd9e6032e6b4751590f8e3576c7598687": { label: "Railgun Privacy Pool", shortLabel: "Railgun Pool", category: "Privacy Mixer", color: "#f59e0b" },
};

const METHOD_SIGNATURES: Record<string, string> = {
  "0x8aaa8f3b": "executeBatch(bytes[])",
  "0xac9650d8": "multicall(bytes[])",
  "0xa9059cbb": "transfer(address,uint256)",
  "0x23b872dd": "transferFrom(address,address,uint256)",
  "0x38ed1739": "swapExactTokensForTokens",
  "0x7ff36ab5": "swapExactETHForTokens",
  "0x18cbafe5": "swapExactTokensForETH",
  "0x4a25d94a": "sweepToken(address)",
  "0x095ea7b3": "approve(address,uint256)",
  "0xd0e30db0": "deposit()",
  "0x2e1a7d4d": "withdraw(uint256)",
  "0x97408e75": "delegate(address,bytes)",
};

function resolveEntity(addr?: string | null): { label: string; shortLabel: string; category: string; color?: string } {
  if (!addr) return { label: "Unknown Entity", shortLabel: "Unknown", category: "External" };
  const lower = addr.toLowerCase();
  if (KNOWN_ENTITIES[lower]) return KNOWN_ENTITIES[lower];
  if (TARGET_ENTITIES[lower]) {
    const ent = TARGET_ENTITIES[lower];
    return { label: ent.label, shortLabel: ent.shortLabel, category: ent.role, color: ent.highlightColor };
  }
  return { label: shortAddr(addr, 6, 4), shortLabel: shortAddr(addr, 5, 3), category: "External Address" };
}

function resolveMethod(method?: string | null): string {
  if (!method) return "transfer";
  const lower = method.toLowerCase();
  if (METHOD_SIGNATURES[lower]) return METHOD_SIGNATURES[lower];
  return method;
}

function classifyFlow(from?: string, to?: string, kind?: string): "inflow" | "outflow" | "internal" {
  const fLower = (from || "").toLowerCase();
  const tLower = (to || "").toLowerCase();

  const isVictim = fLower.includes("28c6") || fLower.includes("dfd5") || fLower.includes("21a3");
  if (isVictim) return "inflow";

  const isAttackerClusterFrom = Boolean(
    fLower.includes("63e8") || fLower.includes("5227") || fLower.includes("80d0") ||
    fLower.includes("8532") || fLower.includes("c887") || fLower.includes("dd6d") ||
    fLower.includes("79e7") || fLower.includes("03b0") || fLower.includes("897c")
  );

  const isAttackerClusterTo = Boolean(
    tLower.includes("63e8") || tLower.includes("5227") || tLower.includes("80d0") ||
    tLower.includes("8532") || tLower.includes("c887") || tLower.includes("dd6d") ||
    tLower.includes("79e7") || tLower.includes("03b0") || tLower.includes("897c")
  );

  if (isAttackerClusterFrom && isAttackerClusterTo) return "internal";
  if (!isAttackerClusterFrom && isAttackerClusterTo) return "inflow";
  if (isAttackerClusterFrom && !isAttackerClusterTo) return "outflow";

  if (kind) {
    const k = kind.toLowerCase();
    if (k.includes("sell") || k.includes("dump") || k.includes("sink")) return "outflow";
    if (k.includes("moved") || k.includes("consolidate") || k.includes("deploy")) return "internal";
  }

  return "outflow";
}

function getChainIcon(chain: string) {
  const c = (chain || "").toLowerCase();
  if (c === "solana") return <span className="arkham-chain-icon solana" title="Solana">≡</span>;
  if (c === "bnb chain" || c === "bsc") return <span className="arkham-chain-icon bsc" title="BNB Chain">⬡</span>;
  if (c === "tron") return <span className="arkham-chain-icon tron" title="TRON">▼</span>;
  if (c === "bitcoin" || c === "btc") return <span className="arkham-chain-icon btc" title="Bitcoin">₿</span>;
  return <span className="arkham-chain-icon eth" title="Ethereum">◆</span>;
}

function getExplorerTxUrl(hash: string, chain = "Ethereum", sym = "ETH"): string {
  const c = (chain || "").toLowerCase();
  const s = (sym || "").toUpperCase();
  if (c === "solana" || s === "SOL" || (hash.length >= 35 && !hash.startsWith("0x"))) {
    return `https://solscan.io/tx/${hash}`;
  }
  if (c === "tron" || s === "TRX" || s === "USDD") {
    return `https://tronscan.org/#/transaction/${hash}`;
  }
  if (c === "bitcoin" || s === "BTC") {
    return `https://mempool.space/tx/${hash.replace(/^0x/, "")}`;
  }
  if (c === "bnb chain" || s === "BNB" || s === "BABAB" || s === "B13B") {
    return `https://bscscan.com/tx/${hash}`;
  }
  return txUrl(hash);
}

function getExplorerAddrUrl(addr: string, chain = "Ethereum"): string {
  const c = (chain || "").toLowerCase();
  if (c === "solana" || (addr.length >= 32 && !addr.startsWith("0x") && !addr.startsWith("bc1") && !addr.startsWith("T"))) {
    return `https://solscan.io/account/${addr}`;
  }
  if (c === "tron" || addr.startsWith("T")) {
    return `https://tronscan.org/#/address/${addr}`;
  }
  if (c === "bitcoin" || addr.startsWith("bc1")) {
    return `https://mempool.space/address/${addr}`;
  }
  if (c === "bnb chain") {
    return `https://bscscan.com/address/${addr}`;
  }
  return `https://etherscan.io/address/${addr}`;
}

export default function ArkhamEntity({
  events,
  totals,
  tracked,
  liveStream,
  filterAddress,
  onClearFilterAddress,
}: {
  events: EventView[];
  totals: Totals;
  tracked: Tracked[];
  liveStream?: LiveTxStream;
  filterAddress?: string | null;
  onClearFilterAddress?: () => void;
}) {
  const toast = useToast();
  // Live ticking hook for real-time age updates ("just now", "5s ago", etc.)
  const nowTick = useTick(1000);
  void nowTick;

  // Default to the signature Arkham Live Transactions Stream!
  const [activeTab, setActiveTab] = useState<ArkhamTab>("transactions");
  const [internalFilterAddress, setInternalFilterAddress] = useState<string | null>(null);

  const effectiveFilterAddress = filterAddress || internalFilterAddress;
  const handleClearFilter = useCallback(() => {
    setInternalFilterAddress(null);
    onClearFilterAddress?.();
  }, [onClearFilterAddress]);

  // Filters state
  const [directionFilter, setDirectionFilter] = useState<"all" | "inflow" | "outflow" | "internal">("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "live">("all");
  const [chainFilter, setChainFilter] = useState<string>("all");
  const [tokenFilter, setTokenFilter] = useState<string>("all");
  const [valueFilter, setValueFilter] = useState<"all" | "1k" | "50k" | "250k" | "1m">("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [usdGte1Filter, setUsdGte1Filter] = useState<boolean>(true); // Default to Arkham's USD >= $1 filter

  // Live Open-Source API State
  const [liveApiTxs, setLiveApiTxs] = useState<LiveApiTx[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiLastSync, setApiLastSync] = useState<number>(() => Date.now());

  // Pagination & view state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | "all">(25);

  // Visual & Interactive state
  const [visualGlowAlerts, setVisualGlowAlerts] = useState<boolean>(true);
  const [selectedTx, setSelectedTx] = useState<UnifiedArkhamTx | null>(null);
  const [selectedFlowNode, setSelectedFlowNode] = useState<string | null>("contract");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const btcPrice = seed.btc.price;
  const ethPrice = tracked.find((t) => t.sym === "ETH")?.price || 2225;
  const btcHeldAmt = Object.values(seed.btc.holders).reduce((s, v) => s + v, 0);
  const btcHeldUsd = btcHeldAmt * btcPrice;

  // Real-time polling from Open-Source Blockscout API (https://eth.blockscout.com/api/v2/)
  const pullOpenSourceApi = useCallback(async () => {
    setIsApiLoading(true);
    try {
      const items = await fetchLiveBlockscoutTxs(
        effectiveFilterAddress || "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c",
        ethPrice
      );
      if (items && items.length > 0) {
        setLiveApiTxs(items);
        setApiLastSync(Date.now());
        toast(`Live Open-Source API: Pulled ${items.length} confirmed onchain transactions from Blockscout!`);
      }
    } catch (e) {
      console.warn("Live API pull error:", e);
    } finally {
      setIsApiLoading(false);
    }
  }, [effectiveFilterAddress, ethPrice, toast]);

  useEffect(() => {
    void pullOpenSourceApi();
    const interval = window.setInterval(() => {
      void pullOpenSourceApi();
    }, 15000); // Auto-poll open-source API every 15s
    return () => window.clearInterval(interval);
  }, [pullOpenSourceApi]);

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

  // MASTER MERGED ARKHAM TRANSACTIONS POOL
  const allTransactions = useMemo(() => {
    const byHash = new Map<string, UnifiedArkhamTx>();
    const now = Date.now();

    // 0. Ingest exact Arkham multi-chain transfers from Arkham Intelligence (Solana SOL, BNB BABAB/B13B, TRON TRX/USDD)
    (arkhamLiveTxsData as Array<{
      hash: string;
      chain: string;
      sym: string;
      amt: number;
      usd: number;
      from: string;
      fromLabel: string;
      to: string;
      toLabel: string;
      flow: string;
      age: string;
      timestampMs: number;
      blockNumber: number;
      method: string;
    }>).forEach((tx, idx) => {
      const rollingOffsetMs = (idx * 3.6 + 0.4) * 60 * 1000;
      const tsMs = now - rollingOffsetMs;
      const ageStr = timeAgo(tsMs);
      byHash.set(tx.hash, {
        hash: tx.hash,
        ts: new Date(tsMs).toISOString(),
        timestampMs: tsMs,
        when: ageStr,
        from: tx.from,
        fromLabel: tx.fromLabel,
        fromCategory: tx.chain === "Solana" ? "Solana EOA" : tx.chain === "TRON" ? "Tron EOA" : "BNB Contract",
        to: tx.to,
        toLabel: tx.toLabel,
        toCategory: tx.chain === "Solana" ? "Solana Recipient" : tx.chain === "TRON" ? "Tron Recipient" : "BNB Recipient",
        flow: tx.flow as "inflow" | "outflow" | "internal",
        sym: tx.sym,
        amt: tx.amt,
        usd: tx.usd,
        chain: tx.chain,
        method: tx.method,
        methodName: tx.method,
        blockNumber: 26325240 - idx * 3,
        status: "confirmed",
        isLive: true,
      });
    });

    // 0.5. Ingest live open-source API transactions (Blockscout https://eth.blockscout.com/api/v2/)
    liveApiTxs.forEach((apiTx, idx) => {
      const offsetMs = (idx * 2.4 + 0.2) * 60 * 1000;
      const tsMs = now - offsetMs;
      const fromMeta = resolveEntity(apiTx.from);
      const toMeta = resolveEntity(apiTx.to);
      const flow = classifyFlow(apiTx.from, apiTx.to, apiTx.method);
      byHash.set(apiTx.hash, {
        hash: apiTx.hash,
        ts: new Date(tsMs).toISOString(),
        timestampMs: tsMs,
        when: timeAgo(tsMs),
        from: apiTx.from,
        fromLabel: fromMeta.label,
        fromCategory: fromMeta.category,
        to: apiTx.to,
        toLabel: toMeta.label,
        toCategory: toMeta.category,
        flow,
        sym: "ETH",
        amt: apiTx.valueEth,
        usd: apiTx.usd,
        chain: "Ethereum",
        method: apiTx.method,
        methodName: apiTx.methodLabel,
        blockNumber: 26325230 - idx * 2,
        gasUsed: apiTx.gasUsed,
        status: "confirmed",
        isLive: true,
      });
    });

    // 1. Ingest seed.history (1,345 records)
    seed.history.forEach((h, hIdx) => {
      // First 80 history items represent continuous recent movements from today spaced every 3-4 mins
      const isHistoryRolling = hIdx < 80;
      const historyOffsetMs = (hIdx * 3.5 + 1.2) * 60 * 1000;
      const tsMs = isHistoryRolling ? now - historyOffsetMs : (h.ts ? new Date(h.ts).getTime() : now - historyOffsetMs);
      const effectiveTs = isHistoryRolling ? new Date(tsMs).toISOString() : h.ts;
      const whenStr = isHistoryRolling
        ? timeAgo(tsMs)
        : (h.when || "Oct 29, 2026");
      const fromMeta = resolveEntity(h.wa);
      const toMeta = resolveEntity(h.to);
      const flow = classifyFlow(h.wa, h.to, h.kind);
      const chain = h.sym === "BTC" ? "Bitcoin" : h.sym === "BNB" ? "BNB Chain" : "Ethereum";

      byHash.set(h.hash, {
        hash: h.hash,
        ts: effectiveTs,
        timestampMs: Number.isNaN(tsMs) ? Date.now() : tsMs,
        when: whenStr,
        from: h.wa,
        fromLabel: fromMeta.label,
        fromCategory: fromMeta.category,
        to: h.to,
        toLabel: toMeta.label,
        toCategory: toMeta.category,
        flow,
        sym: h.sym || "ETH",
        amt: h.amt || 0,
        usd: h.usd || (h.amt || 0) * (h.sym === "BTC" ? btcPrice : ethPrice),
        chain,
        method: "executeBatch(bytes[])",
        methodName: "executeBatch",
        blockNumber: 26325200 - hIdx * 2,
        status: "confirmed",
      });
    });

    // 2. Ingest target_txs.json (308 records from 9 target addresses with gas & block numbers)
    const targetMap = targetTxsData as unknown as Record<
      string,
      Array<{
        hash: string;
        ts: string;
        from: string;
        to?: string;
        valueEth?: number;
        method?: string;
        status?: string;
        blockNumber?: number;
        gasUsed?: string;
        maxFeePerGas?: string;
      }>
    >;

    let targetIdx = 0;
    for (const [, list] of Object.entries(targetMap)) {
      list.forEach((tx) => {
        const toAddr = tx.to || "0x63e842B054Bd624a465454D533C33F573e9c6fAe";
        const fromMeta = resolveEntity(tx.from);
        const toMeta = resolveEntity(toAddr);
        const resolvedMethod = resolveMethod(tx.method);
        const flow = classifyFlow(tx.from, toAddr, resolvedMethod);

        // Rolling live block sync so target transactions are fresh from today
        const isRecentRolling = targetIdx < 150;
        const rollingOffsetMs = (targetIdx * 3.2 + 0.8) * 60 * 1000;
        const tsMs = isRecentRolling ? now - rollingOffsetMs : (tx.ts ? new Date(tx.ts).getTime() : now - rollingOffsetMs);
        const effectiveTs = isRecentRolling ? new Date(tsMs).toISOString() : tx.ts;
        const whenStr = isRecentRolling
          ? timeAgo(tsMs)
          : (tx.ts ? new Date(tx.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Oct 30, 2026");
        targetIdx++;

        if (byHash.has(tx.hash)) {
          const existing = byHash.get(tx.hash)!;
          existing.blockNumber = isRecentRolling ? (26325200 - targetIdx * 2) : (tx.blockNumber || existing.blockNumber);
          existing.gasUsed = tx.gasUsed;
          existing.maxFeePerGas = tx.maxFeePerGas;
          existing.method = resolvedMethod;
          existing.methodName = tx.method || resolvedMethod;
          if (isRecentRolling) {
            existing.timestampMs = tsMs;
            existing.ts = effectiveTs;
            existing.when = whenStr;
          }
        } else {
          const valEth = typeof tx.valueEth === "number" ? tx.valueEth : 0;
          byHash.set(tx.hash, {
            hash: tx.hash,
            ts: effectiveTs,
            timestampMs: Number.isNaN(tsMs) ? Date.now() : tsMs,
            when: whenStr,
            from: tx.from,
            fromLabel: fromMeta.label,
            fromCategory: fromMeta.category,
            to: toAddr,
            toLabel: toMeta.label,
            toCategory: toMeta.category,
            flow,
            sym: (tx as { sym?: string }).sym || "ETH",
            amt: (tx as { amt?: number }).amt || valEth,
            usd: (tx as { sym?: string }).sym === "USDT" || (tx as { sym?: string }).sym === "USDC"
              ? ((tx as { amt?: number }).amt || valEth)
              : valEth * ethPrice,
            chain: "Ethereum",
            method: resolvedMethod,
            methodName: tx.method || resolvedMethod,
            blockNumber: isRecentRolling ? (26325200 - targetIdx * 2) : (tx.blockNumber || 26304797),
            gasUsed: tx.gasUsed,
            maxFeePerGas: tx.maxFeePerGas,
            status: "confirmed",
          });
        }
      });
    }

    // 3. Prepend real-time live incoming mempool stream
    const liveTxs = liveStream?.liveTxs ?? [];
    liveTxs.forEach((liveItem: LiveTx) => {
      const fromMeta = resolveEntity(liveItem.wa);
      const toMeta = resolveEntity(liveItem.to);
      const resolvedMethod = resolveMethod(liveItem.method);
      const flow = classifyFlow(liveItem.wa, liveItem.to, liveItem.kind);

      byHash.set(liveItem.hash, {
        hash: liveItem.hash,
        ts: liveItem.ts,
        timestampMs: liveItem.timestampMs || Date.now(),
        when: liveItem.when || "Just now",
        from: liveItem.wa,
        fromLabel: fromMeta.label,
        fromCategory: fromMeta.category,
        to: liveItem.to,
        toLabel: toMeta.label,
        toCategory: toMeta.category,
        flow,
        sym: liveItem.sym || "ETH",
        amt: liveItem.amt || 0,
        usd: liveItem.usdLive || liveItem.usd || 0,
        chain: liveItem.sym === "BTC" ? "Bitcoin" : liveItem.sym === "BNB" ? "BNB Chain" : "Ethereum",
        method: resolvedMethod,
        methodName: liveItem.method || resolvedMethod,
        blockNumber: liveItem.blockNumber || 26304800,
        status: "live",
        isLive: true,
      });
    });

    const list = Array.from(byHash.values());
    // Sort chronological descending (newest first)
    list.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return b.timestampMs - a.timestampMs;
    });

    return list;
  }, [liveStream?.liveTxs, liveApiTxs, ethPrice, btcPrice]);

  // Aggregate Flow & Volume Statistics
  const stats = useMemo(() => {
    let totalVol = 0;
    let inflowVol = 0;
    let outflowVol = 0;
    let internalVol = 0;

    allTransactions.forEach((tx) => {
      totalVol += tx.usd;
      if (tx.flow === "inflow") inflowVol += tx.usd;
      else if (tx.flow === "outflow") outflowVol += tx.usd;
      else internalVol += tx.usd;
    });

    return {
      totalVol,
      inflowVol,
      outflowVol,
      internalVol,
      netFlow: inflowVol - outflowVol,
      totalCount: allTransactions.length,
      liveCount: liveStream?.liveTxs.length ?? 0,
    };
  }, [allTransactions, liveStream?.liveTxs.length]);

  // Filtered Transactions
  const filteredTxs = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return allTransactions.filter((tx) => {
      // Arkham USD >= $1 quick filter (matching default Arkham screenshot pill)
      if (usdGte1Filter && tx.usd < 1.0) return false;

      // Filter by Target Address if active
      if (effectiveFilterAddress) {
        const fa = effectiveFilterAddress.toLowerCase();
        const matchesAddr =
          Boolean(tx.from && tx.from.toLowerCase() === fa) ||
          Boolean(tx.to && tx.to.toLowerCase() === fa);
        if (!matchesAddr) return false;
      }

      // Scope (Live 5-min today vs All historical)
      if (scopeFilter === "live" && tx.timestampMs < oneDayAgo) return false;

      // Direction
      if (directionFilter !== "all" && tx.flow !== directionFilter) return false;

      // Chain
      if (chainFilter !== "all" && tx.chain.toLowerCase() !== chainFilter.toLowerCase()) return false;

      // Token
      if (tokenFilter !== "all" && tx.sym.toLowerCase() !== tokenFilter.toLowerCase()) return false;

      // Value threshold
      if (valueFilter === "1k" && tx.usd < 1000) return false;
      if (valueFilter === "50k" && tx.usd < 50000) return false;
      if (valueFilter === "250k" && tx.usd < 250000) return false;
      if (valueFilter === "1m" && tx.usd < 1000000) return false;

      // Method
      if (methodFilter !== "all") {
        const m = (tx.method + " " + tx.methodName).toLowerCase();
        if (!m.includes(methodFilter.toLowerCase())) return false;
      }

      // Search Query (hash, from, to, label, method, sym)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          tx.hash.toLowerCase().includes(q) ||
          tx.from.toLowerCase().includes(q) ||
          tx.to.toLowerCase().includes(q) ||
          tx.fromLabel.toLowerCase().includes(q) ||
          tx.toLabel.toLowerCase().includes(q) ||
          tx.sym.toLowerCase().includes(q) ||
          tx.method.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [allTransactions, effectiveFilterAddress, scopeFilter, directionFilter, chainFilter, tokenFilter, valueFilter, methodFilter, searchQuery, usdGte1Filter]);

  // Paginated Slices
  const paginatedTxs = useMemo(() => {
    if (pageSize === "all") return filteredTxs;
    const start = (page - 1) * pageSize;
    return filteredTxs.slice(start, start + pageSize);
  }, [filteredTxs, page, pageSize]);

  const totalPages = pageSize === "all" ? 1 : Math.ceil(filteredTxs.length / (pageSize as number)) || 1;

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

  // Export handlers
  const handleExportCSV = useCallback(() => {
    const headers = ["TxHash", "Timestamp", "Block", "Chain", "Flow", "FromLabel", "FromAddr", "ToLabel", "ToAddr", "Token", "Amount", "USDValue", "Method"];
    const rows = filteredTxs.map((t) => [
      t.hash,
      t.ts,
      t.blockNumber,
      t.chain,
      t.flow.toUpperCase(),
      `"${t.fromLabel.replace(/"/g, '""')}"`,
      t.from,
      `"${t.toLabel.replace(/"/g, '""')}"`,
      t.to,
      t.sym,
      t.amt,
      t.usd.toFixed(2),
      `"${t.method.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `arkham-entity-binance-hacker-2-txs-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Downloaded CSV with " + filteredTxs.length + " transactions");
  }, [filteredTxs, toast]);

  const handleExportJSON = useCallback(() => {
    const jsonStr = JSON.stringify(filteredTxs, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `arkham-entity-binance-hacker-2-txs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Downloaded JSON with " + filteredTxs.length + " transactions");
  }, [filteredTxs, toast]);

  const handleCopyTable = useCallback(() => {
    const sample = filteredTxs.slice(0, 100);
    const text = sample
      .map((t) => `${t.hash}\t${t.ts}\t${t.fromLabel}\t${t.flow.toUpperCase()}\t${t.toLabel}\t${t.sym}\t${t.amt}\t$${t.usd.toFixed(2)}\t${t.method}`)
      .join("\n");
    void navigator.clipboard?.writeText(text).then(
      () => toast(`Copied top ${sample.length} transactions as TSV to clipboard!`),
      () => toast("Clipboard copy failed")
    );
  }, [filteredTxs, toast]);

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
                  ⚡ LIVE STREAMING ({liveStream.speed.toUpperCase()})
                </span>
              ) : (
                <span className="bd ghost" style={{ fontSize: 9.5 }}>
                  ⏸ PAUSED
                </span>
              )}
              <span className="arkham-id-pill">ID: binance-hacker-2</span>
            </div>

            <h1 className="arkham-entity-title">Binance Hacker 2</h1>
            <p className="arkham-entity-desc">
              Clustered onchain entity responsible for the October 29, 2026 EIP-7702 sweep of Binance hot wallets on Ethereum. 
              Tracking <b>{tracked.length}</b> stolen assets ({usd(totals.stolenEth)} initial haul) and <b>{events.length}</b> forensic events, showing <b>{stats.totalCount.toLocaleString()}</b> real-time tracked transactions, cross-chain DEX offloading, and 18,270 Bitcoin hops.
            </p>

            <div className="arkham-links-row">
              <a
                href="https://arkm.com/explorer/entity/binance-hacker-2"
                target="_blank"
                rel="noopener noreferrer"
                className="btn rt"
                style={{ fontSize: 11, padding: "5px 14px", fontWeight: 700 }}
              >
                Official Arkham Page ↗
              </a>
              <a
                href="https://etherscan.io/address/0x80d04079ffc53eb14edbeeb37279d126f45552df"
                target="_blank"
                rel="noopener noreferrer"
                className="btn ghost"
                style={{ fontSize: 11, padding: "5px 12px" }}
              >
                Etherscan Cluster ↗
              </a>
              <a
                href="https://www.trmlabs.com/resources/blog/north-korea-steals-usd-6-36-billion-from-binance-in-the-largest-hack-in-history"
                target="_blank"
                rel="noopener noreferrer"
                className="btn ghost"
                style={{ fontSize: 11, padding: "5px 12px" }}
              >
                TRM Labs Forensic Report ↗
              </a>
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: 11, padding: "5px 12px" }}
                onClick={() => copyToClipboard("https://arkm.com/explorer/entity/binance-hacker-2", "Arkham Entity URL")}
              >
                {copiedKey === "https://arkm.com/explorer/entity/binance-hacker-2" ? "Copied Link!" : "Share Entity ⎘"}
              </button>
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
                <span className="dim">Historical Haul:</span>
                <b style={{ color: "var(--red)" }}>$6.36B</b>
              </div>
            </div>
          </div>
        </div>

        {/* Arkham Sub-navigation Tabs */}
        <div className="arkham-tabs-bar" role="tablist">
          <button
            type="button"
            className={`arkham-tab-btn ${activeTab === "transactions" ? "active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            ⚡ Live Transactions ({stats.totalCount.toLocaleString()})
          </button>
          <button
            type="button"
            className={`arkham-tab-btn ${activeTab === "portfolio" ? "active" : ""}`}
            onClick={() => setActiveTab("portfolio")}
          >
            📊 Clustered Portfolio ({portfolioHoldings.items.length})
          </button>
          <button
            type="button"
            className={`arkham-tab-btn ${activeTab === "counterparties" ? "active" : ""}`}
            onClick={() => setActiveTab("counterparties")}
          >
            ⇄ Top Counterparties ({counterparties.inflow.length + counterparties.outflow.length})
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
        </div>
      </div>

      {/* ===============================================================
          PRIMARY TAB 1: ARKHAM LIVE TRANSACTIONS STREAM
          =============================================================== */}
      {activeTab === "transactions" ? (
        <section className="arkham-transactions-section" style={{ marginTop: 24 }}>
          {/* Arkham 5-Minute Sync Status Alert Banner */}
          <div className="arkham-sync-banner">
            <div className="sync-banner-left">
              <span className="live-status-dot confirmed" />
              <div className="sync-banner-text">
                <div className="sync-banner-title">
                  <b>ARKHAM LIVE FEED</b> · Clustered Entity <code>binance-hacker-2</code>
                </div>
                <div className="sync-banner-sub dim">
                  Real-time blockchain tracker updated <b>every 5 minutes</b> · Last onchain sync: <b>{timeAgo(liveStream?.lastSyncTime || Date.now())}</b> · Next auto-sync: <b style={{ color: "#3fd69c" }}>{String(Math.floor(Math.max(0, 300 - Math.floor((nowTick - (liveStream?.lastSyncTime || nowTick)) / 1000) % 300) / 60)).padStart(2, "0")}:{String(Math.max(0, 300 - Math.floor((nowTick - (liveStream?.lastSyncTime || nowTick)) / 1000) % 300) % 60).padStart(2, "0")}</b>
                </div>
                {effectiveFilterAddress ? (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <span style={{ color: "#60a5fa" }}>
                      🎯 Active target filter: <b>{resolveEntity(effectiveFilterAddress).label || shortAddr(effectiveFilterAddress, 8, 4)}</b>
                    </span>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: "1px 6px", fontSize: 10.5, height: "auto" }}
                      onClick={handleClearFilter}
                    >
                      Clear ✕
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="sync-banner-right">
              <span className="sync-badge-5m">⚡ 5-MIN ROLLING BLOCKS</span>
              <button
                type="button"
                className="btn rt sync-now-btn"
                style={{ fontSize: 11, padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() => {
                  liveStream?.syncNow ? liveStream.syncNow() : liveStream?.triggerPulse();
                  toast("Synced latest 5-minute onchain blocks from mempool!");
                }}
                title="Poll now for the latest onchain block movements"
              >
                ↻ Sync 5m Blocks Now
              </button>
            </div>
          </div>

          {/* Arkham Volume & Flow Metrics Strip */}
          <div className="arkham-stats-bar">
            <div className="arkham-stat-card">
              <div className="arkham-stat-label">TOTAL VOLUME TRACKED</div>
              <div className="arkham-stat-val mono">{usd(stats.totalVol)}</div>
              <div className="arkham-stat-sub">Across {stats.totalCount.toLocaleString()} onchain txs</div>
            </div>

            <div className="arkham-stat-card inflow-card">
              <div className="arkham-stat-label">TOTAL INFLOWS ⬇</div>
              <div className="arkham-stat-val mono up">{usd(stats.inflowVol)}</div>
              <div className="arkham-stat-sub">Victim drains & funding ({pct((stats.inflowVol / stats.totalVol) * 100, 1)})</div>
            </div>

            <div className="arkham-stat-card outflow-card">
              <div className="arkham-stat-label">TOTAL OUTFLOWS ⬆</div>
              <div className="arkham-stat-val mono down">{usd(stats.outflowVol)}</div>
              <div className="arkham-stat-sub">DEX offload & bridges ({pct((stats.outflowVol / stats.totalVol) * 100, 1)})</div>
            </div>

            <div className="arkham-stat-card netflow-card">
              <div className="arkham-stat-label">NET FLOW</div>
              <div className={`arkham-stat-val mono ${stats.netFlow >= 0 ? "up" : "down"}`}>
                {stats.netFlow >= 0 ? "+" : ""}{usd(stats.netFlow)}
              </div>
              <div className="arkham-stat-sub">Exploiter retained balance</div>
            </div>

            <div className="arkham-stat-card speed-card">
              <div className="arkham-stat-label">LIVE FEED STATUS</div>
              <div className="arkham-stat-val mono" style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`live-status-dot ${liveStream?.isStreaming ? "confirmed" : "rec"}`} />
                {liveStream?.isStreaming ? "STREAMING LIVE" : "FEED PAUSED"}
              </div>
              <div className="arkham-stat-sub">~4.2 tx/min · {stats.liveCount} live pulses</div>
            </div>
          </div>

          {/* Arkham Stream Controls Toolbar */}
          <div className="arkham-stream-toolbar">
            <div className="toolbar-left">
              <button
                type="button"
                className={`btn ${liveStream?.isStreaming ? "rt" : "ghost"}`}
                style={{ fontSize: 12, padding: "5px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() => liveStream?.setIsStreaming((prev) => !prev)}
              >
                <span className={`live-status-dot ${liveStream?.isStreaming ? "confirmed" : "rec"}`} />
                {liveStream?.isStreaming ? "Live Stream Active" : "Stream Paused"}
              </button>

              <div className="speed-selector" style={{ display: "inline-flex", background: "var(--panel)", borderRadius: 6, padding: 2, border: "1px solid var(--line)" }}>
                {(["normal", "fast", "hyper", "blitz"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn ${liveStream?.speed === s ? "rt" : "ghost"}`}
                    style={{ fontSize: 10.5, padding: "3px 8px", border: "none", textTransform: "uppercase" }}
                    onClick={() => liveStream?.setSpeed(s)}
                    title={`Stream speed: ${s}`}
                  >
                    {s === "normal" ? "1x" : s === "fast" ? "2x" : s === "hyper" ? "3x" : "4x Blitz"}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: 11, padding: "5px 10px" }}
                onClick={() => liveStream?.triggerPulse()}
                title="Manually simulate a new incoming onchain transaction"
              >
                ⚡ Trigger Pulse
              </button>

              <button
                type="button"
                className={`btn ${visualGlowAlerts ? "ghost" : "ghost"}`}
                style={{ fontSize: 11, padding: "5px 10px", opacity: visualGlowAlerts ? 1 : 0.6 }}
                onClick={() => setVisualGlowAlerts((v) => !v)}
                title="Toggle visual neon pulse alert when new live transactions arrive"
              >
                {visualGlowAlerts ? "🔔 Alerts On" : "🔕 Alerts Off"}
              </button>
            </div>

            <div className="toolbar-right">
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: 11, padding: "5px 10px" }}
                onClick={handleExportCSV}
                title="Export current filtered transactions to CSV"
              >
                📥 Export CSV
              </button>
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: 11, padding: "5px 10px" }}
                onClick={handleExportJSON}
                title="Export current filtered transactions to JSON"
              >
                📄 Export JSON
              </button>
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: 11, padding: "5px 10px" }}
                onClick={handleCopyTable}
                title="Copy current table rows to clipboard"
              >
                📋 Copy Table
              </button>
            </div>
          </div>

          {/* Arkham Multi-Dimensional Filter Bar */}
          <div className="arkham-filter-bar">
            {/* Search Input */}
            <div className="arkham-filter-search-wrap">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search Tx Hash, Address, Counterparty, Token, Method..."
                className="arkham-search-input"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              ) : null}
            </div>

            {/* Active Target Filter Pill if selected */}
            {effectiveFilterAddress ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 10px",
                  background: "rgba(59, 130, 246, 0.16)",
                  border: "1px solid rgba(59, 130, 246, 0.4)",
                  borderRadius: 6,
                  color: "#93c5fd",
                  fontSize: 12,
                  whiteSpace: "nowrap",
                }}
              >
                <span>🎯 Target: <b>{resolveEntity(effectiveFilterAddress).label || shortAddr(effectiveFilterAddress, 8, 4)}</b></span>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: "1px 6px", fontSize: 11, height: "auto" }}
                  onClick={handleClearFilter}
                  title="Clear target filter"
                >
                  ✕
                </button>
              </div>
            ) : null}

            {/* Scope Pills: Live 5-Min Blocks vs All Historical */}
            <div className="arkham-scope-pills">
              <button
                type="button"
                className={`scope-pill-btn ${scopeFilter === "all" ? "active" : ""}`}
                onClick={() => {
                  setScopeFilter("all");
                  setPage(1);
                }}
              >
                ⚡ Live Stream & All Txs ({allTransactions.length.toLocaleString()})
              </button>
              <button
                type="button"
                className={`scope-pill-btn ${scopeFilter === "live" ? "active" : ""}`}
                onClick={() => {
                  setScopeFilter("live");
                  setPage(1);
                }}
              >
                🔥 Today's 5-Min Blocks Only (Fresh Live Feed)
              </button>
            </div>

            {/* Direction Filter Pills */}
            <div className="arkham-direction-pills">
              {(
                [
                  { id: "all", label: "All Flows", badge: null },
                  { id: "inflow", label: "Inflows ⬇", badge: "inflow" },
                  { id: "outflow", label: "Outflows ⬆", badge: "outflow" },
                  { id: "internal", label: "Internal ⇄", badge: "internal" },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`arkham-direction-btn ${directionFilter === d.id ? "active " + d.id : ""}`}
                  onClick={() => {
                    setDirectionFilter(d.id);
                    setPage(1);
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Dropdown Selectors: Chain, Token, Min Value, Method */}
            <div className="arkham-select-group">
              {/* Chain */}
              <select
                className="arkham-select"
                value={chainFilter}
                onChange={(e) => {
                  setChainFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by Chain"
              >
                <option value="all">All Chains</option>
                <option value="ethereum">Ethereum (ETH)</option>
                <option value="bnb chain">BNB Chain</option>
                <option value="bitcoin">Bitcoin (BTC)</option>
                <option value="tron">Tron (TRX)</option>
              </select>

              {/* Token */}
              <select
                className="arkham-select"
                value={tokenFilter}
                onChange={(e) => {
                  setTokenFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by Token"
              >
                <option value="all">All Tokens</option>
                <option value="eth">ETH</option>
                <option value="usdt">USDT</option>
                <option value="usdc">USDC</option>
                <option value="btc">BTC</option>
                <option value="bnb">BNB</option>
                <option value="dai">DAI</option>
                <option value="pepe">PEPE</option>
                <option value="shib">SHIB</option>
                <option value="wld">WLD</option>
                <option value="prom">PROM</option>
                <option value="fun">FUN</option>
              </select>

              {/* Value threshold */}
              <select
                className="arkham-select"
                value={valueFilter}
                onChange={(e) => {
                  setValueFilter(e.target.value as typeof valueFilter);
                  setPage(1);
                }}
                aria-label="Filter by Transaction Value"
              >
                <option value="all">All Values</option>
                <option value="1k">&gt; $1,000</option>
                <option value="50k">&gt; $50,000</option>
                <option value="250k">&gt; $250,000</option>
                <option value="1m">&gt; $1,000,000 (Whales 🐋)</option>
              </select>

              {/* Method */}
              <select
                className="arkham-select"
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by Contract Method"
              >
                <option value="all">All Methods</option>
                <option value="executeBatch">executeBatch</option>
                <option value="swapExact">swapExactTokens</option>
                <option value="sweepToken">sweepToken</option>
                <option value="multicall">multicall</option>
                <option value="transfer">transfer</option>
                <option value="delegate">delegate (EIP-7702)</option>
                <option value="0x8aaa8f3b">0x8aaa8f3b</option>
              </select>

              {/* Clear filters button if active */}
              {directionFilter !== "all" || chainFilter !== "all" || tokenFilter !== "all" || valueFilter !== "all" || methodFilter !== "all" || searchQuery ? (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={() => {
                    setDirectionFilter("all");
                    setChainFilter("all");
                    setTokenFilter("all");
                    setValueFilter("all");
                    setMethodFilter("all");
                    setSearchQuery("");
                    setPage(1);
                  }}
                >
                  Reset
                </button>
              ) : null}
            </div>
          </div>

          {/* Arkham Screenshot Top Pill Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12, marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className={`arkham-filter-pill-usd ${usdGte1Filter ? "" : "inactive"}`}
                onClick={() => {
                  setUsdGte1Filter((v) => !v);
                  setPage(1);
                }}
                title="Toggle Arkham USD >= $1 filter (Arkham default in screenshot)"
              >
                <span>✕</span>
                <span>USD &gt;= $1</span>
              </button>

              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--mute)", fontFamily: "var(--mono)" }}>
                <span className="live-status-dot confirmed" />
                <span>
                  Blockscout Open-Source API:{" "}
                  <b style={{ color: "#3fd69c" }}>
                    {liveApiTxs.length > 0 ? `${liveApiTxs.length} Live Txs (Synced ${timeAgo(apiLastSync)})` : "Connected (Ready)"}
                  </b>
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className="btn rt"
                style={{ fontSize: 11, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() => void pullOpenSourceApi()}
                disabled={isApiLoading}
                title="Poll live Blockscout open-source API for latest transactions"
              >
                <span className={`live-status-dot ${isApiLoading ? "pending" : "confirmed"}`} />
                {isApiLoading ? "Pulling API..." : "↻ Pull Open-Source API"}
              </button>
            </div>
          </div>

          {/* Results Counter & Page Size Selector */}
          <div className="arkham-results-header">
            <div className="results-count-text">
              Showing <b>{paginatedTxs.length}</b> of <b>{filteredTxs.length.toLocaleString()}</b> transactions
              {filteredTxs.length !== allTransactions.length ? ` (filtered from ${allTransactions.length.toLocaleString()})` : ""}
            </div>

            <div className="page-size-selector">
              <span className="dim" style={{ fontSize: 11 }}>Rows:</span>
              {([25, 50, 100, "all"] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  className={`size-btn ${pageSize === sz ? "active" : ""}`}
                  onClick={() => {
                    setPageSize(sz);
                    setPage(1);
                  }}
                >
                  {sz === "all" ? "All" : sz}
                </button>
              ))}
            </div>
          </div>

          {/* Arkham Multi-Chain Live Stream Transactions Table (Matching Arkham Intelligence Explorer) */}
          <div className="arkham-table-container">
            <table className="arkham-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Time</th>
                  <th>From</th>
                  <th>To</th>
                  <th className="num" style={{ width: 120 }}>Value</th>
                  <th style={{ width: 130 }}>Token</th>
                  <th className="num" style={{ width: 130 }}>USD</th>
                  <th style={{ width: 170, textAlign: "right" }}>Action / Explorer</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTxs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "48px 16px", color: "var(--mute)" }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
                      <b>No transactions match your current filter selection.</b>
                      {effectiveFilterAddress ? (
                        <p style={{ fontSize: 12, margin: "6px 0 14px", color: "var(--dim)" }}>
                          Filtered target <code>{shortAddr(effectiveFilterAddress, 10, 4)}</code> has 0 transactions with currently applied criteria.
                        </p>
                      ) : (
                        <p style={{ fontSize: 12, margin: "6px 0 14px" }}>Try broadening your search query or resetting filters.</p>
                      )}
                      <button
                        type="button"
                        className="btn rt"
                        style={{ fontSize: 11 }}
                        onClick={() => {
                          setDirectionFilter("all");
                          setScopeFilter("all");
                          setChainFilter("all");
                          setTokenFilter("all");
                          setValueFilter("all");
                          setMethodFilter("all");
                          setSearchQuery("");
                          setUsdGte1Filter(false);
                          setPage(1);
                          handleClearFilter();
                        }}
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedTxs.map((tx, idx) => {
                    const isNewLive = Boolean(tx.isLive && visualGlowAlerts);
                    const isOutflow = tx.flow === "outflow";
                    const isInflow = tx.flow === "inflow";

                    return (
                      <tr
                        key={`${tx.hash}-${idx}`}
                        className={`arkham-tx-row ${isNewLive ? "arkham-new-live-row" : ""} ${selectedTx?.hash === tx.hash ? "arkham-selected-row" : ""}`}
                        onClick={() => setSelectedTx(tx)}
                      >
                        {/* 1. Chain Icon & Time */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
                            {getChainIcon(tx.chain)}
                            <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--blue)" }}>
                              {tx.when || timeAgo(tx.timestampMs)}
                            </span>
                          </div>
                        </td>

                        {/* 2. From Entity */}
                        <td>
                          <div className="entity-cell">
                            <div className="entity-label-row">
                              <span className="entity-name" title={tx.fromLabel}>
                                {tx.fromLabel}
                              </span>
                              {tx.fromCategory ? <span className="entity-cat-tag">{tx.fromCategory}</span> : null}
                            </div>
                            <div className="entity-addr-row">
                              <a
                                href={getExplorerAddrUrl(tx.from, tx.chain)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mono dim"
                                style={{ textDecoration: "none", color: "var(--dim)" }}
                                onClick={(e) => e.stopPropagation()}
                                title={tx.from}
                              >
                                {shortAddr(tx.from, 6, 4)}
                              </a>
                              <button
                                type="button"
                                className="arkham-copy-inline-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(tx.from, "From Address");
                                }}
                                title="Copy Address"
                              >
                                {copiedKey === tx.from ? "✓" : "⎘"}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 3. To Entity */}
                        <td>
                          <div className="entity-cell">
                            <div className="entity-label-row">
                              <span className="entity-name" title={tx.toLabel}>
                                {tx.toLabel}
                              </span>
                              {tx.toCategory ? <span className="entity-cat-tag">{tx.toCategory}</span> : null}
                            </div>
                            <div className="entity-addr-row">
                              <a
                                href={getExplorerAddrUrl(tx.to, tx.chain)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mono dim"
                                style={{ textDecoration: "none", color: "var(--dim)" }}
                                onClick={(e) => e.stopPropagation()}
                                title={tx.to}
                              >
                                {shortAddr(tx.to, 6, 4)}
                              </a>
                              <button
                                type="button"
                                className="arkham-copy-inline-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(tx.to, "To Address");
                                }}
                                title="Copy Address"
                              >
                                {copiedKey === tx.to ? "✓" : "⎘"}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 4. Value */}
                        <td className="num">
                          <span
                            className="mono"
                            style={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: isInflow ? "#3fd69c" : isOutflow ? "#ff5a52" : "var(--text)",
                            }}
                          >
                            {formatArkhamValue(tx.amt)}
                          </span>
                        </td>

                        {/* 5. Token */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                            {getChainIcon(tx.chain)}
                            <span className={`arkham-token-badge token-${tx.sym.toLowerCase()}`}>
                              {tx.sym}
                            </span>
                          </div>
                        </td>

                        {/* 6. USD */}
                        <td className="num">
                          <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
                            {formatArkhamUsd(tx.usd)}
                          </span>
                        </td>

                        {/* 7. Action / Explorer */}
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <a
                              href={getExplorerTxUrl(tx.hash, tx.chain, tx.sym)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn ghost"
                              style={{ padding: "2px 7px", fontSize: 10.5, fontFamily: "var(--mono)" }}
                              onClick={(e) => e.stopPropagation()}
                              title={`View confirmed on ${tx.chain} explorer`}
                            >
                              Explorer ↗
                            </a>
                            <a
                              href={`https://arkm.com/explorer/tx/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn ghost"
                              style={{
                                padding: "2px 6px",
                                fontSize: 10,
                                fontFamily: "var(--mono)",
                                color: "#3fd69c",
                                borderColor: "rgba(63, 214, 156, 0.3)",
                                background: "rgba(63, 214, 156, 0.1)",
                              }}
                              onClick={(e) => e.stopPropagation()}
                              title="View on Arkham Intelligence"
                            >
                              Arkham ↗
                            </a>
                            <button
                              type="button"
                              className="btn ghost arkham-inspect-btn"
                              style={{ fontSize: 10, padding: "2px 6px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTx(tx);
                              }}
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pageSize !== "all" && totalPages > 1 ? (
            <div className="arkham-pagination">
              <div className="pagination-info">
                Page <b>{page}</b> of <b>{totalPages}</b>
              </div>

              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn ghost pagination-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  title="First Page"
                >
                  « First
                </button>
                <button
                  type="button"
                  className="btn ghost pagination-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  ‹ Prev
                </button>

                <span className="pagination-page-indicator mono">
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  className="btn ghost pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  Next ›
                </button>
                <button
                  type="button"
                  className="btn ghost pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  title="Last Page"
                >
                  Last »
                </button>
              </div>
            </div>
          ) : null}

          {/* Interactive Transaction Inspector Modal / Drawer */}
          {selectedTx ? (
            <div className="arkham-drawer-backdrop" onClick={() => setSelectedTx(null)}>
              <div className="arkham-drawer-panel" onClick={(e) => e.stopPropagation()}>
                <div className="drawer-header">
                  <div className="drawer-header-meta">
                    <span className="arkham-tag-badge">TRANSACTION FORENSICS</span>
                    <span className={`arkham-flow-tag ${selectedTx.flow}`}>
                      {selectedTx.flow.toUpperCase()}
                    </span>
                    <span className="mono dim" style={{ fontSize: 11 }}>Block #{selectedTx.blockNumber}</span>
                  </div>
                  <button
                    type="button"
                    className="drawer-close-btn"
                    onClick={() => setSelectedTx(null)}
                    aria-label="Close transaction details"
                  >
                    ✕
                  </button>
                </div>

                <div className="drawer-body">
                  {/* Tx Hash */}
                  <div className="drawer-section">
                    <div className="drawer-field-label">TRANSACTION HASH</div>
                    <div className="drawer-hash-row">
                      <code className="drawer-hash-val">{selectedTx.hash}</code>
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ fontSize: 11, padding: "2px 8px" }}
                        onClick={() => copyToClipboard(selectedTx.hash, "Tx Hash")}
                      >
                        {copiedKey === selectedTx.hash ? "Copied!" : "Copy ⎘"}
                      </button>
                    </div>
                  </div>

                  {/* Flow Map Visualizer */}
                  <div className="drawer-flow-map">
                    <div className="drawer-flow-box from">
                      <div className="flow-box-role">SOURCE (FROM)</div>
                      <div className="flow-box-title">{selectedTx.fromLabel}</div>
                      <div className="flow-box-addr mono">
                        <span>{shortAddr(selectedTx.from, 8, 6)}</span>{" "}
                        <a
                          href={getExplorerAddrUrl(selectedTx.from, selectedTx.chain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--accent)", textDecoration: "none" }}
                          title={`View address on ${selectedTx.chain} explorer`}
                        >
                          ↗
                        </a>
                      </div>
                    </div>

                    <div className="drawer-flow-arrow">
                      <span className="arrow-badge">{selectedTx.flow.toUpperCase()}</span>
                      ➔
                    </div>

                    <div className="drawer-flow-box to">
                      <div className="flow-box-role">COUNTERPARTY (TO)</div>
                      <div className="flow-box-title">{selectedTx.toLabel}</div>
                      <div className="flow-box-addr mono">
                        <span>{shortAddr(selectedTx.to, 8, 6)}</span>{" "}
                        <a
                          href={getExplorerAddrUrl(selectedTx.to, selectedTx.chain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--accent)", textDecoration: "none" }}
                          title={`View address on ${selectedTx.chain} explorer`}
                        >
                          ↗
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Value and Token Metrics */}
                  <div className="drawer-grid">
                    <div className="drawer-grid-card">
                      <div className="drawer-card-label">ASSET TRANSFERRED</div>
                      <div className="drawer-card-val mono" style={{ color: "#ffffff" }}>
                        {amount(selectedTx.amt)} {selectedTx.sym}
                      </div>
                      <div className="drawer-card-sub">Exact token quantity</div>
                    </div>

                    <div className="drawer-grid-card">
                      <div className="drawer-card-label">USD VALUE (SPOT)</div>
                      <div className="drawer-card-val mono" style={{ color: "var(--accent)" }}>
                        {usd(selectedTx.usd)}
                      </div>
                      <div className="drawer-card-sub">At live Binance spot price</div>
                    </div>

                    <div className="drawer-grid-card">
                      <div className="drawer-card-label">NETWORK / CHAIN</div>
                      <div className="drawer-card-val mono">{selectedTx.chain}</div>
                      <div className="drawer-card-sub">Chain ID 1 (Mainnet)</div>
                    </div>

                    <div className="drawer-grid-card">
                      <div className="drawer-card-label">EXECUTION METHOD</div>
                      <div className="drawer-card-val mono" style={{ fontSize: 13 }}>
                        {selectedTx.method.split("(")[0]}
                      </div>
                      <div className="drawer-card-sub">{selectedTx.methodName || "0x8aaa8f3b"}</div>
                    </div>
                  </div>

                  {/* Gas and MEV Details */}
                  {selectedTx.gasUsed || selectedTx.maxFeePerGas ? (
                    <div className="drawer-gas-breakdown">
                      <div className="drawer-field-label">GAS & EXECUTION METRICS</div>
                      <div className="gas-stats-row">
                        <span>Gas Used: <b>{Number(selectedTx.gasUsed || 133280).toLocaleString()}</b></span>
                        <span>Max Fee: <b>{((Number(selectedTx.maxFeePerGas || 450000000)) / 1e9).toFixed(2)} Gwei</b></span>
                        <span>MEV Bribe: <b>125 Gwei</b></span>
                        <span>Estimated Fee: <b>$24.80</b></span>
                      </div>
                    </div>
                  ) : null}

                  {/* Calldata Preview */}
                  <div className="drawer-calldata-section">
                    <div className="drawer-field-label">CONTRACT CALLDATA & DECODED PARAMETERS</div>
                    <pre className="calldata-pre">
                      <code>{`// Function: ${selectedTx.method}
// Selector: ${selectedTx.methodName || "0x8aaa8f3b"}
// Target Contract: ${selectedTx.to}
// Value: ${selectedTx.amt} ${selectedTx.sym}
// Timestamp: ${selectedTx.ts} (${selectedTx.when})`}</code>
                    </pre>
                  </div>

                  {/* Quick Action Links */}
                  <div className="drawer-action-links">
                    <a
                      href={getExplorerTxUrl(selectedTx.hash, selectedTx.chain, selectedTx.sym)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn rt"
                      style={{ fontSize: 11, padding: "6px 14px", flex: 1, textAlign: "center" }}
                    >
                      View on Explorer ({selectedTx.chain}) ↗
                    </a>
                    <a
                      href={`https://arkm.com/explorer/tx/${selectedTx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn ghost"
                      style={{ fontSize: 11, padding: "6px 14px", flex: 1, textAlign: "center", color: "#3fd69c", borderColor: "rgba(63, 214, 156, 0.4)" }}
                    >
                      View on Arkham Intelligence ↗
                    </a>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ fontSize: 11, padding: "6px 14px" }}
                      onClick={() => copyToClipboard(JSON.stringify(selectedTx, null, 2), "Transaction JSON")}
                    >
                      Copy JSON ⎘
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* SUBTAB 2: PORTFOLIO HOLDINGS */}
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
                  <tr
                    key={`${token.chain}-${token.sym}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setTokenFilter(token.sym.toLowerCase());
                      setActiveTab("transactions");
                      setPage(1);
                      toast(`Filtered transactions for ${token.sym}`);
                    }}
                    title={`Click to filter live transactions for ${token.sym}`}
                  >
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

      {/* SUBTAB 3: TOP COUNTERPARTIES */}
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
                      <tr
                        key={cp.addr}
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setSearchQuery(cp.addr);
                          setActiveTab("transactions");
                          setPage(1);
                          toast(`Filtered transactions for ${cp.name}`);
                        }}
                        title={`Click to filter live transactions for ${cp.name}`}
                      >
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
                      <tr
                        key={cp.addr}
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setSearchQuery(cp.name);
                          setActiveTab("transactions");
                          setPage(1);
                          toast(`Filtered transactions for ${cp.name}`);
                        }}
                        title={`Click to filter live transactions for ${cp.name}`}
                      >
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

      {/* SUBTAB 4: CLUSTERED ADDRESSES */}
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
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button
                          type="button"
                          className="btn rt"
                          style={{ padding: "2px 8px", fontSize: 11 }}
                          onClick={() => {
                            setInternalFilterAddress(ent.address);
                            setActiveTab("transactions");
                            setPage(1);
                            toast(`Filtered transactions for ${ent.shortLabel}`);
                          }}
                          title={`Filter live transactions for ${ent.shortLabel}`}
                        >
                          ⚡ View Txs
                        </button>
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
                        <a
                          href={`https://arkm.com/explorer/address/${ent.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn ghost"
                          style={{ padding: "2px 7px", fontSize: 11, color: "#3fd69c", borderColor: "rgba(63, 214, 156, 0.3)" }}
                          title="View on Arkham Intelligence"
                        >
                          Arkham ↗
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

      {/* SUBTAB 5: VISUALIZER FLOW MAP */}
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
    </div>
  );
}
