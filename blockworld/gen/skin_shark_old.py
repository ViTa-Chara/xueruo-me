#!/usr/bin/env python3
"""Draws the 64x32 Classic skin for the shark-hoodie character (hand-placed pixels) + previews."""
from PIL import Image
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

C = {
 '.': None,
 'N': (46, 60, 98),     # navy hood/suit
 'n': (32, 42, 72),     # dark navy (fin, shading)
 'L': (196, 208, 226),  # light belly
 'W': (246, 246, 246),  # teeth / white
 'Z': (128, 136, 156),  # zipper
 'H': (24, 24, 30),     # black hair
 'h': (40, 40, 52),     # hair shading
 'B': (58, 112, 226),   # blue streak
 'S': (252, 222, 202),  # skin
 's': (232, 196, 178),  # skin shade
 'G': (34, 34, 40),     # glasses frame
 'E': (70, 44, 44),     # closed eye line
 'M': (214, 120, 124),  # mouth / blush
 'R': (150, 54, 70),    # hood mouth inside
 'D': (44, 44, 56),     # shoes
 'K': (232, 236, 244),  # socks
}

def face(img, x, y, rows):
    for j, row in enumerate(rows):
        assert len(row) == len(rows[0]), row
        for i, ch in enumerate(row):
            col = C[ch]
            if col: img.putpixel((x + i, y + j), col + (255,))

def fill(img, x, y, w, h, ch):
    face(img, x, y, [ch * w] * h)

def build():
    img = Image.new('RGBA', (64, 32), (0, 0, 0, 0))
    # ---------------- head (base layer) ----------------
    fill(img, 8, 0, 8, 8, 'H')                     # top
    fill(img, 16, 0, 8, 8, 'S')                    # bottom
    face(img, 8, 8, [                              # front
        "HHHHHHHH",
        "HHBBHHhH",
        "HBSHSHSH",
        "SGGSSGGS",
        "SEESSEES",
        "SSSSSSSS",
        "SMSsSSMS",
        "SSSSSSSS"])
    side = ["HHHHHHHH", "HHHHHHHH", "HHHHHHhH", "HHHHHHHH",
            "HHHHHHHS", "hHHHHHSS", "hHHHHHSS", "hhHHHSSS"]
    face(img, 0, 8, [r[::-1] for r in side])       # right side (face edge toward front = right edge of tile)
    face(img, 16, 8, side)                         # left side
    fill(img, 24, 8, 8, 8, 'H')                    # back
    face(img, 24, 8, ["HHHHHHHH", "HHhHHHHH", "HHHHHhHH", "HHHHHHHH",
                      "HhHHHHHH", "HHHHHHhH", "HHHhHHHH", "hHHHHHHh"])
    # ---------------- hat layer = shark hood ----------------
    face(img, 40, 0, [                             # top (fin ridge)
        "NNNnnNNN", "NNNnnNNN", "NNnnnnNN", "NNnnnnNN",
        "NNnnnnNN", "NNNnnNNN", "NNNnnNNN", "NNNNNNNN"])
    face(img, 40, 8, [                             # front: hood frames the face, teeth rim
        "NNNNNNNN",
        "NWNWWNWN",
        "W......W",
        "N......N",
        "W......W",
        "N......N",
        "W......W",
        "NN....NN"])
    face(img, 32, 8, [                             # right side: eye
        "NNNNNNNN",
        "NNNNNNNN",
        "NNWWWNNN",
        "NWWnnWNN",
        "NWWnnWNN",
        "NNWWWNNN",
        "NNNNNNNN",
        "nNNNNNNN"])
    face(img, 48, 8, [                             # left side: eye + the little 'x'
        "NNNNNNNN",
        "NNNNNNNN",
        "NNNWWWNN",
        "NNWnnWWN",
        "NNWnnWWN",
        "NNNWWWNN",
        "NNNNNWNW",
        "NNNNNNWN"])
    face(img, 56, 8, [                             # back with fin
        "NNNnnNNN", "NNNnnNNN", "NNNnnNNN", "NNNNNNNN",
        "NNNNNNNN", "NNNNNNNN", "NNNNNNNN", "nNNNNNNn"])
    # ---------------- body ----------------
    fill(img, 20, 16, 8, 4, 'N'); fill(img, 28, 16, 8, 4, 'N')
    face(img, 20, 20, [                            # front: jaw teeth collar, belly, zipper
        "NWNWWNWN",
        "NNLLZLNN",
        "NLLLZLLN",
        "NLLLZLLN",
        "NLLLZLLN",
        "NLLLZLLN",
        "NLLLZLLN",
        "NLLLZLLN",
        "NLLLZLLN",
        "NNLLZLNN",
        "NNNNZNNN",
        "nnnnnnnn"])
    fill(img, 16, 20, 4, 12, 'N'); fill(img, 28, 20, 4, 12, 'N')
    face(img, 32, 20, [                            # back: tail stripe
        "NNNNNNNN", "NNNNNNNN", "NNNnnNNN", "NNNnnNNN", "NNNnnNNN", "NNNnnNNN",
        "NNNnnNNN", "NNNnnNNN", "NNnnnnNN", "NNnnnnNN", "NNNNNNNN", "nnnnnnnn"])
    # ---------------- arm (Classic skins mirror it to the other side) ----------------
    fill(img, 44, 16, 4, 4, 'N'); fill(img, 48, 16, 4, 4, 'S')
    arm = ["NNNN"] * 8 + ["nnnn", "LLLL", "SSSS", "SSSS"]
    for x in (40, 44, 48, 52): face(img, x, 20, arm)
    # ---------------- leg ----------------
    fill(img, 4, 16, 4, 4, 'N'); fill(img, 8, 16, 4, 4, 'D')
    leg = ["NNNN", "NNNN", "NNNN", "nnnn", "SSSS", "SSSS", "sSSS", "SSSS", "SSSs", "KKKK", "DDDD", "DDDD"]
    for x in (0, 4, 8, 12): face(img, x, 20, leg)
    return img

def front_view(skin, back=False):
    """Paper-doll front (or back) view, 16x32 px, hat layer composited."""
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
    out = os.path.join(ROOT, 'site', 'skins', 'xueruomi.png')
    skin.save(out)
    os.makedirs(os.path.join(ROOT, 'shots'), exist_ok=True)
    s = 10
    prev = Image.new('RGBA', (64 * s + 40 + 16 * 12 * 2 + 40, 32 * s + 20), (235, 232, 222, 255))
    checker = Image.new('RGBA', (64 * s, 32 * s), (200, 200, 200, 255))
    for yy in range(0, 32 * s, s):
        for xx in range(0, 64 * s, s):
            if (xx // s + yy // s) % 2: checker.paste((220, 220, 220, 255), (xx, yy, xx + s, yy + s))
    checker.alpha_composite(skin.resize((64 * s, 32 * s), Image.NEAREST))
    prev.paste(checker, (10, 10))
    fv = front_view(skin).resize((16 * 12, 32 * 12), Image.NEAREST)
    bv = front_view(skin, True).resize((16 * 12, 32 * 12), Image.NEAREST)
    prev = prev.resize((prev.width, max(prev.height, 32 * 12 + 20)))
    prev.alpha_composite(fv, (64 * s + 30, 10)); prev.alpha_composite(bv, (64 * s + 30 + 16 * 12 + 20, 10))
    prev.save(os.path.join(ROOT, 'shots', 'skin_preview.png'))
    print('wrote', out)
