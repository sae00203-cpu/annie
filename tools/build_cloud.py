"""Firebase(클라우드) 버전 만들기
public/andover-app.html(학원 컴퓨터 버전과 같은 화면) + cloud/cloud.js 를 묶어 docs/app/ 에 넣어요.
GitHub Pages 가 docs/ 를 그대로 올려 주므로, 이 폴더가 곧 선생님들이 여는 주소가 돼요.
쓰는 법:  python3 tools/build_cloud.py
"""
import os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'app')
P = lambda *a: os.path.join(ROOT, *a)

os.makedirs(os.path.join(OUT, 'vendor'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'report', 'fonts'), exist_ok=True)

html = open(P('public', 'andover-app.html'), encoding='utf-8').read()
head = ('<head><script src="vendor/firebase-app-compat.js"></script><script src="vendor/firebase-auth-compat.js"></script>'
        '<script src="vendor/firebase-firestore-compat.js"></script><script src="config.js"></script><script src="cloud.js"></script>')
assert html.count('<head>') >= 1
html = html.replace('<head>', head, 1)
html = re.sub(r'https://cdnjs\.cloudflare\.com/ajax/libs/xlsx/[\d.]+/xlsx\.full\.min\.js', 'vendor/xlsx.full.min.js', html)
html = html.replace('href="/guide/"', 'href="../guide/"')
html = html.replace('<title>앤도버 생활기록</title>', '<title>앤도버 생활기록</title><meta name="robots" content="noindex"><link rel="manifest" href="manifest.json">', 1)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)

shutil.copy(P('cloud', 'cloud.js'), os.path.join(OUT, 'cloud.js'))
for f in ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js']:
    shutil.copy(P('cloud', 'vendor', f), os.path.join(OUT, 'vendor', f))
shutil.copy(P('public', 'vendor', 'xlsx.full.min.js'), os.path.join(OUT, 'vendor', 'xlsx.full.min.js'))
shutil.copy(P('public', 'report', 'letterhead.jpg'), os.path.join(OUT, 'report', 'letterhead.jpg'))
for f in os.listdir(P('public', 'report', 'fonts')):
    shutil.copy(P('public', 'report', 'fonts', f), os.path.join(OUT, 'report', 'fonts', f))
if not os.path.exists(os.path.join(OUT, 'config.js')):
    shutil.copy(P('cloud', 'config.example.js'), os.path.join(OUT, 'config.js'))
open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8').write(
    '{"name":"앤도버 생활기록","short_name":"앤도버","start_url":".","display":"standalone","background_color":"#f4f6fb","theme_color":"#24418a"}')
print('built', OUT)
# ---- Firebase 호스팅용 (andover-record.web.app): 앱을 맨 앞(/)에, 가이드는 /guide/ ----
HOST = P('hosting')
if os.path.exists(HOST):
    shutil.rmtree(HOST)
shutil.copytree(OUT, HOST)
h2 = open(os.path.join(HOST, 'index.html'), encoding='utf-8').read().replace('href="../guide/"', 'href="guide/"')
open(os.path.join(HOST, 'index.html'), 'w', encoding='utf-8').write(h2)
if os.path.exists(P('docs', 'guide')):
    shutil.copytree(P('docs', 'guide'), os.path.join(HOST, 'guide'))
print('built', HOST)

