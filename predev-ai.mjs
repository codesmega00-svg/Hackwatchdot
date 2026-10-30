/**
 * pre.dev AI proxy: lets the app call pre.dev AI from the browser, same origin.
 *
 * The scaffold is a pure Vite SPA with no server, and the workspace key must
 * never reach the browser. This plugin gives the dev server ONE job for AI:
 * anything under `/predev-ai/` is forwarded to `$PREDEV_API_URL/v1/` with the
 * workspace key and the project id added on the way through, and the response
 * (JSON or a streaming SSE body) is piped straight back. Client code calls
 *
 *   fetch("/predev-ai/chat/completions", { method: "POST", body: JSON.stringify({ model, messages, stream: true }) })
 *
 * and never sees a key. Any pre.dev AI path works the same way
 * (/images, /audio/speech, /audio/transcriptions, /embeddings, /models…).
 *
 * Same origin only on purpose: no CORS headers are set, so another site
 * cannot spend this workspace's credits through a running preview.
 *
 * Env (all set by pre.dev in the sandbox):
 *   PREDEV_API_URL       base URL of the pre.dev API
 *   PREDEV_API_KEY       the workspace key (server-side only)
 *   PREDEV_PROJECT_ID    attributes usage to this project
 *   PREDEV_AI_PROXY=0    disable
 *
 * HTTP (same origin as the app):
 *   GET  /__predev_ai         -> { enabled, hasKey, projectId }
 *   ANY  /predev-ai/<path>    -> $PREDEV_API_URL/v1/<path>
 *
 * Plain ESM on purpose (like hmr-gate.mjs): outside the app's tsconfig.
 *
 * @returns {import("vite").Plugin}
 */
export function predevAi() {
  const enabled = process.env.PREDEV_AI_PROXY !== "0";
  const PREFIX = "/predev-ai/";
  const MAX_BODY = 25 * 1024 * 1024;
  const base = () => (process.env.PREDEV_API_URL || "https://api.pre.dev").replace(/\/+$/, "");
  const key = () => process.env.PREDEV_API_KEY || "";
  const projectId = () => process.env.PREDEV_PROJECT_ID || "";
  /** @type {import("vite").ViteDevServer | undefined} */
  let server;

  const json = (res, status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(body));
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on("data", (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          reject(new Error("body too large"));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

  return {
    name: "predev:ai-proxy",
    apply: "serve",
    configureServer(s) {
      server = s;
      if (!enabled) return;
      s.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        const path = url.split("?")[0];
        if (path === "/__predev_ai") {
          return json(res, 200, { enabled, hasKey: Boolean(key()), projectId: projectId() || null });
        }
        if (!path.startsWith(PREFIX)) return next();
        // Belt and braces on top of Vite's own CORS policy: a cross-site page
        // must never be able to spend this workspace's credits via a preview.
        const origin = req.headers.origin ? String(req.headers.origin) : "";
        const host = String(req.headers.host || "");
        if (origin && host && !origin.endsWith(`//${host}`)) {
          return json(res, 403, { error: { type: "forbidden", message: "pre.dev AI proxy is same-origin only." } });
        }
        if (!key()) {
          return json(res, 503, {
            error: { type: "not_configured", message: "pre.dev AI is not configured in this environment (PREDEV_API_KEY missing)." },
          });
        }
        const upstreamUrl = `${base()}/v1/${url.slice(PREFIX.length)}`;
        const method = (req.method || "GET").toUpperCase();
        const headers = {
          Authorization: `Bearer ${key()}`,
          ...(projectId() ? { "x-predev-project-id": projectId() } : {}),
          ...(req.headers["content-type"] ? { "Content-Type": String(req.headers["content-type"]) } : {}),
          ...(req.headers.accept ? { Accept: String(req.headers.accept) } : {}),
        };
        let body;
        try {
          if (method !== "GET" && method !== "HEAD") body = await readBody(req);
        } catch (err) {
          return json(res, 413, { error: { type: "invalid_request", message: String(err?.message || err) } });
        }
        const controller = new AbortController();
        req.on("close", () => controller.abort());
        let upstream;
        try {
          upstream = await fetch(upstreamUrl, { method, headers, body, signal: controller.signal });
        } catch (err) {
          if (controller.signal.aborted) return;
          server?.config.logger.warn(`[predev-ai] upstream unreachable: ${err?.message || err}`, { timestamp: true });
          return json(res, 502, { error: { type: "upstream_unavailable", message: "pre.dev AI did not answer." } });
        }
        res.statusCode = upstream.status;
        for (const [k, v] of upstream.headers) {
          const lk = k.toLowerCase();
          if (lk === "content-type" || lk === "content-disposition" || lk.startsWith("x-predev-")) res.setHeader(k, v);
        }
        res.setHeader("Cache-Control", "no-store");
        if (String(upstream.headers.get("content-type") || "").includes("text/event-stream")) {
          res.setHeader("X-Accel-Buffering", "no");
          res.flushHeaders?.();
        }
        if (!upstream.body) return res.end();
        try {
          for await (const chunk of upstream.body) {
            if (!res.write(chunk)) await new Promise((r) => res.once("drain", r));
          }
        } catch (err) {
          if (!controller.signal.aborted) server?.config.logger.warn(`[predev-ai] stream ended early: ${err?.message || err}`, { timestamp: true });
        } finally {
          res.end();
        }
      });
      server.config.logger.info(`[predev-ai] proxy enabled: /predev-ai/* -> ${base()}/v1/* (${key() ? "key present" : "NO KEY"})`, { timestamp: true });
    },
  };
}
