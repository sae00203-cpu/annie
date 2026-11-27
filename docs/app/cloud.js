/* 앤도버 생활기록 · Firebase 연결층
 * 앱 화면(andover-app.html)은 google.script.run 으로 저장소를 불러요.
 * 이 파일이 같은 모양의 google.script.run 을 만들어, 학원 컴퓨터 서버 대신 Firebase(Firestore)에 저장해요.
 *  - 로그인: 선생님 = 아이디 + 개인 번호 / 관리자(Annie) = 구글 계정
 *  - 데이터: Firestore 'docs' 모음 하나에 (종류|아이디) 문서로 저장 (학원 컴퓨터 버전과 같은 모양)
 *  - 읽기 줄이기: 기기에 캐시를 두고, 바뀐 문서만 받아와요 (무료 요금제 한도 안에서)
 */
(function () {
  var CFG = window.ANDOVER_FB || null;
  var TEACHER_DOMAIN = 'andover-record.invalid';   // 선생님 아이디를 Firebase 로그인 주소로 바꿀 때 쓰는 가짜 도메인 (메일은 안 가요)
  var EMU = /[?&]emu=1/.test(location.search) || (CFG && CFG.useEmulator);

  /* ---------- 화면: 로그인 · 안내 ---------- */
  var css = '#cg{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#f4f6fb;font:15px/1.5 "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;color:#182033;padding:16px}'
    + '#cg .bx{background:#fff;border:1px solid #dfe4ef;border-radius:16px;padding:26px 24px;width:min(380px,100%);box-shadow:0 8px 30px rgba(16,24,40,.08);display:grid;gap:12px}'
    + '#cg h1{margin:0;font-size:21px}#cg p{margin:0;color:#5b6478;font-size:14px}#cg label{display:grid;gap:4px;font-size:13.5px;font-weight:600}'
    + '#cg input{font:inherit;padding:11px 12px;border:1px solid #cfd6e4;border-radius:10px}#cg button{font:inherit;font-weight:700;padding:11px 12px;border-radius:10px;border:0;cursor:pointer}'
    + '#cg .pri{background:#24418a;color:#fff}#cg .gh{background:#fff;color:#24418a;border:1px solid #24418a}#cg .err{color:#b4232a;font-size:13.5px;min-height:1em}#cg .sep{text-align:center;color:#8a93a6;font-size:12.5px}'
    + '@media (prefers-color-scheme:dark){#cg{background:#10141f;color:#e8ecf5}#cg .bx{background:#182032;border-color:#2b3550}#cg input{background:#10141f;color:#e8ecf5;border-color:#2b3550}#cg .gh{background:transparent;color:#8fa9f0;border-color:#8fa9f0}#cg .pri{background:#8fa9f0;color:#10141f}}';
  function gate(html) {
    var g = document.getElementById('cg');
    if (!g) { var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); g = document.createElement('div'); g.id = 'cg'; (document.body || document.documentElement).appendChild(g); }
    g.innerHTML = '<div class="bx">' + html + '</div>'; g.hidden = false; return g;
  }
  function ungate() { var g = document.getElementById('cg'); if (g) g.remove(); }
  var pending = null;
  function whenBody(f) { pending = f; if (document.body) run(); }
  function run() { if (pending && document.body) { var f = pending; pending = null; f(); } }
  document.addEventListener('DOMContentLoaded', run);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  if (!CFG || !CFG.apiKey || !window.firebase) {
    whenBody(function () { gate('<h1>앤도버 생활기록</h1><p>Firebase 설정이 아직 없어요. 안내서의 “설정값 넣기”를 먼저 해 주세요.</p>'); });
    window.google = { script: { run: new Proxy({}, { get: function () { return function () { return this; }; } }) } };
    return;
  }

  firebase.initializeApp(CFG);
  var auth = firebase.auth(), db = firebase.firestore();
  if (EMU) { auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); db.useEmulator('127.0.0.1', 8085); }
  try { db.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (_) {}
  var DOCS = db.collection('docs');

  /* ---------- 기기 안 기록 (앱이 pull 로 가져가요) ---------- */
  var mem = new Map(), seq = 0, maxT = null, me = { uid: '', name: '', role: '' }, unsub = null;
  function keyOf(c, id) { return c + '|' + id; }
  function docId(c, id) { return encodeURIComponent(keyOf(c, id)).replace(/\./g, '%2E'); }
  function absorb(d) {
    var x = d.data(); if (!x || typeof x.c !== 'string') return;
    seq++; mem.set(keyOf(x.c, x.id), { c: x.c, id: String(x.id), json: x.json || '', del: !!x.del, by: x.by || '', s: seq });
    if (x.t && (!maxT || x.t.toMillis() > maxT.toMillis())) maxT = x.t;
  }

  /* ---------- 준비: 로그인 → 권한 확인 → 기록 불러오기 ---------- */
  var flash = '';
  var readyRes, ready = new Promise(function (r) { readyRes = r; });
  function startSync() {
    return DOCS.get({ source: 'cache' }).then(function (q) { q.forEach(absorb); }, function () {}).then(function () {
      var q = maxT ? DOCS.where('t', '>', maxT).orderBy('t') : DOCS;
      return new Promise(function (res) {
        var first = true;
        unsub = q.onSnapshot({ includeMetadataChanges: false }, function (snap) {
          snap.docChanges().forEach(function (ch) { if (ch.type !== 'removed') absorb(ch.doc); });
          if (first) { first = false; res(); }
        }, function (err) { console.error(err); if (first) { first = false; res(); } });
      });
    });
  }
  function loadMe(u) {
    return db.collection('meta').doc('admin').get().then(function (a) {
      if (a.exists && a.data().uid === u.uid) return { uid: u.uid, name: a.data().name || 'Annie', role: 'admin' };
      return db.collection('staff').doc(u.uid).get().then(function (s) {
        if (s.exists && s.data().active) return { uid: u.uid, name: s.data().name, role: 'teacher' };
        if (!a.exists && u.providerData.some(function (p) { return p.providerId === 'google.com'; })) return { uid: u.uid, name: '', role: 'claim' };
        return null;
      });
    });
  }
  function showLogin(msg) {
    var g = gate('<h1>앤도버 생활기록</h1><p>선생님은 아이디와 개인 번호로 로그인해요.</p>'
      + '<label>아이디<input id="cgId" autocomplete="username" autocapitalize="off"></label><label>개인 번호<input id="cgPw" type="password" inputmode="numeric" autocomplete="current-password"></label>'
      + '<button class="pri" id="cgGo">로그인</button><div class="err" id="cgErr">' + esc(msg || '') + '</div><div class="sep">관리자</div><button class="gh" id="cgG">Google 계정으로 로그인</button>');
    var go = function () {
      var id = (document.getElementById('cgId').value || '').trim().toLowerCase(), pw = document.getElementById('cgPw').value || '';
      if (!id || !pw) { document.getElementById('cgErr').textContent = '아이디와 개인 번호를 넣어 주세요'; return; }
      auth.signInWithEmailAndPassword(id + '@' + TEACHER_DOMAIN, pw).catch(function (e) {
        document.getElementById('cgErr').textContent = /too-many/.test(e.code) ? '여러 번 틀려서 잠시 막혔어요. 조금 뒤에 다시 해 주세요.' : '아이디나 개인 번호가 맞지 않아요';
      });
    };
    g.querySelector('#cgGo').onclick = go; g.querySelector('#cgPw').onkeydown = function (e) { if (e.key === 'Enter') go(); };
    g.querySelector('#cgG').onclick = function () { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(function (e) { document.getElementById('cgErr').textContent = '구글 로그인이 안 됐어요 (' + e.code + ')'; }); };
  }
  function showClaim(u) {
    var g = gate('<h1>관리자 등록</h1><p>' + esc(u.email) + ' 계정을 이 학원의 관리자로 등록할까요? 한 번만 할 수 있어요.</p><label>관리자 이름<input id="cgNm" value="Annie"></label><button class="pri" id="cgOk">관리자로 등록</button><button class="gh" id="cgNo">다른 계정으로</button><div class="err" id="cgErr"></div>');
    g.querySelector('#cgOk').onclick = function () {
      db.collection('meta').doc('admin').set({ uid: u.uid, email: u.email || '', name: (document.getElementById('cgNm').value || 'Annie').trim() }).then(function () { location.reload(); },
        function (e) { document.getElementById('cgErr').textContent = '등록할 수 없어요 (' + e.code + '). 안내서의 보안 규칙에 내 이메일을 넣었는지 확인해 주세요.'; });
    };
    g.querySelector('#cgNo').onclick = function () { auth.signOut(); };
  }
  whenBody(function () { gate('<h1>앤도버 생활기록</h1><p>불러오는 중…</p>'); });
  auth.onAuthStateChanged(function (u) {
    if (!u) { if (unsub) { unsub(); unsub = null; } var fm = flash; flash = ''; whenBody(function () { showLogin(fm); }); return; }
    loadMe(u).then(function (m) {
      if (!m) { flash = '사용할 수 없는 계정이에요. Annie께 확인해 주세요.'; auth.signOut(); return; }
      if (m.role === 'claim') { whenBody(function () { showClaim(u); }); return; }
      me = m; try { localStorage.setItem('me', m.name); } catch (_) {}
      whenBody(function () { gate('<h1>앤도버 생활기록</h1><p>' + esc(m.name) + ' 선생님, 기록을 불러오는 중…</p>'); });
      startSync().then(function () { ungate(); readyRes(); });
    }, function (e) { console.error(e); whenBody(function () { showLogin('연결이 안 돼요. 인터넷을 확인해 주세요.'); }); });
  });

  /* ---------- 앱이 부르는 기능 (학원 컴퓨터 서버와 같은 모양) ---------- */
  var API = {
    api_ping: function () { return { last: seq, me: me.name }; },
    api_pull: function (since) {
      since = Number(since) || 0; var out = [];
      mem.forEach(function (d) { if (d.s > since) out.push({ c: d.c, id: d.id, t: d.s, by: d.by, del: d.del, json: d.del ? '' : d.json }); });
      out.sort(function (a, b) { return a.t - b.t; });
      return { last: seq, changes: out };
    },
    api_write: function (ops) {
      if (!Array.isArray(ops)) throw new Error('잘못된 요청이에요');
      var dd = new Map();
      ops.forEach(function (op) { if (!op || typeof op.c !== 'string' || !op.c || op.c.indexOf('|') >= 0 || op.id == null) throw new Error('잘못된 기록이에요'); dd.set(keyOf(op.c, op.id), op); });
      var list = Array.from(dd.values()), ps = [];
      for (var i = 0; i < list.length; i += 400) {
        var b = db.batch();
        list.slice(i, i + 400).forEach(function (op) {
          var del = op.json === null || op.json === undefined, js = del ? '' : String(op.json);
          b.set(DOCS.doc(docId(op.c, op.id)), { c: op.c, id: String(op.id), json: js, del: del, by: me.name, t: firebase.firestore.FieldValue.serverTimestamp() });
          seq++; mem.set(keyOf(op.c, op.id), { c: op.c, id: String(op.id), json: js, del: del, by: me.name, s: seq });
        });
        ps.push(b.commit());
      }
      return Promise.all(ps).then(function () { return { last: seq }; });
    },
  };
  function runner(ok, fail) {
    return new Proxy({}, {
      get: function (_, name) {
        if (name === 'withSuccessHandler') return function (f) { return runner(f, fail); };
        if (name === 'withFailureHandler') return function (f) { return runner(ok, f); };
        if (typeof name !== 'string') return undefined;
        return function () {
          var args = arguments;
          ready.then(function () { var fn = API[name]; if (!fn) throw new Error('없는 기능이에요: ' + name); return fn.apply(null, args); })
            .then(function (r) { if (ok) ok(r); }, function (e) { if (fail) fail(e); else console.error(e); });
        };
      },
    });
  }
  window.google = window.google || {};
  window.google.script = { run: runner(null, null) };

  /* ---------- 관리자 기능 (설정 → 선생님 계정 · 데이터) ---------- */
  var second = null;
  function secondAuth() {
    if (!second) { second = firebase.initializeApp(CFG, 'staff-maker').auth(); if (EMU) second.useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); }
    return second;
  }
  window.ANDOVER_CLOUD = {
    me: function () { return me; },
    isAdmin: function () { return me.role === 'admin'; },
    signOut: function () { try { localStorage.removeItem('me'); } catch (_) {} return auth.signOut().then(function () { location.reload(); }); },
    staffList: function () { return db.collection('staff').get().then(function (q) { var o = []; q.forEach(function (d) { o.push(Object.assign({ uid: d.id }, d.data())); }); return o.sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'ko'); }); }); },
    addTeacher: function (name, id, pin) {
      id = String(id || '').trim().toLowerCase();
      if (!/^[a-z0-9._-]{2,30}$/.test(id)) return Promise.reject(new Error('아이디는 영어 소문자 · 숫자로 2~30자로 지어 주세요'));
      if (String(pin || '').length < 6) return Promise.reject(new Error('개인 번호는 6자리 이상이어야 해요'));
      var A = secondAuth();
      return A.createUserWithEmailAndPassword(id + '@' + TEACHER_DOMAIN, String(pin)).then(function (cr) {
        var uid = cr.user.uid; return A.signOut().then(function () { return db.collection('staff').doc(uid).set({ name: String(name).trim(), loginId: id, role: 'teacher', active: true, created: firebase.firestore.FieldValue.serverTimestamp() }); });
      }, function (e) { throw new Error(/email-already-in-use/.test(e.code) ? '이미 있는 아이디예요. 다른 아이디를 써 주세요 (예: ' + id + '2)' : '만들 수 없어요 (' + e.code + ')'); });
    },
    setActive: function (uid, on) { return db.collection('staff').doc(uid).update({ active: !!on }); },
    rename: function (uid, name) { return db.collection('staff').doc(uid).update({ name: String(name).trim() }); },
    changeMyPin: function (pin) { if (String(pin).length < 6) return Promise.reject(new Error('6자리 이상이어야 해요')); return auth.currentUser.updatePassword(String(pin)); },
    /* 학원 컴퓨터 data/store.json 또는 백업 파일 → Firestore (있는 기록은 덮어써요) */
    importStore: function (store, onProg) {
      var keys = Object.keys((store && store.docs) || {}).filter(function (k) { return k.indexOf('|') > 0 && k.indexOf('zztest|') !== 0; }), done = 0, chunks = [];
      for (var i = 0; i < keys.length; i += 400) chunks.push(keys.slice(i, i + 400));
      return chunks.reduce(function (p, ks) {
        return p.then(function () {
          var b = db.batch();
          ks.forEach(function (k) { var d = store.docs[k], c = k.slice(0, k.indexOf('|')), id = k.slice(k.indexOf('|') + 1); b.set(DOCS.doc(docId(c, id)), { c: c, id: id, json: d.del ? '' : String(d.json || ''), del: !!d.del, by: d.by || '', t: firebase.firestore.FieldValue.serverTimestamp() }); });
          return b.commit().then(function () { done += ks.length; if (onProg) onProg(done, keys.length); });
        });
      }, Promise.resolve()).then(function () { return keys.length; });
    },
    /* 백업 파일 (학원 컴퓨터 버전 store.json 과 같은 모양) */
    exportStore: function () {
      var docs = {}; mem.forEach(function (d) { docs[keyOf(d.c, d.id)] = { t: d.s, del: d.del, by: d.by, json: d.json }; });
      return { version: 1, made: new Date().toISOString(), last: seq, docs: docs };
    },
    count: function () { var n = 0; mem.forEach(function (d) { if (!d.del) n++; }); return n; },
  };
})();
