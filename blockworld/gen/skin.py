#!/usr/bin/env python3
"""64x32 Classic skin: 昊通机械 engineer — yellow HT hard hat, hi-vis orange vest with reflective
bands over a navy coverall, gloves and safety boots. Hand-placed pixels + preview sheet."""
from PIL import Image
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

C = {
 '.': None,
 'Y': (247, 196, 24),   # hard hat safety yellow
 'y': (206, 150, 10),   # hat shade / brim
 'u': (255, 226, 110),  # hat highlight
 'K': (34, 38, 46),     # logo / boots
 'k': (62, 66, 76),     # sole / dark grey
 'H': (26, 26, 32),     # hair
 'h': (46, 46, 60),     # hair shade
 'B': (58, 112, 226),   # blue streak
 'S': (246, 212, 188),  # skin
 's': (222, 184, 160),  # skin shade
 'e': (212, 170, 148),  # ear
 'G': (60, 64, 74),     # glasses frame
 'W': (250, 250, 250),  # eye white
 'P': (40, 44, 70),     # pupil
 'M': (196, 104, 104),  # mouth
 'O': (255, 122, 26),   # hi-vis orange
 'o': (214, 92, 14),    # vest shade
 'R': (220, 226, 232),  # reflective silver
 'r': (170, 178, 188),  # reflective shade
 'N': (44, 62, 102),    # navy coverall
 'n': (30, 42, 72),     # navy shade
 'Z': (150, 156, 170),  # zipper
 'g': (88, 92, 100),    # gloves
 'L': (247, 196, 24),   # buckle / chest badge
}

def face(img, x, y, rows):
    for j, row in enumerate(rows):
        assert len(row) == len(rows[0]), row
        for i, ch in enumerate(row):
            col = C[ch]
            if col: img.putpixel((x + i, y + j), col + (255,))

def fill(img, x, y, w, h, ch): face(img, x, y, [ch * w] * h)
def mirror(rows): return [r[::-1] for r in rows]

def build():
    img = Image.new('RGBA', (64, 32), (0, 0, 0, 0))
    # ---------------- head (base) ----------------
    fill(img, 8, 0, 8, 8, 'H'); fill(img, 16, 0, 8, 8, 'S')
    face(img, 8, 8, [            # front
        "HHHHHHHH",
        "HHHHHHHH",
        "HBBHHHhH",
        "HBSSSSSH",
        "GWPGGWPG",              # glasses + eyes
        "SGGSSGGS",
        "SSSssSSS",
        "SSsMMsSS"])
    right = [                    # right side tile: its RIGHT edge touches the face
        "HHHHHHHH",
        "HHHHHHHH",
        "HHHHHHHH",
        "hHHHHHHS",
        "hHHHGGGG",              # glasses arm
        "hHHeeSSS",
        "hHHeeSSS",
        "hhHSSSSs"]
    face(img, 0, 8, right)
    face(img, 16, 8, mirror(right))
    face(img, 24, 8, ["HHHHHHHH", "HHhHHHHH", "HHHHHhHH", "HHHHHHHH",
                      "HhHHHHHH", "HHHHHHhH", "hHHhHHHh", "hhHHHHhh"])
    # ---------------- hat layer = HT hard hat ----------------
    face(img, 40, 0, ["yYYYYYYy", "YYYuuYYY", "YYYuuYYY", "YYYuuYYY",
                      "YYYuuYYY", "YYYuuYYY", "YYYuuYYY", "yYYYYYYy"])
    face(img, 40, 8, [           # front with HT logo
        "YKYKKKKY",
        "YKKKYKYY",
        "YKYKYKYY",
        "yyyyyyyy",
        "........", "........", "........", "........"])
    side = ["YYYuYYYY", "YYYuYYYY", "YYYYYYYY", "yyyyyyyy",
            "........", "........", "........", "........"]
    face(img, 32, 8, side); face(img, 48, 8, mirror(side))
    face(img, 56, 8, ["YYYuuYYY", "YYYuuYYY", "YYYYYYYY", "yyyyyyyy",
                      "........", "........", "........", "........"])
    # ---------------- body ----------------
    face(img, 20, 16, ["ONNNNNNO", "ONNNNNNO", "OOOOOOOO", "OOOOOOOO"])   # top
    fill(img, 28, 16, 8, 4, 'N')
    face(img, 20, 20, [          # front: V-neck vest, vertical bands, chest badge, belt
        "ORNNNNRO",
        "ORNNNNRO",
        "ORONNORO",
        "ORLOoORO",
        "OROOoORO",
        "OROOoORO",
        "OROOoORO",
        "RRRRRRRR",
        "OOOOoOOO",
        "oooooooo",
        "KKKLLKKK",
        "NNNnnNNN"])
    vside = ["OOOO", "OOOO", "OOOO", "OOOO", "OOOO", "OOOO", "oOOo", "RRRR", "OOOO", "oooo", "KKKK", "nNNn"]
    face(img, 16, 20, vside); face(img, 28, 20, vside)
    face(img, 32, 20, [          # back: big reflective "HT"
        "OOOOOOOO",
        "ORORRRRO",
        "OROROROO",
        "ORRRОROO".replace('О', 'O'),
        "OROROROO",
        "OROROROO",
        "OOOOOOOO",
        "RRRRRRRR",
        "OOOOOOOO",
        "oooooooo",
        "KKKKKKKK",
        "NNNNNNNN"])
    # ---------------- arm (mirrored by the engine for the other side) ----------------
    fill(img, 44, 16, 4, 4, 'N'); fill(img, 48, 16, 4, 4, 'g')
    arm_front = ["NNNN", "NNNN", "NNNN", "NNNN", "NNNN", "nNNn", "RRRR", "NNNN", "NNNN", "nnnn", "gggg", "gggg"]
    arm_side = ["NNNN", "NNNN", "NNNN", "NNNN", "nNNN", "nNNN", "RRRR", "nNNN", "nNNN", "nnnn", "gggg", "gggg"]
    face(img, 40, 20, arm_side); face(img, 44, 20, arm_front)
    face(img, 48, 20, mirror(arm_side)); face(img, 52, 20, arm_front)
    # ---------------- leg ----------------
    fill(img, 4, 16, 4, 4, 'N'); fill(img, 8, 16, 4, 4, 'k')
    leg = ["NNNN", "NNNN", "NNNN", "nNNN", "NNNN", "RRRR", "NNNN", "nNNn", "nnnn", "KKKK", "KKKK", "kkkk"]
    leg_front = leg[:9] + ["KYYK", "KKKK", "kkkk"]
    face(img, 0, 20, leg); face(img, 4, 20, leg_front); face(img, 8, 20, mirror(leg)); face(img, 12, 20, leg)
    return img

def front_view(skin, back=False):
    v = Image.new('RGBA', (16, 32), (0, 0, 0, 0))
    hx, bx, ax, lx = (24, 32, 52, 12) if back else (8, 20, 44, 4)
    v.alpha_composite(skin.crop((hx, 8, hx + 8, 16)), (4, 0))
    v.alpha_composite(skin.crop((hx + 32, 8, hx + 40, 16)), (4, 0))
    v.alpha_composite(skin.crop((bx, 20, bx + 8, 32)), (4, 8))
    a = skin.crop((ax, 20, ax + 4, 32))
    v.alpha_composite(a, (0, 8)); v.alpha_composite(a.transpose(Image.FLIP_LEFT_RIGHT), (12, 8))
    l = skin.crop((lx, 20, lx + 4, 32))
    v.alpha_composite(l, (4, 20)); v.alpha_composite(l.transpose(Image.FLIP_LEFT_RIGHT), (8, 20))
    return v

if __name__ == '__main__':
    skin = build()
    os.makedirs(os.path.join(ROOT, 'site', 'skins'), exist_ok=True)
    out = os.path.join(ROOT, 'site', 'skins', 'xueruomi.png')
    skin.save(out)
    os.makedirs(os.path.join(ROOT, 'shots'), exist_ok=True)
    s = 10
    prev = Image.new('RGBA', (64 * s + 40 + 16 * 12 * 2 + 40, 32 * 12 + 20), (235, 232, 222, 255))
    checker = Image.new('RGBA', (64 * s, 32 * s), (200, 200, 200, 255))
    for yy in range(0, 32 * s, s):
        for xx in range(0, 64 * s, s):
            if (xx // s + yy // s) % 2: checker.paste((220, 220, 220, 255), (xx, yy, xx + s, yy + s))
    checker.alpha_composite(skin.resize((64 * s, 32 * s), Image.NEAREST))
    prev.paste(checker, (10, 10))
    fv = front_view(skin).resize((16 * 12, 32 * 12), Image.NEAREST)
    bv = front_view(skin, True).resize((16 * 12, 32 * 12), Image.NEAREST)
    prev.alpha_composite(fv, (64 * s + 30, 10)); prev.alpha_composite(bv, (64 * s + 30 + 16 * 12 + 20, 10))
    prev.save(os.path.join(ROOT, 'shots', 'ht_skin_preview.png'))
    print('wrote', out)
