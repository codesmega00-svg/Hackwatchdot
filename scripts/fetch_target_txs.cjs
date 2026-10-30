const fs = require('fs');
const https = require('https');
const path = require('path');

const ADDRESSES = [
  { addr: '0x80d04079ffc53eb14edbeeb37279d126f45552df', label: 'Phishing / Deployer' },
  { addr: '0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c', label: 'Main Vault' },
  { addr: '0x8532FA14ACAf483729C449b8458aedDb900543D4', label: '195K ETH Vault' },
  { addr: '0xc887aF690E0301CD4edBbCe8F8d31b4EC65B286A', label: '122K ETH Vault' },
  { addr: '0xdd6dbbe67262ccc9b1824de1257999efc6c52296', label: 'Liquidator Bot' },
  { addr: '0x79e70d139fc05aa75f75611fdf2680e9952b544a', label: 'Relay Consolidation' },
  { addr: '0x03b0eE5d82990cFF1bDa48651AC3e436d1a020ea', label: '17.2K ETH Sink' },
  { addr: '0x897C80d1a9729E94460e2Bd93178bD5215158DF3', label: 'DEX Relay' },
  { addr: '0x63e842B054Bd624a465454D533C33F573e9c6fAe', label: 'Sweeper Contract' }
];

function fetchTxs(address) {
  return new Promise((resolve) => {
    const opt = {
      hostname: 'eth.blockscout.com',
      path: `/api/v2/addresses/${address}/transactions`,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    };
    https.get(opt, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            console.log(`[${address}] Status: ${res.statusCode}`);
            return resolve([]);
          }
          const json = JSON.parse(raw);
          const items = (json.items || []).map(item => ({
            hash: item.hash,
            ts: item.timestamp,
            from: item.from?.hash,
            to: item.to?.hash,
            valueEth: item.value ? Number(item.value) / 1e18 : 0,
            method: item.method || (item.raw_input && item.raw_input.length >= 10 ? item.raw_input.slice(0, 10) : 'transfer'),
            status: item.status === 'ok' ? 'confirmed' : (item.status || (item.block_number ? 'confirmed' : 'pending')),
            blockNumber: item.block_number ?? null,
            gasUsed: item.gas_used ?? null,
            maxFeePerGas: item.max_fee_per_gas ?? null
          }));
          resolve(items);
        } catch (e) {
          console.error(`[${address}] Error parsing: ${e.message}`);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error(`[${address}] Request error: ${err.message}`);
      resolve([]);
    });
  });
}

async function main() {
  const result = {};
  for (const item of ADDRESSES) {
    console.log(`Fetching txs for ${item.label} (${item.addr})...`);
    const txs = await fetchTxs(item.addr);
    console.log(` -> Found ${txs.length} transactions`);
    result[item.addr.toLowerCase()] = txs;
    // Brief sleep to avoid rate limits
    await new Promise(r => setTimeout(r, 600));
  }

  const outPath = path.join(__dirname, '../src/data/target_txs.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Saved target transactions to ${outPath}`);
}

main();
