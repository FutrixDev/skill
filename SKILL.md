---
name: wechat-mp-publisher
description: Use when generating Jimeng cover/body images for a WeChat article, previewing WeChat-friendly HTML, or publishing Markdown articles to 微信公众号草稿箱.
---

# WeChat MP Publisher

Use this skill for the full WeChat article pipeline on this host: Jimeng image generation, WeChat-friendly HTML preview, and final draft creation.

## Module Layout

- Main publisher: `scripts/wechat_mp_publish.py`
- Jimeng image generator: `scripts/jimeng_image.py`
- HTML preview beautifier: `scripts/wechat_beautifier.py`
- Default config: `config.json` in this module directory (start from `config.example.json`)
- Formatting references:
  - `references/wechat-formatting.md`
  - `references/beautifier.md`
  - `references/component-syntax.md`
- Theme presets: `themes/*.yaml`

## Choose the Path

- If the user wants a WeChat draft from Markdown, run `scripts/wechat_mp_publish.py`.
- If the user wants a WeChat-friendly HTML preview without publishing, run `scripts/wechat_beautifier.py` or use `--dry-run --html-out`.
- If the user wants different visual styles, choose a theme via frontmatter `wechat.theme` or CLI `--theme`.
- If the user wants richer chapter blocks (lead, tip, warning, steps, faq, resources, comparison), read `references/component-syntax.md` and render with the built-in directive syntax.
- If the user wants a cover image or body illustrations for the article, run `scripts/jimeng_image.py`.
- If the final goal is a WeChat draft, image generation is only a sub-step; finish by returning to `scripts/wechat_mp_publish.py`.
- If the Markdown already contains `![alt](...)` images, keep them and let the publisher upload them through WeChat `media/uploadimg`.
- If the user provides a cover file, use `--cover-image` and do not regenerate the cover.

## Config

`config.json` supports a merged single-skill layout:

```json
{
  "wechat": {
    "appid": "wx...",
    "secret": "...",
    "author": "Dylan"
  },
  "volc_engine": {
    "access_key_id": "AK...",
    "secret_access_key": "...",
    "region": "cn-north-1",
    "service": "cv"
  },
  "site_base_url": "https://www.dylanslife.com",
  "blog_posts_dir": "/home/openclaw/blog/posts"
}
```

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
- Jimeng generation uses the Volcano Engine OpenAPI AK/SK signing flow, not the LAS bearer-token route.
- Do not expose AppSecret, AK/SK, or other credentials in chat output.
- Do not rely on browser preview as the source of truth; the WeChat draft API result is the acceptance standard.

## Writing Quality Rules

- 发布公众号前，先把内容改写成“微信原生可读文章”，不要直接把聊天记录、调试流水账、命令回显拼进去。
- 教程/配置类文章优先用这个顺序：
  - 先说这篇文章帮读者解决什么问题，谁适合看
  - 再给“最少可用配置”
  - 再列出必需的 secret、skill、GitHub 地址和关键命令
  - 最后补常见坑和一个最小心智模型
- 叙事上优先写“问题 -> 判断 -> 方案 -> 结果”，不要按聊天时间线逐条复述。
- 首屏要先出现价值说明，不要一上来就是配置块、JSON 或命令。
- 段落要短，标题要直接表达价值；一屏内就要让读者知道自己为什么继续读。
- 保留真正有信息量的转折点，删掉重复试错、工具噪音、无效来回和过长命令输出。
- 配置和命令用代码块；其他说明尽量用短段落，不要把整篇写成大段 bullet 堆砌。
- 排版上优先短段落 + 明确二级标题 + 少量高价值列表；不要连续堆很多 bullet，也不要让整篇变成命令清单。
- 重要结论、注意事项和常见坑优先用短标题分段，不要埋在长段落里。
- 如果外链很重要，在正文里写出完整 URL 文本，同时把 `content_source_url` / `阅读原文` 设成稳定跳转目标。
- 发布前优先 `--dry-run` 检查标题、摘要和最终 HTML；质量要求高时，先改文，再发稿。

## Beautiful Formatting

For the full style guide, read `references/beautifier.md`.

Quick rules:

- H1 Title: 24px, bold, bottom border
- H2 Section: 20px, bold, left border
- H3 Subsection: 17px, bold
- Paragraph: 16px, line-height 1.8
- Code Block: dark background `#0f172a`, light text
- Quote Block: light gray background, left border
- Lists: flatten to visible `• ...` or `1. ...` paragraphs

## Quick Start

### Publish article to draft

```bash
cd /home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher
python3 scripts/wechat_mp_publish.py   --article /abs/path/article.md   --author Dylan   --theme tech-clean
```

### Publish with Jimeng cover

```bash
python3 scripts/wechat_mp_publish.py   --article /abs/path/article.md   --author Dylan   --jimeng-cover-prompt "现代科技风微信公众号封面，蓝青色，数据流与芯片元素"   --jimeng-width 1536   --jimeng-height 1024
```

### Generate Jimeng image only

```bash
python3 scripts/jimeng_image.py   --prompt "现代科技资讯插画，蓝青主色，信息图感，不要文字"   --width 1536   --height 1024   --download-dir ./generated-images
```

### Preview beautiful HTML without publishing

```bash
python3 scripts/wechat_beautifier.py article.md output.html tutorial-focus
```

### Debug rendered HTML without publishing

```bash
python3 scripts/wechat_mp_publish.py   --article /abs/path/article.md   --dry-run   --html-out /tmp/wechat-preview.html
```

## Report Back

State:

- whether HTML rendering succeeded
- whether body images were uploaded and how many were rewritten
- whether a cover was generated or uploaded
- whether the WeChat draft was created successfully and the `media_id` when available
