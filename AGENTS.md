# Repository rules

- This is the public, standalone Solo Memory Node CLI repository (`JiugeLi/solo-memory`); do not publish conversation databases, raw transcripts, credentials, personal generated assets, or files from the private JiugeSkills repository.
- Require Node.js >= 22.5 with `node:sqlite`/FTS5; run `npm test` and skill-creator `quick_validate.py .` after changing the CLI or skill metadata.
- Default generated history belongs in `~/.solo-memory/memory.db`, never in the published package. Keep `dist/`, generated databases, and local transcripts out of Git; npm packages should include only bundled CLI, README and LICENSE.
- Build with Bun (`npm run build`) into a Node-target CJS bundle; runtime remains Node.js >= 22.5 with built-in SQLite. WorkBuddy chat bodies are not available locally; recall is heuristic and must not be presented as authoritative project facts.
