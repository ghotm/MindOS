# syntax=docker/dockerfile:1
# =============================================================================
# MindOS Docker 镜像（Builder + Runtime 双阶段）
#
# 工作流：
#   1. 首次 / 源码变更时，手动构建 builder 阶段（缓存编译产物）：
#      docker compose build builder
#
#   2. 日常启动（秒级，BuildKit 自动复用 builder 缓存）：
#      docker compose up -d --build
#
# 服务端口：
#   - Web UI:  http://<服务器IP>:3456
#   - MCP:     http://<服务器IP>:8781/mcp
# =============================================================================

# ---- Stage 1: Builder（编译环境） ----
# 仅在手动 docker compose build builder 时编译，
# 日常 docker compose up -d --build 时 BuildKit 自动复用缓存
FROM node:22-slim AS builder

# 系统依赖（Next.js / sharp 等需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

WORKDIR /app

# ── 复制完整源码 ──
COPY . .

# ── 国内镜像加速 ──
ENV npm_config_registry=https://mirrors.cloud.tencent.com/npm/

# ── 安装依赖（BuildKit cache 加速） ──
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ── 1. 编译 TypeScript（dist/） ──
RUN pnpm --filter @geminilight/mindos build

# ── 2. 编译 Next.js 前端 ──
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm --filter @mindos/web run build

# ── 3. 重组 standalone 运行包 ──
RUN node scripts/prepare-standalone.mjs

# ── 4. 复制运行时资源（skills/templates/assets） ──
RUN node scripts/stage-product-package.mjs

# 清理 pnpm store 缓存
RUN pnpm store prune


# ---- Stage 2: Runtime（运行环境） ----
FROM node:22-slim AS runtime

WORKDIR /app

# 复制生产依赖
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts

# 复制 monorepo 根配置
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./

# 复制运行时必需 packages
COPY --from=builder /app/packages/mindos ./packages/mindos
COPY --from=builder /app/packages/web ./packages/web

# 创建数据目录
RUN mkdir -p /data/mind

# Entrypoint
COPY config.example.json /app/config.example.json
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# mindos CLI 快捷脚本（避免每次写 node /app/packages/mindos/bin/cli.js）
RUN printf '#!/bin/sh\nexec node /app/packages/mindos/bin/cli.js "$@"\n' > /usr/local/bin/mindos \
    && chmod +x /usr/local/bin/mindos

# 运行时环境变量
ENV NODE_ENV=production \
    MINDOS_WEB_PORT=3456 \
    MINDOS_MCP_PORT=8781 \
    MINDOS_WEB_HOST=0.0.0.0 \
    MCP_HOST=0.0.0.0 \
    MCP_TRANSPORT=http \
    MIND_ROOT=/data/mind \
    MINDOS_NEXT_STANDALONE=1 \
    LOG_LEVEL=info

EXPOSE 3456 8781

VOLUME ["/data/mind"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "fetch('http://localhost:3456/api/health').then(r=>r.json()).then(d=>{if(!d.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "packages/mindos/bin/cli.js", "start"]
