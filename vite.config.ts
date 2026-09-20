import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import type { Plugin } from "vite";

const stripDevtoolsSourceFromR3F = (): Plugin => ({
  name: "strip-tsd-source-in-r3f",
  enforce: "post",
  apply: "serve",
  transform(code, id) {
    if (!id.includes("/src/components/nissan/")) return null;
    if (!code.includes("data-tsd-source")) return null;
    return {
      code: code.replace(/\s*"data-tsd-source":\s*"[^"]*",?/g, "")
        .replace(/\s*data-tsd-source="[^"]*"/g, ""),
      map: null,
    };
  },
});

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    stripDevtoolsSourceFromR3F(),
  ],
  server: {
    port: 8080,
  }
});
