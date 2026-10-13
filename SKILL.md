---
name: cross-tool-chat-indexer
description: 在本地索引并搜索 Codex、Claude Code、WorkBuddy 的历史会话；按项目目录召回相关上下文。适用于寻找以前讨论的配置、排错记录或在新会话前回顾项目历史。
---

# Solo Memory

用 Node.js CLI 搜索本地 AI 编码工具历史。需要 Node.js >= 22.5（内置 `node:sqlite`，该 API 在部分版本仍标记为 experimental）；无需 npm 依赖。

```bash
node {SKILL_DIR}/bin/solo-memory.js index --source all
node {SKILL_DIR}/bin/solo-memory.js search "wireguard 配置" --limit 5
node {SKILL_DIR}/bin/solo-memory.js recall "D:/my-project" --top 3 --format md
node {SKILL_DIR}/bin/solo-memory.js compact "D:/my-project" --top 3
```

也可全局安装 npm 包后使用 `solo-memory` 命令；源码打包需 Bun（`npm run build`）。默认数据库在用户目录 `~/.solo-memory/memory.db`，`--db PATH` 可覆盖。`compact` 只输出 Markdown 摘要，不压缩数据库。`index --source codex|claude|workbuddy` 只更新所选来源，不删除其他来源；`search --source` 可按来源过滤。增量更新会重新扫描所选来源的文件，源文件删除后旧记录不会自动清理。

Codex/Claude Code 读取本地 JSONL 转录；WorkBuddy 只能索引会话元信息和 brain 本地产出文件，不能读取云端聊天正文。检索基于关键词，不是语义检索；recall 仅截取会话前若干条，需打开来源核对后再作为项目事实使用。数据库包含未脱敏的历史对话，可能有敏感信息，勿上传或共享。
