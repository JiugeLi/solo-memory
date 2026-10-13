# Solo Memory

[中文](#中文) | [English](#english)

## 中文

Solo Memory 是一个本地 CLI，用于搜索 AI 编码助手的历史对话，并按项目目录召回相关上下文。支持 Codex 和 Claude Code 的本地对话记录；WorkBuddy 只能读取本地会话元信息和生成物，无法读取云端聊天正文。

### 运行要求

Node.js 22.5 或更新版本，需支持内置的 `node:sqlite` 和 FTS5。部分 Node.js 版本会显示实验性 API 警告。无需安装 npm 依赖。

### 使用方法

```bash
node bin/solo-memory.js index --source all
node bin/solo-memory.js search "K3S 部署" --limit 5
node bin/solo-memory.js recall "D:/my-project" --top 3 --format md
npm test
```

可选：运行 `npm link`，在本机安装 `solo-memory` 命令。`--db PATH` 可覆盖默认数据库路径 `data/memory.db`。出现新对话后重新运行 `index`；索引所选来源时会更新已有记录，不会删除其他来源的数据。源文件删除后，数据库中的旧记录**不会自动清除**。搜索基于关键词（空格分隔的词采用 OR 匹配），不是语义搜索。项目召回使用启发式规则且会截断内容；重要信息请回查原始对话。

**隐私提醒：**本地索引保存未经脱敏的对话内容，可能包含凭据或私人信息。`data/` 已被 Git 忽略；不要发布生成的数据库或原始对话记录。

作为 Skill 使用时，请参阅 [SKILL.md](SKILL.md)。

## English

Local CLI for searching AI coding assistant conversations and recalling project context. Supports Codex and Claude Code local transcripts; WorkBuddy only supplies local session metadata and generated artifacts (not cloud chat messages).

## Requirements

Node.js 22.5+ with built-in `node:sqlite` and FTS5. Some Node versions display an experimental API warning. No npm dependencies.

## Usage

```bash
node bin/solo-memory.js index --source all
node bin/solo-memory.js search "K3S 部署" --limit 5
node bin/solo-memory.js recall "D:/my-project" --top 3 --format md
npm test
```

Optionally run `npm link` to install the `solo-memory` command locally. `--db PATH` overrides the default `data/memory.db`. Run `index` again when new conversations appear; selected sources are upserted without removing other sources. Deleted source files are **not** removed automatically from the database. Search is keyword-based (OR across whitespace-separated terms), not semantic search. Recall is heuristic and truncated: verify important details against the original conversation.

**Privacy:** The local index contains unredacted conversation text and may contain credentials or private information. `data/` is gitignored. Never publish a generated database or raw transcripts.

For integration as a skill, see [SKILL.md](SKILL.md).
