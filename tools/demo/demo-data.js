/* ===== 체험용 예시 데이터: 3년 다닌 가상의 학생 "한서윤 (Grace)" =====
 * 실제 학생 정보가 아니에요. 페이지를 여는 날짜를 기준으로 3년 치 기록을 만들어요.
 * 서버 대신 이 페이지 안에서만 저장되고, 새로고침하면 처음 상태로 돌아가요.
 */
(function () {
  var rnd = (function (seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; })(20231106);
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var addD = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };
  var addM = function (d, n) { var x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  var now = new Date(); now.setHours(0, 0, 0, 0);
  var start = addM(now, -36); while (start.getDay() !== 1) start = addD(start, -1);   // 3년 전 그 주 월요일
  var SID = 'sdemo1';
  var docs = {};
  var put = function (c, id, o) { docs[c + '|' + id] = o; };

  // 반: 앤도버 레벨 체계대로 G3(파닉스 9개월) → A1a-1 … A2b-2 (3개월씩) → A3a-1 (지금 반)
  var LV = [
    ['G3', 9, ['Phonics Show 3', 'I Can Speak English 2']],
    ['A1a-1', 3, ['Wonderskills Basic 1', 'Voca Point 1']],
    ['A1a-2', 3, ['Wonderskills Basic 2', 'Voca Point 1']],
    ['A1b-1', 3, ['Wonderskills Basic 3', 'Grammar Start 1']],
    ['A1b-2', 3, ['All New Very Easy True Stories', 'Grammar Start 2']],
    ['A2a-1', 3, ['Wonder Skills Intermediate 1', 'Voca Point 2']],
    ['A2a-2', 3, ['Wonder Skills Intermediate 2', 'Grammar Point 1']],
    ['A2b-1', 3, ['True Stories 1A', 'Grammar Point 2']],
    ['A2b-2', 3, ['True Stories 1B', 'Hamburger Paragraph']],
    ['A3a-1', 0, ['Trophy 9 Our World 4A', 'My Next Grammar 1']],
  ];
  var TEACH = ['Kate T.', 'Ben T.', 'Lucy T.'];
  var C = [], at = new Date(start);
  LV.forEach(function (l, i) {
    var last = i === LV.length - 1, to = last ? addD(now, 15) : addM(at, l[1]);
    var cur = last;
    C.push({ id: 'cdemo' + i, name: l[0], teacher: TEACH[i % 3], dow: cur ? [1, 2, 3, 4, 5] : (i % 2 ? [2, 4] : [1, 3, 5]), time: '4:35', from: at, to: to, books: l[2], voca: 'Voca Point ' + (1 + Math.floor(i / 3)), cur: cur });
    at = to;
  });
  var CUR = C[C.length - 1];
  C.forEach(function (c) {
    // 지난 반은 없는 요일(7)로 두어 '오늘 수업'에는 지금 반만 보이게 해요 (예시 화면용)
    put('classes', c.id, { id: c.id, name: c.name, teacher: c.teacher, dow: c.cur ? c.dow : [7], time: c.time, spcLv: c.cur ? 'Green' : undefined, sites: c.cur ? ['Trophy 9'] : undefined, siteMode: c.cur ? { 'Trophy 9': 'every' } : undefined, key: c.name + '||' + c.time });
  });

  // 학생: 한서윤 + 지금 반 친구 5명 (모두 가상)
  var hist = [];
  for (var hi = 1; hi < C.length; hi++) hist.push({ id: 'hd' + hi, d: ymd(C[hi].from), t: 'class', v: C[hi - 1].name + ' → ' + C[hi].name, from: C[hi - 1].id, to: C[hi].id });
  var me = { id: SID, name: '한서윤', ename: 'Grace', sg: '예시초 6', classId: CUR.id, order: 0, status: 'active', coaching: true,
    enrolledAt: ymd(start), createdAt: start.toISOString(),
    hist: hist,
    awards: [
      { id: 'wd1', d: ymd(addM(start, 19)), n: '교내 영어 말하기 대회', r: '은상' },
      { id: 'wd2', d: ymd(addM(start, 31)), n: '전국 학생 영어 말하기 대회', r: '금상' },
    ] };
  put('students', SID, me);
  var mates = [['김하준', 'Ethan', '예시초 6'], ['이수아', 'Sua', '예시초 5'], ['박지호', 'Jiho', '예시초 6'], ['최유나', 'Yuna', '예시초 5'], ['정민재', 'Minjae', '예시초 6']]
    .map(function (m, i) { var o = { id: 'sdemo' + (i + 2), name: m[0], ename: m[1], sg: m[2], classId: CUR.id, order: i + 1, status: 'active', enrolledAt: '' }; put('students', o.id, o); return o; });

  // 방학 (매년 여름 1주, 겨울 연말연시)
  var closures = [];
  for (var y = start.getFullYear(); y <= now.getFullYear() + 1; y++) {
    closures.push({ id: 'cl' + y + 's', from: y + '-07-29', to: y + '-08-02', name: 'Summer Vacation', cids: [] });
    closures.push({ id: 'cl' + y + 'w', from: y + '-12-30', to: (y + 1) + '-01-03', name: 'Winter Vacation', cids: [] });
  }
  var closed = function (d) { var s = ymd(d); return closures.some(function (c) { return s >= c.from && s <= c.to; }); };
  put('settings', 'main', { closures: closures, makeups: [], hOff: {}, mStart: 1, ivItems: ['점수'], xl1: true, reThr: 70,
    wtTypes: [{ id: 'wbk', n: '교재 단어', lv: '' }, { id: 'wdc', n: 'Dictation', lv: 'A3, A4, F' }],
    etypes: [{ id: 'j34', name: 'JET 3/4', items: ['Listening', 'Reading', 'LFM'] }, { id: 'j56', name: 'JET 5/6', items: ['Listening', 'Reading', 'LFM'] },
      { id: 'tp2', name: 'TOEFL Primary Step 2', items: ['Listening', 'Reading', 'LFM'] }, { id: 'tjb', name: 'TOEFL Junior Basic', items: ['Listening', 'Reading', 'LFM'] }],
    rbItems: ['Listening', 'Reading', 'Writing', 'Speaking'], rbMax: 5, spcCert: { max: 72, every: 6, levels: ['Red', 'Orange', 'Yellow', 'Green', 'Lime', 'Mint', 'Sky Blue', 'Blue', 'Indigo', 'Purple', 'Black'] } });

  // 수업 기록 · 수업계획 · 단어시험 (오늘 이전까지)
  var span = now - start;
  var REASON_A = ['감기', '가족 행사', '병원 진료', '학교 행사'], REASON_L = ['학교 늦게 끝남', '차량 지연'];
  C.forEach(function (c, ci) {
    var unit = 1, day = 0, lastWeek = -1, roster = c.cur ? [me].concat(mates) : [me];
    for (var d = new Date(c.from); d < c.to; d = addD(d, 1)) {
      if (c.dow.indexOf(d.getDay()) < 0 || closed(d)) continue;
      var ds = ymd(d), t = Math.min(1, (d - start) / span);   // 0 → 1: 3년 동안 조금씩 좋아져요
      day++; if (day % c.dow.length === 1 || c.dow.length === 1) unit++;
      var plan = { classId: c.id, date: ds, src: 'demo',
        blocks: [{ book: c.books[0], lesson: 'Unit ' + unit + ' Day ' + (((day - 1) % c.dow.length) + 1), hw: 'Metabook\n(숙제일 기록 꼭 적기)' },
                 { book: c.books[1], lesson: 'Lesson ' + Math.ceil(unit / 2), hw: 'Practice ' + Math.ceil(unit / 2) }],
        voca: c.voca + ' - Day ' + day, spc: 'Day ' + (((day - 1) % 72) + 1) + ((day % 6 === 0) ? ' Video 찍기' : ''), online: '', notice: '' };
      put('plans', c.id + '_' + ds, plan);
      if (d >= now) continue;   // 오늘부터는 수업계획만 (출결은 직접 입력해 보세요)
      var rec = { classId: c.id, date: ds, att: {}, book: {}, hw: {}, note: {}, savedAt: d.toISOString() };
      roster.forEach(function (s) {
        var mine = s.id === SID, r = rnd();
        var pA = mine ? 0.03 - 0.02 * t : 0.03, pL = mine ? 0.06 - 0.04 * t : 0.05;
        if (r < pA) { rec.att[s.id] = 'absent'; rec.note[s.id] = { a: REASON_A[Math.floor(rnd() * 4)] }; return; }
        if (r < pA + pL) { rec.att[s.id] = 'late'; rec.note[s.id] = { a: REASON_L[Math.floor(rnd() * 2)] }; }
        if (rnd() < (mine ? 0.06 - 0.05 * t : 0.04)) rec.book[s.id] = 'no';
        var hwOk = mine ? 0.74 + 0.22 * t : 0.85, h = rnd();
        if (h > hwOk) rec.hw[s.id] = h > hwOk + (1 - hwOk) * 0.7 ? 'none' : 'partial';
      });
      put('daily', c.id + '_' + ds, rec);
      var wk = Math.floor((d - start) / 6048e5);
      if (wk !== lastWeek) {   // 매주 첫 수업에 단어시험
        lastWeek = wk;
        var sc = {};
        roster.forEach(function (s) {
          if (rec.att[s.id] === 'absent') return;
          var base = s.id === SID ? 0.6 + 0.32 * t : 0.72 + 0.25 * rnd();
          sc[s.id] = Math.round(clamp(base + (rnd() - 0.5) * 0.16, 0.3, 1) * 20);
        });
        var re = {};
        Object.keys(sc).forEach(function (k) { if (sc[k] / 20 < 0.7) re[k] = Math.min(20, sc[k] + 4 + Math.floor(rnd() * 5)); });
        put('tests', c.id + '_' + ds + '_word-wbk', { classId: c.id, date: ds, kind: 'word', wt: 'wbk', list: c.voca, range: 'Day ' + Math.max(1, day - 3) + '-' + day, max: 20, scores: sc, re: re, savedAt: d.toISOString() });
        if (/^(A3|A4|F)/.test(c.name) && now - d < 200 * 864e5) {   // 최근 반: Dictation 도 같은 날
          var dc = {};
          Object.keys(sc).forEach(function (k) { dc[k] = Math.round(clamp(sc[k] / 20 + (rnd() - 0.55) * 0.3, 0.3, 1) * 10); });
          put('tests', c.id + '_' + ds + '_word-wdc', { classId: c.id, date: ds, kind: 'word', wt: 'wdc', list: '', range: 'Unit ' + (1 + wk % 12), max: 10, scores: dc, savedAt: d.toISOString() });
        }
      }
    }
  });

  // 정기평가 (6개월마다)
  for (var k = 1; k <= 6; k++) {
    var rd = addM(start, 6 * k - 1); rd.setDate(20); if (rd >= now) break;
    var rid = 'rdemo' + k, tp = k <= 2 ? 'j34' : k <= 4 ? 'j56' : 'tp2', tt = (rd - start) / span;
    put('rounds', rid, { id: rid, name: rd.getFullYear() + '년 ' + (rd.getMonth() + 1) + '월 정기평가', date: ymd(rd), types: [tp] });
    var L = Math.round(62 + 30 * tt + (rnd() - 0.5) * 6), R = Math.round(58 + 34 * tt + (rnd() - 0.5) * 6), F = Math.round(55 + 35 * tt + (rnd() - 0.5) * 6);
    var ex = {}; ex[tp] = { sc: { Listening: clamp(L, 0, 100), Reading: clamp(R, 0, 100), LFM: clamp(F, 0, 100) }, lv: 'Level ' + (2 + k) };
    put('exam', rid + '_' + SID, { rid: rid, sid: SID, classId: (C.filter(function (c) { return c.from <= rd; }).pop() || C[0]).id, exams: ex,
      iv: { sc: { '점수': clamp(Math.round(60 + 35 * tt), 0, 100) }, lv: '', cm: '' }, comment: '', savedAt: rd.toISOString() });
  }

  // 영상 숙제 (지금 반 · 최근 2주): 밴드에 올림 확인 · 피드백 예시
  (function () {
    var days = [], d = addD(now, -1);
    while (days.length < 4) { if (d.getDay() >= 1 && d.getDay() <= 5 && !closed(d)) days.push(new Date(d)); d = addD(d, -3); }
    var roster = [me].concat(mates);
    days.reverse().forEach(function (dd, i) {
      var ds = ymd(dd), aid = 'vdemo' + i;
      put('vassign', aid, { id: aid, classId: CUR.id, title: 'Our World 4A Unit ' + (5 + i) + ' Day 3 Video', date: ds });
      roster.forEach(function (s, j) {
        var r = rnd(), recent = i === 3;
        if (!recent && r < 0.55 || recent && j < 2) {   // 피드백까지 끝남
          var sc = [3, 3, 3, 3, 3].map(function () { return 2 + Math.floor(rnd() * 3); });
          put('video', aid + '_' + s.id, { id: aid + '_' + s.id, aid: aid, sid: s.id, classId: CUR.id, date: ds, scores: sc, words: 'island, journey', comment: 'Great job! Your pronunciation is getting clearer.', teacher: CUR.teacher, total: sc.reduce(function (x, y) { return x + y; }, 0), savedAt: dd.toISOString() });
        } else if (!recent && r < 0.85 || recent && j < 4) {   // 밴드에 올림만 확인
          var ud = addD(dd, 1 + Math.floor(rnd() * 2)); if (ud > now) ud = now;
          put('vup', aid + '_' + s.id, { id: aid + '_' + s.id, aid: aid, sid: s.id, classId: CUR.id, date: ymd(ud), savedAt: ud.toISOString() });
        }
      });
    });
  })();

  // 월간 코멘트 (최근 3개월)
  var CM = [['숙제를 빠짐없이 해 오고 수업 참여도가 높아요. 단어시험 점수도 꾸준히 오르고 있어요.', 'Grace always completes her homework and participates actively. Her word test scores keep improving.'],
            ['리딩 이해력이 많이 좋아졌어요. 발표할 때 자신감이 생겼어요.', 'Her reading comprehension has improved a lot, and she speaks with more confidence.'],
            ['말하기 대회 준비를 성실히 했어요. 문법 정확도를 조금 더 연습하면 좋겠어요.', 'She prepared diligently for the speech contest. A bit more practice on grammar accuracy would help.']];
  for (var m = 0; m < 3; m++) {
    var md = addM(now, -m), ym = md.getFullYear() + '-' + pad(md.getMonth() + 1);
    put('memo', SID + '_' + ym, { sid: SID, ym: ym, text: CM[m][0], en: CM[m][1], savedAt: md.toISOString() });
  }


  /* ===== 더 많은 예시: 지금 다니는 반 8개 · 학생 약 50명 · 최근 4개월 기록 (모두 가상) ===== */
  (function () {
    var FN = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '홍', '유'];
    var GN = [['도윤', 'Dylan'], ['서진', 'Sara'], ['하준', 'Hajun'], ['지우', 'Jiwoo'], ['은우', 'Eunwoo'], ['하윤', 'Hayun'], ['시우', 'Siwoo'], ['지아', 'Jia'], ['예준', 'Yejun'], ['수아', 'Sua'],
      ['주원', 'Juwon'], ['아린', 'Arin'], ['건우', 'Gunwoo'], ['서우', 'Seowoo'], ['우진', 'Woojin'], ['채원', 'Chaewon'], ['선우', 'Sunwoo'], ['지유', 'Jiyu'], ['연우', 'Yeonwoo'], ['다은', 'Daeun'],
      ['현우', 'Hyunwoo'], ['소율', 'Soyul'], ['민준', 'Minjun'], ['예린', 'Yerin'], ['준서', 'Junseo'], ['하린', 'Harin'], ['유준', 'Yujun'], ['나은', 'Naeun'], ['재윤', 'Jaeyun'], ['윤서', 'Yunseo'],
      ['이안', 'Ian'], ['로아', 'Roa'], ['태오', 'Theo'], ['리아', 'Ria'], ['도하', 'Doha'], ['시아', 'Sia'], ['지호', 'Jiho'], ['유나', 'Yuna'], ['민재', 'Minjae'], ['가윤', 'Gayun'],
      ['서준', 'Seojun'], ['하은', 'Haeun'], ['정우', 'Jungwoo'], ['수빈', 'Subin'], ['승민', 'Seungmin'], ['예서', 'Yeseo'], ['태윤', 'Taeyun'], ['아윤', 'Ayun'], ['지환', 'Jihwan'], ['다인', 'Dain']];
    var EN = ['Chloe', 'Ethan', 'Olivia', 'Lucas', 'Emma', 'Noah', 'Mia', 'Leo', 'Ella', 'Ryan', 'Lily', 'Daniel', 'Grace', 'Jake', 'Amy', 'Ben', 'Sophie', 'Max', 'Zoe', 'Sam'];
    var K = [
      { id: 'cx1', name: 'G2', t: 'Lucy T.', dow: [6], time: '10:00', books: ['Phonics Show 2', 'I Can Speak English 1'], n: 5, gr: '초1', lv: 0.70 },
      { id: 'cx2', name: 'A1b-2 (월수금 3:30)', t: 'Lucy T.', dow: [1, 3, 5], time: '3:30', books: ['Wonderskills Basic 3', 'Grammar Start 2'], n: 7, gr: '초3', lv: 0.74, spc: 'Orange' },
      { id: 'cx3', name: 'A2a-1 (화목 4:35)', t: 'Ben T.', dow: [2, 4], time: '4:35', books: ['Wonder Skills Intermediate 1', 'Grammar Point 1'], n: 8, gr: '초4', lv: 0.76, spc: 'Yellow', coach: 3 },
      { id: 'cx4', name: 'A2b-2 (월수금 5:40)', t: 'Kate T.', dow: [1, 3, 5], time: '5:40', books: ['Reading Juice Plus 1', 'Paragraph Writing'], n: 6, gr: '초4', lv: 0.78, spc: 'Yellow', site: 1 },
      { id: 'cx5', name: 'A4a-1', t: 'Amy T.', dow: [2, 4], time: '5:40', books: ['Trophy 9 Our World 5A', 'Creative Journal', 'Grammar Point 3'], n: 7, gr: '초6', lv: 0.8, spc: 'Blue', site: 1, coach: 2 },
      { id: 'cx6', name: 'F2a', t: 'Ben T.', dow: [1, 3, 5], time: '2:45', books: ['Into Reading 3', 'Master Journal'], n: 6, gr: '초3', lv: 0.84, spc: 'Sky Blue', site: 1 },
      { id: 'cx7', name: 'M1b', t: 'Jay T.', dow: [2, 4], time: '7:00', books: ['Reading Juice Plus 3', 'Grammar Point 3'], n: 7, gr: '중1', lv: 0.75 },
      { id: 'cx8', name: 'PMC', t: 'Jay T.', dow: [1, 3], time: '6:00', books: ['Reading Juice Plus 3', 'My Next Grammar 2'], n: 5, gr: '초6', lv: 0.77 },
    ];
    var from = addM(now, -4); from.setDate(1);
    var gi = 0, pick = function (a) { return a[Math.floor(rnd() * a.length)]; };
    var T9 = [['eBook (SK)', 'Vocabulary', 'Dictation'], ['eBook (SC)', 'Role Play', 'Storytelling'], ['eBook (IR)', 'Sentence Puzzle', 'Shadowing'], ['Grammar', 'Book Quiz', 'Book Report']];
    var NOTE_H = ['문제집 일부만 풀어 옴', '단어 암기 덜 함', '오답 정리 안 함'], NOTE_H2 = ['집에 두고 옴', '깜빡함'];
    var MEMO_KO = ['수업 태도가 성실하고 숙제를 꾸준히 해 와요.', '어휘력이 좋아지고 있어요. 문장 단위로 말하는 연습을 이어 가면 좋겠어요.', '이번 달 결석이 있어 진도 보충이 필요해요.', '발표에 자신감이 붙었어요. 단어시험 준비를 조금 더 하면 좋겠어요.', '쓰기 과제를 꼼꼼히 해 와요. 문법 실수를 줄여 가고 있어요.'];
    var MEMO_EN = ['Works diligently and completes homework consistently.', 'Vocabulary is growing. Keep practicing speaking in full sentences.', 'Missed a few classes this month; some review is needed.', 'Speaks with more confidence. A little more word test preparation would help.', 'Writing tasks are careful and grammar mistakes are decreasing.'];
    var RUB = ['trophy-9', 'our-world-4a', 'wonderskills-reading-basic', 'wonderskills-reading-intermediate', 'reading-juice-plus-1', 'reading-juice-plus-3', 'into-reading', 'phonics-show', 'grammar-point', 'creative-journal', 'master-journal', 'paragraph-writing', 'my-first-diary', 'speaking'];

    K.forEach(function (c) {
      put('classes', c.id, { id: c.id, name: c.name, teacher: c.t, dow: c.dow, time: c.time, spcLv: c.spc, sites: c.site ? ['Trophy 9'] : undefined, siteMode: c.site ? { 'Trophy 9': 'every' } : undefined,
        vocab: { list: 'Voca King ' + c.name, range: 'Day 1-30', max: 50 }, key: c.name + '||' + c.time });
      var roster = [];
      for (var i = 0; i < c.n; i++) {
        var g = GN[gi % GN.length], f = FN[(gi * 7 + 3) % FN.length]; gi++;
        var en = rnd() < 0.5 ? g[1] : EN[gi % EN.length];
        var s = { id: 'sx' + gi, name: f + g[0], ename: en, sg: '예시' + (rnd() < 0.5 ? '초' : '초') + ' ' + c.gr.replace(/^초|^중/, ''), classId: c.id, order: i, status: 'active',
          coaching: i < (c.coach || 0), enrolledAt: ymd(addM(now, -(3 + Math.floor(rnd() * 30)))), ab: c.lv + (rnd() - 0.5) * 0.3 };
        if (/^중/.test(c.gr)) s.sg = '예시중 1';
        put('students', s.id, s); roster.push(s);
      }
      if (gi === 9) roster[2].status = 'active';
      var unit = 1, day = 0, lastWeek = -1, mon = '', vi = 0;
      for (var d = new Date(from); d < addD(now, 14); d = addD(d, 1)) {
        if (c.dow.indexOf(d.getDay()) < 0 || closed(d)) continue;
        var ds = ymd(d); day++; if (day % c.dow.length === 1 || c.dow.length === 1) unit++;
        var bl = c.books.map(function (b, bi) { return bi === 0 ? { book: b, lesson: 'Unit ' + unit + ' Day ' + (((day - 1) % 4) + 1), hw: /Trophy|Our World|Into/.test(b) ? 'Metabook' : 'Workbook p.' + (unit * 4) }
          : { book: b, lesson: 'Lesson ' + Math.ceil(unit / 2), hw: 'Practice ' + Math.ceil(unit / 2) }; });
        put('plans', c.id + '_' + ds, { classId: c.id, date: ds, src: 'demo', blocks: bl, voca: 'Voca King ' + c.name + ' - Day ' + day, spc: c.spc ? 'Day ' + (((day - 1) % 72) + 1) : '', online: '', notice: '' });
        if (d >= now) continue;
        var rec = { classId: c.id, date: ds, att: {}, book: {}, hw: {}, note: {}, savedAt: d.toISOString() };
        roster.forEach(function (s) {
          var r = rnd(), weak = s.ab < 0.7;
          if (r < (weak ? 0.07 : 0.025)) { rec.att[s.id] = 'absent'; rec.note[s.id] = { a: pick(REASON_A) }; return; }
          if (r < (weak ? 0.13 : 0.06)) { rec.att[s.id] = 'late'; rec.note[s.id] = { a: pick(REASON_L) }; }
          if (rnd() < (weak ? 0.08 : 0.03)) rec.book[s.id] = 'no';
          var h = rnd(), ok = weak ? 0.72 : 0.9;
          if (h > ok) { rec.hw[s.id] = h > ok + (1 - ok) * 0.6 ? 'none' : 'partial'; rec.note[s.id] = Object.assign(rec.note[s.id] || {}, { h: pick(h > ok + (1 - ok) * 0.6 ? NOTE_H2 : NOTE_H) }); }
        });
        put('daily', c.id + '_' + ds, rec);
        var present = roster.filter(function (s) { return rec.att[s.id] !== 'absent'; });
        // 단어시험: 매주 첫 수업 (종류별)
        var wk = Math.floor(d / 6048e5);
        if (wk !== lastWeek && c.name !== 'G2') {
          lastWeek = wk;
          var types = /^(M|PM)/.test(c.name) ? [['wbk', 30], ['wid', 20]] : /^(A3|A4|F)/.test(c.name) ? [['wbk', 20], ['wdc', 10]] : [['wbk', 10 + 5 * Math.floor(rnd() * 3)]];
          types.forEach(function (tp) {
            var mx = tp[1], sc = {}, re = {};
            roster.forEach(function (s) { if (rec.att[s.id] === 'absent') return; var v = Math.round(clamp(s.ab + (rnd() - 0.5) * 0.3, 0.25, 1) * mx); sc[s.id] = v; if (v / mx < 0.7 && rnd() < 0.85) re[s.id] = Math.min(mx, v + Math.ceil(mx * (0.15 + rnd() * 0.2))); });
            roster.forEach(function (s) { if (rec.att[s.id] === 'absent' && rnd() < 0.5) sc[s.id] = -1; });
            put('tests', c.id + '_' + ds + '_word-' + tp[0], { classId: c.id, date: ds, kind: 'word', wt: tp[0], list: tp[0] === 'wbk' ? c.books[0] : '', range: 'Unit ' + unit, max: mx, scores: sc, re: re, savedAt: d.toISOString() });
          });
        }
        // Voca King: 달마다 중순 첫 수업
        var ym = ds.slice(0, 7);
        if (ym !== mon && d.getDate() >= 13) {
          mon = ym; var ks = {};
          roster.forEach(function (s) { if (rec.att[s.id] === 'absent') return; ks[s.id] = Math.round(clamp(s.ab + 0.08 + (rnd() - 0.5) * 0.25, 0.3, 1) * 50); });
          put('tests', c.id + '_' + ds + '_king', { classId: c.id, date: ds, kind: 'king', list: 'Voca King ' + c.name, range: 'Day ' + (1 + (day % 30)) + '-' + (10 + (day % 30)), max: 50, scores: ks, savedAt: d.toISOString() });
        }
        // 코칭 (최근 6주)
        if (c.coach && now - d < 42 * 864e5) {
          var items = [c.books[0] + ' ' + bl[0].lesson + (bl[0].hw === 'Metabook' ? ' Metabook' : ''), c.books[1] + ' ' + bl[1].hw];
          if (c.spc) items.push('SPC ' + c.spc + ' Day ' + (((day - 1) % 72) + 1));
          var x = {};
          roster.filter(function (s) { return s.coaching; }).forEach(function (s) { var m = []; items.forEach(function (_, ii) { if (rnd() > (s.ab < 0.7 ? 0.75 : 0.9)) m.push(ii); }); if (m.length) x[s.id] = m; });
          put('coach', c.id + '_' + ds, { classId: c.id, date: ds, items: items, x: x, skip: [], sent: {}, teacher: now - d > 864e5 * 2 || rnd() < 0.5 ? c.t : '', savedAt: d.toISOString() });
        }
        // 온라인 (Trophy 9 · 최근 5주)
        if (c.site && now - d < 35 * 864e5) {
          var ln = (((day - 1) % 4) + 1), it = T9[ln - 1], ox = {}, none = [];
          roster.forEach(function (s) { if (rnd() < 0.06) { none.push(s.id); return; } var m = []; it.forEach(function (_, ii) { if (rnd() > (s.ab < 0.7 ? 0.7 : 0.9)) m.push(ii); }); if (m.length) ox[s.id] = m; });
          put('online', c.id + '_' + ds, { classId: c.id, date: ds, site: 'Trophy 9', lesson: ln, items: it, x: ox, none: none, savedAt: d.toISOString() });
        }
        // 영상 숙제 (SPC 반 · 2주마다)
        if (c.spc && day % 6 === 3 && now - d < 50 * 864e5) {
          var aid = 'vx' + c.id + '_' + (vi++), title = c.books[0] + ' Unit ' + unit + ' Video';
          put('vassign', aid, { id: aid, classId: c.id, title: title, date: ds });
          roster.forEach(function (s) {
            var r = rnd(), ud = addD(d, 1 + Math.floor(rnd() * 2)); if (ud > now) ud = now;
            if (r < 0.45) { var sc2 = [0, 0, 0, 0, 0].map(function () { return 2 + Math.floor(rnd() * 3); }); put('video', aid + '_' + s.id, { id: aid + '_' + s.id, aid: aid, sid: s.id, classId: c.id, date: ds, scores: sc2, words: 'journey, island', comment: pick(['Great job! Clear voice and good eye contact.', 'Nice reading. Try to speak a little slower.', 'Good effort! Practice the new words once more.']), teacher: c.t, total: sc2.reduce(function (a, b) { return a + b; }, 0), savedAt: ud.toISOString() }); }
            else if (r < 0.8) put('vup', aid + '_' + s.id, { id: aid + '_' + s.id, aid: aid, sid: s.id, classId: c.id, date: ymd(ud), savedAt: ud.toISOString() });
          });
        }
      }
      // 월간 평가 · 코멘트 (지난달, 일부 반은 이번 달도)
      [1, 0].forEach(function (back) {
        if (back === 0 && !/^(A2a|A4a)/.test(c.name)) return;
        var md = addM(now, -back), ym = md.getFullYear() + '-' + pad(md.getMonth() + 1);
        roster.forEach(function (s, si) {
          if (back === 0 && si > 3) return;
          var lv = function () { return clamp(Math.round(1 + s.ab * 3.2 + (rnd() - 0.5) * 1.2), 1, 4); };
          var ko = {}, en = {};
          RUB.forEach(function (id) { var a = [0, 0, 0, 0, 0, 0].map(lv); ko[id] = a; en[id] = a.map(function (v) { return clamp(v + (rnd() < 0.2 ? -1 : 0), 1, 4); }); });
          var note = rnd() < 0.25 ? { ko: pick(['이번 달 감기로 두 번 결석했어요.', '말하기 대회 준비를 열심히 했어요.', '숙제 제출이 늦은 날이 있었어요.']), en: '' } : {};
          put('meval', s.id + '_' + ym, { sid: s.id, ym: ym, classId: c.id, ko: ko, en: en, note: note, obs: /-(04|10)$/.test(ym) ? { ko: pick(['수업 참여도가 꾸준히 좋아지고 있어요.', '어휘를 빠르게 익히고 발표에 자신감이 생겼어요.', '숙제를 성실히 해 오며 기초가 탄탄해지고 있어요.']), en: pick(['Class participation keeps improving.', 'Learns new words quickly and presents with confidence.', 'Completes homework diligently and builds a solid foundation.']) } : {},
            goal: /-(04|10)$/.test(ym) ? { ko: pick(['단어시험 90% 이상 유지하기', '완전한 문장으로 대답하기', '문단 쓰기에서 주제문 쓰기']), en: pick(['Keep word test scores above 90%.', 'Answer in complete sentences.', 'Write a clear topic sentence in paragraphs.']) } : {}, savedAt: md.toISOString() });
          var k = Math.floor(rnd() * MEMO_KO.length);
          put('memo', s.id + '_' + ym, { sid: s.id, ym: ym, text: MEMO_KO[k], en: MEMO_EN[k], savedAt: md.toISOString() });
        });
      });
      // 정기평가 (최근 두 번)
      ['rdemo5', 'rdemo6'].forEach(function (rid, ri) {
        if (!docs['rounds|' + rid]) return;
        var tp = docs['rounds|' + rid].types[0];
        roster.forEach(function (s) {
          var b = Math.round(s.ab * 100), ex = {}; ex[tp] = { sc: { Listening: clamp(b + Math.round((rnd() - 0.5) * 16), 30, 100), Reading: clamp(b + Math.round((rnd() - 0.5) * 16), 30, 100), LFM: clamp(b - 4 + Math.round((rnd() - 0.5) * 16), 30, 100) }, lv: 'Level ' + (2 + ri + Math.round(s.ab * 3)) };
          put('exam', rid + '_' + s.id, { rid: rid, sid: s.id, classId: c.id, exams: ex, iv: { sc: { '점수': clamp(b + Math.round((rnd() - 0.5) * 10), 30, 100) }, lv: '', cm: '' }, comment: '', savedAt: docs['rounds|' + rid].date + 'T09:00:00.000Z' });
        });
      });
    });

    // 지금 반(A3a-1) 친구들도 코칭 · Voca King · 월간 평가를 조금 더
    var cur = docs['classes|' + CUR.id]; cur.vocab = { list: 'Voca King A3a-1', range: 'Day 1-30', max: 50 };
    docs['students|sdemo2'].coaching = true;
    var all = [me].concat(mates);
    for (var m2 = 11; m2 >= 0; m2--) {
      var kd = addM(now, -m2); kd.setDate(15); while (CUR.dow.indexOf(kd.getDay()) < 0 || closed(kd)) kd = addD(kd, 1);
      if (kd >= now || kd < CUR.from) continue;
      var ks2 = {}; all.forEach(function (s, i) { ks2[s.id] = Math.round(clamp((i === 0 ? 0.82 + 0.015 * (11 - m2) : 0.7 + rnd() * 0.25) + (rnd() - 0.5) * 0.1, 0.3, 1) * 50); });
      put('tests', CUR.id + '_' + ymd(kd) + '_king', { classId: CUR.id, date: ymd(kd), kind: 'king', list: 'Voca King A3a-1', range: 'Day ' + (m2 * 10 + 1) + '-' + (m2 * 10 + 10), max: 50, scores: ks2, savedAt: kd.toISOString() });
    }
    var lm = addM(now, -1), lym = lm.getFullYear() + '-' + pad(lm.getMonth() + 1);
    all.forEach(function (s, i) {
      var ko = {}, en = {}, base = i === 0 ? 3.6 : 2.6 + rnd();
      RUB.forEach(function (id) { var a = [0, 0, 0, 0, 0, 0].map(function () { return clamp(Math.round(base + (rnd() - 0.5) * 1.2), 1, 4); }); ko[id] = a; en[id] = a.slice(); });
      put('meval', s.id + '_' + lym, { sid: s.id, ym: lym, classId: CUR.id, ko: ko, en: en, note: i === 0 ? { ko: '말하기 대회에서 금상을 받았어요.', en: 'Won the gold prize at the speech contest.' } : {},
        obs: i === 0 ? { ko: 'A3a-1로 올라온 뒤에도 빠르게 적응했어요. 읽기 이해력과 발표 자신감이 크게 늘었고, 단어시험 점수가 학기 내내 꾸준히 올랐어요.', en: 'Grace adapted quickly to her new level. Her reading comprehension and confidence have grown remarkably.' } : { ko: '수업에 성실히 참여하고 있어요.', en: 'Participates sincerely in class.' },
        goal: i === 0 ? { ko: '주제문과 근거를 갖춘 한 문단 쓰기. 문법은 시제 일치를 정확히 쓰는 연습을 이어 갈 예정이에요.', en: 'Write a well-organized paragraph with a clear topic sentence and supporting details.' } : { ko: '단어시험 90% 이상 유지하기', en: 'Keep word test scores above 90%.' }, savedAt: lm.toISOString() });
    });
    // 지금 반 다닌 동안 다른 달 월간 평가도 (교재별 코멘트가 여러 달로 쌓이게)
    [3, 2, 0].forEach(function (back) {
      var em = addM(now, -back); if (em < CUR.from && back > 0 && em.getMonth() !== CUR.from.getMonth()) return;
      var eym = em.getFullYear() + '-' + pad(em.getMonth() + 1);
      all.forEach(function (s, i) {
        var ko = {}, en = {}, base = (i === 0 ? 3.0 : 2.4 + rnd() * 0.8) + (3 - back) * 0.18;
        RUB.forEach(function (id) { var a = [0, 0, 0, 0, 0, 0].map(function () { return clamp(Math.round(base + (rnd() - 0.5) * 1.1), 1, 4); }); ko[id] = a; en[id] = a.map(function (v) { var r = rnd(); return clamp(v + (r < 0.18 ? -1 : r > 0.85 ? 1 : 0), 1, 4); }); });
        put('meval', s.id + '_' + eym, { sid: s.id, ym: eym, classId: CUR.id, ko: ko, en: en, note: {}, obs: {}, goal: {}, savedAt: em.toISOString() });
      });
    });
    // 지난 레벨 월간 평가 (한서윤 · 처음부터 지금 반 전까지 매달)
    for (var pm0 = new Date(start.getFullYear(), start.getMonth(), 1); pm0 < CUR.from; pm0 = addM(pm0, 1)) {
      var mid = new Date(pm0.getFullYear(), pm0.getMonth(), 15), pc = C.filter(function (c) { return c.from <= mid && mid < c.to; })[0];
      if (!pc || pc === CUR) continue;
      var pym = pm0.getFullYear() + '-' + pad(pm0.getMonth() + 1), tt = (mid - start) / span, ko2 = {};
      RUB.forEach(function (id) { ko2[id] = [0, 0, 0, 0, 0, 0].map(function () { return clamp(Math.round(1.8 + 2 * tt + (rnd() - 0.5) * 1.1), 1, 4); }); });
      put('meval', SID + '_' + pym, { sid: SID, ym: pym, classId: pc.id, ko: ko2, en: (function () { var o = {}; Object.keys(ko2).forEach(function (k) { o[k] = ko2[k].map(function (v) { var r = rnd(); return clamp(v + (r < 0.18 ? -1 : r > 0.85 ? 1 : 0), 1, 4); }); }); return o; })(), note: {}, obs: {}, goal: {}, savedAt: mid.toISOString() });
    }
    // 평가 선생님 (지난달: 몇 반은 다 정해 둠 → 대시보드 '보낼 수 있어요' 예시)
    var tym = lm.getFullYear() + '-' + pad(lm.getMonth() + 1), NAT = ['Ryan T.', 'Emily T.', 'Chris T.'];
    [CUR.id, 'cx2', 'cx4', 'cx5', 'cx6'].forEach(function (cid, i) {
      var tc = cid === CUR.id ? CUR.teacher : (K.filter(function (k) { return k.id === cid; })[0] || {}).t;
      put('mevc', cid + '_' + tym + '_t', { id: cid + '_' + tym + '_t', classId: cid, ym: tym, teacher: { ko: tc, en: i === 3 ? '' : NAT[i % 3] }, byBook: {}, savedAt: lm.toISOString() });
    });
    // 코칭 (A3a-1, 최근 4주)
    for (var cd = addD(now, -28); cd < now; cd = addD(cd, 1)) {
      if (CUR.dow.indexOf(cd.getDay()) < 0 || closed(cd)) continue;
      var cds = ymd(cd), pl = docs['plans|' + CUR.id + '_' + cds]; if (!pl) continue;
      var its = [pl.blocks[0].book + ' ' + pl.blocks[0].lesson + ' Metabook', pl.blocks[1].book + ' ' + pl.blocks[1].hw, 'SPC Green ' + pl.spc.replace(' Video 찍기', '')];
      var cx = {}; if (rnd() < 0.3) cx.sdemo2 = [1]; if (rnd() < 0.12) cx[SID] = [2];
      put('coach', CUR.id + '_' + cds, { classId: CUR.id, date: cds, items: its, x: cx, skip: [], sent: {}, teacher: 'Lucy T.', savedAt: cd.toISOString() });
    }
    docs['settings|main'].wtTypes.push({ id: 'wid', n: '숙어', lv: 'M, PM' });
  })();

  /* ---- 서버 대신 이 페이지 안에서 동작하는 저장소 (google.script.run 과 같은 모양) ---- */
  var store = {}, last = 0;
  Object.keys(docs).forEach(function (k) { store[k] = { t: ++last, del: false, json: JSON.stringify(docs[k]) }; });
  var API = {
    api_ping: function () { return { last: last, me: '' }; },
    api_pull: function (since) {
      since = Number(since) || 0; var out = [];
      Object.keys(store).forEach(function (k) { var d = store[k]; if (d.t > since) { var i = k.indexOf('|'); out.push({ c: k.slice(0, i), id: k.slice(i + 1), t: d.t, by: '', del: d.del, json: d.json }); } });
      return { last: last, changes: out };
    },
    api_write: function (ops) {
      (ops || []).forEach(function (op) { var del = op.json === null || op.json === undefined; store[op.c + '|' + op.id] = { t: ++last, del: del, json: del ? '' : String(op.json) }; });
      return { last: last };
    },
  };
  function runner(ok, fail) {
    return new Proxy({}, { get: function (_, name) {
      if (name === 'withSuccessHandler') return function (f) { return runner(f, fail); };
      if (name === 'withFailureHandler') return function (f) { return runner(ok, f); };
      return function () { var a = arguments; setTimeout(function () { try { var r = API[name].apply(null, a); if (ok) ok(r); } catch (e) { if (fail) fail(e); } }, 30); };
    } });
  }
  window.google = { script: { run: runner(null, null) } };

  // 예시 데이터 안내 띠
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('div');
    b.setAttribute('role', 'note');
    b.style.cssText = 'max-width:1360px;margin:0 auto 12px;padding:9px 14px;border-radius:10px;background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn);font-size:13.5px;font-weight:600;line-height:1.45';
    b.textContent = '체험용 예시 데이터예요 (가상의 반 9개 · 학생 약 55명). 실제 학생이 아니고, 입력한 내용은 새로고침하면 사라져요. 학생 기록에서 "ㅎㅅㅇ"을 검색하면 3년 기록을 볼 수 있어요. 오른쪽 위 ? 는 사용 가이드예요.';
    var app = document.querySelector('.app'); if (app) app.parentNode.insertBefore(b, app);
  });
})();
