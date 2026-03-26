---
title: 用 tutorial-focus 做一篇部署教程
summary: 展示教程导向主题在步骤、避坑、FAQ 场景下的表现。
author: Dylan
wechat:
  theme: tutorial-focus
---

# 用 tutorial-focus 做一篇部署教程

::: lead
这类文章应该让读者一眼知道：我要解决什么问题、我需要准备什么、我最容易在哪一步翻车。
:::

## 适用对象

适合第一次搭 OpenClaw、第一次接微信发布链路、或者想把文章自动进公众号草稿箱的人。

::: steps
1. 准备 AppID / Secret
2. 确认服务器出口 IP 已进白名单
3. 用 `--dry-run` 看 HTML
4. 再正式创建草稿
:::

## 最小命令

```bash
python3 scripts/wechat_mp_publish.py \
  --article article.md \
  --theme tutorial-focus \
  --dry-run \
  --html-out /tmp/article.html
```

::: pitfall
最常见的错，不是 Markdown 写坏了，而是微信 API 权限、IP 白名单或者图片大小超限。
:::

::: tip
教程类文章不要一上来贴三段配置。先告诉读者这篇文章帮他省掉什么麻烦。
:::

## 排错问答

::: faq
**Q：** 为什么 dry-run 能过，正式发布却失败？

**A：** 因为 dry-run 不会调用微信接口，正式发布才会碰到 token、白名单和上传限制。
:::

::: checklist
- 标题 32 字以内
- 摘要 120 字以内
- 图片大小在微信限制内
- 阅读原文指向博客 canonical URL
:::
