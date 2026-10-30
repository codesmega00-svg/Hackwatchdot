/**
 * HMR gate: hold hot updates while the agent is mid-batch, release them once.
 *
 * The agent writes files in bursts (several write_file calls per response,
 * executed in parallel). Vite reacts to each file the instant it lands, so the
 * preview shows every intermediate state: a component importing a file that is
 * not written yet (red "Failed to resolve import" overlay), a page half-moved
 * to a new prop shape, one reload per file. Measured on the empty template
 * (Vite 8.3, App.tsx -> new Header.tsx -> index.css, 250 ms apart): plain
 * Vite sends update, error, full-reload, update; gated it is ONE update.
 *
 * This plugin buffers every HMR frame and delivers one coalesced result when
 * the burst goes quiet, or when something POSTs /__hmr_flush. Fresh page loads
 * are never affected: the module graph is invalidated as usual, only the push
 * to already-open tabs waits.
 *
 * Env:
 *   PREDEV_HMR_GATE=0            disable (plain Vite behaviour)
 *   PREDEV_HMR_GATE_QUIET_MS     quiet period before auto-flush (default 1500)
 *   PREDEV_HMR_GATE_MAX_HOLD_MS  never hold longer than this (default 10000)
 *
 * HTTP (same origin as the app, CORS *):
 *   GET  /__hmr_gate    -> { enabled, pending, quietMs, maxHoldMs }
 *   POST /__hmr_flush   -> { mode: "none"|"update"|"full-reload"|"error", count }
 *   POST /__hmr_touch   { files: [path] } -> { touched }: treat these files as
 *        changed. The pre.dev CLI sends it when the computer delivers no
 *        file-change events (a stuck fseventsd, too many watchers), so the
 *        server never keeps serving the old code. Only files inside the app.
 *
 * Plain ESM on purpose: it is not part of the app's tsconfig, so `tsc -b`
 * never sees it and no TS import-extension rules apply.
 *
 * @returns {import("vite").Plugin}
 */
import fs from "node:fs";
import path from "node:path";

export function hmrGate() {
  const enabled = process.env.PREDEV_HMR_GATE !== "0";
  const quietMs = Number(process.env.PREDEV_HMR_GATE_QUIET_MS) || 1500;
  const maxHoldMs = Number(process.env.PREDEV_HMR_GATE_MAX_HOLD_MS) || 10000;
  const HELD = new Set(["update", "full-reload", "error", "prune"]);

  /** @type {import("vite").ViteDevServer | undefined} */
  let server;
  /** @type {any[]} */
  let held = [];
  /** @type {ReturnType<typeof setTimeout> | null} */
  let quietTimer = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let maxTimer = null;
  /** @type {((payload: any) => void) | undefined} */
  let rawSend;

  const clearTimers = () => {
    if (quietTimer) clearTimeout(quietTimer);
    if (maxTimer) clearTimeout(maxTimer);
    quietTimer = maxTimer = null;
  };

  /** Collapse the held frames into the fewest that reproduce the final state. */
  const coalesce = (frames) => {
    let lastStateIdx = -1; // index of the last update/full-reload
    frames.forEach((f, i) => {
      if (f.type === "update" || f.type === "full-reload") lastStateIdx = i;
    });
    // An error that a later change superseded is stale; only a trailing error
    // still describes the current state.
    const last = frames[frames.length - 1];
    const trailingError = last && last.type === "error" ? last : null;
    const state = frames.filter((f, i) => i <= lastStateIdx && f.type !== "error");
    const out = [];
    let mode = "none";
    if (state.some((f) => f.type === "full-reload")) {
      out.push(state.filter((f) => f.type === "full-reload").pop());
      mode = "full-reload";
    } else {
      out.push(...state.filter((f) => f.type === "prune"));
      const byKey = new Map();
      for (const f of state) {
        if (f.type !== "update") continue;
        for (const u of f.updates ?? []) byKey.set(`${u.type}|${u.path}|${u.acceptedPath}`, u); // latest wins
      }
      if (byKey.size) {
        out.push({ type: "update", updates: [...byKey.values()] });
        mode = "update";
      }
    }
    if (trailingError) {
      out.push(trailingError);
      mode = "error";
    }
    return { out, mode };
  };

  const flush = (why) => {
    clearTimers();
    if (!held.length || !rawSend) return { mode: "none", count: 0 };
    const frames = held;
    held = [];
    const { out, mode } = coalesce(frames);
    for (const f of out) rawSend(f);
    server?.config.logger.info(`[hmr-gate] flushed ${frames.length} held frame(s) as ${mode} (${why})`, { timestamp: true });
    return { mode, count: frames.length };
  };

  const hold = (payload) => {
    held.push(payload);
    if (quietTimer) clearTimeout(quietTimer);
    quietTimer = setTimeout(() => flush("quiet"), quietMs);
    if (!maxTimer) maxTimer = setTimeout(() => flush("max-hold"), maxHoldMs);
  };

  return {
    name: "predev:hmr-gate",
    apply: "serve",
    configureServer(s) {
      server = s;
      s.middlewares.use((req, res, next) => {
        if ((req.url || "").split("?")[0] !== "/__hmr_touch" || req.method !== "POST") return next();
        let body = "";
        req.on("data", (c) => {
          if (body.length < 256_000) body += c;
        });
        req.on("end", () => {
          const root = path.resolve(s.config.root);
          let files = [];
          try {
            files = JSON.parse(body || "{}").files || [];
          } catch {}
          let touched = 0;
          for (const f of Array.isArray(files) ? files.slice(0, 500) : []) {
            if (typeof f !== "string") continue;
            const abs = path.resolve(root, f);
            if (abs !== root && !abs.startsWith(root + path.sep)) continue;
            s.watcher.emit(fs.existsSync(abs) ? "change" : "unlink", abs);
            touched++;
          }
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify({ touched }));
        });
      });
      if (!enabled) return;
      // Every client-bound HMR frame goes through the client environment's hot
      // channel (the same object as server.ws in Vite 8). Wrap its send() so
      // nothing reaches open tabs until the gate opens. send(event, data)
      // custom frames and non-HMR types pass straight through.
      const channels = new Set([s.ws, s.environments?.client?.hot].filter(Boolean));
      for (const ch of channels) {
        const orig = ch.send.bind(ch);
        rawSend ??= orig;
        ch.send = (...args) => {
          const p = args[0];
          if (args.length === 1 && p && typeof p === "object" && HELD.has(p.type)) return hold(p);
          return orig(...args);
        };
      }
      s.middlewares.use((req, res, next) => {
        const url = (req.url || "").split("?")[0];
        if (url !== "/__hmr_gate" && url !== "/__hmr_flush") return next();
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          return res.end();
        }
        res.setHeader("Content-Type", "application/json");
        if (url === "/__hmr_flush" && req.method === "POST") return res.end(JSON.stringify(flush("post")));
        if (url === "/__hmr_gate" && req.method === "GET") {
          return res.end(JSON.stringify({ enabled, pending: held.length, quietMs, maxHoldMs }));
        }
        res.statusCode = 405;
        res.end();
      });
      s.config.logger.info(`[hmr-gate] enabled (quiet ${quietMs}ms, max hold ${maxHoldMs}ms)`);
    },
  };
}
