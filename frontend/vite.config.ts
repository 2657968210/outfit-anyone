import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import fs from "fs";
import path from "path";

const env = loadEnv("development", process.cwd(), "");

const AUTH_COOKIE_NAME = "sb-oevruodshxkcqvxulhcb-auth-token";
const SUPABASE_ANON_KEY = env["SUPABASE_ANON_KEY"] ?? "";
const TOKEN_FILE = path.resolve(process.cwd(), "public/json", `${AUTH_COOKIE_NAME}.json`);

// 读取已保存的 token 文件（优先于 .env.local）
function readTokenFile(): string[] | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const arr = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")) as string[];
      if (Array.isArray(arr) && arr[0]) {
        console.log("[auth] Loaded tokens from", TOKEN_FILE);
        return arr;
      }
    }
  } catch {}
  return null;
}

function parseEnvCookieArr(): string[] | null {
  try {
    const raw = env["AUTH_COOKIE_VALUE"] ?? "";
    if (!raw) return null;
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr : null;
  } catch { return null; }
}

// JSON 文件优先，否则回退 .env.local
const seedArr = readTokenFile() ?? parseEnvCookieArr() ?? [];

let currentAccessToken  = (seedArr[0] as string | undefined) ?? "";
let currentRefreshToken = (seedArr[1] as string | undefined) ?? "";
let currentCookieValue  = seedArr.length ? encodeURIComponent(JSON.stringify(seedArr)) : "";

function saveTokenFile(arr: (string | null)[]): void {
  try {
    fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(arr), "utf-8");
    console.log("[auth] Token saved to", TOKEN_FILE);
  } catch (e) {
    console.error("[auth] Failed to save token file:", e);
  }
}

async function refreshTokens(): Promise<void> {
  if (!currentRefreshToken) {
    console.warn("[auth] No refresh token available (set AUTH_COOKIE_VALUE in .env.local)");
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
        body: JSON.stringify({ refresh_token: currentRefreshToken }),
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`[auth] Token refresh failed: ${res.status} - ${err}`);
      return;
    }
    const data = (await res.json()) as { access_token: string; refresh_token?: string };
    const newRefresh = data.refresh_token ?? currentRefreshToken;
    currentAccessToken  = data.access_token;
    currentRefreshToken = newRefresh;
    const cookieArr: (string | null)[] = [data.access_token, newRefresh, null, null, null];
    currentCookieValue  = encodeURIComponent(JSON.stringify(cookieArr));
    saveTokenFile(cookieArr);
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

// Redirect TanStack Start bundled server entry to src/server.ts (SSR error wrapper).
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
      allowedHosts: ["outfit.wal-land.com.cn"],
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
