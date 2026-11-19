/* 단독 실행 연결층
 * 앱 화면은 구글 Apps Script의 google.script.run 으로 서버를 불러요.
 * 이 파일이 같은 모양의 google.script.run 을 만들어, 구글 대신 이 PC의 서버(/api/...)로 보내 줘요.
 * 그래서 andover-app.html 은 구글 버전 그대로 고치지 않고 쓸 수 있어요.
 */
(function () {
  function me() { try { return localStorage.getItem('me') || ''; } catch (_) { return ''; } }

  function call(fn, args) {
    return fetch('/api/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User': encodeURIComponent(me()) },
      body: JSON.stringify(args || []),
      credentials: 'same-origin',
    }).then(function (r) {
      if (r.status === 401) { location.href = '/login'; throw new Error('로그인이 필요해요'); }
      return r.json().catch(function () { throw new Error('서버 응답 오류 (' + r.status + ')'); }).then(function (j) {
        if (!r.ok || j.error) throw new Error(j.error || ('서버 오류 ' + r.status));
        return j.result;
      });
    });
  }

  function runner(ok, fail) {
    return new Proxy({}, {
      get: function (_, name) {
        if (name === 'withSuccessHandler') return function (f) { return runner(f, fail); };
        if (name === 'withFailureHandler') return function (f) { return runner(ok, f); };
        if (typeof name !== 'string') return undefined;
        return function () {
          call(name, Array.prototype.slice.call(arguments)).then(
            function (res) { if (ok) ok(res); },
            function (err) { if (fail) fail(err); else console.error(err); }
          );
        };
      },
    });
  }

  window.google = window.google || {};
  window.google.script = { run: runner(null, null) };
})();
