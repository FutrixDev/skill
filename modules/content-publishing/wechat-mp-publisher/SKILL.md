---
name: wechat-mp-publisher
description: Use when publishing Markdown articles to 微信公众号草稿箱, especially when the content needs WeChat-compatible HTML, inline body image upload, or Jimeng-generated covers.
---

# WeChat MP Publisher

Use this skill when the user wants a Markdown article published to 微信公众号草稿箱 in the current environment.

## Module Layout

- The dedicated publisher for this skill is `scripts/wechat_mp_publish.py`.
- Default config is `config.json` in this module directory. Start from `config.example.json`.
- Jimeng 4.0 cover generation is expected at `../../image-generation/jimeng-volcengine/scripts/jimeng_image.py`.
- You can override paths with:
  - `WECHAT_MP_CONFIG`
  - `WECHAT_MP_JIMENG_SCRIPT`
  - `WECHAT_MP_SITE_BASE_URL`
  - `WECHAT_MP_BLOG_POSTS_DIR`

## Choose the Path

- If the user wants a WeChat draft from Markdown, run `scripts/wechat_mp_publish.py`.
- If the user wants a Jimeng cover as well, pass `--jimeng-cover-prompt`.
- If the Markdown already contains `![alt](...)` images, keep them and let the script upload them through WeChat `media/uploadimg`.
- If the user provides a cover file, use `--cover-image` and do not regenerate the cover.

## Non-Negotiables

- Do not send raw Markdown directly to WeChat APIs.
- Render Markdown into WeChat-compatible HTML first.
- Do not keep semantic `ol` / `ul` / `li` in the final draft HTML.
  - WeChat editor reflows list tags unreliably and can inject phantom blank bullets or skipped numbers.
  - Flatten lists into visible paragraph prefixes such as `1. ...` or `• ...` before draft creation.
- Always set `阅读原文` to a canonical blog URL.
  - If the article path is under the configured blog posts directory, let `scripts/wechat_mp_publish.py` auto-derive `<site_base_url>/posts/<slug>.html`.
  - If the WeChat article is a derived summary (for example HN Top 5), pass `--source-url` explicitly and point it to the corresponding source blog post.
- Do not rely on正文里的外部超链接作为最终交付效果。
  - WeChat commonly strips or neutralizes body anchors.
  - Treat `content_source_url` / `阅读原文` as the stable outbound link channel.
- Treat cover images and body images as different channels:
  - cover: `material/add_material` -> `thumb_media_id`
  - body images: `media/uploadimg` -> URL replacement in HTML
- Body images must be normalized to WeChat-friendly `jpg` or `png` before upload.
- Do not rely on browser preview as the source of truth; the WeChat draft API result is the acceptance standard.

## Quick Start

```bash
cd modules/content-publishing/wechat-mp-publisher
python3 scripts/wechat_mp_publish.py \
  --article /abs/path/article.md \
  --author Dylan
```

With Jimeng cover:

```bash
cd modules/content-publishing/wechat-mp-publisher
python3 scripts/wechat_mp_publish.py \
  --article /abs/path/article.md \
  --author Dylan \
  --jimeng-cover-prompt "一张现代科技风微信公众号封面，蓝青色，抽象数据流和芯片元素" \
  --jimeng-width 1536 \
  --jimeng-height 1024
```

Debug rendered HTML without publishing:

```bash
cd modules/content-publishing/wechat-mp-publisher
python3 scripts/wechat_mp_publish.py \
  --article /abs/path/article.md \
  --dry-run \
  --html-out /tmp/wechat-preview.html
```

## Execution Rules

- Prefer this skill over the legacy `wechat-publisher/publisher.py` when the task involves Markdown formatting or body illustrations.
- When the article contains tables, convert them into readable bullet content instead of keeping `<table>` tags.
- When the article contains ordered or unordered lists, keep the visible meaning but replace final HTML list tags with prefixed paragraphs.
- When the article contains raw HTML blocks, do not trust them; keep only the safe WeChat HTML subset.
- When image upload fails, report the exact failing file or URL and the WeChat API error.
- Do not expose stored AppSecret or other credentials in chat output.

## References

- `references/wechat-formatting.md` for Markdown vs WeChat formatting rules and image handling constraints.

## Report Back

- State whether HTML rendering succeeded.
- State whether body images were uploaded and how many were rewritten.
- State whether a cover was uploaded or generated.
- State whether the WeChat draft was created successfully and return the `media_id` when available.
