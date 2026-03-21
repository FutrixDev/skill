# MEMORY.md - Long-Term Memory

## Blog Workflow

**My personal blog is located at:** `/home/openclaw/blog` (GitHub repository)

### 默认图片生成路径

- 公众号相关任务现在统一收口到 `wechat-mp-publisher` skill。
- 图片脚本：`/home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher/scripts/jimeng_image.py`
- 发稿脚本：`/home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher/scripts/wechat_mp_publish.py`
- 不再维护第二份 `wechat-publisher` 实现；旧目录已删除。
- 除非 Dylan 明确指定其他模型或 provider，否则不要改用别的图片生成方式。
- 公众号稿件的 `阅读原文` 统一引流到 Dylan 自己的博客 canonical URL：`https://www.dylanslife.com/posts/<slug>.html`。
- 如果文章文件就在 `/home/openclaw/blog/posts/*.md`，优先让 `wechat-mp-publisher` 自动推导 `阅读原文`。
- 如果是从博客文章衍生出来的公众号摘要稿，例如 `HN Top 5`，必须显式传 `--source-url` 指向对应的博客原文页面。
- 发公众号前，先把内容改写成“微信原生可读文章”，不要直接复用聊天记录、调试流水账或命令输出。
- 教程/配置类公众号优先结构：结果与适用对象 -> 最少可用配置 -> 必需 secret/skill/GitHub 地址 -> 关键命令 -> 常见坑 -> 最小心智模型。
- 写作时优先“问题 -> 判断 -> 方案 -> 结果”，而不是按聊天时间顺序复述。
- 删掉重复试错、工具噪音和无效来回；保留真正解释决策的转折点。
- 公众号标题要直接，段落要短，首屏必须快速说明读者能得到什么。
- 重要链接既要在正文写出完整 URL 文本，也要尽量写进 `content_source_url` / `阅读原文`。
- 发布前先 `--dry-run`，质量要求高时先改文再发稿，不要把“能发出去”当成“写得好”。
- 排版布局经验：首屏先讲价值；正文以短段落和明确小标题为主；列表只在真正需要枚举时少量使用；不要把整篇写成连续 bullet、连续代码块或聊天记录拼接。
- 微信正文最终 HTML 不保留 `ol/ul/li`，统一展平为显式前缀段落，避免微信编辑器产生空白 bullet 和编号跳号。
- 教程/配置类文章里，代码块只保留最少可用配置；每段代码前后都要有解释，不要连续贴多段 JSON / shell 命令。
- 如果任务目标是发公众号、生成封面或补正文配图，都统一走 `wechat-mp-publisher`。
- 现在只有一个真实实现；旧 `wechat-publisher` 名称只用于兼容旧文档和旧提示词。

### ClawTeam 默认分工

- 当 Dylan 需要长期、并行、分角色的 agent 协作时，优先使用 ClawTeam，而不是临时多开 ACP 会话。
- 默认 team 名称：`dev-swarm`
- 默认内部 leader mailbox：`butler-hub`，由 `butler` worker 主动消费
- 默认角色分工：
  - `butler`：总入口、任务拆解、角色分配、结果审核；必须由 Codex 执行
  - `writing-master`：高创造力写作、博客、文章；默认走 OpenClaw 主模型
  - `system-architect`：系统设计、模块划分、任务拆解
  - `implementation-engineer`：具体实现与返工修复
  - `code-reviewer`：详细代码审查、漏洞与风险检查
  - `functional-tester`：功能性验证与缺陷复现
  - `usability-tester`：Web UI 大小、点击区域、交互流程、响应式与合理性测试；默认由 Codex 执行
  - `screenwriter`：故事扩写、剧本、分镜
  - `video-editor-master`：视频生成与剪辑规划
- Team 是 task-driven 的：先 `spawn-defaults` 启动 worker，再优先用 `clawteam_team.sh submit ...` 把顶层任务交给 `butler`；只有明确需要点对点派工时，才直接 `clawteam task create ... -o <role>`。
- 入口 skill：`/home/openclaw/.openclaw/workspace/skills/clawteam-orchestrator/`
- Helper 脚本：`/home/openclaw/.openclaw/workspace/skills/clawteam-orchestrator/scripts/clawteam_team.sh`
- OpenClaw 主聊天入口对复杂任务默认走 ClawTeam：先 `ensure-ready`，再 `submit` 给 `butler`。
- 只对闲聊、轻量搜索、简单问答、一次性小工具调用保留直接 OpenClaw 直答。
- ClawTeam worker 进程默认启用“空闲超时”保护：不是按总时长杀进程，而是只在长时间没有输出、没有输出文件变化、也没有可检测进程活动时才中断。高推理等级的慢任务只要还在工作就应继续跑。
- 对简单的一次性调用，继续优先用 OpenClaw ACP；对需要 persistent team、task board、worktree 隔离的任务，用 ClawTeam。

### When Dylan asks me to post a blog:

1. **Polish the content** - Refine and improve the text he provides
2. **Seek confirmation** - Show him the polished version for approval
3. **Create markdown file** - If approved, create a new markdown file in the `posts/` folder
4. **Commit and push** - Commit the file and push to remote `main` branch
5. **Auto-publish** - GitHub will automatically trigger workflow to publish the blog

### Detailed workflow rules:

- **Location**: `/home/openclaw/blog` is my personal blog's GitHub repository
- **File creation**: New markdown files go in the `posts/` folder
- **Branch**: Commit and push to remote `main` branch (not master)
- **Automation**: GitHub automatically triggers workflow to publish the blog after push
- **Process**: Always seek confirmation before creating and committing the file
- **Polishing**: Always refine and improve the content before showing for approval

---

## ⚠️ 重要规则：HN博客Top 10必须有详细解读

**问题**：AI模型调用失败时，脚本会回退到默认文本"该文章在 Hacker News 上获得了 X 分..."

**正确格式应该是**：
```
- **发生了什么**: 详细的2-3句话技术描述，包含关键技术亮点
- **核心意义**: 1-2句话提炼技术意义或行业影响
- **相关性**: 解释为什么引发开发者关注
```

**要求**：
1. 每篇Top 10文章必须有真实的AI深度分析，不是默认fallback文本
2. 如果AI调用失败，需要手动补充分析内容
3. 不能发布只有数据没有解读的博客

---

## 每日自动化任务

### Hacker News Top 50 + 公众号

**规则**：每天早上发布HN Top 50到博客时，同步发送Top 5到公众号草稿箱

**流程**：
1. 抓取HN Top 50数据
2. 生成博客文章（含Top 10详细解读 + 11-50一句话总结 + 趋势总结 + 行动指南）
3. 推送到博客GitHub
4. 同时整理Top 5精华版本发送到公众号草稿箱

**公众号内容要求**：
- 字数控制在700-800字
- 格式：Top 5必读 + 趋势洞察 + 行动建议
- 像人写的一样，不要AI味道
- `阅读原文` 指向当天对应的 HN 博客文章，例如 `https://www.dylanslife.com/posts/2026-03-20-hackernews-top50.html`

**脚本位置**：
- 博客脚本：`/home/openclaw/.openclaw/scripts/hn_news_publisher.py`
- 公众号发布：`/home/openclaw/.openclaw/scripts/publish_hn_top5_wechat.sh`（内部调用 `wechat-mp-publisher`）
- 公众号专用 skill：`/home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher/`

---

## 微信公众号发布规则 ⚠️ 重要

### Skill路径
- **wechat-mp-publisher**: `/home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher/` （唯一真实实现）
- **wechat-publisher**: 已删除

### 关键规则
1. **不要直接发原始Markdown** - 必须先转换为微信兼容HTML
2. **不要保留语义化列表** - 列表要展平为前缀段落（如"1. ..." 或 "• ..."）
3. **正文图片和封面图是不同渠道**：
   - 封面：`material/add_material` -> `thumb_media_id`
   - 正文：`media/uploadimg` -> HTML中替换URL
4. **使用 `--dry-run` 先检查** HTML效果再发布
5. **阅读原文** 必须指向博客canonical URL

### 正确发布命令（wechat-mp-publisher）
```bash
cd /home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher
python3 scripts/wechat_mp_publish.py --article article.md --author Dylan --dry-run
```

### 写作质量要求
- 先说解决什么问题，谁适合看
- 段落要短，标题要直接表达价值
- 配置和命令用代码块，其他用短段落
- 不要连续堆bullet，不要写成命令清单
- 首屏先出现价值说明

### jimeng封面生成
```bash
cd /home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher
python3 scripts/jimeng_image.py --prompt "描述" --width 1536 --height 1024 --download-dir ./generated-images
```

---

## Twitter/X 操作

### 工具：OpenCLI
使用 `opencli` 命令通过浏览器自动化操作Twitter，无需Twitter API。

### 查询Twitter

```bash
# 查看可用命令
opencli list 2>&1 | grep twitter

# 搜索推文
opencli twitter search "关键词"

# 查看用户资料
opencli twitter profile --username karpathy

# 查看时间线
opencli twitter timeline

# 查看热门话题
opencli twitter trending
```

### 发推文

```bash
# 发推
opencli twitter post --text "推文内容"

# 回复推文
opencli twitter reply --text "回复内容" <推文URL>

# 点赞
opencli twitter like <推文URL>

# 转发
opencli twitter retweet <推文URL>
```

### 自动化场景
- 博客更新时自动发推分享
- 定时发每日资讯
- 触发式发推通知

---

*This is my curated long-term memory - distilled wisdom worth keeping*

## 微信公众号排版优化 (2026-03-20)

### 已掌握的排版标准
- 配色：青色主调 (#0f766e)
- 标题：24px加粗+底部边框，二级标题20px+左边框
- 正文：16px，行高1.8
- 代码块：深色背景(#0f172a)
- 列表：展平为 • 或数字格式

### Skill路径
- 排版标准：wechat-mp-publisher/references/beautifier.md
- 美化脚本：wechat-mp-publisher/scripts/wechat_beautifier.py
- 发布脚本：wechat-mp-publisher/scripts/wechat_mp_publish.py

### 下一步优化
- 内容配图需要加强（每篇文章至少2-3张配图）
- 封面图生成后需要上传到微信

## 微信公众号配图与发稿操作规范 (2026-03-21)

### 两阶段分离原则
**阶段A - 内容准备**（不调用微信API）：
- 写/改公众号正文
- 生成封面图
- 生成正文配图
- 产出：本地Markdown、封面文件、正文图片文件

**阶段B - 公众号发布**（调用微信API）：
- Markdown渲染成微信兼容HTML
- 上传正文图片到 media/uploadimg
- 上传封面到 material/add_material
- 调用 draft/add 创建草稿

### Skill路由规则
- 用户说"配图""生成封面""补正文插图" → 只调用图片skill，不调用微信API
- 用户说"发公众号""创建草稿""上传到微信公众号" → 进入wechat-mp-publisher
- 目标是公众号草稿时，最后一步必须回到wechat-mp-publisher

### IP白名单判断
微信IP白名单限制的是**发布阶段**，不是配图阶段。

受影响接口：
- cgi-bin/token
- media/uploadimg
- material/add_material
- draft/add

### 回复用户标准方式
- 只是图片阶段成功："封面/配图已生成，本地文件已准备好，尚未调用微信公众号接口。"
- 发布阶段被拦："文章和图片都已准备完成，当前卡在微信公众号API调用阶段；需要把当前服务器出口IP加入公众号IP白名单后才能创建草稿。"

**错误说法**："配图失败，需要加微信白名单"
**正确说法**："配图已完成，发布到微信公众号失败，原因是微信IP白名单限制"

### 推荐执行顺序
1. 先写适合微信阅读的Markdown
2. 再生成封面和正文配图
3. 先--dry-run检查最终HTML、标题、摘要
4. 确认机器具备微信API调用权限后，再执行正式发稿
5. 如果白名单不通，停在发布阶段，不要回滚前面的写作和配图成果

### 当前服务器出口IP
- IPv4: 38.244.21.21
- (微信报错中的IPv6 223.244.122.40也需要添加)

