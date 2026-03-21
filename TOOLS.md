# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## WeChat Publisher (微信公众号发布)

### 技能位置
```
~/.openclaw/workspace/skills/wechat-mp-publisher/
```

### 快速命令
```bash
cd /home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher
python3 scripts/wechat_mp_publish.py --article 文章文件.md
python3 scripts/wechat_mp_publish.py --article 文章文件.md --jimeng-cover-prompt "封面提示词" --jimeng-width 1536 --jimeng-height 1024 --download-dir ./generated-cover
```

### 默认规则
- 后续只要是发布微信公众号，默认使用 `wechat-mp-publisher` skill。
- 封面图、正文配图、公众号发稿现在统一收口到 `wechat-mp-publisher`。
- 图片脚本：`/home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher/scripts/jimeng_image.py`
- 发稿脚本：`/home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher/scripts/wechat_mp_publish.py`
- `skills/wechat-publisher/` 现在只保留兼容 shim，不再放真实实现。
- `阅读原文` 默认引流到 Dylan 的博客 canonical URL。
- 如果文章文件位于 `/home/openclaw/blog/posts/*.md`，`wechat-mp-publisher` 会自动推导 `https://www.dylanslife.com/posts/<slug>.html`。
- 如果是公众号专用摘要稿，例如 `HN Top 5`，调用时显式传 `--source-url https://www.dylanslife.com/posts/<对应博客文章>.html`。

### 服务器IP (需加入白名单)
- **当前IP**: 60.168.138.238
- **获取命令**: `curl ifconfig.me`

### 公众号配置
- **公众号**: dylanslife
- **AppID**: wxb572280b1e0337f7
- **凭证文件**: config.json (已配置)

### 重要文档
- **排版参考**: `skills/wechat-mp-publisher/references/beautifier.md`
- **微信格式约束**: `skills/wechat-mp-publisher/references/wechat-formatting.md`

### 发布前检查清单
- [ ] IP白名单已配置
- [ ] 测试发布已通过
- [ ] H3标题 ≤ 20个
- [ ] 代码块样式已处理
- [ ] 链接改为文末统一
- [ ] 已添加图片

---

## Twitter/X (OpenCLI)

### 命令
```bash
# 发推
opencli twitter post --text "内容"

# 搜索
opencli twitter search "关键词"

# 查看用户资料
opencli twitter profile --username 用户名

# 点赞
opencli twitter like <URL>

# 回复
opencli twitter reply --text "内容" <推文URL>
```

### 注意
- 需要Chrome浏览器 + Playwright MCP Bridge扩展
- 使用浏览器自动化，不需要Twitter API
- 登录状态由扩展管理

---

## Gateway Cron（统一调度）

### 当前约定
- 内容生产类定时任务统一走 **OpenClaw Gateway cron**，不要再混用系统 `crontab`。
- Gateway cron 的持久化文件：`/home/openclaw/.openclaw/cron/jobs.json`
- 系统 `crontab` 现在只保留注释占位；如果要加新定时任务，优先改 Gateway job，不要只改 `config/crontab` 文本。
- 迁移完成后，当前日常任务包括：
  - HN Daily Summary
  - HN Top 50 Blog Publisher
  - HN Top 5 WeChat Publisher
  - Official Company News Publisher
  - OpenClaw Log Cleanup
- 验证方法：
  - `openclaw gateway status`
  - 查看 `/home/openclaw/.openclaw/cron/jobs.json`
  - 查看 `/home/openclaw/.openclaw/cron/runs/*.jsonl`
  - 需要 smoke test 时，可临时添加 one-shot Gateway job，而不是系统 cron

## ClawTeam

### 安装位置
- `clawteam`: `/home/openclaw/.local/bin/clawteam`

### Agent CLI
- `codex`: `/home/openclaw/.npm-global/bin/codex`
- `claude`: `/home/openclaw/.local/bin/claude`
- `openclaw`: `/home/openclaw/.npm-global/bin/openclaw`

### 专用 skill
- `~/.openclaw/workspace/skills/clawteam-orchestrator/`

### Helper Script
```bash
cd /home/openclaw/.openclaw/workspace/skills/clawteam-orchestrator
bash scripts/clawteam_team.sh init --team dev-swarm --repo /abs/path/to/git/repo
bash scripts/clawteam_team.sh ensure-ready --team dev-swarm --repo /abs/path/to/git/repo
bash scripts/clawteam_team.sh spawn-defaults --team dev-swarm --repo /abs/path/to/git/repo
bash scripts/clawteam_team.sh submit --team dev-swarm --repo /abs/path/to/git/repo --subject "总控任务" --task "拆解任务、分配角色、审核结果"
bash scripts/clawteam_team.sh status --team dev-swarm
bash scripts/clawteam_team.sh inbox --team dev-swarm
```

### Worker Guardrails
- Worker 子进程默认启用“空闲超时”保护，不是固定总时长超时。
- 只要子进程还有输出、输出文件变化、或可检测到进程 CPU 活动，就不会被误杀。
- 可调环境变量：
  - `CLAWTEAM_SUBPROCESS_IDLE_TIMEOUT_S`
  - `CLAWTEAM_SUBPROCESS_POLL_S`
  - `CLAWTEAM_SUBPROCESS_KILL_GRACE_S`

### 默认角色
- `butler`: 总入口 / 拆任务 / 分配角色 / 审核结果
- `writing-master`: 奇思妙想写作 / 博客 / 文章
- `system-architect`: 系统设计 / 模块划分 / 任务拆解
- `implementation-engineer`: 具体实现 / 修复
- `code-reviewer`: 详细代码审查 / 风险检查
- `functional-tester`: 功能性测试 / 缺陷复现
- `usability-tester`: Web UI 可用性 / 交互合理性测试，默认由 Codex 执行
- `screenwriter`: 剧本 / 分镜
- `video-editor-master`: 视频生成 / 连贯性视频规划

### 派发任务
```bash
bash /home/openclaw/.openclaw/workspace/skills/clawteam-orchestrator/scripts/clawteam_team.sh ensure-ready --team dev-swarm --repo /abs/path/to/git/repo
bash /home/openclaw/.openclaw/workspace/skills/clawteam-orchestrator/scripts/clawteam_team.sh submit --team dev-swarm --repo /abs/path/to/git/repo --subject "总控任务" --task "先拆解任务、分配角色、最后汇总审核"
clawteam task create dev-swarm "设计系统方案" -d "做模块划分与实施计划" -o system-architect
clawteam task create dev-swarm "实现某个功能" -d "详细任务描述" -o implementation-engineer
clawteam task create dev-swarm "review 当前改动" -d "检查 bug、回归和测试缺口" -o code-reviewer
clawteam task create dev-swarm "做功能测试" -d "验证实现结果并复现问题" -o functional-tester
clawteam task create dev-swarm "做可用性测试" -d "使用浏览器能力检查 UI 尺寸、点击交互和响应式" -o usability-tester
clawteam task create dev-swarm "写一篇博客" -d "输出风格化、可发布的文章" -o writing-master
clawteam task create dev-swarm "扩写剧本" -d "把故事梗概扩成剧本和分镜" -o screenwriter
clawteam task create dev-swarm "做视频规划" -d "根据剧本形成视频生成与编辑方案" -o video-editor-master
```

### Main 入口默认规则
- OpenClaw 主聊天入口现在默认把复杂任务路由到 `ClawTeam butler`。
- 判定为复杂任务的场景包括：编码、设计、review、测试、调试、长文写作、剧本、视频规划、多步骤执行。
- 轻量闲聊、简单问答、快速搜索和一次性小工具调用，仍可直接由 OpenClaw 处理。

---

Add whatever helps you do your job. This is your cheat sheet.
