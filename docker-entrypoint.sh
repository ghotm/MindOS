#!/bin/sh
# =============================================================================
# MindOS Docker Entrypoint
# 职责：
#   1. 确保 ~/.mindos/ 和知识库根目录存在
#   2. 若未挂载配置文件，从内置模板复制一份（仅供首次参考）
#   3. 显示当前配置和目录信息，方便运维排查
#
# 配置文件：
#   - 推荐：在 docker-compose.yml 中挂载 ./config.json → ~/.mindos/config.json
#   - 模板：容器内置 /app/config.example.json
# =============================================================================
set -e

CONFIG_FILE="${HOME}/.mindos/config.json"
CONFIG_EXAMPLE="/app/config.example.json"
MIND_ROOT="${MIND_ROOT:-/data/mind}"

# ── 确保必要目录存在 ──────────────────────────────────────────────────────
mkdir -p "${HOME}/.mindos"
mkdir -p "${MIND_ROOT}"

# ── 配置文件初始化 ────────────────────────────────────────────────────────
if [ -f "${CONFIG_FILE}" ]; then
    echo "=========================================="
    echo "  MindOS Docker Entrypoint"
    echo "=========================================="
    echo "  Config : ${CONFIG_FILE}  ✓"
    echo "  Data   : ${MIND_ROOT}"
    echo ""
    echo "  容器内 CLI："
    echo "    mindos status         查看运行状态"
    echo "    mindos config show    查看当前配置"
    echo "    mindos doctor         诊断环境"
    echo ""
    echo "  如需修改配置："
    echo "    1. 编辑 ./config.json（宿主机）"
    echo "    2. docker compose restart mindos"
    echo "=========================================="
else
    echo "=========================================="
    echo "  MindOS Docker Entrypoint"
    echo "=========================================="
    echo "  ⚠ 未找到配置文件：${CONFIG_FILE}"
    echo ""
    if [ -f "${CONFIG_EXAMPLE}" ]; then
        cp "${CONFIG_EXAMPLE}" "${CONFIG_FILE}"
        echo "  已从内置模板 /app/config.example.json 复制默认配置。"
        echo "  请编辑后重新挂载，或通过 mount 直接提供 config.json。"
    else
        echo "  且内置模板缺失，请手动创建 config.json 并挂载。"
    fi
    echo ""
    echo "  推荐挂载方式（docker-compose.yml）："
    echo "    volumes:"
    echo "      - ./config.json:/root/.mindos/config.json:ro"
    echo ""
    echo "  模板参考："
    echo "    config.example.json （项目根目录）"
    echo "=========================================="
fi

# ── 启动服务 ──────────────────────────────────────────────────────────────
echo ""
echo "[entrypoint] Starting MindOS..."
exec "$@"