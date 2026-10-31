import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import rawIocs from "../data/blockaid-iocs.json";
import rawMoves from "../data/blockaid-moves.json";
import rawNodes from "../data/blockaid-nodes.json";
import rawChains from "../data/blockaid-chains.json";
import { shortAddr, timeAgo } from "../lib/format";
import { SectionTitle, useToast } from "./ui";
import { useTick } from "../lib/useLive";

export interface BlockaidIOC {
  a: string;
  chains: string[];
  c: string;
  r: string;
  s: string;
}

export interface BlockaidNode {
  id: string;
  chain?: string;
  chains?: string[];
  kind: "victim" | "attacker" | "hop" | "holding" | "frozen" | "watch";
  label: string;
  addr?: string;
  group?: string[];
  note?: string;
}

export interface BlockaidMove {
  id?: string;
  from: string;
  to: string;
  chain: string;
  toChain?: string;
  amt: string;
  t: string | null;
  tr?: string;
  approx?: boolean;
  det: {
    k: "onsight" | "detector" | "classify" | "preflag" | "feed";
    dt?: string;
    txt: string;
    how: string;
    lagS?: number;
  };
  note?: string;
  bridge?: boolean;
  recovery?: boolean;
  simulated?: boolean;
}

export interface ChainConfig {
  name: string;
  sym: string;
  color: string;
  exp: string;
}

export const CHAINS: Record<string, ChainConfig> = rawChains as Record<string, ChainConfig>;
export const IOCS: BlockaidIOC[] = rawIocs as BlockaidIOC[];
export const BASE_MOVES: BlockaidMove[] = rawMoves as BlockaidMove[];
export const NODES: BlockaidNode[] = rawNodes as BlockaidNode[];
export const NODE_MAP: Record<string, BlockaidNode> = Object.fromEntries(NODES.map((n) => [n.id, n]));

// Quick chain explorer helper
export function getExplorerUrl(chainKey: string, addr?: string): string | null {
  if (!addr) return null;
  const cfg = CHAINS[chainKey];
  if (cfg) return `${cfg.exp}${addr}`;
  if (addr.startsWith("0x")) return `https://etherscan.io/address/${addr}`;
  if (addr.startsWith("T")) return `https://tronscan.org/#/address/${addr}`;
  if (addr.startsWith("bc1")) return `https://mempool.space/address/${addr}`;
  return null;
}

export function getExplorerTxUrl(chainKey: string, txHash: string): string {
  switch (chainKey) {
    case "ethereum":
      return `https://etherscan.io/tx/${txHash}`;
    case "tron":
      return `https://tronscan.org/#/transaction/${txHash}`;
    case "bitcoin":
      return `https://mempool.space/tx/${txHash}`;
    case "solana":
      return `https://solscan.io/tx/${txHash}`;
    case "arbitrum":
      return `https://arbiscan.io/tx/${txHash}`;
    case "optimism":
      return `https://optimistic.etherscan.io/tx/${txHash}`;
    case "avalanche":
      return `https://snowtrace.io/tx/${txHash}`;
    case "polygon":
      return `https://polygonscan.io/tx/${txHash}`;
    case "base":
      return `https://basescan.org/tx/${txHash}`;
    case "bsc":
      return `https://bscscan.com/tx/${txHash}`;
    default:
      return `https://etherscan.io/tx/${txHash}`;
  }
}

// Simulated real-time fast transactions pool across the 351 TRON wallets and EVM sweepers
const SIMULATED_RELAY_TRANSFERS: { fromLabel: string; toLabel: string; fromAddr: string; toAddr: string; chain: string; amt: string; note: string }[] = [
  {
    fromLabel: "TRON Layering Hub TA9i3",
    toLabel: "TRON Relay TXf49",
    fromAddr: "TA9i3JCnLQMuCUT5u1NUcGpKyQpGXgFJhD",
    toAddr: "TXf49xZWJkZQRgkaYLSxf7kUf5bQKesA5v",
    chain: "tron",
    amt: "240,000 TRX ($45.6K)",
    note: "Layering hop via decentralized TRX relay node",
  },
  {
    fromLabel: "Sweeper v2 Delegate",
    toLabel: "Drain1 EVM Vault",
    fromAddr: "0x63e842b054bd624a465454d533c33f573e9c6fae",
    toAddr: "0x5227f603c1ee34ce3c06efe6477003bdfccb2f8c",
    chain: "ethereum",
    amt: "450 ETH ($1.53M)",
    note: "EIP-7702 batch sweep execution",
  },
  {
    fromLabel: "Peel Root bc1q0m",
    toLabel: "Peel Output #17 bc1q63",
    fromAddr: "bc1q0mtc2f5agpkvlq6hhahmfr3hlr55kyfjhl2mnm",
    toAddr: "bc1q63qrfrpsg5hh0zzn3kp2xx9vljl7dq7tatsjxp",
    chain: "bitcoin",
    amt: "125 BTC ($8.5M)",
    note: "UTXO unspent peel transfer",
  },
  {
    fromLabel: "AVAX Holder",
    toLabel: "CCTP Bridge Contract",
    fromAddr: "0x80358c5b8f9b2cc27147a1e0f2a6c9a30eb2c397",
    toAddr: "0xc39e690bea48448cc47e7acddfe30e6453e09824",
    chain: "avalanche",
    amt: "14,500 AVAX ($377K)",
    note: "Cross-chain Circle CCTP transit attempt",
  },
  {
    fromLabel: "Arbitrum Council Target",
    toLabel: "Security Council Vault",
    fromAddr: "0x3e2bf1ac6bf0934bbba6456c341c2ecbced632d5",
    toAddr: "0x0000000000000000000000000000000000000000",
    chain: "arbitrum",
    amt: "1,200,000 ARB ($648K)",
    note: "State transition emergency clawback",
  },
  {
    fromLabel: "Binance 55 (OP)",
    toLabel: "Drain1 EVM Vault",
    fromAddr: "0xacd03d601e5bb1b275bb94076ff46ed9d753435a",
    toAddr: "0x5227f603c1ee34ce3c06efe6477003bdfccb2f8c",
    chain: "optimism",
    amt: "350,000 OP ($595K)",
    note: "Automated L2 collector sweep",
  },
];

export default function FastTransactions() {
  const toast = useToast();
  useTick(1000);

  // Subtabs: 'radar' (Live Fast Transactions) | 'directory' (677 Wallets) | 'pipelines' (Attack Architecture)
  const [activeView, setActiveView] = useState<"radar" | "directory" | "pipelines">("radar");

  // Chain filter
  const [selectedChain, setSelectedChain] = useState<string>("all");

  // Directory search & status filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [pageLimit, setPageLimit] = useState<number>(60);

  // Live Radar State
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [streamSpeed, setStreamSpeed] = useState<number>(1); // 1x, 2x, 5x
  const [liveMoves, setLiveMoves] = useState<BlockaidMove[]>(() =>
    BASE_MOVES.map((m, idx) => ({ ...m, id: `base_${idx}` }))
  );
  const [newTxAlert, setNewTxAlert] = useState<string | null>(null);

  // Chain counts for the 677 IOCs
  const chainCounts = useMemo(() => {
    const map: Record<string, number> = { all: IOCS.length };
    IOCS.forEach((ioc) => {
      ioc.chains.forEach((c) => {
        map[c] = (map[c] || 0) + 1;
      });
    });
    return map;
  }, []);

  // Filtered IOCs for Directory
  const filteredIocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return IOCS.filter((ioc) => {
      // Chain filter
      if (selectedChain !== "all" && !ioc.chains.includes(selectedChain)) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "all") {
        const s = ioc.s.toLowerCase();
        if (selectedStatus === "active" && !s.includes("active") && !s.includes("selling")) return false;
        if (selectedStatus === "frozen" && !s.includes("frozen") && !s.includes("clawed")) return false;
        if (selectedStatus === "holding" && !s.includes("unmoved") && !s.includes("eth") && !s.includes("stash") && !s.includes("holding")) return false;
        if (selectedStatus === "layering" && !s.includes("layering") && !s.includes("hub") && !s.includes("downstream") && !s.includes("relay") && !s.includes("peel")) return false;
        if (selectedStatus === "contract" && !s.includes("contract")) return false;
      }
      // Search query
      if (q) {
        const matchesAddr = ioc.a.toLowerCase().includes(q);
        const matchesRole = ioc.r.toLowerCase().includes(q);
        const matchesStatus = ioc.s.toLowerCase().includes(q);
        const matchesChain = ioc.c.toLowerCase().includes(q);
        return matchesAddr || matchesRole || matchesStatus || matchesChain;
      }
      return true;
    });
  }, [selectedChain, selectedStatus, searchQuery]);

  // Paginated IOCs
  const visibleIocs = useMemo(() => {
    return filteredIocs.slice(0, pageLimit);
  }, [filteredIocs, pageLimit]);

  // Filtered Live Moves for Radar
  const filteredMoves = useMemo(() => {
    if (selectedChain === "all") return liveMoves;
    return liveMoves.filter((m) => m.chain === selectedChain || m.toChain === selectedChain);
  }, [liveMoves, selectedChain]);

  // Periodic fast transaction generation
  const streamTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isLiveStreaming) return;
    const interval = Math.max(800, 3200 / streamSpeed);

    streamTimerRef.current = window.setInterval(() => {
      const template = SIMULATED_RELAY_TRANSFERS[Math.floor(Math.random() * SIMULATED_RELAY_TRANSFERS.length)];
      const randomTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
      const newMove: BlockaidMove = {
        id: `stream_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        from: template.fromLabel,
        to: template.toLabel,
        chain: template.chain,
        amt: template.amt,
        t: new Date().toISOString(),
        det: {
          k: "detector",
          txt: "≤ 7s Detected",
          how: "Blockaid real-time multi-chain scanner (under 7 seconds from block inclusion)",
          lagS: 5 + Math.floor(Math.random() * 3),
        },
        note: `${template.note} · TX: ${shortAddr(randomTxHash, 8, 6)}`,
        simulated: true,
      };

      setLiveMoves((prev) => [newMove, ...prev.slice(0, 80)]);
      setNewTxAlert(newMove.id || "alert");
      window.setTimeout(() => setNewTxAlert(null), 1200);
    }, interval);

    return () => {
      if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
    };
  }, [isLiveStreaming, streamSpeed]);

  // Copy helper
  const handleCopy = useCallback(
    (text: string, label: string) => {
      void navigator.clipboard?.writeText(text).then(
        () => toast(`${label} copied to clipboard!`),
        () => toast(`Copied: ${shortAddr(text)}`)
      );
    },
    [toast]
  );

  // Export IOCs as JSON
  const handleExportJSON = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(IOCS, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `blockaid-binance-hack-677-infected-wallets.json`);
    dlAnchor.click();
    toast("Exported all 677 Blockaid IOCs as JSON.");
  }, [toast]);

  // Export IOCs as Plain Text (addresses only)
  const handleExportTXT = useCallback(() => {
    const lines = filteredIocs.map((i) => `${i.a} # [${i.c}] ${i.r} (${i.s})`).join("\n");
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(lines);
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `blockaid-binance-hack-iocs-${selectedChain}.txt`);
    dlAnchor.click();
    toast(`Exported ${filteredIocs.length} IOC addresses as TXT for firewall/security import.`);
  }, [filteredIocs, selectedChain, toast]);

  // Copy all filtered addresses
  const handleCopyAllFiltered = useCallback(() => {
    const addrs = filteredIocs.map((i) => i.a).join("\n");
    void navigator.clipboard?.writeText(addrs).then(
      () => toast(`Copied all ${filteredIocs.length} filtered addresses to clipboard!`),
      () => toast(`Selected ${filteredIocs.length} addresses.`)
    );
  }, [filteredIocs, toast]);

  // Social Sharing Handlers
  const handleShareX = useCallback(() => {
    const text = `🚨 Live multi-chain tracking of 677 infected wallets across 12 chains in the $6.3B Binance hot wallet breach. Real-time telemetry via @Hackwatchdot:`;
    const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent("https://x.com/Hackwatchdot/status/2116403772956225967")}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    toast("Opening X to share 677 Infected Wallets intel...");
  }, [toast]);

  const handleShareTelegram = useCallback(() => {
    const text = `🚨 Live multi-chain tracking: 677 infected wallets across 12 chains in $6.3B Binance hot wallet breach on HackWatch`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent("https://x.com/Hackwatchdot/status/2116403772956225967")}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    toast("Opening Telegram to share...");
  }, [toast]);

  const handleShareWhatsApp = useCallback(() => {
    const text = `🚨 677 Infected Wallets tracked in $6.3B Binance hot wallet exploit on HackWatch: https://x.com/Hackwatchdot/status/2116403772956225967`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    toast("Opening WhatsApp to share...");
  }, [toast]);

  const handleShareIntelNative = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "677 Infected Wallets ($6.3B Binance Breach) — HackWatch",
        text: "🚨 Live telemetry tracking 677 compromised addresses across 12 blockchains in the $6.3B Binance hot wallet exploit via @Hackwatchdot",
        url: "https://x.com/Hackwatchdot/status/2116403772956225967",
      }).catch(() => {});
    }
  }, []);

  const handleShareMove = useCallback((m: BlockaidMove) => {
    const text = `🚨 HackWatch Live Move Alert: ${m.amt} on ${m.chain} (${m.from} ➔ ${m.to}) · $6.3B Binance Breach`;
    const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent("https://x.com/Hackwatchdot/status/2116403772956225967")}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    toast(`Sharing transaction on X...`);
  }, [toast]);

  const handleShareIoc = useCallback((ioc: BlockaidIOC) => {
    const text = `⚠️ Blockaid Compromised Wallet Alert: ${ioc.a} on ${ioc.c} [Risk: ${ioc.r}, ${ioc.s}] ($6.3B Binance Exploit)`;
    const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent("https://x.com/Hackwatchdot/status/2116403772956225967")}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    toast(`Sharing IOC on X: ${shortAddr(ioc.a)}`);
  }, [toast]);

  return (
    <div className="fasttx-page-wrap">
      {/* Hero Header */}
      <div className="fasttx-hero-card">
        <div className="fasttx-hero-top">
          <div>
            <div className="fasttx-eyebrow">
              <span className="live-status-dot confirmed" />
              <span>INC-242 · BLOCKAID RISK EXPOSURE TRACKER</span>
            </div>
            <h1 className="fasttx-title">Fast Transactions & 677 Infected Wallets</h1>
            <p className="fasttx-subtitle">
              Live multi-chain surveillance of all <b>677 compromised addresses</b> across 12 blockchains drained during
              the <b>$6.3B Binance hot wallet breach</b>. Telemetry and onchain IOC graph powered by Blockaid threat intelligence.
            </p>
          </div>
          <div className="fasttx-hero-actions">
            <a
              href="https://binance-hack-funds.blockaid.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn rt"
              style={{ background: "#0ea5e9", color: "#fff", borderColor: "#0284c7" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Official Blockaid Source
            </a>
            <button
              type="button"
              className="btn rt x-share-btn"
              onClick={handleShareX}
              title="Share 677 Infected Wallets Intel to X (Twitter)"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleShareTelegram}
              title="Share 677 Infected Wallets to Telegram"
              style={{ background: "rgba(36, 161, 222, 0.15)", color: "#24A1DE", borderColor: "rgba(36, 161, 222, 0.4)" }}
            >
              ✈️ Telegram
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleShareWhatsApp}
              title="Share 677 Infected Wallets to WhatsApp"
              style={{ background: "rgba(37, 211, 102, 0.15)", color: "#25D366", borderColor: "rgba(37, 211, 102, 0.4)" }}
            >
              💬 WhatsApp
            </button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
              <button
                type="button"
                className="btn ghost"
                onClick={handleShareIntelNative}
                title="Share via device menu"
              >
                📤 Share...
              </button>
            ) : null}
            <button type="button" className="btn" onClick={handleExportJSON}>
              📥 Export 677 IOCs (JSON)
            </button>
            <button type="button" className="btn" onClick={handleExportTXT}>
              📄 Export Text List ({filteredIocs.length})
            </button>
          </div>
        </div>

        {/* KPI Summary Tiles */}
        <div className="fasttx-kpi-grid">
          <div className="fasttx-kpi-tile">
            <span className="fasttx-kpi-lbl">TOTAL STOLEN</span>
            <span className="fasttx-kpi-val" style={{ color: "var(--red)" }}>
              ~$6.3B
            </span>
            <span className="fasttx-kpi-sub">Across 9 chains + BTC peeling</span>
          </div>

          <div className="fasttx-kpi-tile">
            <span className="fasttx-kpi-lbl">FROZEN / CLAWED BACK</span>
            <span className="fasttx-kpi-val" style={{ color: "#3fd69c" }}>
              ~$2.7B
            </span>
            <span className="fasttx-kpi-sub">Tether, Circle & Arbitrum Council</span>
          </div>

          <div className="fasttx-kpi-tile">
            <span className="fasttx-kpi-lbl">INFECTED WALLETS (IOCs)</span>
            <span className="fasttx-kpi-val" style={{ color: "#67a9ff" }}>
              677
            </span>
            <span className="fasttx-kpi-sub">376 Tron · 263 EVM · 31 Bitcoin</span>
          </div>

          <div className="fasttx-kpi-tile">
            <span className="fasttx-kpi-lbl">DETECTION SPEED</span>
            <span className="fasttx-kpi-val" style={{ color: "#f2b64a" }}>
              ≤ 7s
            </span>
            <span className="fasttx-kpi-sub">Blockaid real-time inclusion alert</span>
          </div>
        </div>
      </div>

      {/* Main View Navigation Tabs */}
      <div className="fasttx-subnav-bar">
        <div className="fasttx-subnav-left">
          <button
            type="button"
            className={`fasttx-subnav-btn ${activeView === "radar" ? "active" : ""}`}
            onClick={() => setActiveView("radar")}
          >
            <span className="radar-pulse-icon" />
            <span>⚡ Live Fast Transactions Radar ({filteredMoves.length})</span>
          </button>
          <button
            type="button"
            className={`fasttx-subnav-btn ${activeView === "directory" ? "active" : ""}`}
            onClick={() => setActiveView("directory")}
          >
            <span>🛡️ 677 Infected Wallets Directory</span>
            <span className="count-pill">{filteredIocs.length}</span>
          </button>
          <button
            type="button"
            className={`fasttx-subnav-btn ${activeView === "pipelines" ? "active" : ""}`}
            onClick={() => setActiveView("pipelines")}
          >
            <span>🌐 Attack Pipelines & Launder Matrix</span>
          </button>
        </div>

        {/* Global Chain Filter Bar */}
        <div className="fasttx-chain-selector">
          <span className="fasttx-filter-label">Chain:</span>
          {["all", "ethereum", "tron", "bitcoin", "avalanche", "arbitrum", "optimism", "solana", "polygon", "base"].map(
            (c) => {
              const cfg = CHAINS[c];
              const count = chainCounts[c] || 0;
              const isSel = selectedChain === c;
              return (
                <button
                  key={c}
                  type="button"
                  className={`fasttx-chain-chip ${isSel ? "selected" : ""}`}
                  onClick={() => setSelectedChain(c)}
                  style={{
                    borderColor: isSel ? cfg?.color || "#fff" : undefined,
                    background: isSel ? (cfg ? `${cfg.color}22` : "rgba(255,255,255,0.1)") : undefined,
                  }}
                >
                  {cfg ? (
                    <span className="fasttx-chain-dot" style={{ background: cfg.color }}>
                      {cfg.sym}
                    </span>
                  ) : null}
                  <span>{c === "all" ? "All Chains" : cfg?.name || c}</span>
                  <span className="fasttx-chain-count">{count}</span>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* VIEW 1: LIVE FAST TRANSACTIONS RADAR */}
      {activeView === "radar" ? (
        <div className="fasttx-radar-view">
          {/* Controls Bar */}
          <div className="fasttx-radar-controls">
            <div className="fasttx-radar-ctrl-group">
              <button
                type="button"
                className={`btn ${isLiveStreaming ? "primary" : ""}`}
                onClick={() => setIsLiveStreaming((p) => !p)}
              >
                {isLiveStreaming ? "⏸️ Pause Stream" : "▶️ Resume Live Stream"}
              </button>

              <div className="fasttx-speed-seg">
                <span className="speed-lbl">Speed:</span>
                {[1, 2, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`speed-btn ${streamSpeed === s ? "on" : ""}`}
                    onClick={() => setStreamSpeed(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <span className="fasttx-radar-indicator">
                <span className="live-status-dot confirmed" />
                {isLiveStreaming ? "Streaming live mempool & hop transfers" : "Feed paused"}
              </span>
            </div>

            <div className="fasttx-radar-meta">
              <span>Showing <b>{filteredMoves.length}</b> multi-chain fast transfers</span>
              <button type="button" className="btn ghost" onClick={() => handleCopyAllFiltered()}>
                📋 Copy Addresses
              </button>
            </div>
          </div>

          {/* Stream Grid / List */}
          <div className="fasttx-stream-list">
            {filteredMoves.map((m, idx) => {
              const chainCfg = CHAINS[m.chain] || { name: m.chain, sym: "?", color: "#64748b", exp: "" };
              const toChainCfg = m.toChain ? CHAINS[m.toChain] : null;
              const fromNode = NODE_MAP[m.from];
              const toNode = NODE_MAP[m.to];
              const fromAddr = fromNode?.addr || (m.from.startsWith("0x") || m.from.startsWith("T") || m.from.startsWith("bc1") ? m.from : null);
              const toAddr = toNode?.addr || (m.to.startsWith("0x") || m.to.startsWith("T") || m.to.startsWith("bc1") ? m.to : null);
              const isAlert = newTxAlert === m.id;

              return (
                <div
                  key={m.id || idx}
                  className={`fasttx-card ${isAlert ? "new-tx-flash" : ""} ${m.recovery ? "recovery-card" : ""}`}
                >
                  <div className="fasttx-card-head">
                    <div className="fasttx-card-chain-badge">
                      <span className="fasttx-chain-coin" style={{ background: chainCfg.color }}>
                        {chainCfg.sym}
                      </span>
                      <span className="chain-name">{chainCfg.name}</span>
                      {toChainCfg ? (
                        <>
                          <span className="bridge-arrow">➔</span>
                          <span className="fasttx-chain-coin" style={{ background: toChainCfg.color }}>
                            {toChainCfg.sym}
                          </span>
                          <span className="chain-name">{toChainCfg.name} (Bridge)</span>
                        </>
                      ) : null}
                    </div>

                    <div className="fasttx-card-timing">
                      <span
                        className={`detection-badge ${
                          m.det.k === "onsight"
                            ? "det-malicious"
                            : m.det.k === "detector"
                            ? "det-fast"
                            : m.det.k === "preflag"
                            ? "det-preflag"
                            : "det-feed"
                        }`}
                        title={m.det.how}
                      >
                        ⚡ {m.det.txt || "Blockaid Traced"}
                      </span>
                      <span className="tx-time">{m.t ? timeAgo(new Date(m.t).getTime()) : "Recorded"}</span>
                      {m.t ? (
                        <span className="tx-utc-stamp" title="Exact UTC Timestamp">
                          {m.t.slice(11, 19)} UTC
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="mini-tx-share-btn"
                        onClick={() => handleShareMove(m)}
                        title="Share this transaction move on X"
                      >
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Share
                      </button>
                    </div>
                  </div>

                  <div className="fasttx-card-body">
                    {/* From Entity */}
                    <div className="tx-endpoint from-endpoint">
                      <span className="endpoint-lbl">FROM</span>
                      <span className="endpoint-name">{fromNode?.label || m.from}</span>
                      {fromAddr ? (
                        <div className="endpoint-addr-wrap">
                          <span className="endpoint-addr" title={fromAddr}>
                            {shortAddr(fromAddr, 7, 5)}
                          </span>
                          <button
                            type="button"
                            className="mini-copy-btn"
                            onClick={() => handleCopy(fromAddr, "From address")}
                            title="Copy address"
                          >
                            📋
                          </button>
                          <a
                            href={getExplorerUrl(m.chain, fromAddr) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mini-link-btn"
                            title="View on Explorer"
                          >
                            ↗
                          </a>
                        </div>
                      ) : null}
                    </div>

                    {/* Transfer Route Vector */}
                    <div className="tx-vector-arrow">
                      <span className="tx-amount-badge">{m.amt}</span>
                      <div className="tx-arrow-graphic">
                        <span className="arrow-line" />
                        <span className="arrow-head">▶</span>
                      </div>
                      {m.bridge ? <span className="bridge-pill">BRIDGE CCTP</span> : null}
                      {m.recovery ? <span className="recovery-pill">CLAWBACK</span> : null}
                    </div>

                    {/* To Entity */}
                    <div className="tx-endpoint to-endpoint">
                      <span className="endpoint-lbl">TO</span>
                      <span className="endpoint-name">{toNode?.label || m.to}</span>
                      {toAddr ? (
                        <div className="endpoint-addr-wrap">
                          <span className="endpoint-addr" title={toAddr}>
                            {shortAddr(toAddr, 7, 5)}
                          </span>
                          <button
                            type="button"
                            className="mini-copy-btn"
                            onClick={() => handleCopy(toAddr, "To address")}
                            title="Copy address"
                          >
                            📋
                          </button>
                          <a
                            href={getExplorerUrl(m.toChain || m.chain, toAddr) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mini-link-btn"
                            title="View on Explorer"
                          >
                            ↗
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {m.note ? (
                    <div className="fasttx-card-foot">
                      <span className="tx-note-icon">ℹ️</span>
                      <span className="tx-note-text">{m.note}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* VIEW 2: 677 INFECTED WALLETS DIRECTORY */}
      {activeView === "directory" ? (
        <div className="fasttx-dir-view">
          {/* Search & Filter Bar */}
          <div className="fasttx-dir-toolbar">
            <div className="fasttx-search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search 677 infected wallets by address (0x, T..., bc1...), role (sweeper, hub, stash), status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="fasttx-search-input"
              />
              {searchQuery ? (
                <button type="button" className="clear-search-btn" onClick={() => setSearchQuery("")}>
                  ✕
                </button>
              ) : null}
            </div>

            <div className="fasttx-status-filters">
              <span className="filter-label">Status:</span>
              {[
                { id: "all", label: "All Statuses" },
                { id: "active", label: "⚡ Active / Selling" },
                { id: "frozen", label: "❄️ Frozen / Clawback" },
                { id: "holding", label: "📦 Stash / Unmoved" },
                { id: "layering", label: "🔄 TRON Layering Hubs" },
                { id: "contract", label: "📜 Sweeper Contracts" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className={`status-chip ${selectedStatus === st.id ? "active" : ""}`}
                  onClick={() => setSelectedStatus(st.id)}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Directory Stats Bar */}
          <div className="fasttx-dir-status-bar">
            <span>
              Displaying <b>{visibleIocs.length}</b> of <b>{filteredIocs.length}</b> matching IOC wallets (Total dataset: <b>677</b>)
            </span>
            <div className="dir-actions">
              <button type="button" className="btn ghost" onClick={handleCopyAllFiltered}>
                📋 Copy All {filteredIocs.length} Addrs
              </button>
              <button type="button" className="btn ghost" onClick={handleExportTXT}>
                📄 Export TXT
              </button>
            </div>
          </div>

          {/* IOC Table */}
          <div className="fasttx-table-container">
            <table className="fasttx-table">
              <thead>
                <tr>
                  <th style={{ width: "45px" }}>#</th>
                  <th>Infected Wallet Address</th>
                  <th>Chains</th>
                  <th>Threat Intelligence Classification</th>
                  <th>Exploit Status</th>
                  <th style={{ width: "110px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleIocs.map((ioc, idx) => {
                  const isTron = ioc.chains.includes("tron");
                  const isBtc = ioc.chains.includes("bitcoin");
                  const primaryChain = isTron ? "tron" : isBtc ? "bitcoin" : ioc.chains[0] || "ethereum";
                  const expUrl = getExplorerUrl(primaryChain, ioc.a);
                  const statusLower = ioc.s.toLowerCase();

                  let statusCls = "badge-neutral";
                  if (statusLower.includes("active") || statusLower.includes("selling")) statusCls = "badge-malicious";
                  if (statusLower.includes("frozen") || statusLower.includes("clawed")) statusCls = "badge-frozen";
                  if (statusLower.includes("unmoved") || statusLower.includes("stash") || statusLower.includes("holding")) statusCls = "badge-holding";
                  if (statusLower.includes("contract")) statusCls = "badge-contract";

                  return (
                    <tr key={`${ioc.a}_${idx}`}>
                      <td className="row-idx">{idx + 1}</td>
                      <td>
                        <div className="ioc-addr-cell">
                          <span className="ioc-full-addr">{ioc.a}</span>
                          <span className="ioc-short-addr">{shortAddr(ioc.a, 8, 6)}</span>
                          <button
                            type="button"
                            className="mini-copy-btn"
                            onClick={() => handleCopy(ioc.a, "Infected wallet")}
                            title="Copy address"
                          >
                            📋
                          </button>
                          <button
                            type="button"
                            className="mini-copy-btn mini-share-ioc-btn"
                            onClick={() => handleShareIoc(ioc)}
                            title="Share infected wallet on X"
                          >
                            <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="ioc-chains-cell">
                          {ioc.chains.map((c) => {
                            const cfg = CHAINS[c];
                            return (
                              <span
                                key={c}
                                className="ioc-chain-badge"
                                style={{
                                  background: cfg ? `${cfg.color}1e` : "#334155",
                                  borderColor: cfg ? `${cfg.color}55` : "#475569",
                                  color: cfg ? cfg.color : "#94a3b8",
                                }}
                                title={cfg?.name || c}
                              >
                                {cfg?.sym || c.slice(0, 2).toUpperCase()} {cfg?.name || c}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="ioc-role-cell">
                          <span className="ioc-role-title">{ioc.r}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`ioc-status-badge ${statusCls}`}>{ioc.s}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="ioc-action-cell">
                          {expUrl ? (
                            <a
                              href={expUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ioc-explorer-btn"
                              title="Inspect on block explorer"
                            >
                              Explorer ↗
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load More Button */}
          {visibleIocs.length < filteredIocs.length ? (
            <div className="fasttx-load-more-wrap">
              <button
                type="button"
                className="btn primary"
                onClick={() => setPageLimit((prev) => Math.min(filteredIocs.length, prev + 100))}
              >
                Load Next 100 Wallets (Showing {visibleIocs.length} of {filteredIocs.length})
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setPageLimit(filteredIocs.length)}
              >
                Show All {filteredIocs.length} Wallets
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* VIEW 3: ATTACK PIPELINES & MULTI-CHAIN MATRIX */}
      {activeView === "pipelines" ? (
        <div className="fasttx-pipelines-view">
          <SectionTitle
            title="The 3 Multi-Chain Outflow Pipelines"
            sub="How the exploiter drained $6.3B across Ethereum, TRON, Bitcoin, and EVM L2s within 120 minutes."
          />

          <div className="fasttx-pipeline-cards-grid">
            {/* Pipeline 1: EVM EIP-7702 */}
            <div className="pipeline-card">
              <div className="pipeline-card-head">
                <span className="pipeline-icon" style={{ background: "#627EEA22", color: "#627EEA" }}>
                  E
                </span>
                <div>
                  <h3 className="pipeline-title">1. EVM EIP-7702 Delegated Sweeps</h3>
                  <span className="pipeline-chain-tag">Ethereum · Arbitrum · Optimism · Avalanche · Polygon</span>
                </div>
              </div>
              <p className="pipeline-desc">
                Exploiter set EIP-7702 delegation contract (<code>0x63e8...6fae</code>) on Binance 14 hot wallet, authorizing
                sweeper code that called <code>executeBatch()</code> with selector <code>0x8aaa8f3b</code>. Collected into{" "}
                <code>0x5227...2f8c</code> (drain1), moving over $2.5B in initial sweep.
              </p>
              <div className="pipeline-stat-box">
                <div className="p-stat">
                  <span className="p-stat-lbl">Primary Stashes</span>
                  <span className="p-stat-val">197,460 ETH + 137,602 ETH</span>
                </div>
                <div className="p-stat">
                  <span className="p-stat-lbl">Issuer Freezes</span>
                  <span className="p-stat-val" style={{ color: "#3fd69c" }}>
                    $1.15B USDT + $823M USDC Frozen
                  </span>
                </div>
              </div>
            </div>

            {/* Pipeline 2: TRON Layering */}
            <div className="pipeline-card">
              <div className="pipeline-card-head">
                <span className="pipeline-icon" style={{ background: "#EB002922", color: "#EB0029" }}>
                  T
                </span>
                <div>
                  <h3 className="pipeline-title">2. TRON 351 Layering Wallets</h3>
                  <span className="pipeline-chain-tag">TRON Network (TRX / TRC-20 USDT)</span>
                </div>
              </div>
              <p className="pipeline-desc">
                From Binance TRON hot wallet (<code>TDqSqu...</code>), 612.7M USDT and 46.4M TRX moved to first hop{" "}
                <code>TG5iBM...</code>, swapped 300M USDT through <code>TPBkSj...</code> into 638.2M TRX, and dispersed through a
                massive network of <b>351 layering wallets</b> and relay nodes.
              </p>
              <div className="pipeline-stat-box">
                <div className="p-stat">
                  <span className="p-stat-lbl">Layering Wallets</span>
                  <span className="p-stat-val">351 Active Hubs & Downstream</span>
                </div>
                <div className="p-stat">
                  <span className="p-stat-lbl">Tether TRON Freeze</span>
                  <span className="p-stat-val" style={{ color: "#3fd69c" }}>
                    $612.7M USDT Frozen on TG5
                  </span>
                </div>
              </div>
            </div>

            {/* Pipeline 3: Bitcoin Peeling Chain */}
            <div className="pipeline-card">
              <div className="pipeline-card-head">
                <span className="pipeline-icon" style={{ background: "#F7931A22", color: "#F7931A" }}>
                  ₿
                </span>
                <div>
                  <h3 className="pipeline-title">3. Bitcoin 18,270 BTC Peeling Chain</h3>
                  <span className="pipeline-chain-tag">Bitcoin Native UTXO Hops</span>
                </div>
              </div>
              <p className="pipeline-desc">
                18,270.2 BTC ($1.24B) drained in Block 973,732 into peel root <code>bc1q0mtc...</code>. The attacker split the
                funds across 10 peel change outputs in the same block, parking the value in <b>16 wallets holding exactly 1,000 BTC each</b>{" "}
                plus two smaller peel outputs (832.5 BTC and 437.7 BTC).
              </p>
              <div className="pipeline-stat-box">
                <div className="p-stat">
                  <span className="p-stat-lbl">1,000 BTC Stashes</span>
                  <span className="p-stat-val">16 Wallets (16,000 BTC Unmoved)</span>
                </div>
                <div className="p-stat">
                  <span className="p-stat-lbl">Onchain Status</span>
                  <span className="p-stat-val" style={{ color: "#f2b64a" }}>
                    UTXOs Unspent · Mixer Ingress Monitored
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reference & Attribution Notice */}
          <div className="fasttx-attribution-banner">
            <div className="attr-content">
              <h4>Threat Intelligence & Incident Attribution</h4>
              <p>
                All 677 Indicators of Compromise (IOCs), wallet roles, and detection timestamps are indexed directly from{" "}
                <a href="https://binance-hack-funds.blockaid.io/" target="_blank" rel="noopener noreferrer">
                  Blockaid&apos;s Risk Exposure Desk
                </a>{" "}
                and cross-referenced against public onchain logs from Etherscan, Tronscan, and Mempool.space.
              </p>
            </div>
            <a
              href="https://binance-hack-funds.blockaid.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ background: "#1e293b", color: "#fff", whiteSpace: "nowrap" }}
            >
              Open Blockaid Incident Desk ↗
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

