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
  local swc=""
  # 依赖还没安装时 node_modules/.pnpm 不存在; find 会返回非零,
  # 在 set -e 下会让整个脚本静默退出, 所以这里必须容忍失败。
  if [[ -d node_modules/.pnpm ]]; then
    swc="$(find node_modules/.pnpm -maxdepth 6 -type d -name 'swc-darwin-arm64' 2>/dev/null | head -1 || true)"
  fi
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

# ---------------------------------------------------------------- 3. 静态导出
# 静态导出有两处约束:
#   1. 不支持 Route Handler  -> 构建期间把 src/app/api 移开
#   2. next build 没有 --config 选项 -> 构建期间用静态配置覆盖 next.config.mjs
# 两者都在结束后还原。
build_static() {
  local api_dir="src/app/api"
  local api_backup=".static-build-api-backup"
  local cfg="next.config.mjs"
  local cfg_backup=".static-build-next-config.mjs"
  local static_cfg="next.config.static.mjs"
  local restored=0
  local rc=0

  restore_all() {
    if [[ "$restored" -eq 0 ]]; then
      if [[ -d "$api_backup" ]]; then
        rm -rf "$api_dir"
        mv "$api_backup" "$api_dir"
        echo "[static] 已还原 $api_dir"
      fi
      if [[ -f "$cfg_backup" ]]; then
        mv -f "$cfg_backup" "$cfg"
        echo "[static] 已还原 $cfg"
      fi
      restored=1
    fi
  }
  trap restore_all EXIT INT TERM

  if [[ ! -f "$static_cfg" ]]; then
    echo "[static] 找不到 $static_cfg" >&2
    return 1
  fi

  # 移开 API 路由
  if [[ -d "$api_dir" ]]; then
    rm -rf "$api_backup"
    mv "$api_dir" "$api_backup"
    echo "[static] 已临时移开 $api_dir (静态导出不允许 API 路由)"
  fi

  # 换成静态配置
  rm -f "$cfg_backup"
  if [[ -f "$cfg" ]]; then
    mv "$cfg" "$cfg_backup"
  fi
  cp "$static_cfg" "$cfg"
  echo "[static] 已启用 $cfg (output: export)"

  # .next 里可能有 dev 模式生成的类型文件, 它们引用了刚被移开的
  # src/app/api/... 路由, 会让 tsc 报 TS2307。整个清掉做干净构建。
  echo "[static] 清理 .next 缓存 ..."
  rm -rf .next

  echo "[static] 开始构建 ..."
  # 告诉前端这是静态部署 (没有 /api/stories), 留言板会改用客户端直连写入
  if ! NEXT_PUBLIC_STATIC_EXPORT=1 "$DEV_NODE" node_modules/next/dist/bin/next build; then
    rc=1
  fi

  restore_all
  trap - EXIT INT TERM

  if [[ $rc -ne 0 ]]; then
    echo "[static] 构建失败" >&2
    return 1
  fi

  if [[ -d out ]]; then
    cat > out/vercel.json << 'JSON'
{
  "headers": [
    {
      "source": "/data/(.*).json",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    },
    {
      "source": "/charts/(.*).png",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
JSON
    echo "[static] 已写出 out/vercel.json"
    du -sh out 2>/dev/null | awk '{print "[static] 产物大小: " $1}'
    echo "[static] 完成 -> $(pwd)/out"
  fi
  return 0
}

# ---------------------------------------------------------------- 4. 启动
export NEXT_CACHE_DIR="${NEXT_CACHE_DIR:-/tmp/beingseen-next-cache}"
mkdir -p "$NEXT_CACHE_DIR"

CMD="${1:-dev}"
case "$CMD" in
  dev)
    echo "[dev] 启动开发服务器 http://localhost:3000"
    exec "$DEV_NODE" node_modules/next/dist/bin/next dev
    ;;
  build)
    echo "[build] 生产构建 (serverless, 用于 Vercel Git 部署)"
    exec "$DEV_NODE" node_modules/next/dist/bin/next build
    ;;
  static)
    build_static
    exit $?
    ;;
  serve-static)
    if [[ ! -d out ]]; then
      echo "[serve-static] 还没有 out/ 目录, 请先运行: ./dev.sh static" >&2
      exit 1
    fi
    # 用自带的静态服务器, 而不是 `python -m http.server`:
    # Next 会为每个子页面同时生成 page.html 和 page/ (只含 RSC 的 .txt),
    # 普通静态服务器会把 /page 301 到 /page/ 然后列出文件目录。
    exec "$DEV_NODE" scripts/serve-static.mjs
    ;;
  start)
    echo "[start] 启动生产服务器 http://localhost:3000"
    exec "$DEV_NODE" node_modules/next/dist/bin/next start
    ;;
  typecheck)
    exec "$DEV_NODE" node_modules/typescript/bin/tsc --noEmit
    ;;
  smoke)
    # 浏览器冒烟测试: 需要另一个终端已经跑着 ./dev.sh start
    shift
    exec "$DEV_NODE" scripts/browser-smoke.mjs "$@"
    ;;
  outline)
    # 逐条核对 网页布局纲要.docx 的要求
    shift
    exec "$DEV_NODE" scripts/outline-check.mjs "$@"
    ;;
  data)
    echo "[data] 重新生成数据与图表"
    exec /opt/anaconda3/bin/python build_data.py
    ;;
  install)
    exec "$NODE_BIN" "$PNPM_BIN" install
    ;;
  *)
    echo "用法: $0 [dev|build|static|serve-static|start|typecheck|smoke|outline|data|install]" >&2
    exit 1
    ;;
esac
