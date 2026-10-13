# Solo Memory

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
