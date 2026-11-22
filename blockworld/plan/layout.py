"""Proposed 512x512 昊通机械 industrial park layout (1 px = 1 block, drawn at 2x)."""
from PIL import Image, ImageDraw, ImageFont
S = 2; N = 512; PAD = 40; LEG = 380
FONT = '/workspace/blockworld/build/fpf/fusion-pixel-12px-proportional-zh_hans.ttf'
f = lambda px: ImageFont.truetype(FONT, px)
img = Image.new('RGB', (N * S + PAD * 2 + LEG, N * S + PAD * 2 + 40), (24, 26, 31))
d = ImageDraw.Draw(img)
def R(x0, z0, x1, z1, fill, outline=None, w=2):
    d.rectangle([PAD + x0 * S, PAD + 40 + z0 * S, PAD + x1 * S, PAD + 40 + z1 * S], fill=fill, outline=outline, width=w)
def T(x, z, s, px=24, col=(20, 20, 24), anchor='mm'):
    d.text((PAD + x * S, PAD + 40 + z * S), s, font=f(px), fill=col, anchor=anchor)
GREEN, ROAD, BLD = (92, 140, 70), (70, 72, 78), (200, 204, 210)
R(0, 0, N - 1, N - 1, GREEN)
# zones (x0,z0,x1,z1,colour,label,sub,num)
Z = [
 (20, 20, 110, 75, (120, 170, 220), '变电站 + 水塔', '110kV · 双水塔 70格', 1),
 (20, 82, 110, 152, (210, 120, 80), '热处理车间', '淬火炉 · 烟囱', 2),
 (120, 20, 400, 152, (236, 180, 40), '巨型总装车间 (巨构)', '280×130×60 · 3台桥式行车 · 整机总装线', 3),
 (410, 20, 492, 108, (150, 160, 175), 'AS/RS 立体仓库', '高 80 格 · 堆垛机巷道', 4),
 (410, 112, 492, 152, (110, 112, 120), '装卸码头 + 货车', '8 个卸货口', 5),
 (20, 178, 196, 292, (240, 140, 40), '精密加工车间 A', '数控车床 · 五轴 · 龙门铣 · 磨床 · 电火花', 6),
 (202, 178, 244, 232, (120, 200, 200), '质检计量中心', '三坐标 CMM', 7),
 (202, 238, 244, 292, (180, 120, 200), '涂装车间', '喷漆房 · 烘干线', 8),
 (268, 178, 400, 292, (230, 110, 60), '钣金焊接车间 B', '激光切割 · 折弯机 · 焊接机器人', 9),
 (410, 166, 492, 300, (90, 96, 110), '重件堆场 + 巨型龙门吊', '跨距 70 · 高 60 (巨构)', 10),
 (20, 318, 140, 410, (200, 190, 160), '员工宿舍 ×6', '', 11),
 (20, 416, 140, 492, (230, 210, 150), '食堂 + 运动场', '', 12),
 (150, 318, 362, 492, (250, 220, 120), '入口广场 (现有内容)', 'HAOTONG 标牌 · 两块 GIF 动图 · 新闻长廊\n研发楼/图书馆 · B站/GitHub 传送门', 13),
 (370, 318, 420, 372, (160, 200, 240), '总部大楼 (巨构)', '高 90 格 · 玻璃幕墙', 14),
 (430, 318, 492, 420, (120, 124, 132), '停车场', '', 15),
 (370, 380, 420, 492, (110, 170, 90), '中央公园 + 湖', '', 16),
 (430, 428, 492, 492, (150, 180, 200), '访客中心 / 门卫', '', 17),
]
# roads
for r in [(8, 8, 503, 16), (8, 495, 503, 503), (8, 8, 16, 503), (495, 8, 503, 503),
          (16, 158, 495, 170), (16, 300, 495, 312), (250, 170, 262, 300), (402, 16, 408, 495), (112, 16, 118, 158), (144, 312, 148, 495)]:
    R(*r, ROAD)
for x in range(20, 495, 10): R(x, 163, x + 4, 164, (230, 230, 230), w=0); R(x, 305, x + 4, 306, (230, 230, 230), w=0)
R(250, 495, 262, 511, (240, 200, 40))  # main gate
T(256, 507, '正门', 16, (0, 0, 0))
for x0, z0, x1, z1, c, lab, sub, n in Z:
    R(x0, z0, x1, z1, c, (20, 20, 24), 3)
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    T(x0 + 4, z0 + 4, str(n), 18, (20, 20, 24), 'la')
    big = (x1 - x0) > 70
    T(cx, cz - (6 if sub else 0), lab, 24 if big else 18)
    if sub: d.multiline_text((PAD + cx * S, PAD + 40 + (cz + 9) * S), sub, font=f(14 if not big else 16), fill=(30, 30, 34), anchor='mm', align='center')
# megastructure markers
for x0, z0, x1, z1 in [(120, 20, 400, 152), (410, 166, 492, 300), (370, 318, 420, 372)]:
    d.rectangle([PAD + x0 * S - 6, PAD + 40 + z0 * S - 6, PAD + x1 * S + 6, PAD + 40 + z1 * S + 6], outline=(255, 60, 40), width=3)
# crane rails across assembly hall
for z in (50, 90, 125): d.line([PAD + 124 * S, PAD + 40 + z * S, PAD + 396 * S, PAD + 40 + z * S], fill=(255, 90, 30), width=2)
d.line([PAD + 412 * S, PAD + 40 + 233 * S, PAD + 490 * S, PAD + 40 + 233 * S], fill=(255, 90, 30), width=6)
# spawn
sx, sz = 256, 470
d.ellipse([PAD + sx * S - 10, PAD + 40 + sz * S - 10, PAD + sx * S + 10, PAD + 40 + sz * S + 10], fill=(255, 255, 255), outline=(0, 0, 0), width=3)
T(sx + 14, sz, '出生点', 16, (0, 0, 0), 'lm')
# title + legend
d.text((PAD, 14), '昊通机械 · 方块厂区 扩建方案 (512 × 96 × 512，1 像素 = 1 格)', font=f(28), fill=(250, 200, 40))
lx = PAD * 2 + N * S; ly = PAD + 40
d.text((lx, ly), '图例', font=f(24), fill=(255, 255, 255)); ly += 36
for x0, z0, x1, z1, c, lab, sub, n in Z:
    d.rectangle([lx, ly, lx + 18, ly + 18], fill=c, outline=(0, 0, 0)); d.text((lx + 28, ly + 9), f'{n}. {lab}', font=f(16), fill=(230, 230, 230), anchor='lm'); ly += 26
ly += 10
for c, lab in [(ROAD, '道路 (环路 8 格 / 主干道 12 格)'), (GREEN, '绿化 / 原地形'), ((255, 60, 40), '红框 = 巨构'), ((255, 90, 30), '橙线 = 行车/龙门吊轨道')]:
    d.rectangle([lx, ly, lx + 18, ly + 18], fill=c if c != (255, 60, 40) else None, outline=c if c == (255, 60, 40) else (0, 0, 0), width=3); d.text((lx + 28, ly + 9), lab, font=f(16), fill=(230, 230, 230), anchor='lm'); ly += 26
ly += 14
for s in ['移动端: 同一张图，视距 96，', '出生在南门广场，先加载近处区块', '桌面端: 视距 256-512 + 平滑光照',
          '现有内容整体搬到 13 号入口广场', '(旋转 180°，标牌正对正门)']:
    d.text((lx, ly), s, font=f(16), fill=(200, 200, 200)); ly += 24
img.save('/workspace/blockworld/shots/park_layout.png')
print(img.size)
