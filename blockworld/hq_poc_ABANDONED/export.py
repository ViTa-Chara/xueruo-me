"""Export site/world.cw + texture pack into raw files for the three.js HQ renderer PoC."""
import gzip, json, zipfile, io, os, re, sys
import nbtlib, numpy as np
ROOT = '/workspace/blockworld'
src = open(os.path.join(ROOT, 'build/ClassiCube/src/Block.c')).read()
core = re.findall(r'\{ "([^"]+)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),[^}]*?(DRAW_\w+)', src)
DRAW = {'DRAW_OPAQUE': 0, 'DRAW_TRANSPARENT': 1, 'DRAW_TRANSPARENT_THICK': 2, 'DRAW_TRANSLUCENT': 3, 'DRAW_GAS': 4, 'DRAW_SPRITE': 5}
blocks = {}
for i, (name, top, side, bot, hei, draw) in enumerate(core[:66]):
    blocks[i] = dict(name=name, tex=[int(top), int(bot)] + [int(side)] * 4, draw=DRAW[draw], h=int(hei), fb=name in ('Lava', 'Still lava', 'Fire', 'Magma'))
f = nbtlib.load(os.path.join(ROOT, 'site/world.cw'), gzipped=True)
r = f if 'X' in f else f['ClassicWorld']
W, H, L = int(r['X']), int(r['Y']), int(r['Z'])
lo = np.frombuffer(bytes(np.array(r['BlockArray'], dtype=np.int8).astype(np.uint8)), np.uint8).astype(np.uint16)
hi = np.frombuffer(bytes(np.array(r['BlockArray2'], dtype=np.int8).astype(np.uint8)), np.uint8).astype(np.uint16) if 'BlockArray2' in r else 0
arr = (lo | (hi << 8)).astype(np.uint16)
arr.tofile('world.bin')
for k, d in r['Metadata']['CPE']['BlockDefinitions'].items():
    bid = int(d['ID2']) if 'ID2' in d else int(d['ID']) & 0xff
    t = [int(x) & 0xff for x in d['Textures']]
    tex = [t[i] | (t[i + 6] << 8) for i in range(6)]
    # cw order: YMAX, YMIN, XMIN, XMAX, ZMIN, ZMAX
    blocks[bid] = dict(name=str(d['Name']), tex=tex, draw=int(d['BlockDraw']), h=16, fb=bool(int(d['FullBright'])))
sp = r['Spawn']
json.dump(dict(W=W, H=H, L=L, spawn=[int(sp['X']), int(sp['Y']), int(sp['Z'])], blocks=blocks), open('world.json', 'w'))
z = zipfile.ZipFile(os.path.join(ROOT, 'site/static/default.zip'))
open('terrain.png', 'wb').write(z.read('terrain.png'))
print(W, H, L, len(blocks), 'defs; nonair', int((arr > 0).sum()))
