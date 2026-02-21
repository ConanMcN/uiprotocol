import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  server: {
    port: 3199,
    strictPort: true
  },
  esbuild: {
    jsx: "automatic"
  },
  resolve: {
    alias: {
      "@uiprotocol/a2ui/react": resolve(__dirname, "../../src/react"),
      "@uiprotocol/a2ui/core": resolve(__dirname, "../../src/core")
    }
  }
});
