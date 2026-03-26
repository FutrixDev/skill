# WeChat Component Syntax

Use these lightweight directives in Markdown when you want themed sections.

## Supported directives

```md
::: lead
这篇文章适合谁看，以及读者能得到什么。
:::

::: summary
先给结论，适合放 2-3 句结论性内容。
:::

::: tip
放实操建议。
:::

::: warning
放风险提醒。
:::

::: note
放补充说明。
:::

::: pitfall
放常见坑。
:::

::: steps
1. 第一步
2. 第二步
:::

::: checklist
- 发布前检查 1
- 发布前检查 2
:::

::: faq
**Q：** 为什么正文链接不稳定？

**A：** 因为微信正文对外链处理不稳定，优先用阅读原文。
:::

::: resources
- 原文：https://example.com/post
- 文档：https://example.com/docs
:::

::: comparison
| 方案 | 优点 | 风险 |
| --- | --- | --- |
| A | 稳 | 朴素 |
| B | 漂亮 | 依赖更多 |
:::
```

## Optional custom title

Append a custom title after the directive name:

```md
::: tip 先做这一步
把公众号密钥和 IP 白名单先跑通。
:::
```

## Theme selection

Set the theme in frontmatter:

```yaml
---
title: 示例文章
wechat:
  theme: tutorial-focus
---
```

Or override from CLI:

```bash
python3 scripts/wechat_mp_publish.py --article article.md --theme news-brief --dry-run
```

## Current themes

- `tech-clean`
- `news-brief`
- `tutorial-focus`
- `warm-magazine`
