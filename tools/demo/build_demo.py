"""체험판 만들기: 앱 + 예시 데이터(가짜 학생) → docs/index.html (GitHub Pages).
사용: python3 tools/demo/build_demo.py   (출력: docs/index.html, 테스트용 사본: 인자로 폴더를 주면 그 폴더/andover-demo.html 도 만들어요)"""
import os, sys
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
h = open(R + '/public/andover-app.html', encoding='utf-8').read()
js = open(R + '/tools/demo/demo-data.js', encoding='utf-8').read()
for old, new in [
    ('window.claude={use:async function(n){', 'window.__demoClaude={use:async function(n){'),
    ('var cl=window.claude,d=null;', 'var cl=window.__demoClaude||window.claude,d=null;'),
]:
    assert h.count(old) == 1, old
    h = h.replace(old, new)
h = h.replace('<head>', '<head><script>\n' + js + '\n</script>', 1)
if len(sys.argv) > 1:
    open(sys.argv[1] + '/andover-demo.html', 'w', encoding='utf-8').write(h)
open(R + '/docs/index.html', 'w', encoding='utf-8').write(h.replace('href="/guide/"', 'href="guide/"'))
print('built', len(h))
