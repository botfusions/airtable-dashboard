"""Koreografideki patlama seslerinin müzik ızgarasına oturduğunu doğrular.

events.json (render.mjs çıktısı) içindeki 'boom' ve 'mine' olaylarının her biri
onaltılık nota ızgarasına (120 BPM'de 0,125 sn) en fazla 33 ms (1 video karesi)
uzaklıkta olmalı. Ayrıca drop'ta bir patlama olmalı. Hata varsa çıkış kodu 1.
Kullanım: python3 senkron_kontrol.py events.json beats.json
"""
import json
import sys

ev = json.load(open(sys.argv[1]))
beats = json.load(open(sys.argv[2]))
grid = 60 / beats['bpm'] / 4
TOL = 1 / 30
bad, n = [], 0
for e in ev:
    if e['kind'] not in ('boom', 'mine') or e['t'] > 30:
        continue
    n += 1
    off = abs(e['t'] - round(e['t'] / grid) * grid)
    if off > TOL:
        bad.append((e['kind'], e['t'], round(off * 1000)))
drop_hit = any(e['kind'] == 'boom' and abs(e['t'] - beats['drop']) < TOL for e in ev)
sil = [e for e in ev if e['kind'] in ('boom', 'mine') and beats['silence'][0] <= e['t'] < beats['silence'][1]]
print(f'{n} patlama kontrol edildi, ızgara dışı: {len(bad)}, drop patlaması: {"var" if drop_hit else "YOK"}, sessizlikte patlama: {len(sil)}')
for b in bad[:10]:
    print('  ızgara dışı:', b)
sys.exit(1 if bad or not drop_hit or sil else 0)
