#!/bin/bash
# ============================================================================
# BeingSeen 本地开发启动脚本 (macOS)
#
# 为什么需要这个脚本?
# ----------------------------------------------------------------------------
# 本机的 Node 由 Apple 签名 (有 Team ID), 而 npm 分发的 @next/swc-darwin-arm64
# 是 adhoc 签名 (无 Team ID)。macOS 的库校验 (library validation) 会因此拒绝
# 加载原生 SWC 二进制, 报错:
#     "mapping process and mapped file (non-platform) have different Team IDs"
#
# 解决办法: 给 Node 的一份副本签上
#     com.apple.security.cs.disable-library-validation
# 权限, 然后用这份副本运行 Next。
#
# 这个脚本会自动完成以上全部步骤, 可以重复运行。
# Linux / Vercel 上完全不需要这些 — 直接用 `pnpm dev`。
# ============================================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="${NODE_BIN:-/Users/eva/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node}"
PNPM_BIN="${PNPM_BIN:-/Users/eva/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.mjs}"
DEV_NODE="/tmp/beingseen-node/node"
ENT_PLIST="/tmp/beingseen-node/entitlements.plist"

cd "$PROJECT_DIR"

# ---------------------------------------------------------------- 1. 准备开发用 Node
prepare_dev_node() {
  if [[ ! -x "$DEV_NODE" ]] || ! codesign -d --entitlements - "$DEV_NODE" 2>/dev/null | grep -q "disable-library-validation"; then
    echo "[dev] 制作带 disable-library-validation 权限的 Node 副本 ..."
    mkdir -p "$(dirname "$DEV_NODE")"
    cp "$(readlink -f "$NODE_BIN" 2>/dev/null || echo "$NODE_BIN")" "$DEV_NODE"
    cat > "$ENT_PLIST" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
</dict>
</plist>
PLIST
    codesign -f -s - --entitlements "$ENT_PLIST" "$DEV_NODE"
  fi
}

# ---------------------------------------------------------------- 2. 确保原生 SWC 已签名
sign_swc() {
  local swc
  swc="$(find node_modules/.pnpm -maxdepth 4 -type d -name 'swc-darwin-arm64' 2>/dev/null | head -1)"
  if [[ -n "$swc" ]]; then
    local bin="$swc/next-swc.darwin-arm64.node"
    if [[ -f "$bin" ]] && ! codesign -dv "$bin" 2>&1 | grep -q "adhoc"; then
      echo "[dev] 为原生 SWC 重新 adhoc 签名 ..."
      codesign -f -s - "$bin"
    fi
  fi
}

prepare_dev_node
sign_swc

# ---------------------------------------------------------------- 3. 启动
export NEXT_CACHE_DIR="${NEXT_CACHE_DIR:-/tmp/beingseen-next-cache}"
mkdir -p "$NEXT_CACHE_DIR"

CMD="${1:-dev}"
case "$CMD" in
  dev)
    echo "[dev] 启动开发服务器 http://localhost:3000"
    exec "$DEV_NODE" node_modules/next/dist/bin/next dev
    ;;
  build)
    echo "[build] 生产构建"
    exec "$DEV_NODE" node_modules/next/dist/bin/next build
    ;;
  start)
    echo "[start] 启动生产服务器 http://localhost:3000"
    exec "$DEV_NODE" node_modules/next/dist/bin/next start
    ;;
  typecheck)
    exec "$DEV_NODE" node_modules/typescript/bin/tsc --noEmit
    ;;
  data)
    echo "[data] 重新生成数据与图表"
    exec /opt/anaconda3/bin/python build_data.py
    ;;
  install)
    exec "$NODE_BIN" "$PNPM_BIN" install
    ;;
  *)
    echo "用法: $0 [dev|build|start|typecheck|data|install]" >&2
    exit 1
    ;;
esac
