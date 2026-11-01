const fs = require('fs');
const https = require('https');
const path = require('path');
const querystring = require('querystring');

const VAULT_ADDR = '0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c';

function get(reqPath, retries = 3) {
  return new Promise((resolve) => {
    function attempt(n) {
      const req = https.get({
        hostname: 'eth.blockscout.com',
        path: reqPath,
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        timeout: 15000,
      }, (res) => {
        let d = '';
        res.on('data', chunk => d += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              console.error(`HTTP ${res.statusCode} for ${reqPath}`);
              return resolve({ items: [] });
            }
            resolve(JSON.parse(d));
          } catch (e) {
            console.error(`Parse error for ${reqPath}:`, e.message);
            resolve({ items: [] });
          }
        });
      });
      req.on('timeout', () => {
        req.destroy();
        if (n > 1) {
          console.log(`Timeout on ${reqPath}, retrying (${n - 1} left)...`);
          setTimeout(() => attempt(n - 1), 1200);
        } else {
          resolve({ items: [] });
        }
      });
      req.on('error', err => {
        if (n > 1) {
          console.log(`Error on ${reqPath}: ${err.message}, retrying (${n - 1} left)...`);
          setTimeout(() => attempt(n - 1), 1200);
        } else {
          console.error(`Failed ${reqPath}: ${err.message}`);
          resolve({ items: [] });
        }
      });
    }
    attempt(retries);
  });
}

async function fetchAllPages(baseEndpoint, maxPages = 8) {
  let all = [];
  let currentPath = baseEndpoint;
  for (let page = 0; page < maxPages; page++) {
    console.log(`[Page ${page + 1}] Fetching: ${currentPath}`);
    const data = await get(currentPath);
    if (!data.items || data.items.length === 0) break;
    all.push(...data.items);
    if (!data.next_page_params) break;
    const qs = querystring.stringify(data.next_page_params);
    currentPath = baseEndpoint.split('?')[0] + '?' + qs;
    await new Promise(r => setTimeout(r, 600));
  }
  return all;
}

async function main() {
  console.log(`=== Fetching token transfers for Vault ${VAULT_ADDR} ===`);
  
  // Load existing target_txs.json
  const dataPath = path.join(__dirname, '../src/data/target_txs.json');
  let currentData = {};
  if (fs.existsSync(dataPath)) {
    currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }

  const existingVaultTxs = currentData[VAULT_ADDR.toLowerCase()] || [];
  console.log(`Currently have ${existingVaultTxs.length} txs for vault.`);

  // Fetch token transfers
  const tokenItems = await fetchAllPages(`/api/v2/addresses/${VAULT_ADDR}/token-transfers`, 8);
  console.log(`Fetched ${tokenItems.length} token transfers.`);

  const seen = new Set(existingVaultTxs.map(t => t.hash));
  const newItems = [];

  for (const item of tokenItems) {
    const txHash = item.transaction_hash || item.hash;
    if (!txHash) continue;
    if (seen.has(txHash)) continue;
    seen.add(txHash);

    const sym = item.token?.symbol || 'ERC20';
    const decimals = Number(item.token?.decimals || 18);
    const rawVal = item.total?.value || '0';
    let amt = Number(rawVal) / Math.pow(10, decimals);
    if (isNaN(amt) || amt <= 0) amt = 1.0;

    newItems.push({
      hash: txHash,
      ts: item.timestamp || new Date().toISOString(),
      from: item.from?.hash || VAULT_ADDR,
      to: item.to?.hash || '0x2274C80AFa66b23A34c56814274d0e2370fb64B0',
      valueEth: sym === 'ETH' || sym === 'WETH' ? amt : (sym === 'WBTC' ? amt * 30 : (amt * 0.0004)),
      method: item.method || 'transfer(address,uint256)',
      status: 'confirmed',
      blockNumber: item.block_number ?? 26318895,
      gasUsed: null,
      maxFeePerGas: null,
    });
  }

  console.log(`Adding ${newItems.length} new unique token transfers.`);
  const consolidated = [...newItems, ...existingVaultTxs];
  consolidated.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));

  currentData[VAULT_ADDR.toLowerCase()] = consolidated;
  fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2));
  console.log(`Updated ${dataPath} with total ${consolidated.length} transfers for ${VAULT_ADDR}!`);
}

main().catch(console.error);
