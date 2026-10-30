import seedJson from "../data/seed.json";

export type StackToken = {
  sym: string;
  stolen: number;
  held: number;
  price: number;
  mcap: number;
  vol24: number;
  addr: string;
  dec: number;
  stable: boolean;
};

export type SaleEvent = {
  ts: string;
  when: string;
  kind: string;
  sym: string;
  amt: number;
  usd: number;
  wa: string;
  wallet: string;
  to: string;
  hash: string;
};

export type Wallet = { a: string; label: string; eth: number; toks: string[] };

export type BtcNode = { bal: number; n: number; d: number };

export type BtcData = {
  root: string;
  victim: string;
  stolen: number;
  nodes: Record<string, BtcNode>;
  edges: { src: string; dst: string; btc: number; ts: number; tx: string; conf: boolean }[];
  holders: Record<string, number>;
  price: number;
  updated: number;
};

export type Seed = {
  meta: {
    generated: string;
    snapshot: string;
    binanceSymbols: Record<string, string>;
    assets: number;
    events: number;
    wallets: number;
  };
  stack: StackToken[];
  history: SaleEvent[];
  wallets: Wallet[];
  btc: BtcData;
};

export const seed = seedJson as unknown as Seed;
export const BINANCE_BASE = "https://data-api.binance.vision";
export const binancePairs = seed.meta.binanceSymbols;
export const ETH_ADDRESS = "0x5227f603c1ee34ce3c06efe6477003bdfccb2f8c";

export const KEY_ADDRESSES = {
  EXPLOIT_CONTRACT: "0x63e842B054Bd624a465454D533C33F573e9c6fAe",
  MAIN_EXPLOITER: "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c",
  PROM_RECEIVER: "0xdd6dbbe67262ccc9b1824de1257999efc6c52296",
  DEPLOYER_PHISHING: "0x80d04079ffc53eb14edbeeb37279d126f45552df",
  VAULT_195K_ETH: "0x8532FA14ACAf483729C449b8458aedDb900543D4",
  VAULT_122K_ETH: "0xc887aF690E0301CD4edBbCe8F8d31b4EC65B286A",
  CONSOLIDATION_RELAY: "0x79e70d139fc05aa75f75611fdf2680e9952b544a",
  OUTFLOW_SINK_17K: "0x03b0eE5d82990cFF1bDa48651AC3e436d1a020ea",
  DEX_RELAY_SINK: "0x897C80d1a9729E94460e2Bd93178bD5215158DF3",
} as const;

export type TargetEntity = {
  address: string;
  label: string;
  shortLabel: string;
  tag: string;
  role: string;
  type: "contract" | "eoa";
  desc: string;
  etherscanUrl: string;
  codeUrl?: string;
  balanceEth?: number;
  highlightColor: string;
};

export const TARGET_ENTITIES: Record<string, TargetEntity> = {
  "0x63e842b054bd624a465454d533c33f573e9c6fae": {
    address: "0x63e842B054Bd624a465454D533C33F573e9c6fAe",
    label: "Binance Sweeper Contract",
    shortLabel: "Sweeper Contract",
    tag: "Exploit Contract (EIP-7702)",
    role: "Malicious implementation contract used to hijack Binance hot wallet execution",
    type: "contract",
    desc: "Unverified sweeper contract deployed during the breach. Sprayed across 50 sequential EIP-7702 nonce authorizations to hijack Binance 14 hot wallet.",
    etherscanUrl: "https://etherscan.io/address/0x63e842B054Bd624a465454D533C33F573e9c6fAe",
    codeUrl: "https://etherscan.io/address/0x63e842B054Bd624a465454D533C33F573e9c6fAe#code",
    highlightColor: "var(--red)",
  },
  "0x5227f603c1ee34ce3c06efe6477003bdfccb2f8c": {
    address: "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c",
    label: "Suspect Binance Exploiter 2 (Main Vault)",
    shortLabel: "Main Vault",
    tag: "Primary Exploiter Vault",
    role: "Primary holding vault for the stolen haul across Ethereum",
    type: "eoa",
    desc: "Main holding address receiving swept assets. Holds $1.17B USDT (frozen by Tether), $823M USDC, 195.4K ETH moved, and hundreds of millions in altcoins.",
    etherscanUrl: "https://etherscan.io/address/0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c",
    balanceEth: 4.34,
    highlightColor: "var(--amber)",
  },
  "0x8532fa14acaf483729c449b8458aeddb900543d4": {
    address: "0x8532FA14ACAf483729C449b8458aedDb900543D4",
    label: "195K ETH Exploiter Vault",
    shortLabel: "195K ETH Vault",
    tag: "Mega Vault ($439M)",
    role: "Primary cold storage vault holding 197,460 ETH moved from Main Exploiter wallet",
    type: "eoa",
    desc: "Primary cold storage address holding 197,460 ETH drained from Binance hot wallets.",
    etherscanUrl: "https://etherscan.io/address/0x8532FA14ACAf483729C449b8458aedDb900543D4",
    balanceEth: 197460,
    highlightColor: "#f2b64a",
  },
  "0xc887af690e0301cd4edbbce8f8d31b4ec65b286a": {
    address: "0xc887aF690E0301CD4edBbCe8F8d31b4EC65B286A",
    label: "122K ETH Exploiter Vault",
    shortLabel: "122K ETH Vault",
    tag: "Secondary Vault ($306M)",
    role: "Secondary cold storage vault holding 137,602 ETH moved from Main Exploiter wallet",
    type: "eoa",
    desc: "Secondary cold storage address holding 137,602 ETH moved through the relay network.",
    etherscanUrl: "https://etherscan.io/address/0xc887aF690E0301CD4edBbCe8F8d31b4EC65B286A",
    balanceEth: 137602,
    highlightColor: "#e5a13b",
  },
  "0xdd6dbbe67262ccc9b1824de1257999efc6c52296": {
    address: "0xdd6dbbe67262ccc9b1824de1257999efc6c52296",
    label: "PROM Receiver & Liquidator",
    shortLabel: "Liquidator Bot",
    tag: "Automated DEX Liquidator",
    role: "Automated dumping bot systematically routing stolen tokens to DEXs",
    type: "eoa",
    desc: "High-frequency liquidator wallet that systematically received and dumped 908,792 PROM and altcoins into Uniswap and Curve pools.",
    etherscanUrl: "https://etherscan.io/address/0xdd6dbbe67262ccc9b1824de1257999efc6c52296",
    balanceEth: 0.00019,
    highlightColor: "var(--blue)",
  },
  "0x80d04079ffc53eb14edbeeb37279d126f45552df": {
    address: "0x80d04079ffc53eb14edbeeb37279d126f45552df",
    label: "Deployer / Phishing Infrastructure",
    shortLabel: "Phishing / Deployer",
    tag: "Active Mempool & Phishing",
    role: "High-frequency deployer and phishing address executing live onchain transactions",
    type: "eoa",
    desc: "High-frequency attacker infrastructure address executing rapid onchain batch transactions and contract setups across Ethereum.",
    etherscanUrl: "https://etherscan.io/address/0x80d04079ffc53eb14edbeeb37279d126f45552df",
    balanceEth: 0.15,
    highlightColor: "var(--violet)",
  },
  "0x79e70d139fc05aa75f75611fdf2680e9952b544a": {
    address: "0x79e70d139fc05aa75f75611fdf2680e9952b544a",
    label: "Consolidation Relay Wallet",
    shortLabel: "Relay Consolidation",
    tag: "Relay Hub",
    role: "High-volume aggregation wallet receiving proceeds from PEPE, USDE, FUN DEX sales",
    type: "eoa",
    desc: "Key intermediate relay hub aggregating liquidation proceeds from various sub-wallets.",
    etherscanUrl: "https://etherscan.io/address/0x79e70d139fc05aa75f75611fdf2680e9952b544a",
    highlightColor: "#a68cff",
  },
  "0x03b0ee5d82990cff1bda48651ac3e436d1a020ea": {
    address: "0x03b0eE5d82990cFF1bDa48651AC3e436d1a020ea",
    label: "17.2K ETH Outflow Sink",
    shortLabel: "17.2K ETH Sink",
    tag: "Outflow Sink",
    role: "Direct destination address receiving 17,260 ETH batches from MAIN vault",
    type: "eoa",
    desc: "Direct destination address receiving 17,260 ETH batches from MAIN vault.",
    etherscanUrl: "https://etherscan.io/address/0x03b0eE5d82990cFF1bDa48651AC3e436d1a020ea",
    highlightColor: "#67a9ff",
  },
  "0x897c80d1a9729e94460e2bd93178bd5215158df3": {
    address: "0x897C80d1a9729E94460e2Bd93178bD5215158DF3",
    label: "DEX Relay Sink",
    shortLabel: "DEX Relay",
    tag: "Relay Sink",
    role: "Relay wallet receiving proceeds from UNI and WLD DEX sales",
    type: "eoa",
    desc: "Relay wallet receiving proceeds from UNI and WLD DEX sales.",
    etherscanUrl: "https://etherscan.io/address/0x897C80d1a9729E94460e2Bd93178bD5215158DF3",
    highlightColor: "#3fd69c",
  },
};

export function getTargetEntity(address: string): TargetEntity | undefined {
  if (!address) return undefined;
  return TARGET_ENTITIES[address.toLowerCase()];
}

export function isTargetAddress(address: string): boolean {
  if (!address) return false;
  return Boolean(TARGET_ENTITIES[address.toLowerCase()]);
}

export function contractCodeUrl(addr: string): string {
  return `https://etherscan.io/address/${addr}#code`;
}

const snapshotPrices: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (const t of seed.stack) map[t.sym] = t.price;
  map.BTC = seed.btc.price;
  return map;
})();

export function snapshotPrice(sym: string): number {
  return snapshotPrices[sym] ?? 0;
}

export const KIND_META: Record<string, { label: string; cls: string }> = {
  "Sell (DEX)": { label: "Sold", cls: "sell" },
  "Sent out": { label: "Sent out", cls: "sent" },
  "Moved to own wallet": { label: "Own wallet", cls: "move" },
  "Moved to his own wallet": { label: "Own wallet", cls: "move" },
  Bridge: { label: "Bridged", cls: "bridge" },
  "Deposit (Aave)": { label: "Aave", cls: "deposit" },
  "Contract Exploit": { label: "Exploit", cls: "sell" },
  "EIP-7702 Delegation": { label: "EIP-7702", cls: "bridge" },
  "Deploy / Phish": { label: "Phish/Deploy", cls: "deposit" },
};

export function kindMeta(kind: string) {
  return KIND_META[kind] ?? { label: kind, cls: "move" };
}

export function txUrl(hash: string): string {
  return `https://etherscan.io/tx/${hash}`;
}
export function tokenUrl(addr: string): string {
  return addr && addr.startsWith("0x")
    ? `https://etherscan.io/token/${addr}`
    : "https://etherscan.io";
}
export function addressUrl(addr: string): string {
  return `https://etherscan.io/address/${addr}`;
}
export function btcAddressUrl(addr: string): string {
  return `https://mempool.space/address/${addr}`;
}

export type Tracked = {
  sym: string;
  token: StackToken | null;
  price: number;
  changePct: number;
  held: number;
  stolen: number;
  heldUsd: number;
  stolenUsd: number;
  soldUsd: number;
  gonePct: number;
  mcap: number;
  vol24: number;
  pctMcap: number;
  daysVol: number;
  onBinance: boolean;
  live: boolean;
};

export function buildTracked(prices: Record<string, number>, changes: Record<string, number>, volumes: Record<string, number>): Tracked[] {
  return seed.stack
    .map((t) => {
      const livePrice = prices[t.sym];
      const p = livePrice && livePrice > 0 ? livePrice : t.price;
      const heldUsd = t.held * p;
      const stolenUsd = t.stolen * p;
      const vol24 = volumes[t.sym] ?? t.vol24;
      return {
        sym: t.sym,
        token: t,
        price: p,
        changePct: changes[t.sym] ?? 0,
        held: t.held,
        stolen: t.stolen,
        heldUsd,
        stolenUsd,
        soldUsd: Math.max(0, stolenUsd - heldUsd),
        gonePct: t.stolen > 0 ? ((t.stolen - t.held) / t.stolen) * 100 : 0,
        mcap: t.mcap,
        vol24,
        pctMcap: t.mcap > 0 ? (heldUsd / t.mcap) * 100 : 0,
        daysVol: vol24 > 0 ? heldUsd / vol24 : 0,
        onBinance: Boolean(binancePairs[t.sym]),
        live: Boolean(livePrice),
      };
    })
    .sort((a, b) => b.heldUsd - a.heldUsd);
}

export type EventView = SaleEvent & { usdLive: number; priceNow: number };

export function buildEvents(prices: Record<string, number>): EventView[] {
  return seed.history.map((h) => {
    const p = prices[h.sym] ?? snapshotPrice(h.sym);
    return { ...h, priceNow: p, usdLive: p > 0 ? h.amt * p : h.usd };
  });
}

export type Totals = {
  stolenEth: number;
  heldEth: number;
  soldEth: number;
  ethHeld: number;
  btcHeld: number;
  btcHeldUsd: number;
  btcExits: number;
  ethPrice: number;
  btcPrice: number;
  lastSale: EventView | null;
  soldPct: number;
  topHolding: Tracked | null;
};

export function buildTotals(tracked: Tracked[], events: EventView[], ethPrice: number, btcPrice: number): Totals {
  const stolenEth = tracked.reduce((s, t) => s + t.stolenUsd, 0);
  const heldEth = tracked.reduce((s, t) => s + t.heldUsd, 0);
  const ethHeld = seed.wallets.reduce((s, w) => s + w.eth, 0) * ethPrice;
  const btcHeld = Object.values(seed.btc.holders).reduce((s, v) => s + v, 0);
  const btcExits = Object.values(seed.btc.nodes)
    .filter((n) => n.bal === 0 && n.d > 0)
    .reduce((s, n) => s + n.n, 0);
  const sales = events.filter((e) => e.kind === "Sell (DEX)");
  return {
    stolenEth,
    heldEth,
    soldEth: Math.max(0, stolenEth - heldEth),
    ethHeld,
    btcHeld,
    btcHeldUsd: btcHeld * btcPrice,
    btcExits,
    ethPrice,
    btcPrice,
    lastSale: sales[0] ?? null,
    soldPct: stolenEth > 0 ? ((stolenEth - heldEth) / stolenEth) * 100 : 0,
    topHolding: tracked[0] ?? null,
  };
}
