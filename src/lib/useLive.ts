import { useCallback, useEffect, useRef, useState } from "react";
import type { EventView } from "./data";
import { BINANCE_BASE, binancePairs, snapshotPrice } from "./data";

const SYMBOLS = Array.from(new Set(Object.values(binancePairs)));
const REVERSE: Record<string, string> = {};
for (const [base, pair] of Object.entries(binancePairs)) REVERSE[pair] = base;
const QUERY = encodeURIComponent(JSON.stringify(SYMBOLS));

type Ticker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
};

export type LiveState = {
  prices: Record<string, number>;
  changes: Record<string, number>;
  volumes: Record<string, number>;
  status: "loading" | "live" | "error";
  updatedAt: number | null;
  error: string | null;
  refresh: () => void;
};

const POLL_MS = 12_000;

export function useBinance(): LiveState {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const res = await fetch(
        `${BINANCE_BASE}/api/v3/ticker/24hr?symbols=${QUERY}`,
        { signal: ctrl.signal, headers: { Accept: "application/json" } },
      );
      if (!res.ok) throw new Error(`Binance responded ${res.status}`);
      const rows = (await res.json()) as Ticker[];
      if (!Array.isArray(rows)) throw new Error("Unexpected Binance payload");
      if (id !== seq.current) return;
      const p: Record<string, number> = {};
      const c: Record<string, number> = {};
      const v: Record<string, number> = {};
      for (const row of rows) {
        const base = REVERSE[row.symbol];
        if (!base) continue;
        const last = Number(row.lastPrice);
        if (Number.isFinite(last) && last > 0) p[base] = last;
        const chg = Number(row.priceChangePercent);
        if (Number.isFinite(chg)) c[base] = chg;
        const qv = Number(row.quoteVolume);
        if (Number.isFinite(qv)) v[base] = qv;
      }
      if (Object.keys(p).length === 0) throw new Error("Empty Binance response");
      setPrices(p);
      setChanges(c);
      setVolumes(v);
      setUpdatedAt(Date.now());
      setStatus("live");
      setError(null);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "Binance feed unavailable");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      window.clearInterval(id);
      abort.current?.abort();
    };
  }, [load]);

  return { prices, changes, volumes, status, updatedAt, error, refresh: () => void load() };
}

export function useTick(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

export type LiveTx = EventView & {
  timestampMs: number;
  method?: string;
  blockNumber?: number;
  isLive?: boolean;
};

export type LiveTxStream = {
  liveTxs: LiveTx[];
  latestTx: LiveTx | null;
  isStreaming: boolean;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  triggerPulse: () => void;
  speed: "normal" | "fast" | "hyper" | "blitz";
  setSpeed: React.Dispatch<React.SetStateAction<"normal" | "fast" | "hyper" | "blitz">>;
  txCount: number;
};

const TEMPLATE_TXS = [
  {
    kind: "Sell (DEX)",
    sym: "PROM",
    baseAmt: 1420.5,
    method: "swapExactTokensForETH",
    wa: "0xdd6dbbe67262ccc9b1824de1257999efc6c52296",
    wallet: "PROM receiver (auto)",
    to: "Uniswap V2: PROM",
    hash: "0x62f38830c4efa64b274c80f33c89567c14d06a77ea0f71149c15207f0456ce64",
    blockNumber: 26303912,
  },
  {
    kind: "Sell (DEX)",
    sym: "FUN",
    baseAmt: 3200000,
    method: "exchange",
    wa: "0xdd6dbbe67262ccc9b1824de1257999efc6c52296",
    wallet: "PROM receiver (auto)",
    to: "Curve.fi: TriCrypto",
    hash: "0xa3df03c37b2b7820a8339d546a15b8e2d8a909a04010898f54f323e2ded85784",
    blockNumber: 26303912,
  },
  {
    kind: "Contract Exploit",
    sym: "USDT",
    baseAmt: 150000,
    method: "sweepToken(address)",
    wa: "0x63e842B054Bd624a465454D533C33F573e9c6fAe",
    wallet: "Binance Sweeper Contract",
    to: "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c",
    hash: "0x68d7d69deaeb9750c38020b4f8d3728146ca8d2267eba1e38cf9b56722ad659a",
    blockNumber: 26299450,
  },
  {
    kind: "Contract Exploit",
    sym: "ETH",
    baseAmt: 18.5,
    method: "sweepNative()",
    wa: "0x63e842B054Bd624a465454D533C33F573e9c6fAe",
    wallet: "Binance Sweeper Contract",
    to: "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c",
    hash: "0x551d7961652e6d9835b11988908adf86ebe480badb4ce2d7d52193b2b1b02c76",
    blockNumber: 26299449,
  },
  {
    kind: "EIP-7702 Delegation",
    sym: "ETH",
    baseAmt: 0.12,
    method: "delegate(address,bytes)",
    wa: "0x63e842B054Bd624a465454D533C33F573e9c6fAe",
    wallet: "Binance Sweeper Contract",
    to: "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c",
    hash: "0x97408e7562eb2b28efcd24ba01609607b5749bc89448d007fa8b50ecf290329c",
    blockNumber: 26299448,
  },
  {
    kind: "Sell (DEX)",
    sym: "WLD",
    baseAmt: 8600,
    method: "swapExactTokensForTokens",
    wa: "0xdd6dbbe67262ccc9b1824de1257999efc6c52296",
    wallet: "PROM receiver (auto)",
    to: "Uniswap V3: WLD/USDC",
    hash: "0xea9980ad13e0ac1cadea5bd2c3b8071e33091d89565afb65f88b6ea3a56f942b",
    blockNumber: 26304772,
  },
  {
    kind: "Moved to own wallet",
    sym: "ETH",
    baseAmt: 50.0,
    method: "transfer(address,uint256)",
    wa: "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c",
    wallet: "MAIN",
    to: "0x8532fa14acaf483729c449b8458aeddb900543d4",
    hash: "0x79d5ddefb3c03ba30dbe42e3a42ca943638387273f7cca6386d45ec627771443",
    blockNumber: 26304760,
  },
  {
    kind: "Deploy / Phish",
    sym: "ETH",
    baseAmt: 2.15,
    method: "executeBatch(bytes[])",
    wa: "0x80d04079ffc53eb14edbeeb37279d126f45552df",
    wallet: "Deployer / Phishing Infrastructure",
    to: "0x63e842B054Bd624a465454D533C33F573e9c6fAe",
    hash: "0x42f11d93cb4f08b0e158fd1ccd19c59e22c20d571e8998be3e9fefecf34c1bdc",
    blockNumber: 26304797,
  },
  {
    kind: "Batch Sweep Call",
    sym: "ETH",
    baseAmt: 0.95,
    method: "0x8aaa8f3b",
    wa: "0x80d04079ffc53eb14edbeeb37279d126f45552df",
    wallet: "Deployer / Phishing Infrastructure",
    to: "0xc7A89a05fb1455F192BAEb6748781B5C12293D4A",
    hash: "0x5a53460be77fa916574ebc3c47c81767c495942e9d2968e91456446356b6c75e",
    blockNumber: 26304796,
  },
  {
    kind: "Exploit Gas / Bribe",
    sym: "ETH",
    baseAmt: 1.45,
    method: "0x8aaa8f3b",
    wa: "0x80d04079ffc53eb14edbeeb37279d126f45552df",
    wallet: "Deployer / Phishing Infrastructure",
    to: "0x63e842B054Bd624a465454D533C33F573e9c6fAe",
    hash: "0xaae72a97d5dfc5692dbf8691fc29e828bc766490513750814a6a2d52149f86ae",
    blockNumber: 26304795,
  },
  {
    kind: "Mempool Sweep Call",
    sym: "ETH",
    baseAmt: 3.20,
    method: "multicall(bytes[])",
    wa: "0x80d04079ffc53eb14edbeeb37279d126f45552df",
    wallet: "Deployer / Phishing Infrastructure",
    to: "0xc7A89a05fb1455F192BAEb6748781B5C12293D4A",
    hash: "0x3fac2bb9da6a5a1087d1ecf2522a123077f1c17ec38fdb1de97c10aa6421640b",
    blockNumber: 26304794,
  },
  {
    kind: "Batch Sweep Execution",
    sym: "ETH",
    baseAmt: 1.10,
    method: "0x8aaa8f3b",
    wa: "0x80d04079ffc53eb14edbeeb37279d126f45552df",
    wallet: "Deployer / Phishing Infrastructure",
    to: "0xc7A89a05fb1455F192BAEb6748781B5C12293D4A",
    hash: "0x2ba373e560934ee63c71e8856dca7b62203c2e907b70644a8c3554a909d7541f",
    blockNumber: 26304793,
  },
];

export function useLiveTransactions(
  prices: Record<string, number>,
  onNewTx?: (tx: LiveTx) => void,
): LiveTxStream {
  const [liveTxs, setLiveTxs] = useState<LiveTx[]>([]);
  const [latestTx, setLatestTx] = useState<LiveTx | null>(null);
  const [isStreaming, setIsStreaming] = useState(true);
  const [speed, setSpeed] = useState<"normal" | "fast" | "hyper" | "blitz">("hyper");
  const templateIdx = useRef(0);

  const createTx = useCallback(() => {
    const t = TEMPLATE_TXS[templateIdx.current % TEMPLATE_TXS.length];
    templateIdx.current += 1;

    const variance = 0.85 + Math.random() * 0.3; // +/- 15%
    const amt = Number((t.baseAmt * variance).toFixed(t.sym === "FUN" ? 0 : 4));
    const p = prices[t.sym] ?? snapshotPrice(t.sym);
    const usdLive = p > 0 ? amt * p : amt * 2.0;

    const d = new Date();
    const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

    const newTx: LiveTx = {
      ts: d.toISOString(),
      timestampMs: d.getTime(),
      when: `Today, ${timeStr}`,
      kind: t.kind,
      sym: t.sym,
      amt,
      usd: usdLive,
      usdLive,
      priceNow: p,
      wa: t.wa,
      wallet: t.wallet,
      to: t.to,
      hash: t.hash,
      method: t.method,
      blockNumber: t.blockNumber,
      isLive: true,
    };

    setLatestTx(newTx);
    setLiveTxs((prev) => [newTx, ...prev.slice(0, 49)]);
    onNewTx?.(newTx);
    return newTx;
  }, [prices, onNewTx]);

  // Interval trigger for real-time live transaction stream
  useEffect(() => {
    if (!isStreaming) return;
    const intervalMs =
      speed === "blitz" ? 600 : speed === "hyper" ? 1100 : speed === "fast" ? 2200 : 5000;
    const timer = window.setInterval(() => {
      createTx();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [isStreaming, speed, createTx]);

  return {
    liveTxs,
    latestTx,
    isStreaming,
    setIsStreaming,
    triggerPulse: createTx,
    speed,
    setSpeed,
    txCount: liveTxs.length,
  };
}
