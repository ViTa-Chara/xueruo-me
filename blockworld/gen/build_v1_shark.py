#!/usr/bin/env python3
"""
若米的方块世界 — site + world generator.

Inputs : content/news/*.md, /workspace/xueruo-deploy (books, library, reader, old homepage),
         ClassiCube web build (build/ClassiCube), cc_textures.zip (ClassiCube's own art).
Outputs: site/  (index.html, static/ClassiCube.{js,wasm}, static/default.zip, world.cw, world.json,
                 skins/, classic/, library.html, read.html, css/, js/, data/)
"""
import gzip, io, json, math, os, re, shutil, struct, sys, uuid, zipfile, html
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
CC = os.path.join(ROOT, 'build', 'ClassiCube')
OLD = os.environ.get('XR_OLD_SITE', '/workspace/xueruo-deploy')
FONT = os.path.join(ROOT, 'build', 'fpf', 'fusion-pixel-12px-proportional-zh_hans.ttf')

W, H, L = 256, 64, 256
WATER = 32
T = 36            # flattened ground level (top solid block); players stand at T+1
SEED = 20260921
TS = 64           # texture tile size in the generated texture pack

# ---------------------------------------------------------------- block ids (Classic + CPE)
AIR, STONE, GRASS, DIRT, COBBLE, PLANKS, SAPLING, BEDROCK = 0, 1, 2, 3, 4, 5, 6, 7
WATER_B, STILL_WATER, LAVA, STILL_LAVA, SAND, GRAVEL, GOLD_ORE, IRON_ORE = 8, 9, 10, 11, 12, 13, 14, 15
COAL_ORE, LOG, LEAVES, SPONGE, GLASS = 16, 17, 18, 19, 20
RED_W, ORANGE_W, YELLOW_W, LIME_W, GREEN_W, TEAL_W, AQUA_W, CYAN_W, BLUE_W, INDIGO_W = range(21, 31)
VIOLET_W, MAGENTA_W, PINK_W, BLACK_W, GRAY_W, WHITE_W = range(31, 37)
DANDELION, ROSE, BROWN_MUSH, RED_MUSH, GOLD_B, IRON_B, DSLAB, SLAB, BRICK, TNT, BOOKSHELF, MOSSY, OBSIDIAN = range(37, 50)
COBBLE_SLAB, ROPE, SANDSTONE, SNOW, FIRE, LIGHT_PINK, FOREST_GREEN, BROWN_W, DEEP_BLUE, TURQUOISE = range(50, 60)
ICE, CERAMIC, MAGMA, PILLAR, CRATE, STONE_BRICK = range(60, 66)

# ---------------------------------------------------------------- helpers
rng = np.random.default_rng(SEED)
blocks = np.zeros((H, L, W), dtype=np.uint16)   # [y, z, x]

def setb(x, y, z, b):
    if 0 <= x < W and 0 <= y < H and 0 <= z < L: blocks[y, z, x] = b

def fill(x0, y0, z0, x1, y1, z1, b):
    xa, xb = sorted((x0, x1)); ya, yb = sorted((y0, y1)); za, zb = sorted((z0, z1))
    blocks[max(ya, 0):min(yb, H - 1) + 1, max(za, 0):min(zb, L - 1) + 1, max(xa, 0):min(xb, W - 1) + 1] = b

# ---------------------------------------------------------------- noise / terrain
def perlin2(shape, scale, seed):
    r = np.random.default_rng(seed)
    gw, gh = int(shape[1] / scale) + 2, int(shape[0] / scale) + 2
    ang = r.uniform(0, 2 * np.pi, (gh, gw))
    gx, gy = np.cos(ang), np.sin(ang)
    ys, xs = np.mgrid[0:shape[0], 0:shape[1]] / scale
    x0, y0 = xs.astype(int), ys.astype(int)
    fx, fy = xs - x0, ys - y0
    def dot(ix, iy, dx, dy): return gx[iy, ix] * dx + gy[iy, ix] * dy
    n00 = dot(x0, y0, fx, fy); n10 = dot(x0 + 1, y0, fx - 1, fy)
    n01 = dot(x0, y0 + 1, fx, fy - 1); n11 = dot(x0 + 1, y0 + 1, fx - 1, fy - 1)
    u = fx * fx * fx * (fx * (fx * 6 - 15) + 10); v = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
    return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v

def octaves(shape, scale, n, seed):
    out = np.zeros(shape); amp = 1.0; tot = 0
    for i in range(n):
        out += perlin2(shape, scale / (2 ** i), seed + i * 101) * amp; tot += amp; amp *= 0.5
    return out / tot

def terrain():
    shape = (L, W)
    base = octaves(shape, 90, 4, SEED) * 22
    hills = np.maximum(octaves(shape, 50, 3, SEED + 7), 0) * 30
    h = 34 + base + hills
    # flatten the built-up area (plaza, gallery, library, mural, title) to T with a soft edge
    zz, xx = np.mgrid[0:L, 0:W]
    def rect_dist(x0, z0, x1, z1):
        dx = np.maximum(np.maximum(x0 - xx, xx - x1), 0); dz = np.maximum(np.maximum(z0 - zz, zz - z1), 0)
        return np.sqrt(dx * dx + dz * dz)
    d = np.minimum.reduce([rect_dist(84, 88, 246, 182)])
    wgt = np.clip(1 - d / 16.0, 0, 1); wgt = wgt * wgt * (3 - 2 * wgt)
    h = h * (1 - wgt) + T * wgt
    h = np.clip(np.round(h), 8, 54).astype(int)
    dirt = 3 + (octaves(shape, 20, 2, SEED + 3) > 0.1).astype(int)
    for z in range(L):
        for x in range(W):
            top = h[z, x]
            blocks[0, z, x] = BEDROCK
            blocks[1:top - dirt[z, x] + 1, z, x] = STONE
            blocks[top - dirt[z, x] + 1:top, z, x] = DIRT
            if top > WATER:
                blocks[top, z, x] = GRASS
            else:
                blocks[top, z, x] = SAND if top >= WATER - 3 else GRAVEL
                blocks[top + 1:WATER + 1, z, x] = STILL_WATER
            if WATER - 1 <= top <= WATER + 1 and wgt[z, x] < 0.5:
                blocks[top, z, x] = SAND   # beaches
    # ores
    for b, n, ymax in ((COAL_ORE, 900, 40), (IRON_ORE, 500, 30), (GOLD_ORE, 160, 18)):
        for _ in range(n):
            x, z, y = rng.integers(1, W - 1), rng.integers(1, L - 1), rng.integers(2, ymax)
            if blocks[y, z, x] == STONE: blocks[y, z, x] = b
    return h, wgt

def tree(x, y, z, hgt=None):
    hgt = hgt or int(rng.integers(4, 7))
    for dy in range(hgt - 3, hgt + 1):
        r = 2 if dy < hgt - 1 else 1
        for dx in range(-r, r + 1):
            for dz in range(-r, r + 1):
                if abs(dx) == r and abs(dz) == r and (dy >= hgt or rng.random() < 0.5): continue
                if blocks[y + dy, z + dz, x + dx] == AIR: setb(x + dx, y + dy, z + dz, LEAVES)
    for dy in range(hgt): setb(x, y + dy, z, LOG)

def decorate(h, wgt):
    for _ in range(4000):
        x, z = int(rng.integers(3, W - 3)), int(rng.integers(3, L - 3))
        top = h[z, x]
        if blocks[top, z, x] != GRASS or wgt[z, x] > 0.05: continue
        r = rng.random()
        if r < 0.10 and octaves_cache[z, x] > 0.0: tree(x, top + 1, z)
        elif r < 0.16: setb(x, top + 1, z, DANDELION if rng.random() < 0.5 else ROSE)
        elif r < 0.165: setb(x, top + 1, z, BROWN_MUSH if rng.random() < 0.5 else RED_MUSH)

# ---------------------------------------------------------------- texture atlas + custom blocks
cc_zip = zipfile.ZipFile(os.path.join(CC, 'misc', 'cc_textures.zip'))
base_terrain = Image.open(io.BytesIO(cc_zip.read('terrain.png'))).convert('RGBA')
atlas = Image.new('RGBA', (16 * TS, 32 * TS), (0, 0, 0, 0))
atlas.paste(base_terrain.resize((16 * TS, 16 * TS), Image.NEAREST), (0, 0))
free_tiles = [t for t in range(96, 240)] + [t for t in range(256, 512)]
custom_defs = []          # dicts for BlockDefinitions
next_id = [66]

def tile_avg(t):
    tx, ty = (t % 16) * 16, (t // 16) * 16
    return np.array(base_terrain.crop((tx, ty, tx + 16, ty + 16)).convert('RGB')).reshape(-1, 3).mean(0)

def new_tile(img):
    t = free_tiles.pop(0)
    atlas.paste(img.resize((TS, TS), Image.NEAREST) if img.size != (TS, TS) else img, ((t % 16) * TS, (t // 16) * TS))
    return t

def new_block(name, tex6, fullbright=False, sound=5, draw=0):
    """tex6 = [top, bottom, xmin, xmax, zmin, zmax] tile ids."""
    bid = next_id[0]; next_id[0] += 1
    assert bid <= 767, 'out of block ids'
    custom_defs.append(dict(id=bid, name=name, tex=tex6, fullbright=fullbright, sound=sound, draw=draw))
    return bid

FACE_INDEX = {'+y': 0, '-y': 1, '-x': 2, '+x': 3, '-z': 4, '+z': 5}
PLANK_T, LOG_SIDE_T = 4, 20

def textured_panel(img, x0, y0, z0, wblocks, hblocks, facing, name='Sign', back=PLANK_T, flip_u=False):
    """Slice img into wblocks x hblocks tiles and place them as a wall whose visible face points `facing`.
    (x0,y0,z0) is the min corner. Returns the block bounding box [x0,y0,z0,x1,y1,z1]."""
    img = img.convert('RGBA').resize((wblocks * TS, hblocks * TS), Image.NEAREST)
    fi = FACE_INDEX[facing]
    for j in range(hblocks):
        for i in range(wblocks):
            tile = img.crop((i * TS, j * TS, (i + 1) * TS, (j + 1) * TS))
            if flip_u: tile = tile.transpose(Image.FLIP_LEFT_RIGHT)
            t = new_tile(tile)
            tex = [back] * 6; tex[fi] = t
            b = new_block(name, tex, fullbright=True)
            y = y0 + hblocks - 1 - j
            if facing == '+z':   x, z = x0 + i, z0
            elif facing == '-z': x, z = x0 + wblocks - 1 - i, z0
            elif facing == '-x': x, z = x0, z0 + i
            elif facing == '+x': x, z = x0, z0 + wblocks - 1 - i
            setb(x, y, z, b)
    if facing in ('+z', '-z'): return [x0, y0, z0, x0 + wblocks - 1, y0 + hblocks - 1, z0]
    return [x0, y0, z0, x0, y0 + hblocks - 1, z0 + wblocks - 1]

paint_cache = {}
def paint(rgb, name='Paint', fullbright=False):
    rgb = tuple(int(c) for c in rgb)
    key = (rgb, fullbright)
    if key in paint_cache: return paint_cache[key]
    r = np.random.default_rng(hash(rgb) & 0xffff)
    a = np.ones((16, 16, 3)) * np.array(rgb)
    a += r.normal(0, 4, (16, 16, 1))   # subtle grain so it still feels like a block
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert('RGBA')
    t = new_tile(img)
    b = new_block(name, [t] * 6, sound=7, fullbright=fullbright)
    paint_cache[key] = b
    return b

# ---------------------------------------------------------------- fonts & text rendering
def font(px): return ImageFont.truetype(FONT, px)

def wrap(text, fnt, maxw):
    lines, cur = [], ''
    for para in text.split('\n'):
        cur = ''
        for ch in para:
            if fnt.getlength(cur + ch) > maxw and ch not in '，。、：；！？）」』…,.;:!?)':
                lines.append(cur); cur = ch.lstrip()
            else:
                cur += ch
        lines.append(cur)
    return lines

PARCHMENT = (246, 238, 218, 255)
def board_image(wb, hb, title, date='', body='', hint='点击 / E 查看 ▶', accent=(46, 60, 98)):
    img = Image.new('RGBA', (wb * TS, hb * TS), PARCHMENT)
    d = ImageDraw.Draw(img); d.fontmode = '1'
    Wp, Hp = img.size
    d.rectangle([0, 0, Wp - 1, Hp - 1], outline=(110, 76, 44), width=6)
    d.rectangle([6, 6, Wp - 7, Hp - 7], outline=(196, 160, 112), width=2)
    d.rectangle([12, 12, Wp - 13, 15], fill=accent)
    y = 22; m = 18
    f24, f12 = font(24), font(12)
    for line in wrap(title, f24, Wp - 2 * m)[:2]:
        d.text((m, y), line, font=f24, fill=accent); y += 28
    if date:
        d.text((m, y + 2), date, font=f12, fill=(150, 104, 60)); y += 20
    if body:
        maxl = max(1, (Hp - y - 24) // 15)
        lines = wrap(body, f12, Wp - 2 * m)
        if len(lines) > maxl: lines = lines[:maxl]; lines[-1] = lines[-1][:-1] + '…'
        for line in lines:
            d.text((m, y), line, font=f12, fill=(52, 48, 44)); y += 15
    if hint:
        tw = f12.getlength(hint)
        d.text((Wp - m - tw, Hp - 26), hint, font=f12, fill=(58, 112, 200))
    return img

def text_bitmap(text, px=12):
    f = font(px)
    wpx = int(f.getlength(text)) + 2
    img = Image.new('1', (wpx, px + 4), 0)
    d = ImageDraw.Draw(img); d.fontmode = '1'
    d.text((0, 0), text, font=f, fill=1)
    a = np.array(img)
    rows = np.where(a.any(1))[0]; cols = np.where(a.any(0))[0]
    return a[rows.min():rows.max() + 1, cols.min():cols.max() + 1]

# ---------------------------------------------------------------- content
def parse_md(path):
    s = open(path, encoding='utf-8').read()
    m = re.match(r'^---\n(.*?)\n---\n(.*)$', s, re.S)
    meta = {}
    for line in m.group(1).splitlines():
        if ':' in line:
            k, v = line.split(':', 1); meta[k.strip()] = v.strip()
    meta['body'] = m.group(2).strip()
    meta['id'] = os.path.splitext(os.path.basename(path))[0]
    return meta

def load_news():
    d = os.path.join(ROOT, 'content', 'news')
    items = [parse_md(os.path.join(d, f)) for f in os.listdir(d) if f.endswith('.md')]
    items.sort(key=lambda m: (m.get('date', ''), m['id']), reverse=True)
    return items

def load_books():
    return json.load(open(os.path.join(OLD, 'data', 'books.json'), encoding='utf-8'))

# ---------------------------------------------------------------- structures
interactives = []   # world.json entries

def add_item(kind, box, **kw):
    e = dict(kind=kind, box=box); e.update(kw); interactives.append(e); return e

def plaza():
    fill(106, T + 1, 106, 150, H - 1, 150, AIR)
    fill(108, T, 108, 148, T, 148, DSLAB)
    for i in range(108, 149):
        for (x, z) in ((i, 108), (i, 148), (108, i), (148, i)): setb(x, T, z, STONE_BRICK)
    # checker ring
    for x in range(118, 139):
        for z in range(118, 139):
            if (x + z) % 2 == 0 and (x in (118, 138) or z in (118, 138)): setb(x, T, z, CERAMIC)
    # lamp posts at the corners
    for (x, z) in ((110, 110), (146, 110), (110, 146), (146, 146)):
        fill(x, T + 1, z, x, T + 3, z, LOG); setb(x, T + 4, z, GOLD_B)

def title_wall():
    """Giant block letters 「薛若米」 on a white wool billboard north of the plaza, facing +z (south)."""
    bm = text_bitmap('薛若米', 12)
    s = 2
    hh, ww = bm.shape[0] * s, bm.shape[1] * s
    x0 = 128 - ww // 2; y0 = T + 3; z = 98
    navy = paint((44, 58, 104), 'Hood navy')
    shade = paint((26, 34, 64), 'Deep navy')
    fill(x0 - 3, T + 1, z - 1, x0 + ww + 2, y0 + hh + 1, z - 1, WHITE_W)   # backing
    fill(x0 - 3, T + 1, z - 2, x0 + ww + 2, y0 + hh + 1, z - 2, PLANKS)
    for yy in range(T + 1, y0 + hh + 2):
        setb(x0 - 4, yy, z - 1, LOG); setb(x0 + ww + 3, yy, z - 1, LOG)
    fill(x0 - 4, y0 + hh + 2, z - 1, x0 + ww + 3, y0 + hh + 2, z - 1, LOG)
    for j in range(bm.shape[0]):
        for i in range(bm.shape[1]):
            if not bm[j, i]: continue
            for a in range(s):
                for b in range(s):
                    x, y = x0 + i * s + a, y0 + hh - 1 - (j * s + b)
                    setb(x, y, z, shade)        # letters are extruded 2 deep: dark core,
                    setb(x, y, z + 1, navy)     # navy face toward the plaza
    return [x0 - 4, T + 1, z - 1, x0 + ww + 3, y0 + hh + 2, z + 1]

MURAL = [  # 24 wide, hand-placed pixel portrait of the shark-hoodie character (left half mirrored)
    "...........n", "..........nN", ".........nNN", "......nnNNNN", "....nNNNNNNN", "...nNNNNNNNN",
    "..nNNNNWwWwW", "..NNNNWHHHHH", ".nNWWNWHHHHH", ".NWnWNWHHHHH", ".NNWWNWHSHHH", ".NNNNWHHSSHS",
    ".NNNNWHGGGGS", ".NNNNWHGSESG", ".NNNNWHGGGGS", ".nNNNWSSPSSS", "..NNNNWSSSSM", "..nNNNNWSSSS",
    "...nNNNNWWwW", "....nNNNNNNN", ".....nNNNNNw", "....NNNNNwww", "...NNNNNwwww", "..NNNNNwwwww",
    "..NNNNNwwwww", "..NNNNNwwwww"]
MURAL_COL = {'N': (44, 58, 104), 'n': (28, 36, 70), 'W': (248, 248, 248), 'w': (206, 214, 230),
             'H': (26, 26, 32), 'B': (60, 114, 228), 'S': (252, 224, 204), 'P': (240, 150, 160),
             'G': (40, 40, 48), 'E': (90, 52, 52), 'M': (210, 110, 116), 'O': (226, 150, 70), 'o': (170, 96, 40)}

def mural():
    rows = [r + r[::-1] for r in MURAL]
    grid = [list(r) for r in rows]
    for y in range(7, 11): grid[y][8] = 'B'                 # blue streak (viewer-left)
    for (x, y) in ((19, 8), (21, 8), (20, 9), (19, 10), (21, 10)): grid[y][x] = 'W'   # the 'x' on the hood
    for (x, y) in ((20, 8), (19, 9), (21, 9), (20, 10)): grid[y][x] = 'N'
    for k in range(6):                                       # baguette across the belly
        x, y = 15 - k, 20 + k
        if 0 <= y < 26: grid[y][x] = 'O'; grid[y][x + 1] = 'o' if k % 2 else 'O'
    hgt, wid = len(grid), len(grid[0])
    xw = 98            # wall plane, faces +x (east, toward plaza)
    z0 = 128 - wid // 2; y0 = T + 1
    sky_top, sky_bot = np.array((255, 240, 196)), np.array((250, 200, 132))
    fill(xw - 1, T + 1, z0 - 2, xw - 1, y0 + hgt + 1, z0 + wid + 1, PLANKS)
    for j in range(hgt):
        for i in range(wid):
            ch = grid[j][i]
            if ch == '.':
                k = j / (hgt - 1); c = sky_top * (1 - k) + sky_bot * k
                c = tuple(int(round(v / 12) * 12) for v in c)
                b = paint(c, 'Sky', True)
            else:
                b = paint(MURAL_COL[ch], 'Paint', True)
            # viewer looks -x, so viewer-right is -z
            setb(xw, y0 + hgt - 1 - j, z0 + wid - 1 - i, b)
    for y in range(T + 1, y0 + hgt + 1):
        setb(xw, y, z0 - 1, LOG); setb(xw, y, z0 + wid, LOG)
    fill(xw, y0 + hgt, z0 - 1, xw, y0 + hgt, z0 + wid, LOG)
    return [xw, T + 1, z0, xw, y0 + hgt - 1, z0 + wid - 1]

def post(x, z, y_top):
    for y in range(T + 1, y_top + 1): setb(x, y, z, LOG)

def gallery(news):
    fill(149, T, 125, 250, T, 131, GRAVEL)
    fill(149, T, 127, 250, T, 129, STONE_BRICK)
    # entrance arch with header board facing -x (toward the plaza)
    for z in (124, 132): fill(150, T + 1, z, 150, T + 6, z, LOG)
    fill(150, T + 7, 124, 150, T + 7, 132, LOG)
    hdr = board_image(7, 2, '最新动态 NEWS', '', '沿着这条路往东走，每块告示牌都是一条动态。', hint='')
    textured_panel(hdr, 150, T + 5, 125, 7, 2, '-x', 'News header')
    for i, n in enumerate(news):
        side = i % 2; x0 = 154 + (i // 2) * 11
        if x0 + 7 > 252: break
        if side == 0:
            z = 122; facing = '+z'
        else:
            z = 134; facing = '-z'
        img = board_image(7, 3, n['title'], n.get('date', ''), n['body'])
        post(x0, z, T + 2); post(x0 + 6, z, T + 2)
        box = textured_panel(img, x0, T + 3, z, 7, 3, facing, 'News')
        fill(x0, T + 6, z, x0 + 6, T + 6, z, SLAB)
        add_item('news', box, id=n['id'], title=n['title'], date=n.get('date', ''), body=n['body'], url=n.get('link', ''))
        # little lantern
        setb(x0 + 3, T + 1, z + (1 if side == 0 else -1), 0)

def library(books):
    x0, x1, z0, z1 = 112, 144, 156, 176
    fill(x0 - 2, T + 1, z0 - 2, x1 + 2, H - 1, z1 + 2, AIR)
    fill(x0, T, z0, x1, T, z1, PLANKS)
    for y in range(T + 1, T + 8):
        for x in range(x0, x1 + 1):
            for z in (z0, z1): setb(x, y, z, BOOKSHELF if y < T + 7 else PLANKS)
        for z in range(z0, z1 + 1):
            for x in (x0, x1): setb(x, y, z, BOOKSHELF if y < T + 7 else PLANKS)
    for x in range(x0, x1 + 1, 8):
        for z in (z0, z1): fill(x, T + 1, z, x, T + 7, z, LOG)
    for z in range(z0, z1 + 1, 10):
        for x in (x0, x1): fill(x, T + 1, z, x, T + 7, z, LOG)
    fill(x0, T + 8, z0, x1, T + 8, z1, PLANKS)
    fill(x0 + 2, T + 8, z0 + 2, x1 - 2, T + 8, z1 - 2, GLASS)      # glass roof → bright interior
    for x in range(x0 + 2, x1 - 1, 4):                               # windows
        fill(x, T + 3, z0, x + 1, T + 4, z0, GLASS)
    fill(127, T + 1, z0, 129, T + 3, z0, AIR)                       # door
    fill(127, T, 148, 129, T, z0 - 1, STONE_BRICK)                  # path from the plaza
    sign = board_image(7, 2, '书库 LIBRARY', '', '三部连载，进门后点书看简介，再点「去阅读」。', hint='')
    box = textured_panel(sign, 125, T + 4, z0 - 1, 7, 2, '-z', 'Library sign')
    add_item('info', box, title='书库', body='书库里有三部连载：' + '、'.join('《%s》' % b['title'] for b in books) + '。走进去，点一下书的封面就能看简介和入口。', url='/library.html')
    # book portals on the back wall, facing -z (toward the door)
    colors = [tuple(int(b['coverColor'][i:i + 2], 16) for i in (1, 3, 5)) for b in books]
    for k, b in enumerate(books):
        bx = 116 + k * 9
        fill(bx - 1, T + 1, z1 - 1, bx + 4, T + 6, z1 - 1, GOLD_B)
        cover = Image.new('RGBA', (4 * TS, 5 * TS), colors[k] + (255,))
        d = ImageDraw.Draw(cover); d.fontmode = '1'
        d.rectangle([8, 8, 4 * TS - 9, 5 * TS - 9], outline=(240, 226, 196), width=3)
        f24, f12 = font(24), font(12)
        y = 26
        for line in wrap(b['title'], f24, 4 * TS - 40)[:6]:
            d.text((20, y), line, font=f24, fill=(250, 244, 230)); y += 30
        d.text((20, y + 6), b['genre'], font=f12, fill=(236, 220, 190))
        d.text((20, 5 * TS - 40), '连载 · %d 章 ▶' % b['chapterCount'], font=f12, fill=(250, 244, 230))
        box = textured_panel(cover, bx, T + 1, z1 - 2, 4, 5, '-z', 'Book')
        add_item('book', box, id=b['id'], title='《%s》' % b['title'], date=b['genre'], body=b['blurb'],
                 url='/read.html?book=' + b['id'], cta='去阅读')
    # reading tables
    for (x, z) in ((120, 164), (136, 164)):
        fill(x, T + 1, z, x + 2, T + 1, z + 1, PLANKS); setb(x + 1, T + 2, z, BOOKSHELF)

def portal(x0, z, label, sub, color, url, kind='link', title=None, body=''):
    """5x5 obsidian frame + 3x3 textured center on the south edge of the plaza, facing -z."""
    fill(x0, T + 1, z, x0 + 4, T + 5, z, OBSIDIAN)
    img = Image.new('RGBA', (3 * TS, 3 * TS), color + (255,))
    d = ImageDraw.Draw(img); d.fontmode = '1'
    for k in range(0, 3 * TS, 12):
        d.line([(0, k), (3 * TS, k + 40)], fill=tuple(min(255, c + 18) for c in color) + (255,), width=3)
    f24, f12 = font(24), font(12)
    tw = f24.getlength(label); d.text(((3 * TS - tw) / 2, 64), label, font=f24, fill=(255, 255, 255))
    tw = f12.getlength(sub); d.text(((3 * TS - tw) / 2, 104), sub, font=f12, fill=(255, 255, 255))
    box = textured_panel(img, x0 + 1, T + 2, z, 3, 3, '-z', 'Portal')
    add_item(kind, box, title=title or label, body=body, url=url, cta='前往')

def welcome():
    img = board_image(9, 3, '欢迎来到「若米的方块世界」', '薛若米 · xueruo.me',
                      'WASD 移动，空格跳，鼠标看四周（手机用屏幕摇杆）。\n点击告示牌、书本或传送门（或者对准后按 E）会弹出详情。\n东边是最新动态长廊，南边是书库，西边是画像，北边是名字。\n方块可以随便拆和放，刷新页面就会复原。', hint='')
    post(124, 114, T + 2); post(132, 114, T + 2)
    box = textured_panel(img, 124, T + 3, 114, 9, 3, '+z', 'Welcome')
    add_item('info', box, title='欢迎来到「若米的方块世界」',
             body='这是薛若米（xueruo.me）的个人主页，做成了一个可以直接在浏览器里玩的复古方块世界。\n\n操作：WASD 移动，空格跳，鼠标看四周；点击告示牌、书本或传送门（或者对准后按 E）会弹出详情。手机上用屏幕摇杆，点一下牌子就能查看。\n\n东边：最新动态长廊；南边：书库和传送门；西边：画像；北边：名字。\n\n方块可以随便拆和放，只在你自己的浏览器里生效，刷新就复原。', url='')

def spawn_marker():
    for (x, z) in ((127, 133), (128, 133), (129, 133), (127, 134), (129, 134), (127, 135), (128, 135), (129, 135)):
        setb(x, T, z, GOLD_B)

# ---------------------------------------------------------------- NBT / ClassicWorld writer
def nbt_name(n): b = n.encode('utf-8'); return struct.pack('>H', len(b)) + b
def t_byte(n, v): return b'\x01' + nbt_name(n) + struct.pack('>B', v & 0xff)
def t_short(n, v): return b'\x02' + nbt_name(n) + struct.pack('>h', v)
def t_int(n, v): return b'\x03' + nbt_name(n) + struct.pack('>i', v)
def t_float(n, v): return b'\x05' + nbt_name(n) + struct.pack('>f', v)
def t_bytes(n, v): return b'\x07' + nbt_name(n) + struct.pack('>i', len(v)) + bytes(v)
def t_str(n, v): b = v.encode('utf-8'); return b'\x08' + nbt_name(n) + struct.pack('>H', len(b)) + b
def t_comp(n, *children): return b'\x0a' + nbt_name(n) + b''.join(children) + b'\x00'

def write_cw(path, spawn, yaw_deg, pitch_deg=0):
    flat = blocks.reshape(-1)          # (y*L + z)*W + x
    lo = (flat & 0xff).astype(np.uint8).tobytes()
    hi = (flat >> 8).astype(np.uint8)
    defs = []
    for d in custom_defs:
        tex = d['tex']
        tbytes = [t & 0xff for t in tex] + [(t >> 8) & 0xff for t in tex]
        defs.append(t_comp('Block%03X' % d['id'],
            t_byte('ID', d['id']), t_short('ID2', d['id']), t_str('Name', d['name']),
            t_byte('CollideType', 2), t_float('Speed', 1.0), t_bytes('Textures', tbytes),
            t_byte('TransmitsLight', 0), t_byte('WalkSound', d['sound']),
            t_byte('FullBright', 1 if d['fullbright'] else 0), t_byte('Shape', 16),
            t_byte('BlockDraw', d['draw']), t_bytes('Fog', [0xFF, 0, 0, 0]),
            t_bytes('Coords', [0, 0, 0, 16, 16, 16])))
    meta = t_comp('Metadata', t_comp('CPE',
        t_comp('ClickDistance', t_short('Distance', 8 * 32)),
        t_comp('EnvWeatherType', t_byte('WeatherType', 0)),
        t_comp('EnvMapAppearance', t_byte('SideBlock', BEDROCK), t_byte('EdgeBlock', STILL_WATER), t_short('SideLevel', WATER)),
        t_comp('BlockDefinitions', *defs)))
    parts = [t_byte('FormatVersion', 1), t_str('Name', 'xueruomi'), t_bytes('UUID', uuid.uuid5(uuid.NAMESPACE_DNS, 'xueruo.me').bytes),
             t_short('X', W), t_short('Y', H), t_short('Z', L),
             t_comp('MapGenerator', t_int('Seed', SEED), t_str('Software', 'xueruomi-blockworld')),
             t_comp('Spawn', t_short('X', spawn[0]), t_short('Y', spawn[1]), t_short('Z', spawn[2]),
                    t_byte('H', int(round(yaw_deg * 256 / 360)) & 0xff), t_byte('P', int(round(pitch_deg * 256 / 360)) & 0xff)),
             b'\x07' + nbt_name('BlockArray') + struct.pack('>i', len(lo)) + lo]
    if hi.any(): parts.append(b'\x07' + nbt_name('BlockArray2') + struct.pack('>i', len(hi)) + hi.tobytes())
    parts.append(meta)
    data = t_comp('ClassicWorld', *parts)
    with gzip.open(path, 'wb', compresslevel=9) as f: f.write(data)

# ---------------------------------------------------------------- texture pack
def write_texpack(path):
    out = zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED)
    for name in cc_zip.namelist():
        data = cc_zip.read(name)
        if name == 'terrain.png':
            buf = io.BytesIO(); atlas.save(buf, 'PNG'); data = buf.getvalue()
        elif name == 'animations.png':
            im = Image.open(io.BytesIO(data)); im = im.resize((im.width * TS // 16, im.height * TS // 16), Image.NEAREST)
            buf = io.BytesIO(); im.save(buf, 'PNG'); data = buf.getvalue()
        elif name == 'animations.txt':
            k = TS // 16; lines = []
            for line in data.decode().splitlines():
                p = line.split()
                if len(p) == 7 and not line.startswith('#'):
                    p[2], p[3], p[4] = str(int(p[2]) * k), str(int(p[3]) * k), str(int(p[4]) * k)
                    line = ' '.join(p)
                lines.append(line)
            data = '\n'.join(lines).encode()
        out.writestr(name, data)
    out.close()

# ---------------------------------------------------------------- old site (classic/, library, reader)
def copy_old_site():
    for d in ('css', 'js', 'data'):
        shutil.copytree(os.path.join(OLD, d), os.path.join(SITE, d), dirs_exist_ok=True)
    for f in ('library.html', 'read.html', 'ruomi.png'):
        shutil.copy(os.path.join(OLD, f), os.path.join(SITE, f))
    s = open(os.path.join(OLD, 'index.html'), encoding='utf-8').read()
    for a, b in (('"./css/', '"../css/'), ('"./js/', '"../js/'), ("'./data/", "'../data/"),
                 ('"./library.html"', '"../library.html"'), ('"./read.html', '"../read.html'), ('"./index.html"', '"./"')):
        s = s.replace(a, b)
    os.makedirs(os.path.join(SITE, 'classic'), exist_ok=True)
    open(os.path.join(SITE, 'classic', 'index.html'), 'w', encoding='utf-8').write(s)

# ---------------------------------------------------------------- html
def write_html(news, books):
    tpl = open(os.path.join(ROOT, 'gen', 'index.template.html'), encoding='utf-8').read()
    e = html.escape
    li = []
    for n in news:
        link = (' <a href="%s">链接</a>' % e(n['link'])) if n.get('link') else ''
        li.append('<li><time>%s</time> <strong>%s</strong><p>%s%s</p></li>' % (e(n.get('date', '')), e(n['title']), e(n['body']), link))
    bl = ''.join('<li><a href="/read.html?book=%s">《%s》</a> <span>%s</span><p>%s</p></li>' % (e(b['id']), e(b['title']), e(b['genre']), e(b['blurb'])) for b in books)
    s = tpl.replace('{{NEWS_LIST}}', '\n'.join(li)).replace('{{BOOK_LIST}}', bl)
    open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8').write(s)

# ---------------------------------------------------------------- main
def main():
    global octaves_cache
    os.makedirs(os.path.join(SITE, 'static'), exist_ok=True)
    news, books = load_news(), load_books()
    h, wgt = terrain()
    octaves_cache = octaves((L, W), 40, 2, SEED + 11)
    decorate(h, wgt)
    plaza(); spawn_marker(); welcome()
    intro = ('薛若米 / xuē ruò mǐ\n\n线条之外，还有一个小小的世界。这里是我的一角，也是与你相遇的一页。\n\n'
             '（画像是戴鲨鱼帽的我，抱着一根法棍。）')
    add_item('info', title_wall(), title='薛若米', body=intro, url='/classic/', cta='看看旧版主页')
    add_item('info', mural(), title='画像 · 鲨鱼帽的薛若米', body=intro, url='')
    gallery(news); library(books)
    portal(111, 150, 'bilibili', 'B 站个人空间', (251, 114, 153), 'https://space.bilibili.com/204339779', title='Bilibili 个人空间', body='哔哩哔哩 UID 204339779')
    portal(118, 150, 'GitHub', '@ViTa-Chara', (36, 41, 47), 'https://github.com/ViTa-Chara', title='GitHub @ViTa-Chara', body='代码和小工具都在这里。')
    portal(134, 150, '旧版主页', '纸页风 /classic/', (196, 160, 112), '/classic/', title='旧版主页（纸页风）', body='原来的 THE PERSONAL EDITION 纸页风主页，保留在 /classic/。')
    portal(141, 150, '文字版', '不玩也能看', (88, 120, 88), '#text', title='文字版', body='不想走路？打开文字版，所有动态和书目一页看完。')
    write_cw(os.path.join(SITE, 'world.cw'), (128, T + 2, 134), 0)
    write_texpack(os.path.join(SITE, 'static', 'default.zip'))
    json.dump({'version': 1, 'items': interactives}, open(os.path.join(SITE, 'world.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for f in ('ClassiCube.js', 'ClassiCube.wasm'):
        shutil.copy(os.path.join(CC, f), os.path.join(SITE, 'static', f))
    copy_old_site()
    write_html(news, books)
    print('custom blocks:', len(custom_defs), 'max id', next_id[0] - 1, 'tiles left', len(free_tiles), 'items', len(interactives))

if __name__ == '__main__':
    main()
