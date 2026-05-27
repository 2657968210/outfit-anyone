// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Load local env vars from .env.local (gitignored via *.local rule)
// Set AUTH_COOKIE_VALUE in frontend/.env.local for local dev proxy auth
const env = loadEnv("development", process.cwd(), "");

const AUTH_COOKIE_NAME = "sb-oevruodshxkcqvxulhcb-auth-token";
// Public anon key — loaded from .env.local
const SUPABASE_ANON_KEY = env["SUPABASE_ANON_KEY"] ?? "";
// Supabase Bearer token — set independently from AUTH_COOKIE_VALUE
const SUPABASE_ACCESS_TOKEN = env["SUPABASE_ACCESS_TOKEN"] ?? "";
const RAW_COOKIE_VALUE = env["AUTH_COOKIE_VALUE"] ?? "";
const AUTH_COOKIE_VALUE = RAW_COOKIE_VALUE ? encodeURIComponent(RAW_COOKIE_VALUE) : "";
const ACCESS_TOKEN = (() => {
  try {
    return RAW_COOKIE_VALUE ? (JSON.parse(RAW_COOKIE_VALUE) as [string, ...unknown[]])[0] as string : "";
  } catch {
    return "";
  }
})();

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      proxy: {
        "/api": {
          target: "https://www.outfitanyone.net",
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader(
                "Cookie",
                `${AUTH_COOKIE_NAME}=${AUTH_COOKIE_VALUE}`
              );
            });
          },
        },
        "/supabase": {
          target: "https://oevruodshxkcqvxulhcb.supabase.co",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("Authorization", `Bearer ${SUPABASE_ACCESS_TOKEN}`);
              proxyReq.setHeader("apikey", SUPABASE_ANON_KEY);
              proxyReq.setHeader("Accept-Profile", "public");
              console.log("[supabase proxy] URL:", proxyReq.path);
              console.log("[supabase proxy] Authorization: Bearer", SUPABASE_ACCESS_TOKEN);
              console.log("[supabase proxy] apikey:", SUPABASE_ANON_KEY);
            });
          },
        },
      },
    },
  },
});
