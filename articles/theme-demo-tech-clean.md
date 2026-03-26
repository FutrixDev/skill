---
title: 用 tech-clean 做一篇 Agent 技术文章
summary: 展示科技清爽主题在教程与系统说明类文章中的表现。
author: Dylan
wechat:
  theme: tech-clean
---

# 用 tech-clean 做一篇 Agent 技术文章

::: lead
这篇测试稿主要看三个东西：标题层级清不清楚、信息卡片够不够稳、代码和表格在公众号里是否还保持可读。
:::

## 适合什么内容

适合技术教程、系统方案、工具链介绍和产品评测。整体应该给人一种信息密度高，但不会压迫的感觉。

::: summary
如果你写的是 OpenClaw、Agent、自动化、工作流、工程配置，这个主题应该是默认起手式。
:::

## 一个最小配置

```json
{
  "wechat": {
    "appid": "wx123",
    "secret": "***"
  }
}
```

::: tip
正文里真正重要的外链，除了写在文中，最好也放进 `阅读原文`。
:::

## 方案对比

::: comparison
| 方案 | 优点 | 风险 |
| --- | --- | --- |
| 当前 skill | 本地可控，适合自动化 | 默认样式偏朴素 |
| 第三方排版服务 | 漂亮、主题多 | 外部依赖更强 |
:::

## 发布前检查

::: checklist
- 标题不要太虚
- 摘要要能单独成立
- 图片尺寸提前压缩
- 列表不要写得太长
:::

::: resources
- 原文：https://www.dylanslife.com/
- 文档：https://docs.openclaw.ai
:::
