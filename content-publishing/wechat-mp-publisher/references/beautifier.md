# WeChat Article Beautifier

微信公众号HTML排版美化工具

## 排版标准

### 字体与颜色

| 元素 | 字号 | 字色 | 说明 |
|------|------|------|------|
| 标题1 | 24px | #1a1a1a | 主标题，加粗 |
| 标题2 | 20px | #0f172a | 二级标题，左边框 |
| 标题3 | 17px | #134e4a | 三级标题 |
| 正文 | 16px | #374151 | 行高1.8 |
| 辅助 | 14px | #6b7280 | 灰色辅助文字 |
| 代码 | 14px | #e2e8f0 | 深色背景 |

### 配色方案

```css
/* 主色调 */
--primary: #0f766e;      /* 青色，用于标题左边框、强调 */
--primary-light: #134e4a; /* 深青，用于三级标题 */

/* 背景色 */
--bg-white: #fefefe;     /* 白色背景（防过滤） */
--bg-dark: #0f172a;      /* 深色，用于代码块 */
--bg-gray: #f3f4f6;      /* 浅灰，用于引用块 */

/* 文字色 */
--text-dark: #1a1a1a;    /* 深色文字 */
--text-normal: #374151;   /* 正文 */
--text-light: #6b7280;    /* 辅助文字 */

/* 边框色 */
--border-light: #d1d5db;  /* 浅灰分隔线 */
```

### 布局规则

1. **所有CSS必须内联** - 不支持外部CSS
2. **使用section标签** - 不容易被微信过滤
3. **padding > margin** - padding更可靠
4. **避免float** - 容易导致布局问题
5. **使用px单位** - 避免百分比高度/位移
6. **图片添加width:100%** - 自适应屏幕

## HTML模板

### 标准文章结构

```html
<!-- 顶部引导 -->
<section style="text-align:center;padding:20px 0;border-bottom:1px solid #eee;">
  <p style="color:#666;font-size:14px;">👆 点击上方蓝字关注 👆</p>
</section>

<!-- 主标题 -->
<h1 style="font-size:24px;line-height:1.4;font-weight:700;color:#1a1a1a;margin:0 0 20px 0;padding-bottom:12px;border-bottom:2px solid #0f766e;">
  文章主标题
</h1>

<!-- 摘要 -->
<p style="font-size:15px;color:#6b7280;margin:0 0 24px 0;padding:12px 16px;background:#f3f4f6;border-left:4px solid #0f766e;">
  文章摘要内容
</p>

<!-- 二级标题 -->
<h2 style="font-size:20px;line-height:1.5;font-weight:700;color:#0f172a;margin:28px 0 14px 0;padding-left:12px;border-left:4px solid #0f766e;">
  章节标题
</h2>

<!-- 三级标题 -->
<h3 style="font-size:17px;line-height:1.55;font-weight:700;color:#134e4a;margin:20px 0 10px 0;">
  小节标题
</h3>

<!-- 正文段落 -->
<p style="margin:12px 0;line-height:1.8;font-size:16px;color:#374151;">
  正文内容
</p>

<!-- 引用块 -->
<blockquote style="margin:16px 0;padding:14px 18px;background:#f3f4f6;border-left:4px solid #0f766e;font-style:italic;">
  引用内容
</blockquote>

<!-- 代码块 -->
<pre style="margin:16px 0;padding:16px;background:#0f172a;color:#e2e8f0;border-radius:8px;overflow-x:auto;line-height:1.7;font-size:14px;">
<code>代码内容</code>
</pre>

<!-- 无序列表 -->
<p style="margin:12px 0;color:#374151;">• 第一点</p>
<p style="margin:12px 0;color:#374151;">• 第二点</p>
<p style="margin:12px 0;color:#374251;">• 第三点</p>

<!-- 有序列表 -->
<p style="margin:12px 0;color:#374151;"><strong>1.</strong> 第一步</p>
<p style="margin:12px 0;color:#374151;"><strong>2.</strong> 第二步</p>

<!-- 分隔线 -->
<hr style="border:none;border-top:1px solid #d1d5db;margin:24px 0;"/>

<!-- 卡片框 -->
<section style="margin:20px 0;padding:20px;background:#f3f4f6;border-radius:8px;border:1px solid #e5e7eb;">
  <p style="margin:0;font-weight:600;color:#0f172a;">💡 提示</p>
  <p style="margin:8px 0 0 0;color:#374151;">卡片内容</p>
</section>

<!-- 图片 -->
<img src="图片URL" style="width:100%;margin:16px 0;border-radius:4px;" />

<!-- 底部引导 -->
<section style="text-align:center;padding:24px 0;margin-top:24px;border-top:1px solid #eee;">
  <p style="color:#666;font-size:14px;margin:0 0 8px 0;">如果文章有帮助，欢迎转发在看</p>
  <p style="color:#999;font-size:12px;margin:0;">作者：XXX</p>
</section>
```

## 使用方法

### Python转换函数

```python
def markdown_to_wechat_html(markdown_text):
    """将Markdown转换为微信美化HTML"""
    # 实现转换逻辑
    pass
```

### 关键转换规则

1. **标题** → `<h1/h2/h3>` + 内联样式
2. **段落** → `<p>` + 行高1.8
3. **代码块** → `<pre><code>` + 深色背景
4. **引用** → `<blockquote>` + 灰色背景+左边框
5. **列表** → 展平为 `<p>• ...</p>` 格式
6. **分隔线** → `<hr>` + 灰色
7. **加粗** → `<strong>` 保留
8. **链接** → `<a href="...">` 保留

## 质量检查清单

- [ ] 所有CSS内联
- [ ] 使用px单位（非百分比）
- [ ] 图片添加width:100%
- [ ] 列表展平为段落格式
- [ ] 代码块有深色背景
- [ ] 标题有明确的层级
- [ ] 段落行高1.8
- [ ] 适当使用分隔线和留白
- [ ] 底部有引导关注
- [ ] 总字数控制在合理范围
