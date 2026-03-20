# skill

按模块分类的技能仓库。

当前模块：

- `content-publishing/wechat-mp-publisher`
  微信公众号 Markdown 发布 skill。负责把 Markdown 渲染成适合微信公众号草稿接口的 HTML，上传正文插图、上传封面，并创建草稿。
- `image-generation/jimeng-volcengine`
  火山引擎即梦 4.0 生图 skill。可作为公众号封面图生成器，也可单独用于文章配图。

抽象出的关键经验：

- 微信公众号草稿接口吃的是保守 HTML 子集，不是 Markdown 原文。
- 微信编辑器会把语义化列表吃坏，最终 HTML 里更稳的是显式前缀段落，不是 `ol/ul/li`。
- 正文插图和封面图是两条不同的上传链路。
- 正文里的外部超链接不可靠，稳定引流要走 `content_source_url` / `阅读原文`。
- 微信稿更适合内联样式、简单结构、无表格依赖的排版。

建议目录约定：

- `content-publishing/*`：内容生产与分发类 skill
- `image-generation/*`：图片与视觉素材生成类 skill

这两个模块可以配合使用：

1. 用 `jimeng-volcengine` 生成封面图
2. 用 `wechat-mp-publisher` 处理 Markdown、上传正文图并创建公众号草稿
