# skill

按模块分类的技能仓库。

当前模块：

- `content-publishing/wechat-mp-publisher`
  微信公众号单一主 skill。负责：
  - Jimeng 封面/正文配图生成
  - Markdown -> 微信兼容 HTML
  - 正文图片上传
  - 封面上传
  - 草稿创建
  - 本地美化预览

这次收口后，不再保留独立的 `image-generation/jimeng-volcengine` 模块副本。
Jimeng 能力已经并入 `wechat-mp-publisher/scripts/jimeng_image.py`，避免维护两套实现。

抽象出的关键经验：

- 微信公众号草稿接口吃的是保守 HTML 子集，不是 Markdown 原文。
- 微信编辑器会把语义化列表吃坏，最终 HTML 里更稳的是显式前缀段落，不是 `ol/ul/li`。
- 正文插图和封面图是两条不同的上传链路。
- 正文里的外部超链接不可靠，稳定引流要走 `content_source_url` / `阅读原文`。
- 微信稿更适合内联样式、简单结构、无表格依赖的排版。
- 封面/配图和最终发稿虽然是两个步骤，但在技能层面最好只保留一个主入口，避免路径分裂。
