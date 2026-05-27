# Outfit Anyone — Frontend

基于 [TanStack Start](https://tanstack.com/start) + React + Tailwind CSS 构建的前端项目。

## 环境要求

- Node.js >= 18

## 安装依赖

```bash
cd frontend
npm install
```

## 本地开发

### 1. 配置本地环境变量（可选，用于代理鉴权）

项目在开发模式下会将 `/api` 和 `/supabase` 请求反向代理到后端，代理会自动注入认证 Cookie。  
如需使用此功能，在 `frontend/` 目录下创建 `.env.local` 文件（已被 `.gitignore` 忽略，**不要提交**）：

```
AUTH_COOKIE_VALUE=<你的 Supabase auth cookie JSON 数组值>
```

> 如不配置，代理仍然生效，但不会携带认证信息。

### 2. 启动开发服务器

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

默认访问地址：http://localhost:5173

## 构建

```bash
# 生产构建
npm run build

# 开发模式构建
npm run build:dev
```

## 预览生产构建

```bash
npm run preview
```

## 部署到 Cloudflare Workers

项目已集成 `@cloudflare/vite-plugin`，可直接通过 Wrangler 部署：

```bash
npx wrangler deploy
```

> 部署前请先执行 `npm run build`。

## 代码检查 & 格式化

```bash
# ESLint 检查
npm run lint

# Prettier 格式化
npm run format
```

## 项目结构

```
frontend/
├── src/
│   ├── routes/        # 页面路由（TanStack Router 文件式路由）
│   ├── components/    # UI 组件（shadcn/ui）
│   ├── hooks/         # 自定义 React Hooks
│   ├── lib/           # 工具函数
│   ├── server.ts      # SSR 服务端入口
│   └── start.ts       # 客户端入口
├── .env.local         # 本地环境变量（gitignored，需手动创建）
├── vite.config.ts     # Vite 配置
├── wrangler.jsonc     # Cloudflare Workers 配置
└── package.json
```
