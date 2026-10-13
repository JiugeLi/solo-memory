#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { DatabaseSync } = require('node:sqlite');

const HOME = os.homedir();
const DB_DEFAULT = path.resolve(__dirname, '../data/memory.db');
const CAP = 200000;
const sources = ['codex', 'workbuddy', 'claude'];
const stop = new Set('users user home documents desktop downloads appdata roaming local programdata tmp temp var opt mnt media c d e disk project projects src source app apps code workspace workspaces dev test tests build dist out bin lib libs vendor node nodejs modules node_modules components data config configs resources assets public static files docs doc logs cache main index api core base common utils helpers types interfaces models views new old backup master v1 v2 2024 2025 2026'.split(' '));
const iso = v => v == null ? '' : typeof v === 'number' ? new Date(v > 1e12 ? v : v * 1000).toISOString() : String(v);
const tokens = s => new Set(String(s || '').toLowerCase().split(/[\s\\/:_\-.]+/).filter(t => t.length >= 2 && /^[\p{L}\p{N}]+$/u.test(t) && !stop.has(t)));
const cjkSpace = s => String(s || '').replace(/[\u3400-\u9fff\uf900-\ufaff]/g, '$& ');
const record = (source, sid, title, role, ts, text, file, cwd, idx) => ({source, session_id: sid, session_title: title || sid, role, ts: iso(ts), text: String(text || '').trim().slice(0, CAP), path: file || '', cwd: cwd || '', idx});
function* walk(dir, filter) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, filter);
    else if (e.isFile() && filter(p)) yield p;
  }
}
function* lines(file) {
  // Streaming to avoid retaining entire transcripts in memory.
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(65536);
  let tail = '';
  const decoder = new TextDecoder();
  try {
    let size;
    while ((size = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      const chunks = (tail + decoder.decode(buf.subarray(0, size), {stream: true})).split('\n');
      tail = chunks.pop();
      for (const line of chunks) yield line;
    }
    tail += decoder.decode();
    if (tail) yield tail;
  } finally { fs.closeSync(fd); }
}
function parseLines(file) {
  return (function* () { for (const line of lines(file)) { try { yield JSON.parse(line); } catch {} } })();
}
function codexText(c) {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map(v => typeof v === 'string' ? v : ['text','output','content','arguments','reasoning','input','name'].map(k => typeof v?.[k] === 'string' ? v[k] : v?.[k] ? JSON.stringify(v[k]) : '').filter(Boolean).join('\n')).join('\n');
  return c && typeof c === 'object' ? codexText(c.content || c.text) : '';
}
function claudeText(c) {
  if (typeof c === 'string') return c;
  if (!Array.isArray(c)) return '';
  return c.map(v => typeof v === 'string' ? v : v?.type === 'text' ? v.text : v?.type === 'thinking' ? v.thinking : v?.type === 'tool_result' ? claudeText(v.content) : v?.type === 'tool_use' ? `[tool_use ${v.name}] ${JSON.stringify(v.input || {})}` : '').filter(Boolean).join('\n');
}
function* codex(home = HOME) {
  const base = path.join(home, '.codex');
  for (const dir of ['sessions', 'archived_sessions']) for (const file of walk(path.join(base, dir), p => /rollout-.*\.jsonl$/.test(p))) {
    const sid = path.basename(file).replace(/^rollout-|\.jsonl$/g, '');
    let title = sid, cwd = '', idx = 0;
    for (const o of parseLines(file)) {
      const p = o.payload || {}, ts = o.timestamp || p.timestamp;
      if (o.type === 'session_meta') { cwd = p.cwd || ''; title = cwd || sid; continue; }
      let role, text;
      if (o.type === 'response_item' && p.type === 'message') { role = p.role || '?'; text = codexText(p.content); }
      else if (o.type === 'event_msg' && p.type === 'user_message') { role = 'user'; text = codexText(p.message); }
      if (text) yield record('codex', sid, title, role, ts, text, file, cwd, ++idx);
    }
  }
}
function* claude(home = HOME) {
  for (const file of walk(path.join(home, '.claude', 'projects'), p => p.endsWith('.jsonl'))) {
    const sid = path.basename(file, '.jsonl');
    let idx = 0;
    for (const o of parseLines(file)) {
      if (!['user','assistant','system'].includes(o.type)) continue;
      const text = claudeText(o.message?.content);
      if (text) yield record('claude', sid, path.basename(path.dirname(file)), o.message?.role || o.type, o.timestamp, text, file, o.cwd || path.basename(path.dirname(file)), ++idx);
    }
  }
}
function* workbuddy(home = HOME, appdata = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')) {
  const meta = new Map();
  const vscdb = path.join(appdata, 'WorkBuddy', 'codebuddy-sessions.vscdb');
  if (fs.existsSync(vscdb)) {
    try {
      const db = new DatabaseSync(vscdb, {readOnly: true});
      for (const r of db.prepare("SELECT key,value FROM ItemTable WHERE key LIKE 'session:%'").all()) {
        try { meta.set(r.key.slice(8), JSON.parse(r.value)); } catch {}
      }
      db.close();
    } catch (e) { console.error(`WorkBuddy metadata: ${e.message}`); }
  }
  const wbdb = path.join(home, '.workbuddy', 'workbuddy.db');
  if (fs.existsSync(wbdb)) {
    try {
      const db = new DatabaseSync(wbdb, {readOnly: true});
      for (const r of db.prepare('SELECT id,title,cwd,created_at,updated_at,model FROM sessions').all()) meta.set(String(r.id), {...meta.get(String(r.id)), ...r});
      db.close();
    } catch (e) { console.error(`WorkBuddy database: ${e.message}`); }
  }
  for (const [sid, m] of meta) {
    const title = m.title || sid, cwd = m.cwd || '', ts = m.updated_at || m.updatedAt || m.created_at || m.createdAt;
    yield record('workbuddy', sid, title, 'meta', ts, `[会话元信息] 标题: ${title}\n工作目录: ${cwd}\n模型: ${m.model || ''}`, '', cwd, 1);
  }
  const brain = path.join(appdata, 'WorkBuddy', 'User', 'globalStorage', 'tencent-cloud.coding-copilot', 'brain');
  if (fs.existsSync(brain)) for (const ent of fs.readdirSync(brain, {withFileTypes: true})) {
    if (!ent.isDirectory()) continue;
    const m = meta.get(ent.name) || {}, dir = path.join(brain, ent.name);
    let idx = 1;
    for (const file of fs.readdirSync(dir).filter(f => /\.(md|html|txt)$/i.test(f)).sort()) {
      const fp = path.join(dir, file);
      if (!fs.statSync(fp).isFile()) continue;
      const text = fs.readFileSync(fp, 'utf8');
      if (text.trim()) yield record('workbuddy', ent.name, `${m.title || ent.name} :: ${file}`, 'artifact', m.updated_at || m.updatedAt || m.created_at || m.createdAt, text, fp, m.cwd, ++idx);
    }
  }
}
const iterators = {codex, claude, workbuddy};
function openDb(file) {
  fs.mkdirSync(path.dirname(path.resolve(file)), {recursive: true});
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, source TEXT, session_id TEXT, idx INTEGER, session_title TEXT, role TEXT, ts TEXT, text TEXT, path TEXT, cwd TEXT, UNIQUE(source,session_id,idx));
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_unicode USING fts5(session_title,role,text,cwd,tokenize='unicode61');
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_trigram USING fts5(session_title,role,text,cwd,tokenize='trigram');`);
  return db;
}
function index(db, selected = sources, providers = iterators) {
  const upsert = db.prepare(`INSERT INTO messages(source,session_id,idx,session_title,role,ts,text,path,cwd) VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(source,session_id,idx) DO UPDATE SET session_title=excluded.session_title,role=excluded.role,ts=excluded.ts,text=excluded.text,path=excluded.path,cwd=excluded.cwd RETURNING id`);
  const delU = db.prepare('DELETE FROM fts_unicode WHERE rowid=?'), delT = db.prepare('DELETE FROM fts_trigram WHERE rowid=?');
  const insU = db.prepare('INSERT INTO fts_unicode(rowid,session_title,role,text,cwd) VALUES(?,?,?,?,?)');
  const insT = db.prepare('INSERT INTO fts_trigram(rowid,session_title,role,text,cwd) VALUES(?,?,?,?,?)');
  const counts = {};
  db.exec('BEGIN');
  try {
    for (const source of selected) {
      counts[source] = 0;
      for (const r of providers[source]()) {
        const id = upsert.get(r.source,r.session_id,r.idx,r.session_title,r.role,r.ts,r.text,r.path,r.cwd).id;
        delU.run(id); delT.run(id);
        insU.run(id,cjkSpace(r.session_title),r.role,cjkSpace(r.text),cjkSpace(r.cwd));
        insT.run(id,r.session_title,r.role,r.text,r.cwd);
        counts[source]++;
      }
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return counts;
}
function matches(db, query) {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return new Set();
  const ids = new Set();
  for (const [table, values] of [['fts_unicode',terms.map(cjkSpace)],['fts_trigram',terms.filter(t => t.length >= 3)]]) {
    if (!values.length) continue;
    const expression = values.map(t => `"${t.trim().replaceAll('"','""')}"`).join(' OR ');
    for (const r of db.prepare(`SELECT rowid FROM ${table} WHERE ${table} MATCH ?`).all(expression)) ids.add(r.rowid);
  }
  return ids;
}
function search(db, query, source, limit = 10) {
  const ids = matches(db, query);
  if (!ids.size || limit <= 0) return [];
  const placeholders = [...ids].map(() => '?').join(',');
  return db.prepare(`SELECT * FROM messages WHERE id IN (${placeholders}) ${source ? 'AND source=?' : ''} ORDER BY ts DESC, id DESC LIMIT ?`).all(...ids, ...(source ? [source] : []), limit);
}
function compress(rows) {
  const intent = rows.find(r => ['user','developer','system'].includes(r.role) && r.text.trim())?.text.trim().slice(0,200) || '';
  return {intent, body: rows.filter(r => ['user','developer','system','assistant','agent','aid'].includes(r.role)).slice(0,10).map(r => `${['user','developer','system'].includes(r.role) ? '问' : '答'}: ${r.text.trim().slice(0, ['user','developer','system'].includes(r.role) ? 200 : 400)}`).join('\n')};
}
function recall(db, cwd, top = 5) {
  const base = path.basename(path.resolve(cwd)), bt = tokens(base), ct = tokens(cwd);
  const names = fs.existsSync(cwd) && fs.statSync(cwd).isDirectory() ? fs.readdirSync(cwd).slice(0,15) : [];
  const content = new Set();
  for (const q of [base, ...names.slice(0,4)].filter(x => tokens(x).size)) for (const id of matches(db, q)) {
    const r = db.prepare('SELECT source,session_id FROM messages WHERE id=?').get(id);
    if (r) content.add(`${r.source}\0${r.session_id}`);
  }
  const sessions = db.prepare('SELECT source,session_id,MAX(ts) AS ts FROM messages GROUP BY source,session_id').all();
  const scored = sessions.map(s => {
    const rows = db.prepare('SELECT * FROM messages WHERE source=? AND session_id=? ORDER BY idx').all(s.source,s.session_id);
    const stok = new Set(rows.flatMap(r => [...tokens(r.cwd),...tokens(r.session_title)]));
    const baseHit = [...bt].some(t => stok.has(t));
    const overlap = [...ct].filter(t => !bt.has(t) && stok.has(t)).length;
    const hit = content.has(`${s.source}\0${s.session_id}`);
    return {...s, rows, score:(baseHit ? 5 : 0) + overlap + (hit ? 3 : 0), admitted:baseHit || overlap >= 2 || hit};
  }).filter(s => s.admitted).sort((a,b) => b.score-a.score || String(b.ts).localeCompare(String(a.ts))).slice(0,top);
  return scored.map(s => ({source:s.source,title:s.rows[0].session_title,cwd:s.rows[0].cwd,ts:s.ts,score:s.score,...compress(s.rows)}));
}
function usage() { console.log(`solo-memory index [--source all|codex|claude|workbuddy] [--db PATH]\nsolo-memory search QUERY [--source codex|claude|workbuddy] [--limit N] [--db PATH]\nsolo-memory recall PROJECT_DIR [--top N] [--format text|md] [--db PATH]`); }
function main(argv) {
  const [cmd,...rest] = argv;
  if (!['index','search','recall'].includes(cmd)) { usage(); process.exitCode = cmd ? 1 : 0; return; }
  const opts = {}, positional = [];
  for (let i=0;i<rest.length;i++) {
    if (rest[i].startsWith('--')) { const key = rest[i].slice(2); if (!['db','source','limit','top','format'].includes(key) || !rest[i+1] || rest[i+1].startsWith('--')) throw Error(`Invalid option: ${rest[i]}`); opts[key]=rest[++i]; }
    else positional.push(rest[i]);
  }
  const dbfile = opts.db || DB_DEFAULT;
  if (opts.source && ![...sources,'all'].includes(opts.source)) throw Error('Unknown source');
  if (cmd === 'index') {
    const db = openDb(dbfile);
    try { console.log(index(db, opts.source && opts.source !== 'all' ? [opts.source] : sources)); console.log(`Index: ${dbfile}`); } finally { db.close(); }
    return;
  }
  if (!positional.length) throw Error(`Missing ${cmd === 'search' ? 'query' : 'project directory'}`);
  if (cmd === 'search' && opts.source === 'all') throw Error('Use --source only for one source');
  if (cmd === 'recall' && opts.source) throw Error('recall does not support --source');
  if (!fs.existsSync(dbfile)) { if (cmd === 'recall') { const db = openDb(dbfile); try { index(db); } finally { db.close(); } } else throw Error('Index missing; run solo-memory index first'); }
  const db = new DatabaseSync(dbfile, {readOnly:true});
  try {
    if (cmd === 'search') {
      const n = opts.limit == null ? 10 : Number(opts.limit);
      if (!Number.isSafeInteger(n) || n < 0) throw Error('Invalid limit');
      for (const r of search(db,positional.join(' '),opts.source,n)) console.log(`[${r.source}] ${r.session_title} | ${r.role} | ${r.ts}\n${r.text.slice(0,400)}\n${r.path}`);
    } else {
      const n = opts.top == null ? 5 : Number(opts.top);
      if (!Number.isSafeInteger(n) || n < 0 || (opts.format && !['md','text'].includes(opts.format))) throw Error('Invalid top or format');
      const result = recall(db,positional[0],n);
      if (opts.format === 'md') console.log(`# 项目上下文召回: ${positional[0]}`);
      for (const r of result) console.log(`${opts.format === 'md' ? '##' : '---'} [${r.source}] ${r.title} (${r.ts}, score ${r.score})\n目录: ${r.cwd}\n意图: ${r.intent}\n${r.body}`);
      if (!result.length) console.log('未找到相关历史上下文。');
    }
  } finally { db.close(); }
}
if (require.main === module) { try { main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exitCode = 1; } }
module.exports = {index, search, recall, openDb, matches, record, iterators, main};
