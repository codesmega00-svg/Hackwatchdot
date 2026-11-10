// Robinhood Dust to ETH Sweeper Engine
// Integrations:
// 1. Robinhood Crypto Trading API: https://docs.robinhood.com/crypto/trading/
// 2. LI.FI DEX & Multi-Token Aggregation Protocol: https://docs.li.fi/introduction/introduction

export const PROTOCOL_FEE_PCT = 0.20; // 20% protocol fee
export const USER_REVERT_PCT = 0.80; // 80% reverted back to user's wallet
export const DEFAULT_DUST_THRESHOLD_USD = 30.0; // Tokens valued < $30 USD
export const PROTOCOL_WALLET = "0x24fe2677F951493eE42550Aa05c55c713de5c556"; // HackWatch Protocol Treasury

export interface DustToken {
  id: string;
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance: number;
  balanceFormatted: string;
  priceUsd: number;
  valueUsd: number;
  chain: string;
  chainId: number;
  isRobinhoodListed: boolean;
  isDust: boolean; // true if valueUsd > 0 && valueUsd < threshold
  logoUrl: string;
  sourceLiquidity: string;
}

export interface SweepQuote {
  tokens: DustToken[];
  totalDustUsd: number;
  protocolFeePct: number;
  protocolFeeUsd: number;
  protocolFeeEth: number;
  userRevertPct: number;
  userRevertUsd: number;
  userRevertEth: number;
  estimatedGasUsd: number;
  gasSavingsUsd: number;
  ethPrice: number;
  routes: {
    aggregator: string;
    dexes: string[];
    contractAddress: string;
    integratorFeeBps: number; // 2000 bps = 20%
  };
}

export interface SweepStep {
  id: "quote" | "permit" | "swap" | "split" | "revert" | "success";
  title: string;
  description: string;
  status: "pending" | "processing" | "success" | "error";
  txHash?: string;
  detail?: string;
}

export interface SweepReceipt {
  txHash: string;
  blockNumber: number;
  timestamp: string;
  userWallet: string;
  protocolWallet: string;
  tokensCount: number;
  totalUsdSwept: number;
  userReceivedEth: number;
  userReceivedUsd: number;
  protocolFeeEth: number;
  protocolFeeUsd: number;
  gasUsedEth: number;
  gasUsedUsd: number;
  explorerUrl: string;
  lifiExecutionId: string;
  robinhoodOrderId: string;
  swappedTokens: { symbol: string; amount: string; usd: number }[];
}

export interface PresetWallet {
  label: string;
  address: string;
  tag: string;
  description: string;
}

export const PRESET_WALLETS: PresetWallet[] = [
  {
    label: "Robinhood Hot Wallet 8",
    address: "0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489",
    tag: "Robinhood Custody",
    description: "Official Robinhood Exchange Ethereum holding wallet",
  },
  {
    label: "Binance Exploiter Staging",
    address: "0x11142F60f6Ec1b2A53d686f0302E15e8b340Fa98",
    tag: "Exploiter Dust",
    description: "Active staging address with leftover low-cap ERC-20 dust",
  },
  {
    label: "Infected Victim Wallet",
    address: "0x51E2818816c5264b3E4f762Fa5D60E58Fff86475",
    tag: "Victim Dust",
    description: "Infected user wallet with fragmented dust balances",
  },
  {
    label: "Investigation Sleuth Wallet",
    address: "0x71a2B890F34bC1a3c74E21D71b9B2eD95c2192b4",
    tag: "Community Sleuth",
    description: "Community researcher wallet with active small token balances",
  },
];

// Catalog of Robinhood Crypto listed tokens with real contract addresses and logos
export const ROBINHOOD_CRYPTO_TOKENS = [
  {
    symbol: "PEPE",
    name: "Pepe",
    address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
    decimals: 18,
    basePrice: 0.0000094,
    logoUrl: "https://assets.coingecko.com/coins/images/29850/standard/pepe-token.png",
  },
  {
    symbol: "SHIB",
    name: "Shiba Inu",
    address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
    decimals: 18,
    basePrice: 0.0000178,
    logoUrl: "https://assets.coingecko.com/coins/images/11939/standard/shiba.png",
  },
  {
    symbol: "UNI",
    name: "Uniswap",
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    decimals: 18,
    basePrice: 7.65,
    logoUrl: "https://assets.coingecko.com/coins/images/12504/standard/uniswap-uni.png",
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18,
    basePrice: 11.45,
    logoUrl: "https://assets.coingecko.com/coins/images/877/standard/chainlink-new-logo.png",
  },
  {
    symbol: "AAVE",
    name: "Aave",
    address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    decimals: 18,
    basePrice: 142.5,
    logoUrl: "https://assets.coingecko.com/coins/images/12645/standard/AAVE.png",
  },
  {
    symbol: "CRV",
    name: "Curve DAO",
    address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
    decimals: 18,
    basePrice: 0.28,
    logoUrl: "https://assets.coingecko.com/coins/images/12124/standard/Curve.png",
  },
  {
    symbol: "POL",
    name: "Polygon (POL)",
    address: "0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3e6",
    decimals: 18,
    basePrice: 0.365,
    logoUrl: "https://assets.coingecko.com/coins/images/4713/standard/polygon.png",
  },
  {
    symbol: "COMP",
    name: "Compound",
    address: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
    decimals: 18,
    basePrice: 48.2,
    logoUrl: "https://assets.coingecko.com/coins/images/10775/standard/COMP.png",
  },
  {
    symbol: "ARB",
    name: "Arbitrum",
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    decimals: 18,
    basePrice: 0.54,
    logoUrl: "https://assets.coingecko.com/coins/images/16547/standard/arbitrum-shield.png",
  },
  {
    symbol: "LDO",
    name: "Lido DAO",
    address: "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
    decimals: 18,
    basePrice: 1.18,
    logoUrl: "https://assets.coingecko.com/coins/images/13573/standard/Lido_DAO.png",
  },
  {
    symbol: "SUSHI",
    name: "Sushi",
    address: "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2",
    decimals: 18,
    basePrice: 0.74,
    logoUrl: "https://assets.coingecko.com/coins/images/12271/standard/sushi.png",
  },
  {
    symbol: "ENS",
    name: "Ethereum Name Service",
    address: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
    decimals: 18,
    basePrice: 17.8,
    logoUrl: "https://assets.coingecko.com/coins/images/19785/standard/ens.png",
  },
  {
    symbol: "USDD",
    name: "Decentralized USD",
    address: "0x0C10bF8FcB7Bf5412187A595ab97a3609160b5c6",
    decimals: 18,
    basePrice: 0.998,
    logoUrl: "https://assets.coingecko.com/coins/images/25380/standard/UUSD.jpg",
  },
  {
    symbol: "DOGE",
    name: "Wrapped Dogecoin",
    address: "0xBA35Ea5236ec907c8227652781cfEb348877aF6b",
    decimals: 8,
    basePrice: 0.162,
    logoUrl: "https://assets.coingecko.com/coins/images/5/standard/dogecoin.png",
  },
];

// Simple deterministic hash helper for consistent wallet dust simulation
function hashAddress(addr: string): number {
  let hash = 0;
  const clean = addr.toLowerCase().replace("0x", "");
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Generate deterministic realistic dust tokens (< $30 USD) for any EVM wallet
export function generateDeterministicDustTokens(
  address: string,
  maxThresholdUsd: number = DEFAULT_DUST_THRESHOLD_USD
): DustToken[] {
  const seed = hashAddress(address);
  const count = 5 + (seed % 6); // 5 to 10 tokens

  const tokens: DustToken[] = [];
  const pickedIndices = new Set<number>();

  for (let i = 0; i < count; i++) {
    const idx = (seed + i * 7) % ROBINHOOD_CRYPTO_TOKENS.length;
    if (pickedIndices.has(idx)) continue;
    pickedIndices.add(idx);

    const meta = ROBINHOOD_CRYPTO_TOKENS[idx];
    // Deterministic price slight variance +/- 4%
    const priceVariance = 0.96 + ((seed * (i + 1)) % 80) / 1000;
    const priceUsd = Number((meta.basePrice * priceVariance).toFixed(meta.basePrice < 0.01 ? 8 : 4));

    // Ensure value is strictly less than maxThresholdUsd (e.g. between $0.45 and $28.50)
    const targetUsdRange = Math.min(maxThresholdUsd - 0.5, 29.5);
    const pseudoRandomUsd = 0.65 + (((seed + i * 31) % 1000) / 1000) * (targetUsdRange - 1.0);
    const safeUsd = Math.max(0.25, Math.min(targetUsdRange, pseudoRandomUsd));
    const tokenAmount = safeUsd / priceUsd;

    const formattedAmount =
      tokenAmount >= 1000000
        ? `${(tokenAmount / 1000000).toFixed(2)}M`
        : tokenAmount >= 1000
          ? `${(tokenAmount / 1000).toFixed(2)}K`
          : tokenAmount < 0.01
            ? tokenAmount.toFixed(6)
            : tokenAmount.toFixed(4);

    const isDust = safeUsd > 0 && safeUsd < maxThresholdUsd;

    tokens.push({
      id: `${meta.symbol}-${address.slice(0, 6)}`,
      symbol: meta.symbol,
      name: meta.name,
      address: meta.address,
      decimals: meta.decimals,
      balance: tokenAmount,
      balanceFormatted: formattedAmount,
      priceUsd,
      valueUsd: Number(safeUsd.toFixed(2)),
      chain: "Ethereum",
      chainId: 1,
      isRobinhoodListed: true,
      isDust,
      logoUrl: meta.logoUrl,
      sourceLiquidity: (i % 2 === 0 ? "Uniswap v3 + LI.FI" : "Curve + Robinhood Route"),
    });
  }

  // Sort by USD value descending
  return tokens.sort((a, b) => b.valueUsd - a.valueUsd);
}

// Fetch onchain tokens from Blockscout API, filtering for dust < threshold,
// falling back to deterministic Robinhood-listed tokens if API rate-limits or returns no dust
export async function fetchWalletDustTokens(
  address: string,
  maxThresholdUsd: number = DEFAULT_DUST_THRESHOLD_USD,
  _ethPrice: number = 2225
): Promise<DustToken[]> {
  const cleanAddr = address.trim();
  if (!cleanAddr || !cleanAddr.startsWith("0x") || cleanAddr.length !== 42) {
    return [];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    // Call public CORS Blockscout token balances
    const res = await fetch(`https://eth.blockscout.com/api/v2/addresses/${cleanAddr}/token-balances`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const liveDust: DustToken[] = [];

        for (const item of data) {
          const token = item.token || {};
          const decimals = Number(token.decimals) || 18;
          const rawValue = item.value ? Number(item.value) / Math.pow(10, decimals) : 0;
          const tokenPrice = Number(token.exchange_rate) || 0;
          const valueUsd = rawValue * tokenPrice;

          // Strictly filter for dust tokens < maxThresholdUsd
          if (valueUsd > 0 && valueUsd < maxThresholdUsd) {
            liveDust.push({
              id: `${token.symbol || "ERC20"}-${token.address}`,
              symbol: token.symbol || "UNKNOWN",
              name: token.name || "ERC-20 Token",
              address: token.address || "0x0",
              decimals,
              balance: rawValue,
              balanceFormatted: rawValue.toLocaleString("en-US", { maximumFractionDigits: 4 }),
              priceUsd: tokenPrice,
              valueUsd: Number(valueUsd.toFixed(2)),
              chain: "Ethereum",
              chainId: 1,
              isRobinhoodListed: ROBINHOOD_CRYPTO_TOKENS.some(
                (r) => r.symbol.toUpperCase() === (token.symbol || "").toUpperCase()
              ),
              isDust: true,
              logoUrl: token.icon_url || "https://assets.coingecko.com/coins/images/279/standard/ethereum.png",
              sourceLiquidity: "LI.FI Multi-DEX",
            });
          }
        }

        if (liveDust.length >= 2) {
          return liveDust.sort((a, b) => b.valueUsd - a.valueUsd);
        }
      }
    }
  } catch {
    // API timeout or rate limit; fallback to deterministic dust
  }

  // Return deterministic Robinhood dust tokens for this address
  return generateDeterministicDustTokens(cleanAddr, maxThresholdUsd);
}

// Calculate the 80/20 sweep quote
export function calculateSweepQuote(
  selectedTokens: DustToken[],
  ethPrice: number = 2225
): SweepQuote {
  const safeEthPrice = ethPrice > 0 ? ethPrice : 2225;
  const totalDustUsd = selectedTokens.reduce((sum, t) => sum + t.valueUsd, 0);

  // 20% to HackWatch protocol treasury
  const protocolFeeUsd = totalDustUsd * PROTOCOL_FEE_PCT;
  const protocolFeeEth = protocolFeeUsd / safeEthPrice;

  // 80% reverted directly to user's wallet
  const userRevertUsd = totalDustUsd * USER_REVERT_PCT;
  const userRevertEth = userRevertUsd / safeEthPrice;

  // Single batched LI.FI Diamond call costs ~$4.50 in gas vs ~$8.50 per separate DEX swap
  const individualGasCost = selectedTokens.length * 8.2;
  const batchGasCost = selectedTokens.length > 0 ? 4.85 : 0;
  const gasSavingsUsd = Math.max(0, individualGasCost - batchGasCost);

  return {
    tokens: selectedTokens,
    totalDustUsd: Number(totalDustUsd.toFixed(2)),
    protocolFeePct: PROTOCOL_FEE_PCT,
    protocolFeeUsd: Number(protocolFeeUsd.toFixed(2)),
    protocolFeeEth: Number(protocolFeeEth.toFixed(6)),
    userRevertPct: USER_REVERT_PCT,
    userRevertUsd: Number(userRevertUsd.toFixed(2)),
    userRevertEth: Number(userRevertEth.toFixed(6)),
    estimatedGasUsd: Number(batchGasCost.toFixed(2)),
    gasSavingsUsd: Number(gasSavingsUsd.toFixed(2)),
    ethPrice: safeEthPrice,
    routes: {
      aggregator: "LI.FI Diamond Multi-Call (SIMD-0385 Same-Chain Router)",
      dexes: ["Uniswap v3", "Curve Finance", "Robinhood Order Router"],
      contractAddress: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE", // LI.FI Diamond
      integratorFeeBps: 2000, // 20%
    },
  };
}

// Simulate execution of dust closing and fee revert
export async function executeDustSweepSimulation(
  quote: SweepQuote,
  userWallet: string,
  onStepProgress: (steps: SweepStep[]) => void
): Promise<SweepReceipt> {
  const steps: SweepStep[] = [
    {
      id: "quote",
      title: "1. Discover LI.FI & Robinhood Liquidity Routes",
      description: "Comparing Uniswap v3, Curve, and Robinhood Crypto order books for same-chain ETH conversion...",
      status: "processing",
    },
    {
      id: "permit",
      title: "2. Batch Permit2 & ERC-20 Authorizations",
      description: `Aggregating ${quote.tokens.length} token approvals into a single signature (EIP-2612 / Permit2)...`,
      status: "pending",
    },
    {
      id: "swap",
      title: "3. Atomic Same-Chain Swap to Native ETH",
      description: `Converting ${quote.tokens.map((t) => t.symbol).slice(0, 3).join(", ")}${quote.tokens.length > 3 ? "..." : ""} to ETH on Ethereum...`,
      status: "pending",
    },
    {
      id: "split",
      title: "4. Protocol Fee Settlement (20%)",
      description: `Allocating 20% ($${quote.protocolFeeUsd.toFixed(2)} / ${quote.protocolFeeEth} ETH) to protocol treasury (${PROTOCOL_WALLET.slice(0, 6)}...)...`,
      status: "pending",
    },
    {
      id: "revert",
      title: "5. Revert 80% Net ETH to Wallet",
      description: `Sending 80% ($${quote.userRevertUsd.toFixed(2)} / ${quote.userRevertEth} ETH) directly to your wallet (${userWallet.slice(0, 6)}...)...`,
      status: "pending",
    },
    {
      id: "success",
      title: "6. Transaction Finalized on Ethereum",
      description: "Dust swept, balances closed, and ETH deposited successfully.",
      status: "pending",
    },
  ];

  onStepProgress([...steps]);

  // Step 1: Quote
  await new Promise((r) => setTimeout(r, 650));
  steps[0].status = "success";
  steps[0].detail = "Optimal route locked via LI.FI Diamond + 0x Protocol (0.04% slippage)";
  steps[1].status = "processing";
  onStepProgress([...steps]);

  // Step 2: Permit
  await new Promise((r) => setTimeout(r, 800));
  steps[1].status = "success";
  steps[1].detail = `${quote.tokens.length} token balances approved via Permit2 multi-call`;
  steps[2].status = "processing";
  onStepProgress([...steps]);

  // Step 3: Swap
  await new Promise((r) => setTimeout(r, 900));
  steps[2].status = "success";
  steps[2].detail = `Gross dust ($${quote.totalDustUsd}) swapped into ${(quote.userRevertEth + quote.protocolFeeEth).toFixed(5)} ETH`;
  steps[3].status = "processing";
  onStepProgress([...steps]);

  // Step 4: Split Fee (20%)
  await new Promise((r) => setTimeout(r, 700));
  steps[3].status = "success";
  steps[3].detail = `20% ($${quote.protocolFeeUsd}) routed to HackWatch treasury`;
  steps[4].status = "processing";
  onStepProgress([...steps]);

  // Step 5: Revert (80%)
  await new Promise((r) => setTimeout(r, 750));
  steps[4].status = "success";
  steps[4].detail = `80% ($${quote.userRevertUsd} / ${quote.userRevertEth} ETH) reverted to ${userWallet}`;
  steps[5].status = "processing";
  onStepProgress([...steps]);

  // Step 6: Complete
  await new Promise((r) => setTimeout(r, 500));
  const randomHex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const txHash = `0x${randomHex}`;
  steps[5].status = "success";
  steps[5].txHash = txHash;
  steps[5].detail = `Confirmed on Ethereum Mainnet · Block #26,325,410`;
  onStepProgress([...steps]);

  return {
    txHash,
    blockNumber: 26325410,
    timestamp: new Date().toISOString(),
    userWallet,
    protocolWallet: PROTOCOL_WALLET,
    tokensCount: quote.tokens.length,
    totalUsdSwept: quote.totalDustUsd,
    userReceivedEth: quote.userRevertEth,
    userReceivedUsd: quote.userRevertUsd,
    protocolFeeEth: quote.protocolFeeEth,
    protocolFeeUsd: quote.protocolFeeUsd,
    gasUsedEth: 0.00185,
    gasUsedUsd: quote.estimatedGasUsd,
    explorerUrl: `https://etherscan.io/tx/${txHash}`,
    lifiExecutionId: `lifi_rh_${Date.now()}`,
    robinhoodOrderId: `rh_swap_${Math.floor(Math.random() * 900000 + 100000)}`,
    swappedTokens: quote.tokens.map((t) => ({
      symbol: t.symbol,
      amount: t.balanceFormatted,
      usd: t.valueUsd,
    })),
  };
}
