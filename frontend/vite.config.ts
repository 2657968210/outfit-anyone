import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

const env = loadEnv("development", process.cwd(), "");

const AUTH_COOKIE_NAME = "sb-oevruodshxkcqvxulhcb-auth-token";
const SUPABASE_ANON_KEY = env["SUPABASE_ANON_KEY"] ?? "";
const RAW_COOKIE_VALUE = env["AUTH_COOKIE_VALUE"] ?? "";
const SUPABASE_REFRESH_TOKEN = (() => {
  try { return RAW_COOKIE_VALUE ? (JSON.parse(RAW_COOKIE_VALUE) as string[])[1] ?? "" : ""; }
  catch { return ""; }
})();

// Mutable — updated each time refreshTokens() runs; seeded from .env.local on startup
let currentAccessToken = (() => {
  try { return RAW_COOKIE_VALUE ? (JSON.parse(RAW_COOKIE_VALUE) as [string])[0] : ""; }
  catch { return ""; }
})();
let currentCookieValue = RAW_COOKIE_VALUE ? encodeURIComponent(RAW_COOKIE_VALUE) : "";

async function refreshTokens(): Promise<void> {
  if (!SUPABASE_REFRESH_TOKEN) {
    console.warn("[auth] SUPABASE_REFRESH_TOKEN not set in .env.local");
    return;
  }
  try {
    const res = await fetch(
      "https://oevruodshxkcqvxulhcb.supabase.co/auth/v1/token?grant_type=refresh_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ refresh_token: SUPABASE_REFRESH_TOKEN }),
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`[auth] Token refresh failed: ${res.status} — ${err}`);
      return;
    }
    const data = (await res.json()) as { access_token: string; refresh_token?: string };
    currentAccessToken = data.access_token;
    const cookieArr = [data.access_token, data.refresh_token ?? SUPABASE_REFRESH_TOKEN, null, null, null];
    currentCookieValue = encodeURIComponent(JSON.stringify(cookieArr));
    const exp = (() => {
      try {
        const payload = JSON.parse(atob(data.access_token.split(".")[1])) as { exp: number };
        return new Date(payload.exp * 1000).toISOString();
      } catch { return "unknown"; }
    })();
    console.log(`[auth] Token refreshed, exp: ${exp}`);
  } catch (e) {
    console.error("[auth] Token refresh error:", e);
  }
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      {
        name: "auth-refresh",
        configureServer(server) {
          // Endpoint called by the UI "Refresh Token" button
          server.middlewares.use("/api-refresh-token", async (_req, res) => {
            await refreshTokens();
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          });
        },
      },
    ],
    server: {
      proxy: {
        "/api": {
          target: "https://www.outfitanyone.net",
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("Cookie", `${AUTH_COOKIE_NAME}=${currentCookieValue}`);
            });
          },
        },
        "/supabase": {
          target: "https://oevruodshxkcqvxulhcb.supabase.co",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("Authorization", `Bearer ${currentAccessToken}`);
              proxyReq.setHeader("apikey", SUPABASE_ANON_KEY);
              proxyReq.setHeader("Accept-Profile", "public");
            });
          },
        },
      },
    },
  },
});
