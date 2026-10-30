"""Build the bundled onchain snapshot + Binance market map for HackWatch."""
import json, urllib.request, time, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data"
OUT.mkdir(parents=True, exist_ok=True)

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "hackwatch/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

data = get("https://binance-hack-watch.vercel.app/api/data")
btc = get("https://binance-hack-watch.vercel.app/api/btc")

stack = []
for s in data["stack"]:
    stack.append({
        "sym": s["sym"], "stolen": round(s["stolen"], 6), "held": round(s["held"], 6),
        "price": s["price"], "mcap": s.get("mcap") or 0, "vol24": s.get("vol24") or 0,
        "addr": s.get("addr", ""), "dec": s.get("dec", 18), "stable": bool(s.get("stable")),
    })

history = []
for h in data["history"]:
    history.append({
        "ts": h["ts"], "when": h["when"], "kind": h["kind"], "sym": h["sym"],
        "amt": h["amt"], "usd": h["usd"], "wa": h["wa"], "wallet": h["wallet"],
        "to": h.get("to", ""), "hash": h.get("hash", ""),
    })

wallets = [{"a": w["a"], "label": w["label"], "eth": w["eth"], "toks": w.get("toks", [])} for w in data["wallets"]]

btc_out = {
    "root": btc["root"], "victim": btc["victim"], "stolen": btc["stolen"],
    "nodes": btc["nodes"], "edges": btc["edges"], "holders": btc["holders"],
    "price": btc["price"], "updated": btc["updated"],
}

# Market map: which tracked symbols have a live Binance USDT pair.
tickers = get("https://data-api.binance.vision/api/v3/ticker/price")
usdt = {}
for t in tickers:
    sym = t["symbol"]
    if sym.endswith("USDT"):
        usdt[sym[:-4]] = t["price"]

tracked = {s["sym"] for s in stack} | {h["sym"] for h in history}
binance = {}
for sym in sorted(tracked):
    if sym in usdt:
        binance[sym] = f"{sym}USDT"

seed = {
    "meta": {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "snapshot": data["updated"],
        "binanceSymbols": binance,
        "assets": len(stack), "events": len(history), "wallets": len(wallets),
    },
    "stack": stack, "history": history, "wallets": wallets, "btc": btc_out,
}
(OUT / "seed.json").write_text(json.dumps(seed, separators=(",", ":")))
print("stack", len(stack), "history", len(history), "binance pairs", len(binance))
print("on binance:", ", ".join(sorted(binance))[:600])
print("size", (OUT / "seed.json").stat().st_size)
