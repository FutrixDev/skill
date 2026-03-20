---
name: jimeng-volcengine
description: Use when generating cover images or illustrations with Volcano Engine Jimeng 4.0 via AK/SK signed OpenAPI requests.
---

# Jimeng Volcano Engine

Use this skill when the user needs an image generated through 火山引擎即梦 4.0.

## Module Layout

- Main generator: `scripts/jimeng_image.py`
- Start from `config.example.json`, then create local `config.json`
- You can also provide credentials with:
  - `VOLC_ACCESSKEY`
  - `VOLC_ACCESS_KEY_ID`
  - `VOLC_SECRETKEY`
  - `VOLC_SECRET_ACCESS_KEY`

## Correct API Path

- This skill is for the Jimeng OpenAPI route at `https://visual.volcengineapi.com`
- Auth is AK/SK HMAC signing
- It is not the LAS bearer-token route
- Request flow is two-step:
  1. `CVSync2AsyncSubmitTask`
  2. `CVSync2AsyncGetResult`

## Non-Negotiables

- Keep `Region=cn-north-1`
- Keep `Service=cv`
- Keep `req_key=jimeng_t2i_v40`
- Do not collapse submit and result polling into one request
- Do not guess-return image URLs from the submit response; poll by `task_id`

## Quick Start

```bash
cd image-generation/jimeng-volcengine
python3 scripts/jimeng_image.py \
  --prompt "一张现代科技风微信公众号封面，蓝青色，抽象数据流和芯片元素" \
  --width 1536 \
  --height 1024 \
  --download-dir ./generated-images
```

## Report Back

- State whether the submit call succeeded
- State the `task_id`
- State whether polling reached `done`
- State the final image URL
- State the saved local path when auto-download is enabled
