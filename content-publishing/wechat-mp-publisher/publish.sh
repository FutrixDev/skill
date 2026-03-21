#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLISHER="$SCRIPT_DIR/scripts/wechat_mp_publish.py"
CONFIG="$SCRIPT_DIR/config.json"
AUTHOR="$(python3 - <<'PY'
import json
from pathlib import Path
p = Path('/home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher/config.json')
if p.exists():
    data = json.loads(p.read_text())
    print(data.get('wechat', {}).get('author', 'Dylan'))
else:
    print('Dylan')
PY
)"

usage() {
  cat <<'EOF'
微信公众号发布助手（merged wechat-mp-publisher）

用法:
  ./publish.sh <markdown文件> [选项]

选项:
  --no-cover                 不生成封面（兼容旧调用）
  --image <图片文件>          使用自定义封面图片
  --jimeng-prompt <提示词>    先用即梦4.0生成封面，再发布
  --jimeng-width <宽度>       即梦封面宽度，需与 --jimeng-height 一起使用
  --jimeng-height <高度>      即梦封面高度，需与 --jimeng-width 一起使用
  --download-dir <目录>       即梦图片下载目录，默认 generated-images/
  --source-url <URL>          显式设置阅读原文链接
  --dry-run                   只渲染 HTML，不真正发草稿
  --help, -h                 显示帮助
EOF
}

[[ $# -gt 0 ]] || { usage; exit 1; }

ARTICLE=""
EXTRA=()
DOWNLOAD_DIR="$SCRIPT_DIR/generated-images"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --no-cover)
      shift
      ;;
    --image)
      EXTRA+=("--cover-image" "$2")
      shift 2
      ;;
    --jimeng-prompt)
      EXTRA+=("--jimeng-cover-prompt" "$2")
      shift 2
      ;;
    --jimeng-width)
      EXTRA+=("--jimeng-width" "$2")
      shift 2
      ;;
    --jimeng-height)
      EXTRA+=("--jimeng-height" "$2")
      shift 2
      ;;
    --download-dir)
      DOWNLOAD_DIR="$2"
      shift 2
      ;;
    --source-url)
      EXTRA+=("--source-url" "$2")
      shift 2
      ;;
    --dry-run)
      EXTRA+=("--dry-run")
      shift
      ;;
    -* )
      echo "❌ 未知参数: $1" >&2
      usage
      exit 1
      ;;
    *)
      if [[ -z "$ARTICLE" ]]; then
        ARTICLE="$1"
      else
        echo "❌ 只支持一个 Markdown 文件参数" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

[[ -n "$ARTICLE" ]] || { echo "❌ 请提供 Markdown 文件路径" >&2; exit 1; }

mkdir -p "$DOWNLOAD_DIR"

exec python3 "$PUBLISHER" \
  --article "$ARTICLE" \
  --config "$CONFIG" \
  --author "$AUTHOR" \
  --download-dir "$DOWNLOAD_DIR" \
  "${EXTRA[@]}"
