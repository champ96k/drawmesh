import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    server: {
      deps: {
        // The Excalidraw bundle pulls in a JSON file that Node's ESM loader
        // only accepts with an import attribute; inlining lets Vite transform it.
        inline: [/@excalidraw\//, /open-color/],
      },
    },
  },
});
