"""영어 화면 번역 추가: python3 tools/add_i18n.py '{"한국어":"English", ...}'  (var D={ 줄에 넣어요)"""
import json, os, sys
p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'andover-app.html')
add = json.loads(sys.argv[1])
L = open(p, encoding='utf-8').read().split('\n')
idx = [i for i, l in enumerate(L) if l.startswith('var D={')]
assert len(idx) == 1, idx
i = idx[0]
ins = ''.join(json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False) + ',' for k, v in add.items() if json.dumps(k, ensure_ascii=False) + ':' not in L[i])
L[i] = L[i].replace('var D={', 'var D={' + ins, 1)
open(p, 'w', encoding='utf-8').write('\n'.join(L))
print('added', ins.count('":"'))
