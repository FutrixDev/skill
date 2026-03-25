---
title: ClawTeam vs DeerFlow：多 Agent 系统架构深度对比研究报告
author: Dylan
summary: 深入研究两个最火的多 Agent 开源框架，源码级对比揭示：ClawTeam 是进程级星型，DeerFlow 是线程级星型——看起来差不多，其实差很多。
cover-image: /home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher/articles/images/cover.png
---

# ClawTeam vs DeerFlow：多 Agent 系统架构深度对比研究报告

**作者：Dylan**
**日期：2026-03-23**
**备注：本文所有结论均经过源码级验证，引用处标注文件名和行号**

---

多 Agent 系统是当前 LLM 应用领域最活跃的方向之一。当单 Agent 的能力触顶，业界想到让多个 Agent 协同工作——但如何组织 Agent 之间的协作，才是真正的工程难题。

本文深入研究两个最具代表性的开源项目：

• **ClawTeam**（HKUDS）—— 进程级星型架构，多 Agent 群体智能
• **DeerFlow**（ByteDance）—— 线程级星型架构，基于 LangGraph 的协作框架

经过逐文件、逐行的源码级研究，我们发现了不少初看时不容易察觉的细节——包括 DeerFlow 的默认安装方式（LocalSandbox）对 bash 命令没有任何容器隔离，ClawTeam 的 Worker 崩溃后任务会永久卡死，DeerFlow 的记忆系统是纯文本追加而非向量数据库。这些发现对选择技术方案有实质性的影响。

---

## 一、项目背景与解决的问题

### 1.1 ClawTeam：让 Agent 自主组队

**出品方：** 香港大学数据科学实验室（HKUDS）
**定位：** CLI 工具，让 AI Agent 自主组建团队、分配任务、协同工作
**开源协议：** MIT

ClawTeam 解决的核心问题是：AI Agent 各自为战。当任务太大时，人类只能手动拆解工作、复制粘贴上下文、合并结果。ClawTeam 的目标是：给 Agent 一个目标，它自动组建团队完成。

典型场景：

• **8 Agent × 8 块 H100 GPU** 的自主 ML 研究：2430 + 实验，val_bpb 从 1.044 降至 0.977（提升 6.4%）
• **全栈软件开发**：Agent 自主拆分为 API、后端、前端、测试，并行独立开发后自动合并
• **AI 对冲基金**：7 个分析师 Agent + 风控经理收敛投资决策

设计哲学：Agent 是主角，人类是观众。框架提供舞台，Agent 自主表演。

### 1.2 DeerFlow：结构化的深度研究框架

**出品方：** ByteDance（字节跳动）
**定位：** 基于 LangGraph 的深度研究框架，专注复杂研究任务的多阶段处理
**技术栈：** LangChain/LangGraph + FastAPI + Next.js

DeerFlow 解决的核心问题是：复杂研究任务需要结构化的深度分析流程——信息搜集 → 多角度研究 → 综合报告。通过预定义的中间件链和子 Agent 流水线，确保研究过程的完整性和可追溯性。

典型场景：

• **深度市场研究**：多角度并行搜集信息，综合分析
• **技术文档生成**：从原始材料生成结构化文档
• **多跳推理任务**：需要多个研究步骤的复杂问题

设计哲学：流水线标准化，执行可复现，每一步都可干预和回溯。

### 1.3 共同的技术判断

两者都认为：复杂任务需要分解给多个 Agent 并行处理，不是让一个 Agent 串行做完所有事。两者也都支持任务依赖管理、外部工具扩展、执行可观测性。

---

## 二、架构拓扑：两者都是星型，但"星"的质量完全不同

### 2.1 核心发现：不是流水线 vs 星型，而是进程级 vs 线程级

初稿的最大错误是将 DeerFlow 归类为"流水线型"架构。经过源码级验证，这是一个需要彻底修正的判断。

两者的真实架构都是星型 / Hub-and-Spoke：有一个中心节点（Leader），多个叶节点（Worker / Subagent），叶节点之间不直接通信，都只与中心节点交互。

但"星"的实现质量天差地别：

```
ClawTeam（进程级星型）               DeerFlow（线程级星型）

   ┌──── Leader ────┐                   ┌──── Lead Agent ────┐
  /  |    |    \   │                  /  |    |    \   │
 /   |    |    \   │                 /   |    |    \   │
Worker1 Worker2 Worker3             Sub1  Sub2  Sub3
(独立OS进程)                      (ThreadPoolExecutor线程)
  长期存活                       request 级生命周期
```

### 2.2 ClawTeam Worker 是独立进程

ClawTeam 的 Worker 通过 `subprocess.Popen` 在独立 OS 进程中启动：

```python
# clawteam/spawn/tmux_backend.py:53-59
subprocess.Popen(
    ["tmux", "new-window", "-t", session_name, command]
)
env_vars["CLAWTEAM_AGENT_ID"] = agent_id  # 每个 Worker 有独立身份
env_vars["CLAWTEAM_AGENT_NAME"] = agent_name
env_vars["CLAWTEAM_AGENT_TYPE"] = agent_type
```

### 2.3 DeerFlow Subagent 是线程

DeerFlow 的 Subagent 在 ThreadPoolExecutor 线程池中运行：

```python
# deerflow/subagents/executor.py:71-75
_execution_pool = ThreadPoolExecutor(
    max_workers=3,
    thread_name_prefix="subagent-exec-"
)
MAX_CONCURRENT_SUBAGENTS = 3  # 默认值，硬编码
```

### 2.4 进程 vs 线程的根本差异

关键证据：GIL 限制

DeerFlow 使用 ThreadPoolExecutor 而非 ProcessPoolExecutor，这意味着：

• 对于 I/O 密集型工作（LLM API 调用时的网络等待），线程可以真正并发
• 对于 CPU 密集型工作，Python GIL 会序列化执行，无法真正并行

```python
# backend/packages/harness/deerflow/subagents/executor.py:241-244
# Lead Agent 轮询 subagent 完成状态，每 5 秒一次
while True:
    result = get_background_task_result(task_id)
    time.sleep(5)  # 阻塞等待，不是异步事件
```

### 2.5 Lead Agent 与 Subagent 使用完全相同的类

```python
# executor.py:164-175 和 agent.py:322-331
# 两者都调用 langchain.agents.create_agent()，只是配置不同
return create_agent(
    model=create_chat_model(...),
    tools=self.tools,
    system_prompt=self.config.system_prompt,
    state_schema=ThreadState,
)
```

---

## 三、Agent 生命周期与身份机制对比

### 3.1 ClawTeam Worker 的启动与身份发现

启动流程（tmux_backend.py:43-93）：

1. 人类或 Leader 执行 `clawteam spawn tmux claude --team my-team --agent-name worker1 --task "实现 OAuth2"`
2. `TmuxBackend.spawn()` 注入环境变量，创建 tmux 窗口
3. Worker 进程启动，继承所有环境变量

注入的环境变量：

• `CLAWTEAM_AGENT_ID` —— 唯一标识符
• `CLAWTEAM_AGENT_NAME` —— 可读名字
• `CLAWTEAM_AGENT_TYPE` —— 角色类型（如 `implementation-engineer`）
• `CLAWTEAM_TEAM_NAME` —— 团队名
• `CLAWTEAM_AGENT_LEADER` —— `"0"` = Worker，`"1"` = Leader
• `CLAWTEAM_CONTEXT_ENABLED` —— `"1"` 启用上下文感知

身份发现的两种机制：

• **环境变量**：Worker 通过 `os.environ` 读取自身身份
• **Prompt 注入**（spawn/prompt.py:36-59）：身份通过 prompt 显式告知

```python
## Identity
- Name: {agent_name}
- ID: {agent_id}
- Type: {agent_type}
- Team: {team_name}
- Leader: {leader_name}
```

### 3.2 DeerFlow Subagent 的生命周期

Subagent 的生命周期完全由 `task_tool.py` 中的 `execute_async()` 控制：

```python
# backend/packages/harness/deerflow/tools/builtins/task_tool.py:66-75
executor = SubagentExecutor(config=config, tools=tools, ...)
task_id = executor.execute_async(prompt, task_id=tool_call_id)

# 后端轮询，阻塞等待结果
while True:
    result = get_background_task_result(task_id)
    if result.status == SubagentStatus.COMPLETED:
        return f"Task Succeeded. Result: {result.result}"
    time.sleep(5)
```

Subagent 随请求创建、随请求销毁，没有独立的进程或持久身份。

---

## 四、Agent 通信机制深度对比

### 4.1 ClawTeam Mailbox：完整的消息队列系统

MessageType 枚举（team/models.py）：

• `TASK_CREATED` —— 新任务分配
• `TASK_UPDATED` —— 任务状态变更
• `TASK_COMPLETED` —— 任务完成
• `TASK_FAILED` —— 任务失败
• `MESSAGE` —— 一般消息
• `REQUEST_HELP` —— Worker 向 Leader 求援
• `ALERT` —— 紧急通知
• `HEARTBEAT` —— 心跳存活检测
• `SHUTDOWN` —— 优雅关闭

共 9 种消息类型，涵盖任务状态流转、Agent 间通信、生命周期管理。

peek vs receive（team/mailbox.py:55-80）：

• **`peek()`**：读取消息但不消费，文件留在原处，其他 Worker 也能读到
• **`receive()`**：消费消息，文件移动到 `inbox/.seen/` 目录

MailboxManager.resolve_inbox()（team/manager.py:217-221）：

```python
def resolve_inbox(team_name: str, recipient: str, user: str = "") -> str:
    member = TeamManager.get_member(team_name, recipient, user=user)
    if member:
        return TeamManager.inbox_name_for(member)
    return recipient
```

将逻辑名字（如 `worker1`）解析为实际的文件系统目录名。

### 4.2 ClawTeam 收件箱检查机制：纯轮询，无事件驱动

```python
# clawteam/team/watcher.py:37-53
class InboxWatcher:
    def watch(self) -> None:
        while self._running:
            messages = self.mailbox.receive(self.agent_name, limit=10)
            for msg in messages:
                self._output(msg)
            time.sleep(self.poll_interval)  # 默认 1 秒，纯轮询
```

关键发现：没有任何事件驱动机制。Worker 必须主动调用 `clawteam inbox receive` 或开启 `clawteam inbox watch`，否则消息不会自动被处理。

### 4.3 DeerFlow：没有独立的消息队列

DeerFlow 的 subagent 之间无法直接通信。所有结果都通过函数返回值传回 Lead Agent。

```python
# backend/packages/harness/deerflow/tools/builtins/task_tool.py:75-78
if result.status == SubagentStatus.COMPLETED:
    return f"Task Succeeded. Result: {result.result}"
elif result.status == SubagentStatus.FAILED:
    return f"Task failed. Error: {result.error}"
```

subagent 禁止嵌套调用 subagent：

```python
# task_tool.py:90-92
# Subagents should not have subagent tools enabled (prevent recursive nesting)
tools = get_available_tools(model_name=parent_model, subagent_enabled=False)
```

### 4.4 通信机制综合对比

| 维度 | ClawTeam Mailbox | DeerFlow task tool |
|---|---|---|
| 消息持久化 | ✅ 文件系统，可离线 | ❌ 仅内存，随请求销毁 |
| 消息语义 | 信号 / 指令（异步） | 数据 / 结果（同步返回） |
| 接收方式 | Worker 主动拉取（peek/receive） | 主动推送（函数返回值） |
| 广播能力 | ✅ 支持 broadcast() | ❌ 不支持 |
| 原子性消费 | ✅ claim_messages 原子认领 | ❌ 不支持 |
| Worker→Worker 直连 | ✅ P2P Transport | ❌ 不支持 |
| 离线支持 | ✅ 完整离线支持 | ❌ 仅在线 |

---

## 五、Memory 系统对比

### 5.1 ClawTeam：不实现 Memory，完全交给 Agent 自身

ClawTeam 不实现独立的 Agent Memory 能力。Memory 功能由具体的 Agent 实现提供（如 Claude Code 有自己的 Memory）。ClawTeam 提供的是团队级别的共享知识层：任务状态、团队事件日志、Leader 的观察和指令。

### 5.2 DeerFlow Memory：追加式 JSONL，非向量数据库

这是本研究最重要的发现之一：DeerFlow 的 Memory 不是向量数据库。

```python
# backend/packages/harness/deerflow/agents/memory/updater.py:44-69
def update_memory(self, thread_id: str, messages: list[BaseMessage]) -> None:
    memory_content = self._build_memory_content(messages)
    structured = self._build_structured_memory(thread_id, memory_content)
    memory_file = self._get_memory_file(thread_id)
    with open(memory_file, "a", encoding="utf-8") as f:  # 追加模式！
        f.write(structured + "\n")  # 每次更新追加一行
```

存储格式：append-only JSONL，每行一个 JSON 对象，完全没有向量化。

检索方式：全量读取再拼接

```python
# updater.py:91-115
def retrieve_memory(self, thread_id: str) -> str:
    with open(memory_file, encoding="utf-8") as f:
        for line in f:
            entries.append(json.loads(line))
    history_text = "\n---\n".join(
        e.get("content", "") for e in entries if e.get("content")
    )
    return f"<Memory>\n{history_text}\n</Memory>"
```

对可观测性的影响：

• 无法按语义检索记忆（如"找到关于 X 的所有讨论"）
• 每次请求都要读全部历史记忆，无索引
• 随时间积累，性能线性下降

Memory 更新触发：Debounce 机制——收集对话上下文，等待若干秒后批量写入，避免频繁 IO。

---

## 六、任务依赖与调度系统对比

### 6.1 ClawTeam：事件驱动的任务依赖

blocked_by 的实现（team/tasks.py:290-307）：

```python
def _resolve_dependents_unlocked(self, completed_task_id: str) -> None:
    root = _tasks_root(self.team_name)
    for f in root.glob("task-*.json"):
        task = TaskItem.model_validate(json.loads(f.read_text()))
        if completed_task_id in task.blocked_by:
            task.blocked_by.remove(completed_task_id)
            if not task.blocked_by and task.status == TaskStatus.blocked:
                task.status = TaskStatus.pending  # 自动解除阻塞
            self._save_unlocked(task)
```

关键发现：这是事件驱动的，不是轮询的。`_resolve_dependents_unlocked` 只在 `TaskStore.update()` 被调用时才会触发。

但这也意味着：如果 Worker 崩溃了，没有主动通知机制，依赖它的任务永久卡死。

### 6.2 DeerFlow：LLM 驱动的隐式调度

DeerFlow 的调度完全由 Lead Agent 的 LLM 决定，中间件负责执行层面的限制：

```python
# backend/packages/harness/deerflow/agents/middlewares/subagent_limit_middleware.py:43-70
class SubagentLimitMiddleware:
    def _truncate_task_calls(self, state: AgentState) -> dict | None:
        task_indices = [i for i, tc in enumerate(tool_calls) if tc.get("name") == "task"]
        if len(task_indices) <= self.max_concurrent:
            return None
        indices_to_drop = set(task_indices[self.max_concurrent:])  # 丢弃后面的
        dropped_count = len(indices_to_drop)
        logger.warning(f"Truncated {dropped_count} excess task tool call(s)...")
```

并行上限硬编码为 3（最小 2，最大 4）。

### 6.3 调度系统综合对比

| 维度 | ClawTeam | DeerFlow |
|---|---|---|
| 调度入口 | CLI 命令 / Leader Agent 显式调用 | HTTP 请求，LLM 自行决定 |
| 并行度上限 | 无硬性限制 | 2-4 个（硬编码） |
| 依赖管理 | 显式 blocked_by，事件驱动 | LangGraph 条件边（隐式，由 LLM 决定） |
| 任务状态持久化 | ✅ 独立 JSON 文件，跨进程存活 | ❌ 仅内存 |
| 崩溃后依赖自动解除 | ❌ 不支持（任务永久卡死） | N/A（无显式依赖机制） |
| 人类干预时机 | 任意时刻 | 等当前请求完成 |

---

## 七、中间件链：DeerFlow 的核心竞争力

DeerFlow 的 Lead Agent 在每次请求中会经过以下中间件链（agent.py:145-191）：

1. **ToolErrorHandlingMiddleware** —— 捕获工具异常，转换为 ToolMessage 防止崩溃
2. **ThreadDataMiddleware** —— 注入线程数据（工作区路径等）
3. **SandboxMiddleware** —— 获取沙箱环境，注入沙箱 URL
4. **UploadsMiddleware** —— 处理上传文件上下文
5. **DanglingToolCallMiddleware** —— 修补缺失的 ToolMessages
6. **SummarizationMiddleware**（可选）—— 上下文压缩，节省 token
7. **TodoMiddleware**（可选，plan 模式）—— 结构化任务列表管理
8. **TitleMiddleware** —— 首轮对话后自动生成标题
9. **MemoryMiddleware** —— 将对话加入 Memory 更新队列
10. **ViewImageMiddleware**（可选，vision 模型）—— 注入图片详情
11. **DeferredToolFilterMiddleware**（可选）—— 隐藏延迟工具 schema
12. **SubagentLimitMiddleware**（可选）—— 截断超额 task 调用
13. **LoopDetectionMiddleware** —— 检测并中断重复工具调用循环
14. **ClarificationMiddleware** —— 最后——拦截用户澄清请求

中间件顺序有严格约束（agent.py:197-206）：

```python
# ThreadDataMiddleware 必须在 SandboxMiddleware 之前（确保 thread_id 可用）
# SummarizationMiddleware 应尽早处理以减少后续上下文
# ClarificationMiddleware 永远最后（拦截澄清请求）
```

ClawTeam 没有中间件链的概念——所有协调逻辑通过 CLI 命令和 Agent 的自觉行为实现。

---

## 八、隔离机制对比

### 8.1 ClawTeam：Git Worktree 真实隔离

```python
# clawteam/workspace/git.py:48-60
def create_worktree(repo: Path, worktree_path: Path, branch: str, base_ref: str = "HEAD"):
    _run(["worktree", "add", "-b", branch, str(worktree_path), base_ref], cwd=repo)
```

每个 Worker 在独立 Git 分支上工作：真实文件系统隔离、可以 git merge、有完整提交历史、各自独立工作目录。

### 8.2 DeerFlow 沙箱：本地模式 vs AioSandbox 模式

DeerFlow 有两套沙箱实现，隔离能力完全不同：

**LocalSandbox（默认安装方式）：**

```python
# sandbox/local/local_sandbox.py
def execute_command(self, command: str) -> str:
    result = subprocess.run(
        command,
        executable=self._get_shell(),
        shell=True,  # ⚠️ 直接在主机执行，无容器隔离
        capture_output=True,
        text=True,
        timeout=600,
    )
```

这是默认安装方式的行为——直接 `subprocess.run(shell=True)` 在主机上执行命令，没有任何容器隔离。

**AioSandboxProvider（community 扩展模块，需要额外配置）：**

```yaml
# CONFIGURATION.md:186
use: deerflow.community.aio_sandbox:AioSandboxProvider  # Docker-based sandbox
```

需要同时满足：① 安装 `deerflow[community]` 扩展包；② 在配置中显式切换 sandbox provider；③ 配置 Docker 或 Apple Container。启用后使用 Docker 容器隔离 bash 命令，默认镜像为 `enterprise-public-cn-beijing.cr.volces.com/vefaas-public/all-in-one-sandbox:latest`。

**结论：** 默认安装下不对 bash 命令做容器隔离。只有配置了 AioSandboxProvider 才会启用容器隔离，这是需要额外安装和配置的 community 扩展功能。**生产环境必须配置 AioSandbox。**

### 8.3 隔离机制对比

| 维度 | ClawTeam | DeerFlow |
|---|---|---|
| 代码隔离 | Git Worktree（分支级） | 无（本地模式） |
| 进程隔离 | OS 进程隔离 | 无（本地模式） |
| 容器隔离 | 无 | ⚠️ 需配置 AioSandbox |
| 生产级隔离 | ✅（天然隔离） | ⚠️ 需额外配置 |

---

## 九、崩溃处理与容错机制

### 9.1 ClawTeam：检测有，但恢复全靠手动

存活检测（spawn/registry.py:59-76）：

```python
def is_agent_alive(team_name: str, agent_name: str) -> bool | None:
    registry = get_registry(team_name)
    info = registry.get(agent_name)
    if backend == "tmux":
        alive = _tmux_pane_alive(info.get("tmux_target", ""))
        if alive is False:
            pid = info.get("pid", 0)
            if pid:
                return _pid_alive(pid)
        return alive
```

使用 tmux pane dead 标记 + PID 检测来确认进程存活。

但没有自动恢复机制。Leader 必须手动重新 spawn。

另一个严重问题：Worker 崩溃后，其任务永久卡死。因为 blocked_by 的解除依赖于 `update_task --status completed` 调用，Worker 不在了就不会触发。

### 9.2 DeerFlow：崩溃处理更完善，但无自动恢复

三层异常捕获（executor.py:340-450）：

```python
# 1. 调度器层面
except Exception as e:
    result.status = SubagentStatus.FAILED
    logger.exception(f"Subagent {self.config.name} execution failed")

# 2. 执行未来层面（超时）
except FuturesTimeoutError:
    execution_future.cancel()
    result.status = SubagentStatus.TIMED_OUT

# 3. 异步执行层面
except Exception as e:
    result.status = SubagentStatus.FAILED
    result.error = str(e)
```

任务工具有明确的结构化返回值：

```python
# task_tool.py:140-148
if result.status == SubagentStatus.COMPLETED:
    return f"Task Succeeded. Result: {result.result}"
elif result.status == SubagentStatus.FAILED:
    return f"Task failed. Error: {result.error}"
elif result.status == SubagentStatus.TIMED_OUT:
    return f"Task timed out. Error: {result.error}"
```

Lead Agent 可以根据错误类型决定是否重试，但没有自动重试机制。

### 9.3 崩溃处理综合对比

| 维度 | ClawTeam | DeerFlow |
|---|---|---|
| 崩溃检测 | ✅ tmux pane dead + PID 检测 | ✅ 三层异常捕获 |
| 错误分类 | ❌ 无细分 | ✅ COMPLETED / FAILED / TIMED_OUT |
| 错误消息结构化 | ❌ 无 | ✅ 函数返回值带错误信息 |
| 自动恢复 | ❌ 无 | ❌ 无 |
| 任务永久卡死风险 | ⚠️ Worker 崩溃时存在 | N/A |
| 崩溃后自动清理 | ❌ 无 | ✅ cleanup_background_task() |

---

## 十、P2P 传输：ClawTeam 的高级特性

ClawTeam 支持可选的 P2P 传输模式（transport/p2p.py）：

```python
class P2PTransport(Transport):
    """ZeroMQ PUSH/PULL + FileTransport offline fallback.

    - PULL socket: 监听传入消息（如果设置了 bind_agent）
    - PUSH socket: 发送消息给其他 Agent
    - 节点发现：通过共享文件系统的 peers/{agent}.json
    - 离线兜底：如果节点不可达，走 FileTransport
    """
    _peer_heartbeat_interval_s = 1.0
    _peer_lease_ms = 5000
```

工作原理：

• 每个 Worker 启动时在 `peers/{name}.json` 写入自己的地址
• 发消息时读取对方地址，通过 ZeroMQ 直连
• 对方离线则自动回退到文件兜底

传输方式选择：

```python
# team/mailbox.py - _default_transport()
name = os.environ.get("CLAWTEAM_TRANSPORT", "")
if name == "p2p":
    return get_transport("p2p", team_name=team_name, bind_agent=agent)
# 默认是 file（纯文件系统），P2P 模式需要显式启用
```

---

## 十一、核心结论汇总

### 11.1 架构判断的最终结论

两者都是星型 / Hub-and-Spoke 架构，不是流水线 vs 星型。差异在于"星"的质量：

• **ClawTeam = 进程级星型**：每个 Worker 是独立 OS 进程，有持久身份、独立文件系统（Git Worktree）、独立生命周期
• **DeerFlow = 线程级星型**：每个 Subagent 是同一进程内的函数调用，无独立身份，无持久状态，无真正 CPU 并行

### 11.2 最重要的量化数据

| 发现 | 数值 | 来源 |
|---|---|---|
| DeerFlow 并行 subagent 上限 | **3**（可配置 2-4） | executor.py:492 |
| DeerFlow 超额 task 调用 | **被丢弃，有 WARNING 日志** | subagent_limit_middleware.py:67 |
| DeerFlow 本地沙箱隔离 | **无隔离**（subprocess.run shell=True） | local_sandbox.py |
| DeerFlow Memory 存储 | **append-only JSONL**（非向量 DB） | updater.py:55 |
| ClawTeam Mailbox 消息类型 | **9 种** | models.py |
| ClawTeam Worker 崩溃后 | **任务永久卡死** | tasks.py:290-307 |
| DeerFlow Lead / Subagent | **同一个类**（create_agent()） | executor.py:164, agent.py:322 |

### 11.3 场景选择建议

**选 ClawTeam 当你需要：**

• 真实 OS 级进程隔离
• 任务需要 Git 分支管理（代码合入需要真实分支）
• 需要超过 3-4 个 Agent 并行工作
• Worker 之间需要直接通信（P2P）
• 需要消息持久化（Agent 重启后不丢消息）
• Worker 崩溃后有监控系统可以手动恢复

**选 DeerFlow 当你需要：**

• MCP 工具生态扩展
• 实时流式响应（SSE）
• 10 + 中间件的标准化处理链
• Memory 跨会话持久化（即使没有向量搜索）
• 研究任务是 I/O 密集型（API 调用为主，不受 GIL 影响）
• 需要明确的 FAILED / TIMED_OUT 状态追踪

### 11.4 两者共同的工程盲点

• **ClawTeam**：Worker 崩溃后，其任务永久卡死，需要手动干预
• **DeerFlow**：默认 LocalSandbox 模式无隔离（subprocess.run shell=True），生产部署必须配置 AioSandbox community 扩展
• **两者都没有自动重试机制**：崩溃后的恢复完全靠人工或 Lead Agent 的自觉

---

## 结语

两个框架代表了两种不同的工程哲学：ClawTeam 追求 Agent 的"自主性"，DeerFlow 追求执行过程的"可控性"。没有绝对的好坏，只有场景的匹配。

完整研究报告（含所有源码索引）已发布在博客：https://www.dylanslife.com/posts/2026-03-23-clawteam-vs-deerflow-research-report.html

---

> 作者：Dylan
> 日期：2026-03-23
> 本文所有源码引用均可在 GitHub 仓库找到原始代码
