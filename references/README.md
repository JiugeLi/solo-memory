# Solo Memory (Node CLI)

Node.js >= 22.5；依赖 Node 内置 `node:sqlite`，不需安装第三方包。若当前 Node 将 sqlite 标记为实验性，会提示 warning。

```bash
node bin/solo-memory.js index --source all
node bin/solo-memory.js search "K3S 部署" --source codex --limit 5
node bin/solo-memory.js recall "D:/my-project" --top 3 --format md
npm test
```

运行 `npm run build` 用 Bun 打包；安装后命令名为 `solo-memory`。`solo-memory compact [项目目录]` 输出 Markdown 卡片（不压缩数据库）。`--db PATH` 可指定库文件（默认 `~/.solo-memory/memory.db`）。索引全程本地，不会上传对话；但本地数据库保存原文，**不会自动脱敏**，应避免共享。增量索引重新扫描源文件，保留历史行和其他来源的行；源文件删除不会清除旧记录。召回卡片不是权威总结，重要结论请回查原始会话。

数据源：Codex `~/.codex/sessions` 与 `archived_sessions` 的 rollout JSONL；Claude Code `~/.claude/projects` 的 JSONL；WorkBuddy 本地 SQLite 元信息及 brain 文本产物（不含云端会话正文）。
