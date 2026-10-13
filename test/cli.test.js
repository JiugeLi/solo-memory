const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {openDb,index,search,recall,record} = require('../bin/solo-memory.js');

test('upsert keeps FTS in sync and retains unrelated source; project recall', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'solo-memory-'));
  const db = openDb(path.join(dir,'memory.db'));
  try {
    const source = () => [record('codex','s1','demo','user','2026-01-01','旧关键词', '',path.join(dir,'demo'),1)];
    index(db,['codex'],{codex:source});
    index(db,['claude'],{claude:() => [record('claude','s2','other','user','2026-01-02','othertext','',dir,1)]});
    index(db,['codex'],{codex:() => [record('codex','s1','demo','user','2026-01-03','新关键词','',path.join(dir,'demo'),1)]});
    assert.equal(search(db,'旧关键词').length,0);
    assert.equal(search(db,'新关键词').length,1);
    assert.equal(search(db,'othertext').length,1);
    assert.equal(recall(db,path.join(dir,'demo'))[0].source,'codex');
  } finally { db.close(); fs.rmSync(dir,{recursive:true,force:true}); }
});

test('search sorted newest first', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'solo-memory-'));
  const db = openDb(path.join(dir,'memory.db'));
  try {
    index(db,['codex'],{codex:() => [record('codex','a','x','user','2024-01-01','关键词','',dir,1),record('codex','b','x','user','2025-01-01','关键词','',dir,1)]});
    assert.deepEqual(search(db,'关键词').map(r => r.session_id),['b','a']);
  } finally { db.close(); fs.rmSync(dir,{recursive:true,force:true}); }
});
