#!/usr/bin/env node
/**
 * 앤도버 생활기록 — 단독 실행 서버
 *
 * 구글 Apps Script(Code.gs) + 구글 시트 대신, 이 PC에서 직접 돌아가는 서버예요.
 *  - 화면: public/andover-app.html (구글 버전과 같은 파일을 그대로 씁니다)
 *  - 데이터: data/store.json (한 파일에 전부 저장)
 *  - 백업: data/backups/ 에 하루 한 번 자동 저장, 최근 30개 보관
 *
 * 추가 설치가 필요 없어요. Node.js 18 이상만 있으면 됩니다.
 *   node server.js
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const APP_FILE = path.join(PUBLIC, 'andover-app.html');
const BACKUP_KEEP = 30;
const MAX_BODY = 50 * 1024 * 1024;       // 요청 하나 최대 50MB
const MAX_DOC = 5 * 1024 * 1024;         // 문서 하나 최대 5MB (구글 버전은 27만 자)

fs.mkdirSync(BACKUP_DIR, { recursive: true });

/* ---------------- 설정 ---------------- */
function loadConfig() {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch (_) { /* 처음 실행 */ }
  let changed = false;
  if (typeof cfg.port !== 'number') { cfg.port = 8080; changed = true; }
  if (typeof cfg.password !== 'string') { cfg.password = ''; changed = true; }
  if (!cfg.secret) { cfg.secret = crypto.randomBytes(24).toString('hex'); changed = true; }
  if (changed) writeJsonAtomic(CONFIG_FILE, cfg);
  return cfg;
}

function writeJsonAtomic(file, obj) {
  const tmp = file + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, JSON.stringify(obj));
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  // 바탕화면이 OneDrive 와 동기화되면 파일이 잠깐 잠길 수 있어서, 몇 번 다시 시도해요
  for (let i = 0; ; i++) {
    try { fs.renameSync(tmp, file); return; } catch (e) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      if (i >= 8) { fs.copyFileSync(tmp, file); try { fs.unlinkSync(tmp); } catch (_) { /* 남아도 괜찮아요 */ } return; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 60 * (i + 1));
    }
  }
}

const config = loadConfig();
const PORT = Number(process.env.PORT) || config.port;

/* ---------------- 데이터 저장소 ----------------
 * 구글 시트의 'data' 시트와 같은 구조예요.
 *   key = "컬렉션|id",  t = updatedAt,  by = 수정한 사람,  del = 삭제 여부,  json = 내용
 */
let store = { last: 0, docs: {} };
try {
  store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  if (!store.docs) store.docs = {};
  store.last = Number(store.last) || 0;
} catch (e) {
  if (e.code !== 'ENOENT') {
    console.error('\n[오류] data/store.json 을 읽지 못했어요: ' + e.message);
    console.error('       data/backups 폴더의 백업 파일을 store.json 으로 복사하면 복구할 수 있어요.\n');
    process.exit(1);
  }
  saveStore();
}

function saveStore() { writeJsonAtomic(STORE_FILE, store); }

function nextTime() { return Math.max(store.last + 1, Date.now()); }

/** since 이후에 바뀐 문서를 돌려줘요 (Code.gs 의 api_pull 과 같음) */
function apiPull(since) {
  since = Number(since) || 0;
  let mx = since;
  const out = [];
  for (const key of Object.keys(store.docs)) {
    const d = store.docs[key];
    if (d.t > since) {
      const p = key.indexOf('|');
      out.push({ c: key.slice(0, p), id: key.slice(p + 1), t: d.t, by: d.by, del: !!d.del, json: d.del ? '' : d.json });
      if (d.t > mx) mx = d.t;
    }
  }
  out.sort((a, b) => a.t - b.t);
  return { last: mx, changes: out };
}

/** ops: [{c, id, json}]  (json === null 이면 삭제) — Code.gs 의 api_write 와 같음 */
function apiWrite(ops, by) {
  if (!Array.isArray(ops)) throw new Error('잘못된 요청이에요');
  const dedup = new Map();
  for (const op of ops) {
    if (!op || typeof op.c !== 'string' || op.c === '' || op.c.includes('|') || op.id === undefined || op.id === null) {
      throw new Error('잘못된 기록이에요');
    }
    const k = op.c + '|' + String(op.id);
    dedup.delete(k);            // 같은 문서가 여러 번 오면 마지막 것만
    dedup.set(k, op);
  }
  let t = nextTime();
  for (const [k, op] of dedup) {
    const del = op.json === null || op.json === undefined;
    const js = del ? '' : String(op.json);
    if (js.length > MAX_DOC) throw new Error('기록이 너무 커요 (' + k + ')');
    store.docs[k] = { t: t, by: by, del: del, json: js };
    t++;
  }
  if (dedup.size) {
    store.last = t - 1;
    saveStore();
  }
  return { last: store.last };
}

/** 문서 전체를 바꿔요 (가져오기·복원). 없어진 문서는 삭제로 표시해서 열린 화면에도 반영돼요. */
function replaceAll(newDocs, by) {
  let t = nextTime();
  const next = {};
  for (const k of Object.keys(newDocs)) {
    const d = newDocs[k];
    next[k] = { t: t++, by: d.by || by, del: !!d.del, json: d.del ? '' : String(d.json || '') };
  }
  for (const k of Object.keys(store.docs)) {
    if (!next[k] && !store.docs[k].del) next[k] = { t: t++, by: by, del: true, json: '' };
  }
  store = { last: t - 1, docs: next };
  saveStore();
}

function countDocs(docs) {
  const n = {};
  for (const k of Object.keys(docs)) {
    if (docs[k].del) continue;
    const c = k.slice(0, k.indexOf('|'));
    n[c] = (n[c] || 0) + 1;
  }
  return n;
}

/* ---------------- 자동 백업 ---------------- */
function pad(n) { return String(n).padStart(2, '0'); }
function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function stampStr(d) { return dateStr(d) + '_' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()); }

function listBackups() {
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => /^[\w.-]+\.json$/.test(f))
    .map(f => { const s = fs.statSync(path.join(BACKUP_DIR, f)); return { name: f, size: s.size, mtime: s.mtimeMs }; })
    .sort((a, b) => b.mtime - a.mtime);
}

function backupNow(name) {
  name = name || ('daily-' + dateStr(new Date()) + '.json');
  let file = path.join(BACKUP_DIR, name);
  if (!name.startsWith('daily-')) {   // 같은 초에 두 번 만들어도 앞의 백업을 덮어쓰지 않게
    for (let i = 2; fs.existsSync(file); i++) file = path.join(BACKUP_DIR, name.replace(/\.json$/, '-' + i + '.json'));
  }
  fs.copyFileSync(STORE_FILE, file);
  const daily = listBackups().filter(b => b.name.startsWith('daily-'));
  daily.slice(BACKUP_KEEP).forEach(b => fs.unlinkSync(path.join(BACKUP_DIR, b.name)));
  const manual = listBackups().filter(b => !b.name.startsWith('daily-'));
  manual.slice(BACKUP_KEEP).forEach(b => fs.unlinkSync(path.join(BACKUP_DIR, b.name)));
  return path.basename(file);
}

/** 오늘 백업이 없으면 만들어요. (PC가 새벽에 꺼져 있어도 켜지면 바로 백업돼요) */
function dailyBackup() {
  try {
    const name = 'daily-' + dateStr(new Date()) + '.json';
    if (!fs.existsSync(path.join(BACKUP_DIR, name))) {
      backupNow(name);
      console.log('[백업] ' + name + ' 저장했어요');
    }
  } catch (e) { console.error('[백업 실패] ' + e.message); }
}
dailyBackup();
setInterval(dailyBackup, 30 * 60 * 1000).unref();

/* ---------------- 로그인 (비밀번호를 설정한 경우만) ---------------- */
function sessionToken() {
  return crypto.createHash('sha256').update(config.secret + ':' + config.password).digest('hex');
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function isAuthed(req) {
  if (!config.password) return true;
  return safeEqual(parseCookies(req).sid || '', sessionToken());
}
function setSessionCookie(res) {
  res.setHeader('Set-Cookie', 'sid=' + sessionToken() + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000');
}

/* ---------------- HTTP ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function send(res, status, body, type, extra) {
  res.writeHead(status, Object.assign({ 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {}));
  res.end(body);
}
function sendJson(res, status, obj) { send(res, status, JSON.stringify(obj), MIME['.json']); }

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('요청이 너무 커요')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readBody(req) { return (await readRaw(req)).toString('utf8'); }

/* ---------------- 프로그램 업데이트 (ZIP) ----------------
 * 관리 화면에서 업데이트 ZIP 을 올리면 프로그램 파일만 바꿔요.
 * data 폴더(학생 기록 · 백업 · 비밀번호)는 절대 건드리지 않아요.
 */
const zlib = require('zlib');
const UPDATABLE = /^(server\.js|package\.json|README\.md|\.gitignore|start-windows\.bat|start-mac\.command|public\/[A-Za-z0-9_.\-\/]+)$/;

function unzipEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ZIP 파일이 아니에요');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('ZIP 파일이 손상됐어요');
    const method = buf.readUInt16LE(off + 10), csize = buf.readUInt32LE(off + 20);
    const nlen = buf.readUInt16LE(off + 28), elen = buf.readUInt16LE(off + 30), clen = buf.readUInt16LE(off + 32);
    const local = buf.readUInt32LE(off + 42);
    const name = buf.slice(off + 46, off + 46 + nlen).toString('utf8').replace(/\\/g, '/');
    off += 46 + nlen + elen + clen;
    if (name.endsWith('/')) continue;
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error('ZIP 파일이 손상됐어요');
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.slice(start, start + csize);
    let data;
    if (method === 0) data = raw;
    else if (method === 8) data = zlib.inflateRawSync(raw);
    else throw new Error('지원하지 않는 압축 방식이에요 (' + name + ')');
    out.push({ name, data });
  }
  return out;
}

function applyUpdate(buf) {
  let files = unzipEntries(buf);
  // 'andover-record/server.js' 처럼 맨 위 폴더 하나로 묶여 있으면 그 폴더를 벗겨요
  const tops = new Set(files.map(f => f.name.split('/')[0]));
  if (tops.size === 1 && files.every(f => f.name.includes('/'))) {
    const top = [...tops][0] + '/';
    files = files.map(f => ({ name: f.name.slice(top.length), data: f.data }));
  }
  const ok = files.filter(f => UPDATABLE.test(f.name) && !f.name.split('/').includes('..'));
  if (!ok.some(f => f.name === 'server.js') || !ok.some(f => f.name === 'public/andover-app.html')) {
    throw new Error('앤도버 생활기록 업데이트 파일이 아니에요 (server.js, public/andover-app.html 이 필요해요)');
  }
  // 바꾸기 전 프로그램을 백업해 두어요 (되돌릴 수 있게)
  const bdir = path.join(BACKUP_DIR, 'program-' + stampStr(new Date()));
  for (const f of ok) {
    const cur = path.join(ROOT, f.name);
    if (fs.existsSync(cur)) { fs.mkdirSync(path.dirname(path.join(bdir, f.name)), { recursive: true }); fs.copyFileSync(cur, path.join(bdir, f.name)); }
  }
  for (const f of ok) {
    const dest = path.join(ROOT, f.name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest + '.tmp', f.data);
    fs.renameSync(dest + '.tmp', dest);
  }
  return { updated: ok.length, skipped: files.length - ok.length, backup: path.basename(bdir) };
}

function whoIs(req) {
  let u = '';
  try { u = decodeURIComponent(req.headers['x-user'] || ''); } catch (_) { u = ''; }
  u = u.replace(/[\r\n]/g, ' ').trim().slice(0, 60);
  return u || String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}

function appHtml() {
  let html = fs.readFileSync(APP_FILE, 'utf8');
  // 구글 연결층보다 먼저 단독 실행 연결층을 넣어요
  html = html.replace(/<head>/i, '<head><script src="/standalone.js"></script>');
  // 엑셀 라이브러리는 인터넷 없이도 되도록 PC에 있는 파일을 써요
  html = html.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx\/[\d.]+\/xlsx\.full\.min\.js/g, '/vendor/xlsx.full.min.js');
  return html;
}

function serveStatic(res, rel) {
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 404, 'Not found');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, buf, MIME[path.extname(file)] || 'application/octet-stream', rel.startsWith('vendor/') ? { 'Cache-Control': 'public, max-age=86400' } : null);
  });
}

const LOGIN_HTML = (msg) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>앤도버 생활기록 · 로그인</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F4F6F5;font:15px system-ui,sans-serif;color:#1d2a24}
form{background:#fff;padding:28px 24px;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.08);width:min(320px,calc(100vw - 32px));box-sizing:border-box}
h1{font-size:18px;margin:0 0 16px}input,button{width:100%;box-sizing:border-box;font:inherit;padding:11px 12px;border-radius:9px}
input{border:1px solid #c9d3ce;margin-bottom:10px}button{border:0;background:#1F6B4F;color:#fff;font-weight:600;cursor:pointer}
p{color:#C23A3A;font-size:13px;margin:0 0 10px}</style></head><body>
<form method="post" action="/login"><h1>앤도버 생활기록</h1>${msg ? '<p>' + msg + '</p>' : ''}
<input type="password" name="password" placeholder="비밀번호" autofocus required><button>들어가기</button></form></body></html>`;

const API = {
  api_ping: () => ({ last: store.last, me: '' }),
  api_pull: (args) => apiPull(args[0]),
  api_write: (args, req) => apiWrite(args[0], whoIs(req)),
};

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  if (p === '/login') {
    if (req.method === 'POST') {
      const form = new URLSearchParams(await readBody(req));
      if (config.password && safeEqual(form.get('password') || '', config.password)) {
        setSessionCookie(res);
        res.writeHead(303, { Location: '/' }); return res.end();
      }
      return send(res, 401, LOGIN_HTML('비밀번호가 맞지 않아요.'), MIME['.html']);
    }
    return send(res, 200, LOGIN_HTML(''), MIME['.html']);
  }

  if (!isAuthed(req)) {
    if (p.startsWith('/api/') || p.startsWith('/admin/')) return sendJson(res, 401, { error: '로그인이 필요해요' });
    res.writeHead(303, { Location: '/login' }); return res.end();
  }

  // 앱 → 서버 (google.script.run 대신)
  if (p.startsWith('/api/') && req.method === 'POST') {
    const fn = API[p.slice(5)];
    if (!fn) return sendJson(res, 404, { error: '없는 기능이에요' });
    try {
      const args = JSON.parse((await readBody(req)) || '[]');
      return sendJson(res, 200, { result: fn(Array.isArray(args) ? args : [], req) });
    } catch (e) {
      return sendJson(res, 400, { error: e.message || String(e) });
    }
  }

  if (p === '/' || p === '/index.html') return send(res, 200, appHtml(), MIME['.html']);
  if (p === '/admin') return serveStatic(res, 'admin.html');

  // 관리 기능: 상태 · 가져오기 · 백업 · 복원 · 비밀번호
  if (p === '/admin/status') {
    return sendJson(res, 200, { counts: countDocs(store.docs), last: store.last, dataDir: DATA_DIR, backups: listBackups(), hasPassword: !!config.password });
  }
  if (p === '/admin/export') {
    const name = 'andover-data-' + stampStr(new Date()) + '.json';
    return send(res, 200, JSON.stringify(store), MIME['.json'], { 'Content-Disposition': 'attachment; filename="' + name + '"' });
  }
  if (p === '/admin/backup-file') {
    const name = url.searchParams.get('name') || '';
    if (!/^[\w.-]+\.json$/.test(name)) return send(res, 400, 'bad name');
    const file = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(file)) return send(res, 404, 'Not found');
    return send(res, 200, fs.readFileSync(file), MIME['.json'], { 'Content-Disposition': 'attachment; filename="' + name + '"' });
  }
  if (req.method === 'POST' && p === '/admin/update') {
    try {
      const r = applyUpdate(await readRaw(req));
      console.log('[업데이트] 프로그램 파일 ' + r.updated + '개를 바꿨어요. 이 창을 닫고 다시 실행해 주세요.');
      return sendJson(res, 200, r);
    } catch (e) {
      return sendJson(res, 400, { error: e.message || String(e) });
    }
  }
  if (req.method === 'POST' && p.startsWith('/admin/')) {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const by = whoIs(req);
      if (p === '/admin/backup') return sendJson(res, 200, { name: backupNow('manual-' + stampStr(new Date()) + '.json') });

      if (p === '/admin/import-rows') {
        // 구글 시트 'data' 시트의 행들: [key, updatedAt, by, deleted, 내용1, 내용2, ...]
        const docs = {};
        for (const row of body.rows || []) {
          const key = String(row[0] == null ? '' : row[0]).trim();
          const pi = key.indexOf('|');
          if (pi <= 0 || key.startsWith('key')) continue;
          const del = row[3] === true || String(row[3]).toUpperCase() === 'TRUE';
          const json = row.slice(4).map(v => (v == null ? '' : String(v))).join('');
          if (!del) JSON.parse(json);          // 깨진 기록이 있으면 가져오기 전에 멈춰요
          docs[key] = { by: String(row[2] || ''), del: del, json: json };
        }
        if (!Object.keys(docs).length) throw new Error('가져올 기록을 찾지 못했어요. 구글 시트의 data 시트가 맞는지 확인해 주세요.');
        const before = backupNow('before-import-' + stampStr(new Date()) + '.json');
        replaceAll(docs, by);
        return sendJson(res, 200, { counts: countDocs(store.docs), backup: before });
      }

      if (p === '/admin/merge-history') {
        // 지난 단어시험 · Voca King 성적을 더해요. 지우거나 덮어쓰지 않아요 (이미 있는 학생 점수는 그대로).
        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (!rows.length) throw new Error('추가할 기록이 없어요');
        const norm = s => String(s || '').replace(/\s+/g, '').toLowerCase();
        const studs = [];
        for (const k of Object.keys(store.docs)) {
          if (!k.startsWith('students|') || store.docs[k].del) continue;
          try { studs.push(JSON.parse(store.docs[k].json)); } catch (_) { /* 깨진 기록은 건너뜀 */ }
        }
        const byName = {};
        studs.forEach(s => (byName[norm(s.name)] = byName[norm(s.name)] || []).push(s));
        const pick = r => {
          let c = byName[norm(r.name)] || [];
          if (c.length > 1) { const e = c.filter(s => norm(s.ename) === norm(r.ename)); if (e.length) c = e; }
          if (c.length > 1) { const a = c.filter(s => s.status !== 'left'); if (a.length) c = a; }
          return c.length === 1 ? c[0] : (c.length > 1 ? 'many' : null);
        };
        // 그 날짜에 있던 반 (반 이동 이력이 있으면 따라감)
        const classAt = (s, d) => {
          const mv = (s.hist || []).filter(h => h.t === 'class' && h.to && h.d).sort((a, b) => (a.d < b.d ? -1 : 1));
          const next = mv.find(h => h.d > d);
          return (next && next.from) || s.classId;
        };
        const groups = new Map(), unmatched = {}, many = {};
        let bad = 0;
        for (const r of rows) {
          if (!r || !/^(word|king)$/.test(r.kind) || !/^\d{4}-\d\d-\d\d$/.test(r.date) || typeof r.v !== 'number') { bad++; continue; }
          const s = pick(r), label = String(r.name || '') + (r.ename ? ' (' + r.ename + ')' : '');
          if (s === 'many') { many[label] = (many[label] || 0) + 1; continue; }
          const cid = s && classAt(s, r.date);
          if (!s || !cid) { unmatched[label] = (unmatched[label] || 0) + 1; continue; }
          const id = cid + '_' + r.date + '_' + r.kind;
          let g = groups.get(id);
          if (!g) groups.set(id, g = { classId: cid, date: r.date, kind: r.kind, max: {}, range: new Set(), scores: {} });
          g.scores[s.id] = r.v;
          if (r.max) g.max[r.max] = (g.max[r.max] || 0) + 1;
          if (r.range) g.range.add(String(r.range).slice(0, 40));
        }
        const before = backupNow('before-history-' + stampStr(new Date()) + '.json');
        let t = nextTime(), made = 0, added = 0, kept = 0;
        for (const [id, g] of groups) {
          const key = 'tests|' + id, d0 = store.docs[key];
          let doc = null;
          if (d0 && !d0.del) { try { doc = JSON.parse(d0.json); } catch (_) { doc = null; } }
          const mx = +((Object.entries(g.max).sort((a, b) => b[1] - a[1])[0] || [0])[0]) || 0;
          if (!doc) { doc = { classId: g.classId, date: g.date, kind: g.kind, list: '', range: [...g.range].join(', ').slice(0, 100), max: mx, scores: {}, src: 'history' }; made++; }
          doc.scores = doc.scores || {};
          let ch = false;
          for (const [sid, v] of Object.entries(g.scores)) {
            if (doc.scores[sid] !== undefined) { kept++; continue; }
            doc.scores[sid] = v; added++; ch = true;
          }
          if (!ch && d0 && !d0.del) continue;
          if (!doc.max && mx) doc.max = mx;
          doc.savedAt = new Date().toISOString();
          store.docs[key] = { t: t++, by: by, del: false, json: JSON.stringify(doc) };
        }
        store.last = Math.max(store.last, t - 1);
        saveStore();
        const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([n, c]) => n + ' ' + c + '건');
        return sendJson(res, 200, { made, added, kept, bad, unmatched: top(unmatched), many: top(many), backup: before });
      }

      if (p === '/admin/restore') {
        let src;
        if (body.name) {
          if (!/^[\w.-]+\.json$/.test(body.name)) throw new Error('잘못된 파일 이름');
          src = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, body.name), 'utf8'));
        } else src = body.store;
        if (!src || typeof src.docs !== 'object') throw new Error('백업 파일 형식이 아니에요');
        const before = backupNow('before-restore-' + stampStr(new Date()) + '.json');
        const live = {};
        for (const k of Object.keys(src.docs)) if (!src.docs[k].del) live[k] = src.docs[k];
        replaceAll(live, by);
        return sendJson(res, 200, { counts: countDocs(store.docs), backup: before });
      }

      if (p === '/admin/password') {
        config.password = String(body.password || '');
        writeJsonAtomic(CONFIG_FILE, config);
        if (config.password) setSessionCookie(res);
        return sendJson(res, 200, { ok: true, hasPassword: !!config.password });
      }
    } catch (e) {
      return sendJson(res, 400, { error: e.message || String(e) });
    }
    return sendJson(res, 404, { error: '없는 기능이에요' });
  }

  if (req.method === 'GET' && (p === '/standalone.js' || p.startsWith('/vendor/'))) return serveStatic(res, p.slice(1));
  if (p === '/favicon.ico') return send(res, 204, '');
  return send(res, 404, 'Not found');
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(e => { console.error(e); try { send(res, 500, '서버 오류: ' + e.message); } catch (_) { /* 이미 응답함 */ } });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('\n[오류] ' + PORT + '번 포트를 이미 쓰고 있어요. 프로그램이 이미 켜져 있는지 확인하거나,');
    console.error('       data/config.json 의 "port" 값을 바꿔 주세요.\n');
  } else console.error(e);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const lan = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) lan.push('http://' + a.address + ':' + PORT);
  }
  const local = 'http://localhost:' + PORT;
  console.log('');
  console.log('  ✅ 앤도버 생활기록이 켜졌어요');
  console.log('');
  console.log('  이 PC에서:        ' + local);
  lan.forEach(u => console.log('  다른 PC·휴대폰:   ' + u + '   (같은 와이파이/공유기에서)'));
  console.log('  관리(가져오기·백업): ' + local + '/admin');
  console.log('  데이터 폴더:       ' + DATA_DIR);
  if (!config.password) console.log('\n  ⚠️  비밀번호가 없어요. 같은 와이파이의 누구나 들어올 수 있으니 /admin 에서 설정해 주세요.');
  console.log('\n  이 창을 닫으면 프로그램이 꺼져요.\n');
  if (!process.env.NO_BROWSER) {
    const cmd = process.platform === 'win32' ? 'start "" "' + local + '"' : process.platform === 'darwin' ? 'open "' + local + '"' : 'xdg-open "' + local + '"';
    exec(cmd, () => { /* 브라우저를 못 열어도 괜찮아요 */ });
  }
});
