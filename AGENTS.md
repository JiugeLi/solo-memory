# Repository rules

- This is the public, standalone Solo Memory Node CLI repository (`JiugeLi/solo-memory`); do not publish conversation databases, raw transcripts, credentials, personal generated assets, or files from the private JiugeSkills repository.
- Require Node.js >= 22.5 with `node:sqlite`/FTS5; run `npm test` and skill-creator `quick_validate.py .` after changing the CLI or skill metadata.
- `data/` contains generated unredacted history and must stay gitignored. WorkBuddy chat bodies are not available locally; recall is heuristic and must not be presented as authoritative project facts.
