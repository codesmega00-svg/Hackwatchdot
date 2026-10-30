import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Batches the agent's parallel file writes into ONE live update (see hmr-gate.mjs).
import { hmrGate } from "./hmr-gate.mjs";
// Same-origin proxy to pre.dev AI: the browser calls /predev-ai/*, the key stays on the server (see predev-ai.mjs).
import { predevAi } from "./predev-ai.mjs";

export default defineConfig({
  plugins: [react(), hmrGate(), predevAi()],
  server: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
