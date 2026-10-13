# Solo Memory

[中文](#中文) | [English](#english)

## 中文

Solo Memory 是一个本地 CLI，用于搜索 AI 编码助手的历史对话，并按项目目录召回相关上下文。支持 Codex 和 Claude Code 的本地对话记录；WorkBuddy 只能读取本地会话元信息和生成物，无法读取云端聊天正文。

### 运行要求

Node.js 22.5 或更新版本，需支持内置的 `node:sqlite` 和 FTS5。部分 Node.js 版本会显示实验性 API 警告。无需安装 npm 依赖。

### 安装与使用

发布到 npm 后可全局安装；在发布前可从源码安装：

```bash
npm install -g solo-memory
# 源码安装：git clone https://github.com/JiugeLi/solo-memory.git && cd solo-memory && npm install -g .
solo-memory index --source all
solo-memory search "K3S 部署" --limit 5
solo-memory recall "D:/my-project" --top 3 --format md
solo-memory compact "D:/my-project" --top 3
```

`npm run build` 使用 Bun 将 Node CLI 打包到 `dist/`；仅构建时需要 Bun，安装后的 CLI 由 Node.js 运行。`compact` 是输出 Markdown 精简上下文卡片的便捷命令，不会改写或压缩数据库；不传目录时默认当前工作目录。`--db PATH` 可覆盖默认数据库路径 `~/.solo-memory/memory.db`。出现新对话后重新运行 `index`；索引所选来源时会更新已有记录，不会删除其他来源的数据。源文件删除后，数据库中的旧记录**不会自动清除**。搜索基于关键词（空格分隔的词采用 OR 匹配），不是语义搜索。项目召回使用启发式规则且会截断内容；重要信息请回查原始对话。

**隐私提醒：**本地索引保存未经脱敏的对话内容，可能包含凭据或私人信息。生成的数据库不包含在 npm 包或 Git 仓库中；不要发布生成的数据库或原始对话记录。

作为 Skill 使用时，请参阅 [SKILL.md](SKILL.md)。

## English

Local CLI for searching AI coding assistant conversations and recalling project context. Supports Codex and Claude Code local transcripts; WorkBuddy only supplies local session metadata and generated artifacts (not cloud chat messages).

## Requirements

Node.js 22.5+ with built-in `node:sqlite` and FTS5. Some Node versions display an experimental API warning. No npm dependencies.

## Install & usage

Once published to npm, install globally; before publication, install from source:

```bash
npm install -g solo-memory
# From source: git clone https://github.com/JiugeLi/solo-memory.git && cd solo-memory && npm install -g .
solo-memory index --source all
solo-memory search "K3S 部署" --limit 5
solo-memory recall "D:/my-project" --top 3 --format md
solo-memory compact "D:/my-project" --top 3
```

`npm run build` bundles the Node CLI into `dist/` with Bun. Bun is needed for building only; the installed CLI runs on Node.js. `compact` prints truncated Markdown context cards; it does **not** compact the database. When omitted, the project directory defaults to the current directory. `--db PATH` overrides the default `~/.solo-memory/memory.db`.  Run `index` again when new conversations appear; selected sources are upserted without removing other sources. Deleted source files are **not** removed automatically from the database. Search is keyword-based (OR across whitespace-separated terms), not semantic search. Recall is heuristic and truncated: verify important details against the original conversation.

**Privacy:** The local index contains unredacted conversation text and may contain credentials or private information. The generated database is excluded from the npm package and Git repository. Never publish a generated database or raw transcripts.

For integration as a skill, see [SKILL.md](SKILL.md).
