#!/usr/bin/env python3
"""
昊通机械 · 方块厂区 (xueruo.me) — site + world generator.

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
    d = np.minimum.reduce([rect_dist(62, 88, 252, 182)])
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

# ---------------------------------------------------------------- animated tiles (texture-pack animations)
anim_strips = []     # (tile id, [64x64 RGBA frames], tick delay)

def animated_panel(frames, x0, y0, z0, wblocks, hblocks, facing, name='Billboard', back=None, delay=1):
    """Like textured_panel but every tile is animated through `frames` (list of full-size RGBA images)."""
    back = PLANK_T if back is None else back
    fi = FACE_INDEX[facing]
    frames = [f.convert('RGBA') for f in frames]
    for j in range(hblocks):
        for i in range(wblocks):
            tiles = [f.crop((i * TS, j * TS, (i + 1) * TS, (j + 1) * TS)) for f in frames]
            t = new_tile(tiles[0])
            anim_strips.append((t, tiles, delay))
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

def gif_frames(path, wpx, hpx, step=1, bg=(236, 234, 228)):
    im = Image.open(path); out = []
    for i in range(0, im.n_frames, step):
        im.seek(i)
        f = im.convert('RGBA')
        base = Image.new('RGBA', f.size, bg + (255,)); base.alpha_composite(f)
        out.append(base.resize((wpx, hpx), Image.LANCZOS))
    return out

# ---------------------------------------------------------------- 昊通机械 material set (designed, not official)
STEEL = (122, 128, 138); STEEL_D = (52, 56, 64); ORANGE = (255, 122, 26); YELLOW = (247, 196, 24)
INK = (30, 34, 40); PANEL = (236, 234, 228)

def tex_img(fn):
    img = Image.new('RGBA', (TS, TS)); d = ImageDraw.Draw(img); fn(img, d); return img

def noise(img, amt=5, seed=1):
    a = np.array(img).astype(int); r = np.random.default_rng(seed)
    a[..., :3] += r.normal(0, amt, a.shape[:2] + (1,)).astype(int)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def _checker(img, d):
    d.rectangle([0, 0, TS, TS], fill=(138, 142, 150))
    for yy in range(0, TS, 16):
        for xx in range(0, TS, 16):
            ox = 8 if (yy // 16) % 2 else 0
            cx, cy = (xx + ox) % TS + 4, yy + 8
            d.line([(cx - 3, cy + 3), (cx + 3, cy - 3)], fill=(178, 182, 190), width=3)
            d.line([(cx - 2, cy + 4), (cx + 4, cy - 2)], fill=(96, 100, 108), width=1)
    d.rectangle([0, 0, TS - 1, TS - 1], outline=(104, 108, 116), width=2)

def _hazard(img, d):
    d.rectangle([0, 0, TS, TS], fill=YELLOW)
    for k in range(-TS, 2 * TS, 32):
        d.polygon([(k, 0), (k + 16, 0), (k + 16 - TS, TS), (k - TS, TS)], fill=INK)

def _plate(col, rivets=True, edge=None):
    def f(img, d):
        d.rectangle([0, 0, TS, TS], fill=col)
        e = edge or tuple(max(0, c - 34) for c in col)
        d.rectangle([0, 0, TS - 1, TS - 1], outline=e, width=3)
        d.line([(3, 3), (TS - 4, 3)], fill=tuple(min(255, c + 30) for c in col), width=1)
        if rivets:
            for (x, y) in ((8, 8), (TS - 9, 8), (8, TS - 9), (TS - 9, TS - 9)):
                d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=tuple(min(255, c + 40) for c in col), outline=e)
    return f

def _lattice(img, d):
    c, e = YELLOW, (176, 130, 8)
    d.rectangle([0, 0, TS - 1, TS - 1], outline=e, width=6)
    d.rectangle([2, 2, TS - 3, TS - 3], outline=c, width=4)
    d.line([(4, 4), (TS - 5, TS - 5)], fill=c, width=5)
    d.line([(4, TS - 5), (TS - 5, 4)], fill=c, width=5)

def _concrete(img, d):
    d.rectangle([0, 0, TS, TS], fill=(188, 186, 180))
    d.rectangle([0, 0, TS - 1, TS - 1], outline=(166, 164, 158), width=1)

def _belt_frame(k):
    def f(img, d):
        d.rectangle([0, 0, TS, TS], fill=(44, 46, 52))
        for yy in range(-16, TS + 16, 16):
            y = (yy + k * 2) % (TS + 16) - 8
            d.rectangle([4, y, TS - 5, y + 5], fill=(70, 72, 80))
        d.rectangle([0, 0, 5, TS], fill=YELLOW); d.rectangle([TS - 6, 0, TS, TS], fill=YELLOW)
        for y in range(0, TS, 16): d.rectangle([0, y, 5, y + 7], fill=INK); d.rectangle([TS - 6, y + 8, TS, y + 15], fill=INK)
    return f

def _belt_side(img, d):
    d.rectangle([0, 0, TS, TS], fill=STEEL_D)
    for x in range(8, TS, 16): d.ellipse([x - 6, 22, x + 6, 34], fill=(150, 154, 162), outline=INK)
    d.rectangle([0, 0, TS, 6], fill=(44, 46, 52))

def _light(img, d):
    d.rectangle([0, 0, TS, TS], fill=(255, 176, 40))
    d.rectangle([10, 10, TS - 11, TS - 11], fill=(255, 230, 150))
    d.rectangle([0, 0, TS - 1, TS - 1], outline=STEEL_D, width=6)

MAT = {}
def materials():
    def blk(name, img, draw=0, fb=False, sound=7, sides=None, top=None):
        t = new_tile(noise(img, 3, len(MAT) + 7) if draw == 0 else img)
        tex = [t] * 6
        if top is not None: tex[0] = top
        if sides is not None: tex[2:6] = [sides] * 4
        MAT[name] = new_block(name, tex, fullbright=fb, sound=sound, draw=draw)
    blk('checker', tex_img(_checker))
    blk('hazard', tex_img(_hazard))
    blk('steel', tex_img(_plate(STEEL)))
    blk('steel_d', tex_img(_plate(STEEL_D)))
    blk('orange', tex_img(_plate(ORANGE)))
    blk('yellow', tex_img(_plate(YELLOW, rivets=False)))
    blk('lattice', tex_img(_lattice), draw=1)
    blk('concrete', tex_img(_concrete), sound=5)
    blk('light', tex_img(_light), fb=True)
    # conveyor: animated top
    frames = [tex_img(_belt_frame(k)) for k in range(8)]
    tb = new_tile(frames[0]); anim_strips.append((tb, frames, 0))
    ts = new_tile(tex_img(_belt_side))
    MAT['belt'] = new_block('Conveyor', [tb, MAT_TILE_STEEL_D(), ts, ts, ts, ts], sound=7)

def MAT_TILE_STEEL_D():
    return [d for d in custom_defs if d['id'] == MAT['steel_d']][0]['tex'][0]

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

def hazard_band(d, x0, y0, x1, y1, step=16):
    d.rectangle([x0, y0, x1, y1], fill=YELLOW)
    hgt = y1 - y0
    for k in range(x0 - hgt, x1 + step, step * 2):
        d.polygon([(k, y1), (k + step, y1), (k + step + hgt, y0), (k + hgt, y0)], fill=INK)
    d.rectangle([x1 + 1, y0, x1 + step * 3, y1], fill=STEEL_D)   # clip overflow (covered by frame anyway)

def rivets(d, Wp, Hp, inset=12, col=(150, 154, 162)):
    for (x, y) in ((inset, inset), (Wp - inset - 1, inset), (inset, Hp - inset - 1), (Wp - inset - 1, Hp - inset - 1)):
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=col, outline=INK)

def board_image(wb, hb, title, date='', body='', hint='点击 / E 查看 ▶', accent=INK, tag=''):
    """Industrial notice board: steel frame, hazard-stripe header, light enamel panel."""
    img = Image.new('RGBA', (wb * TS, hb * TS), PANEL + (255,))
    d = ImageDraw.Draw(img); d.fontmode = '1'
    Wp, Hp = img.size
    d.rectangle([0, 0, Wp - 1, Hp - 1], outline=STEEL_D, width=8)
    d.rectangle([8, 8, Wp - 9, Hp - 9], outline=(170, 172, 176), width=1)
    hazard_band(d, 8, 8, Wp - 9, 17)
    d.rectangle([Wp - 8, 0, Wp - 1, Hp - 1], fill=STEEL_D)
    rivets(d, Wp, Hp, 4)
    y = 24; m = 18
    f24, f12 = font(24), font(12)
    if tag:
        tw = f12.getlength(tag)
        d.rectangle([Wp - m - tw - 8, y, Wp - m, y + 16], fill=ORANGE); d.text((Wp - m - tw - 4, y + 1), tag, font=f12, fill=(255, 255, 255))
    for line in wrap(title, f24, Wp - 2 * m - (60 if tag else 0))[:2]:
        d.text((m, y), line, font=f24, fill=accent); y += 28
    if date:
        d.text((m, y + 2), date, font=f12, fill=(214, 92, 14)); y += 20
    if body:
        maxl = max(1, (Hp - y - 26) // 15)
        lines = wrap(body, f12, Wp - 2 * m)
        if len(lines) > maxl: lines = lines[:maxl]; lines[-1] = lines[-1][:-1] + '…'
        for line in lines:
            d.text((m, y), line, font=f12, fill=(48, 50, 54)); y += 15
    if hint:
        tw = f12.getlength(hint)
        d.text((Wp - m - tw, Hp - 28), hint, font=f12, fill=(214, 92, 14))
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
    fill(100, T + 1, 104, 156, H - 1, 152, AIR)
    fill(108, T, 108, 148, T, 148, MAT['checker'])
    for i in range(108, 149):
        for (x, z) in ((i, 108), (i, 148), (108, i), (148, i)): setb(x, T, z, MAT['hazard'])
    for x in range(118, 139):
        for z in range(118, 139):
            if x in (118, 138) or z in (118, 138): setb(x, T, z, MAT['steel_d'])
    # industrial lamp posts
    for (x, z) in ((110, 110), (146, 110), (110, 146), (146, 146)):
        fill(x, T + 1, z, x, T + 4, z, MAT['steel_d']); setb(x, T + 5, z, MAT['light'])

def spawn_marker():
    for x in range(126, 131):
        for z in range(132, 137): setb(x, T, z, MAT['hazard'] if x in (126, 130) or z in (132, 136) else MAT['yellow'])

FONT57 = {
    'H': ["X...X", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
    'A': [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
    'O': [".XXX.", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
    'T': ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "..X.."],
    'N': ["X...X", "XX..X", "XX..X", "X.X.X", "X..XX", "X..XX", "X...X"],
    'G': [".XXX.", "X...X", "X....", "X.XXX", "X...X", "X...X", ".XXX."],
}

def gear(cx, cy, z, r, teeth=8, body=None, hub=None):
    body = body or MAT['steel']; hub = hub or MAT['orange']
    for dy in range(-r - 2, r + 3):
        for dx in range(-r - 2, r + 3):
            rr = math.hypot(dx, dy); ang = math.atan2(dy, dx)
            tooth = math.cos(ang * teeth) > 0.35
            if rr <= r or (rr <= r + 2 and tooth):
                b = body
                if rr <= 2.2: b = hub
                elif 2.2 < rr <= 3.2: b = MAT['steel_d']
                elif r - 2.5 < rr <= r - 1.5 and int(math.degrees(ang)) % 45 < 22: b = MAT['steel_d']
                setb(cx + dx, cy + dy, z, b)

def title_wall():
    """HAOTONG in block letters (yellow face, orange core) + rendered 「昊通机械」 sign, facing +z."""
    word = 'HAOTONG'; s = 2
    ww = len(word) * 5 * s + (len(word) - 1) * s
    x0 = 128 - ww // 2; z = 98; ytop = T + 26
    fill(x0 - 4, T + 1, z - 1, x0 + ww + 3, T + 27, z - 1, MAT['steel_d'])     # backing
    fill(x0 - 4, T + 1, z - 2, x0 + ww + 3, T + 27, z - 2, MAT['steel'])
    fill(x0 - 4, T + 1, z - 1, x0 + ww + 3, T + 2, z - 1, MAT['hazard'])
    fill(x0 - 4, T + 27, z - 1, x0 + ww + 3, T + 27, z - 1, MAT['hazard'])
    for x in (x0 - 5, x0 + ww + 4): fill(x, T + 1, z - 1, x, T + 27, z - 1, MAT['lattice'])
    for k, ch in enumerate(word):
        g = FONT57[ch]
        for j in range(7):
            for i in range(5):
                if g[j][i] != 'X': continue
                for a in range(s):
                    for b in range(s):
                        x = x0 + k * 6 * s + i * s + a; y = ytop - (j * s + b)
                        setb(x, y, z, MAT['orange']); setb(x, y, z + 1, MAT['yellow'])
    # rendered nameplate under the letters
    wb, hb = 12, 3
    img = Image.new('RGBA', (wb * TS, hb * TS), STEEL_D + (255,))
    d = ImageDraw.Draw(img); d.fontmode = '1'
    Wp, Hp = img.size
    hazard_band(d, 0, 0, Wp - 1, 11); hazard_band(d, 0, Hp - 12, Wp - 1, Hp - 1)
    d.rectangle([Wp - 1, 0, Wp - 1, Hp], fill=STEEL_D)
    f48, f24, f12 = font(48), font(24), font(12)
    d.text((28, 30), '昊通机械', font=f48, fill=YELLOW)
    d.text((32 + f48.getlength('昊通机械') + 18, 40), 'HAOTONG MACHINE', font=f24, fill=(240, 240, 240))
    d.text((32 + f48.getlength('昊通机械') + 18, 74), '方块厂区 · 薛若米 / xueruo.me', font=f24, fill=ORANGE)
    d.text((30, Hp - 40), 'HT · EST. NANJING · 精工 · 稳健 · 通达', font=f12, fill=(170, 176, 186))
    rivets(d, Wp, Hp, 22)
    bx = 128 - wb // 2
    box = textured_panel(img, bx, T + 7, z, wb, hb, '+z', 'Nameplate', back=MAT_TILE_STEEL_D())
    gear(x0 - 14, T + 14, z, 6, teeth=8)
    gear(x0 + ww + 13, T + 14, z, 6, teeth=8)
    gear(x0 + ww + 8, T + 23, z, 3, teeth=6, body=MAT['orange'], hub=MAT['steel_d'])
    return [x0 - 21, T + 1, z - 1, x0 + ww + 21, T + 27, z + 1]

def billboard_frame(x0, y0, z, wb, hb):
    """Steel frame + hazard top around a panel at (x0..x0+wb-1, y0..y0+hb-1) on plane z (posts to the ground)."""
    for y in range(T + 1, y0 + hb + 1):
        setb(x0 - 1, y, z, MAT['steel_d']); setb(x0 + wb, y, z, MAT['steel_d'])
    fill(x0 - 1, y0 + hb, z, x0 + wb, y0 + hb, z, MAT['hazard'])
    fill(x0, y0 - 1, z, x0 + wb - 1, y0 - 1, z, MAT['steel_d'])
    fill(x0 - 1, y0 - 1, z - 1, x0 + wb, y0 + hb, z - 1, MAT['steel'])    # back plate
    setb(x0 - 1, y0 + hb + 1, z, MAT['light']); setb(x0 + wb, y0 + hb + 1, z, MAT['light'])

def make_logo():
    """Designed HT mark (no official 昊通机械 logo found): yellow gear ring + HT on dark steel."""
    S = 256; img = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, S - 1, S - 1], 36, fill=STEEL_D + (255,))
    c = S / 2
    for k in range(12):
        a = k * math.pi / 6
        pts = []
        for da, rr in ((-0.13, 96), (-0.09, 116), (0.09, 116), (0.13, 96)):
            pts.append((c + rr * math.cos(a + da), c + rr * math.sin(a + da)))
        d.polygon(pts, fill=YELLOW + (255,))
    d.ellipse([c - 100, c - 100, c + 100, c + 100], fill=YELLOW + (255,))
    d.ellipse([c - 78, c - 78, c + 78, c + 78], fill=STEEL_D + (255,))
    u = 11; ox = int(c - (11 * u) / 2); oy = int(c - (7 * u) / 2)
    for k, ch in enumerate('HT'):
        g = FONT57[ch]
        for j in range(7):
            for i in range(5):
                if g[j][i] == 'X':
                    x = ox + (k * 6 + i) * u; y = oy + j * u
                    d.rectangle([x, y, x + u - 1, y + u - 1], fill=(255, 255, 255, 255) if k == 0 else ORANGE + (255,))
    os.makedirs(os.path.join(SITE, 'media'), exist_ok=True)
    img.save(os.path.join(SITE, 'media', 'ht-logo.png'))
    img.resize((64, 64), Image.LANCZOS).save(os.path.join(SITE, 'media', 'ht-logo-64.png'))

def gif_billboards():
    a = os.path.join(ROOT, 'gifs', 'a.gif'); b = os.path.join(ROOT, 'gifs', 'b.gif')
    os.makedirs(os.path.join(SITE, 'media'), exist_ok=True)
    shutil.copy(a, os.path.join(SITE, 'media', 'shark-baguette.gif'))
    shutil.copy(b, os.path.join(SITE, 'media', 'shark-cat.gif'))
    # A: 500x428 → 7x6 tiles (448x384, same aspect), every 2nd frame at 100 ms
    fa = gif_frames(a, 7 * TS, 6 * TS, step=2)
    box = animated_panel(fa, 104, T + 3, 115, 7, 6, '+z', 'GIF A', back=MAT_TILE_STEEL_D(), delay=1)
    billboard_frame(104, T + 3, 115, 7, 6)
    box = [103, T + 2, 115, 111, T + 9, 115]      # include the frame so near-misses still open it
    add_item('media', box, title='鲨鱼帽 · 法棍散步', img='/media/shark-baguette.gif',
             body='这张动图原样挂在厂区入口（游戏里是缩小后的逐帧版本，这里是原图）。', url='/media/shark-baguette.gif', cta='打开原图')
    # B: 200x200 → 5x5 tiles, all 12 frames at 100 ms
    fb = gif_frames(b, 5 * TS, 5 * TS, step=1)
    box = animated_panel(fb, 147, T + 4, 115, 5, 5, '+z', 'GIF B', back=MAT_TILE_STEEL_D(), delay=1)
    billboard_frame(147, T + 4, 115, 5, 5)
    box = [146, T + 3, 115, 152, T + 9, 115]
    add_item('media', box, title='鲨鱼帽 · 抱猫', img='/media/shark-cat.gif',
             body='这张动图原样挂在厂区入口（游戏里是逐帧动画，这里是原图）。', url='/media/shark-cat.gif', cta='打开原图')

def post(x, z, y_top, b=None):
    for y in range(T + 1, y_top + 1): setb(x, y, z, b or MAT['steel_d'])

def tower_crane(cx, cz):
    top = T + 24
    for y in range(T + 1, top):
        for dx in (0, 1):
            for dz in (0, 1): setb(cx + dx, y, cz + dz, MAT['lattice'])
    fill(cx - 1, T, cz - 1, cx + 2, T, cz + 2, MAT['concrete'])
    fill(cx - 1, top - 3, cz - 1, cx + 2, top - 1, cz + 2, MAT['orange'])            # cab
    fill(cx - 1, top - 2, cz + 2, cx + 2, top - 2, cz + 2, GLASS)
    fill(cx - 22, top, cz, cx + 12, top, cz + 1, MAT['lattice'])                    # jib + counter-jib
    fill(cx, top + 1, cz, cx + 1, top + 3, cz + 1, MAT['lattice'])                   # apex
    fill(cx + 9, top - 2, cz, cx + 12, top - 1, cz + 1, MAT['concrete'])            # counterweight
    hx = cx - 18
    for y in range(T + 9, top): setb(hx, y, cz, ROPE)
    fill(hx - 1, T + 7, cz - 1, hx + 1, T + 8, cz + 1, CRATE)
    setb(hx, T + 9, cz, MAT['yellow'])
    setb(cx - 22, top + 1, cz, MAT['light']); setb(cx + 2, top + 4, cz, MAT['light'])

def gallery(news):
    fill(149, T, 124, 252, T, 132, MAT['concrete'])
    fill(149, T, 125, 252, T, 125, MAT['hazard']); fill(149, T, 131, 252, T, 131, MAT['hazard'])
    fill(152, T, 128, 252, T, 128, MAT['belt'])                                     # conveyor down the middle
    for x in range(160, 252, 13): setb(x, T + 1, 128, CRATE)
    for z in (124, 132): fill(150, T + 1, z, 150, T + 6, z, MAT['lattice'])
    fill(150, T + 7, 124, 150, T + 7, 132, MAT['hazard'])
    hdr = board_image(7, 2, '厂区公告 NEWS', '', '沿着传送带往东走，每块公告牌都是一条最新动态。', hint='')
    textured_panel(hdr, 150, T + 5, 125, 7, 2, '-x', 'News header', back=MAT_TILE_STEEL_D())
    for i, n in enumerate(news):
        side = i % 2; x0 = 154 + (i // 2) * 11
        if x0 + 7 > 252: break
        z, facing = (121, '+z') if side == 0 else (135, '-z')
        img = board_image(6, 3, n['title'], n.get('date', ''), n['body'], tag='NO.%02d' % (i + 1))
        post(x0 - 1, z, T + 5); post(x0 + 6, z, T + 5)
        box = textured_panel(img, x0, T + 3, z, 6, 3, facing, 'News', back=MAT_TILE_STEEL_D())
        fill(x0 - 1, T + 6, z, x0 + 6, T + 6, z, MAT['hazard'])
        setb(x0 - 1, T + 7, z, MAT['light'])
        add_item('news', box, id=n['id'], title=n['title'], date=n.get('date', ''), body=n['body'], url=n.get('link', ''))

def workshop():
    """West: 一号车间 — sawtooth-roof assembly hall, open toward the plaza (east)."""
    x0, x1, z0, z1 = 78, 99, 112, 144
    fill(x0 - 1, T + 1, z0 - 1, x1 + 1, H - 1, z1 + 1, AIR)
    fill(x0, T, z0, x1, T, z1, MAT['concrete'])
    for y in range(T + 1, T + 9):
        for x in range(x0, x1 + 1):
            setb(x, y, z0, BRICK); setb(x, y, z1, BRICK)
        for z in range(z0, z1 + 1): setb(x0, y, z, BRICK)
    for z in range(z0, z1 + 1, 4): fill(x1, T + 1, z, x1, T + 8, z, MAT['steel_d'])   # open steel front
    fill(x1, T + 9, z0, x1, T + 9, z1, MAT['hazard'])
    for x in range(x0 + 2, x1 - 1, 5): fill(x, T + 4, z0, x + 2, T + 6, z0, GLASS); fill(x, T + 4, z1, x + 2, T + 6, z1, GLASS)
    # sawtooth roof running north-south
    for k, x in enumerate(range(x0, x1 + 1)):
        ph = k % 6
        y = T + 9 + (ph if ph < 5 else 0)
        fill(x, T + 9, z0, x, y, z1, AIR)
        fill(x, y, z0, x, y, z1, MAT['steel'] if ph < 5 else GLASS)
        if ph == 5: fill(x, T + 9, z0, x, T + 13, z1, GLASS)
    # chimney
    fill(x0 + 2, T + 1, z1 - 4, x0 + 4, H - 4, z1 - 2, BRICK)
    fill(x0 + 2, H - 6, z1 - 4, x0 + 4, H - 5, z1 - 2, MAT['hazard'])
    # inside: machines, conveyor, crates
    fill(x0 + 3, T, 127, x1 - 1, T, 129, MAT['belt'])
    for (mx, mz) in ((84, 117), (90, 117), (84, 137), (90, 137)):
        fill(mx, T + 1, mz, mx + 3, T + 2, mz + 3, MAT['steel']); fill(mx + 1, T + 3, mz + 1, mx + 2, T + 4, mz + 2, MAT['orange'])
        setb(mx + 3, T + 3, mz, MAT['light'])
    for (cx, cz) in ((94, 114), (95, 114), (94, 115), (81, 142), (82, 142)): setb(cx, T + 1, cz, CRATE)
    sign = board_image(7, 2, '一号车间 ASSEMBLY', '', '昊通机械 · 方块装配线。点我看看厂区介绍。', hint='')
    box = textured_panel(sign, x1 + 1, T + 10, 125, 7, 2, '+x', 'Workshop sign', back=MAT_TILE_STEEL_D())
    return box

def library(books):
    """South: the red-brick, Soviet-style 开发部大楼 houses the 资料室 (library)."""
    x0, x1, z0, z1 = 112, 144, 156, 176
    fill(x0 - 2, T + 1, z0 - 2, x1 + 2, H - 1, z1 + 2, AIR)
    fill(x0, T, z0, x1, T, z1, PLANKS)
    top = T + 12
    for y in range(T + 1, top + 1):
        for x in range(x0, x1 + 1):
            for z in (z0, z1): setb(x, y, z, BRICK)
        for z in range(z0, z1 + 1):
            for x in (x0, x1): setb(x, y, z, BRICK)
    for y in (T + 6, top): fill(x0, y, z0, x1, y, z0, MAT['concrete'])           # stone string courses
    for y in (T + 6, top): fill(x0, y, z1, x1, y, z1, MAT['concrete'])
    for x in range(x0 + 2, x1 - 1, 4):                                              # two rows of windows
        if 126 <= x <= 130: continue
        fill(x, T + 3, z0, x + 1, T + 4, z0, GLASS); fill(x, T + 8, z0, x + 1, T + 10, z0, GLASS)
    fill(x0, top + 1, z0, x1, top + 1, z1, MAT['steel_d'])
    fill(x0 + 2, top + 1, z0 + 2, x1 - 2, top + 1, z1 - 2, GLASS)
    fill(x0 - 1, top + 2, z0 - 1, x1 + 1, top + 2, z0 - 1, MAT['concrete'])
    # inside: bookshelves line the walls
    for y in range(T + 1, T + 6):
        for x in range(x0 + 1, x1):
            setb(x, y, z1 - 1, BOOKSHELF)
        for z in range(z0 + 1, z1):
            setb(x0 + 1, y, z, BOOKSHELF); setb(x1 - 1, y, z, BOOKSHELF)
    fill(x0 + 1, T + 6, z0 + 1, x1 - 1, T + 6, z1 - 1, AIR)
    fill(127, T + 1, z0, 129, T + 4, z0, AIR)                                       # door
    fill(127, T, 148, 129, T, z0 - 1, MAT['concrete'])
    sign = board_image(7, 2, '资料室 LIBRARY', '', '开发部大楼一层 · 三部连载，进门点书看简介。', hint='')
    box = textured_panel(sign, 125, T + 6, z0 - 1, 7, 2, '-z', 'Library sign', back=MAT_TILE_STEEL_D())
    add_item('info', box, title='资料室（书库）', body='开发部大楼一层是资料室，书架上有三部连载：' + '、'.join('《%s》' % b['title'] for b in books) + '。走进去，点一下书的封面就能看简介和入口。', url='/library.html', cta='打开书库')
    colors = [tuple(int(b['coverColor'][i:i + 2], 16) for i in (1, 3, 5)) for b in books]
    for k, b in enumerate(books):
        bx = 117 + k * 9
        fill(bx - 1, T + 1, z1 - 2, bx + 3, T + 6, z1 - 2, MAT['steel_d'])
        cover = Image.new('RGBA', (3 * TS, 4 * TS), colors[k] + (255,))
        d = ImageDraw.Draw(cover); d.fontmode = '1'
        d.rectangle([6, 6, 3 * TS - 7, 4 * TS - 7], outline=(240, 226, 196), width=3)
        f24, f12 = font(24), font(12)
        y = 20
        for line in wrap(b['title'], f24, 3 * TS - 32)[:5]:
            d.text((16, y), line, font=f24, fill=(250, 244, 230)); y += 28
        d.text((16, y + 4), b['genre'], font=f12, fill=(236, 220, 190))
        d.text((16, 4 * TS - 34), '%d 章 · 去阅读 ▶' % b['chapterCount'], font=f12, fill=(250, 244, 230))
        box = textured_panel(cover, bx, T + 2, z1 - 3, 3, 4, '-z', 'Book', back=MAT_TILE_STEEL_D())
        add_item('book', box, id=b['id'], title='《%s》' % b['title'], date=b['genre'], body=b['blurb'],
                 url='/read.html?book=' + b['id'], cta='去阅读')
    for (x, z) in ((120, 164), (136, 164)):
        fill(x, T + 1, z, x + 2, T + 1, z + 1, MAT['steel']); setb(x + 1, T + 2, z, MAT['light'])

def portal(x0, z, label, sub, color, url, kind='link', title=None, body=''):
    """Control-panel gate: hazard frame + dark 'screen' with a brand-colour bezel, facing -z."""
    fill(x0, T + 1, z, x0 + 4, T + 5, z, MAT['hazard'])
    fill(x0, T + 1, z + 1, x0 + 4, T + 5, z + 1, MAT['steel_d'])
    img = Image.new('RGBA', (3 * TS, 3 * TS), (24, 28, 34, 255))
    d = ImageDraw.Draw(img); d.fontmode = '1'
    d.rectangle([0, 0, 3 * TS - 1, 3 * TS - 1], outline=color, width=8)
    for k in range(14, 3 * TS - 14, 6): d.line([(14, k), (3 * TS - 15, k)], fill=(30, 36, 44))
    f24, f12 = font(24), font(12)
    tw = f24.getlength(label); d.text(((3 * TS - tw) / 2, 58), label, font=f24, fill=(255, 255, 255))
    tw = f12.getlength(sub); d.text(((3 * TS - tw) / 2, 98), sub, font=f12, fill=color)
    tw = f12.getlength('▶ ENTER'); d.text(((3 * TS - tw) / 2, 140), '▶ ENTER', font=f12, fill=YELLOW)
    box = textured_panel(img, x0 + 1, T + 2, z, 3, 3, '-z', 'Portal', back=MAT_TILE_STEEL_D())
    add_item(kind, box, title=title or label, body=body, url=url, cta='前往')

WELCOME_BODY = ('这是薛若米（xueruo.me）的个人主页，做成了一个可以直接在浏览器里玩的复古方块世界，主题是「昊通机械 HaoTong Machine」的方块厂区。\n\n'
                '操作：WASD 移动，空格跳，鼠标看四周；点击公告牌、书本、动图或控制台（或者对准后按 E）会弹出详情。手机上用屏幕摇杆，点一下牌子就能查看。\n\n'
                '入口两侧：两张动图；北边：HAOTONG 厂牌；东边：厂区公告（最新动态）；南边：开发部大楼资料室和传送控制台；西边：一号车间。\n\n'
                '方块可以随便拆和放，只在你自己的浏览器里生效，刷新就复原。')

def welcome():
    img = board_image(9, 3, '欢迎来到 昊通机械 · 方块厂区', '薛若米 · xueruo.me · HAOTONG MACHINE',
                      'WASD 移动，空格跳，鼠标看四周（手机用屏幕摇杆）。\n点击公告牌、书本、动图或控制台（或对准后按 E）会弹出详情。\n东：厂区公告　南：资料室与传送台　西：一号车间　北：厂牌\n方块可以随便拆和放，刷新页面就会复原。', hint='')
    post(123, 114, T + 5); post(133, 114, T + 5)
    box = textured_panel(img, 124, T + 3, 114, 9, 3, '+z', 'Welcome', back=MAT_TILE_STEEL_D())
    fill(123, T + 6, 114, 133, T + 6, 114, MAT['hazard'])
    add_item('info', box, title='欢迎来到 昊通机械 · 方块厂区', body=WELCOME_BODY, url='')

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
            t_byte('TransmitsLight', 1 if d['draw'] else 0), t_byte('WalkSound', d['sound']),
            t_byte('FullBright', 1 if d['fullbright'] else 0), t_byte('Shape', 16),
            t_byte('BlockDraw', d['draw']), t_bytes('Fog', [0xFF, 0, 0, 0]),
            t_bytes('Coords', [0, 0, 0, 16, 16, 16])))
    meta = t_comp('Metadata', t_comp('CPE',
        t_comp('ClickDistance', t_short('Distance', 12 * 32)),
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
    """cc_textures (ClassiCube's own art) upscaled to 64px tiles + our atlas + packed animations."""
    k = TS // 16
    base_anim = Image.open(io.BytesIO(cc_zip.read('animations.png'))).convert('RGBA')
    base_anim = base_anim.resize((base_anim.width * k, base_anim.height * k), Image.NEAREST)
    strips = []   # (tileX, tileY, [frames], delay)
    for line in cc_zip.read('animations.txt').decode().splitlines():
        p = line.split()
        if len(p) != 7 or line.startswith('#'): continue
        tx, ty, fx, fy, sz, cnt, dl = map(int, p)
        if (tx, ty) == (6, 2): continue          # fire: not used in this world, saves a 2k-wide row
        frames = [base_anim.crop(((fx + i * sz) * k, fy * k, (fx + (i + 1) * sz) * k, fy * k + sz * k)) for i in range(cnt)]
        strips.append((tx, ty, frames, dl))
    for (t, frames, dl) in anim_strips:
        strips.append((t % 16, t // 16, frames, dl))
    width = max(len(f) for (_, _, f, _) in strips) * TS
    # shelf packing, longest strips first
    rows = []   # [used_width, [(x, strip)]]
    for st in sorted(strips, key=lambda s: -len(s[2])):
        wpx = len(st[2]) * TS
        for r in rows:
            if r[0] + wpx <= width: r[1].append((r[0], st)); r[0] += wpx; break
        else:
            rows.append([wpx, [(0, st)]])
    sheet = Image.new('RGBA', (width, len(rows) * TS), (0, 0, 0, 0))
    lines = ['# generated by gen/build.py: <TileX> <TileY> <FrameX> <FrameY> <Size> <Count> <Delay>']
    for ri, r in enumerate(rows):
        for (x, (tx, ty, frames, dl)) in r[1]:
            for i, f in enumerate(frames): sheet.paste(f, (x + i * TS, ri * TS))
            lines.append('%d %d %d %d %d %d %d' % (tx, ty, x, ri * TS, TS, len(frames), dl))
    # palette PNG keeps the download small (ClassiCube decodes indexed PNGs)
    sheet_p = sheet.convert('RGB').quantize(256, method=Image.MEDIANCUT, dither=Image.NONE)
    out = zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED)
    for name in cc_zip.namelist():
        data = cc_zip.read(name)
        if name == 'terrain.png':
            buf = io.BytesIO(); atlas.save(buf, 'PNG', optimize=True); data = buf.getvalue()
        elif name == 'animations.png':
            buf = io.BytesIO(); sheet_p.save(buf, 'PNG', optimize=True); data = buf.getvalue()
        elif name == 'animations.txt':
            data = '\n'.join(lines).encode()
        out.writestr(name, data)
    out.close()
    print('animations:', len(strips), 'strips, sheet', sheet.size)

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
    materials(); make_logo()
    plaza(); spawn_marker(); welcome()
    intro = ('昊通机械 HaoTong Machine\n\n这里是薛若米（xueruo.me）的方块厂区：精工、稳健、通达。\n'
             '厂牌、齿轮、塔吊和传送带都是为这个世界设计的；昊通机械没有公开的官方标志，这里的 HT 标识和配色是自制的。')
    add_item('info', title_wall(), title='昊通机械 HaoTong Machine', body=intro, url='/classic/', cta='看看旧版主页')
    add_item('info', workshop(), title='一号车间 · 方块装配线', body=intro + '\n\n车间里是方块装配线：传送带、机床和货箱。', url='')
    gif_billboards()
    tower_crane(182, 108)
    gallery(news); library(books)
    portal(111, 150, 'bilibili', 'B 站个人空间', (251, 114, 153), 'https://space.bilibili.com/204339779', title='Bilibili 个人空间', body='哔哩哔哩 UID 204339779')
    portal(118, 150, 'GitHub', '@ViTa-Chara', (120, 180, 255), 'https://github.com/ViTa-Chara', title='GitHub @ViTa-Chara', body='代码和小工具都在这里。')
    portal(134, 150, '旧版主页', '纸页风 /classic/', (196, 160, 112), '/classic/', title='旧版主页（纸页风）', body='原来的 THE PERSONAL EDITION 纸页风主页，保留在 /classic/。')
    portal(141, 150, '文字版', '不玩也能看', (120, 200, 120), '#text', title='文字版', body='不想走路？打开文字版，所有动态和书目一页看完。')
    write_cw(os.path.join(SITE, 'world.cw'), (128, T + 2, 134), 0)
    write_texpack(os.path.join(SITE, 'static', 'default.zip'))
    json.dump({'version': 2, 'items': interactives}, open(os.path.join(SITE, 'world.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for f in ('ClassiCube.js', 'ClassiCube.wasm'):
        shutil.copy(os.path.join(CC, f), os.path.join(SITE, 'static', f))
    copy_old_site()
    write_html(news, books)
    print('custom blocks:', len(custom_defs), 'max id', next_id[0] - 1, 'tiles left', len(free_tiles), 'items', len(interactives))

if __name__ == '__main__':
    main()
