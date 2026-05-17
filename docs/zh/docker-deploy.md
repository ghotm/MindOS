# MindOS Docker 部署指南

## 概述

MindOS Docker 部署采用单 Dockerfile 双阶段架构，配置通过 `config.json` 管理：

- **Builder 阶段**：完整编译环境和构建产物。仅在源码/依赖变更时手动重建（约 10 分钟）。
- **Runtime 阶段**：纯文件复制，BuildKit 自动复用 Builder 缓存，秒级构建。
- **配置管理**：通过 `config.example.json` 模板创建 `config.json`，挂载到容器。

## 环境要求

| 项目 | 最低要求 |
|------|----------|
| Docker | 20.10+（需支持 BuildKit） |
| Docker Compose | v2 |
| 内存 | 16GB（构建阶段 Next.js 编译需要约 8GB） |
| 磁盘 | 20GB |

## 快速开始

### 1. 创建配置文件

```bash
cp config.example.json config.json
# 编辑 config.json，至少填写 ai.providers 中的 apiKey 和 baseUrl
```

### 2. 配置挂载

编辑 `docker-compose.yml`，找到 volumes 部分，取消注释 config.json 挂载行：

```yaml
volumes:
  - ./data:/data/mind
  # 取消下面这行的注释：
  - ./config.json:/root/.mindos/config.json:ro
```

### 3. 准备环境变量（可选）

```bash
cp .env.example .env
# .env 仅包含版本号和日志配置，AI 配置在 config.json 中
```

### 4. 首次构建 Builder 缓存

**首次部署或源码变更时（约 10 分钟）：**

1. 取消注释 `docker-compose.yml` 中的 `builder` 服务（删除 `#`）
2. 执行构建：
```bash
docker compose build builder
```
3. 构建完成后**注释回去**（重新加上 `#`）

### 5. 启动服务

```bash
docker compose up -d --build
```

### 6. 访问

- Web UI: `http://<服务器IP>:3456`
- MCP 端点: `http://<服务器IP>:8781/mcp`

## 工作流说明

```
首次或源码变更时：
  取消注释 builder → docker compose build builder → 注释回去
  （约 10 分钟，编译全部源码）

每次日常启动：
  docker compose up -d --build
  （秒级完成，BuildKit 自动复用 builder 缓存）
```

## 配置说明

### config.json（核心配置）

AI 配置、认证、同步等所有业务配置通过 `config.json` 管理。

**创建方法**：
```bash
cp config.example.json config.json
# 编辑 config.json
```

**挂载方法**（在 docker-compose.yml 中取消注释）：
```yaml
- ./config.json:/root/.mindos/config.json:ro
```

**修改配置后**：
```bash
docker compose restart mindos
```

### config.json 关键字段

| 字段 | 说明 |
|------|------|
| `mindRoot` | 知识库根目录 |
| `port` / `mcpPort` | Web 和 MCP 服务端口 |
| `logLevel` | 日志等级：trace / debug / info / warn / error / fatal |
| `authToken` | API 认证令牌（推荐设置） |
| `ai.activeProvider` | 当前激活的 AI 提供商 id |
| `ai.providers` | AI 提供商列表（数组，每个含 id/name/protocol/apiKey/model/baseUrl） |
| `allowNetworkAccess` | 是否允许局域网访问 |
| `sync` | Git 知识库同步配置 |
| `embedding` | 语义搜索配置 |

完整字段及注释见 `config.example.json`。

### .env 环境变量（可选）

`.env` 仅包含非业务配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| MINDOS_VERSION | latest | Builder 镜像版本标签 |
| LOG_LEVEL | info | 日志等级 |
| PRETTY_LOGS | true | 彩色日志输出 |

## 日常操作

### 查看日志

```bash
docker compose logs -f mindos
```

### 进入容器

```bash
docker compose exec mindos bash
# 容器内可直接使用 mindos CLI：
mindos status          # 查看运行状态
mindos config show     # 查看当前配置
mindos doctor          # 诊断环境
```

### 修改配置

```bash
# 编辑宿主机上的 config.json
vim config.json
# 重启容器生效
docker compose restart mindos
```

### 停止 / 更新

```bash
# 停止
docker compose down

# 更新版本
git pull
# 取消注释 builder → 重建缓存
docker compose build builder
# 注释回去
docker compose up -d --build
```

## 架构说明

```
config.example.json  ──→  config.json（用户编辑）──→  ~/.mindos/config.json（挂载）

Dockerfile (单文件，双阶段)
  ├── Stage 1: builder
  │     Node 22 + pnpm → 安装依赖 → tsc → Next.js → standalone → stage
  │
  └── Stage 2: runtime
        node:22-slim → COPY 编译产物 → config.example.json → entrypoint → mindos start
```

## 常见问题

### Q: Builder 缓存何时需要重建？

源码变更、依赖更新（pnpm-lock.yaml）、Node.js 版本升级时需要。日常重启和配置修改不需要。

### Q: 如何添加多个 AI Provider？

编辑 `config.json`，在 `ai.providers` 数组中添加新 provider：

```json
{
  "ai": {
    "activeProvider": "openai",
    "providers": [
      { "id": "openai", "name": "OpenAI", "protocol": "openai", ... },
      { "id": "anthropic", "name": "Anthropic", "protocol": "anthropic", ... }
    ]
  }
}
```

然后 `docker compose restart mindos`。

### Q: 构建失败怎么办？

1. 确保内存 >= 16GB
2. 检查网络是否可达 npm 镜像（默认使用 mirrors.cloud.tencent.com）
3. 查看构建日志定位具体步骤

### Q: ARM64 支持？

Dockerfile 默认适配宿主机架构（BuildKit 自动检测）。ARM64 设备直接构建即可。
