#!/usr/bin/env bash
# ============================================================================
# site-v2 local runner
#
# Why this exists: on macOS the Node binary is usually Apple-signed while the
# native rolldown binding shipped by Vite is adhoc-signed. Library validation
# then refuses to load it:
#
#   mapping process and mapped file (non-platform) have different Team IDs
#
# The workaround is the same one the old site uses: make a copy of Node signed
# with com.apple.security.cs.disable-library-validation and run Vite with it.
# macOS only; Linux and Vercel use plain node and are unaffected.
#
# Usage:
#   ./run.sh install     # pnpm install
#   ./run.sh dev         # http://localhost:3100
#   ./run.sh build       # typecheck + static dist/
#   ./run.sh preview     # serve dist/
#   ./run.sh typecheck
#
# If node/pnpm are not on PATH, pass them explicitly:
#   NODE_BIN=/path/to/node PNPM_BIN=/path/to/pnpm.mjs ./run.sh install
# ============================================================================
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
PNPM_BIN="${PNPM_BIN:-$(command -v pnpm || true)}"
DEV_NODE="/tmp/beingseen-v2-node/node"
ENT_PLIST="/tmp/beingseen-v2-node/entitlements.plist"

if [[ -z "$NODE_BIN" ]]; then
  echo "[run] node not found. Set NODE_BIN=/path/to/node" >&2
  exit 1
fi

prepare_node() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    printf '%s' "$NODE_BIN"
    return
  fi

  if [[ ! -x "$DEV_NODE" ]] || ! codesign -d --entitlements - "$DEV_NODE" 2>/dev/null | grep -q "disable-library-validation"; then
    echo "[run] creating an entitlement-signed Node copy (macOS rolldown fix) ..." >&2
    mkdir -p "$(dirname "$DEV_NODE")"
    cp "$(readlink "$NODE_BIN" 2>/dev/null || echo "$NODE_BIN")" "$DEV_NODE"
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

  printf '%s' "$DEV_NODE"
}

NODE="$(prepare_node)"
# The .bin shims (`tsc`, `vite`) use `#!/usr/bin/env node`; put the signed copy
# first so `pnpm run build` does not fall back to the Apple-signed Node.
export PATH="$(dirname "$NODE"):$PATH"

pnpm_run() {
  if [[ -z "$PNPM_BIN" ]]; then
    echo "[run] pnpm not found. Set PNPM_BIN=/path/to/pnpm.mjs" >&2
    exit 1
  fi
  case "$PNPM_BIN" in
    *.mjs | *.cjs | *.js) "$NODE" "$PNPM_BIN" "$@" ;;
    *) "$PNPM_BIN" "$@" ;;
  esac
}

CMD="${1:-dev}"
shift || true

case "$CMD" in
  install) pnpm_run install "$@" ;;
  dev) "$NODE" node_modules/vite/bin/vite.js "$@" ;;
  build) pnpm_run build ;;
  preview) "$NODE" node_modules/vite/bin/vite.js preview "$@" ;;
  typecheck) "$NODE" node_modules/typescript/bin/tsc --noEmit ;;
  *)
    echo "usage: $0 [install|dev|build|preview|typecheck]" >&2
    exit 1
    ;;
esac
