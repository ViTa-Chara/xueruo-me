"""Export the SAME 512 scene to ClassicWorld for an honest rendering baseline.
No optional packages, no current production build changes. Benchmark only.
"""
import gzip, json, math, struct, zipfile, zlib
from pathlib import Path

out = Path(__file__).resolve().parent.parent / 'public/benchmark'
scene = json.loads((out / 'scene.json').read_text())
world, palette = scene['world'], scene['palette']
w, h, d = world['size']
blocks = bytearray(w * h * d)
for x0, y0, z0, x1, y1, z1, material in world['boxes']:
    a, b = math.ceil(x0), math.ceil(x1)
    row = bytes([material + 65 if material else 0]) * (b - a)
    for y in range(math.ceil(y0), math.ceil(y1)):
        for z in range(math.ceil(z0), math.ceil(z1)):
            offset = (y * d + z) * w
            blocks[offset + a:offset + b] = row

def name(n):
    value = n.encode('utf8')
    return struct.pack('>H', len(value)) + value
def byte(n, value): return b'\x01' + name(n) + bytes([value & 255])
def short(n, value): return b'\x02' + name(n) + struct.pack('>h', value)
def float_(n, value): return b'\x05' + name(n) + struct.pack('>f', value)
def array(n, value): return b'\x07' + name(n) + struct.pack('>i', len(value)) + bytes(value)
def string(n, value): return b'\x08' + name(n) + name(value)
def compound(n, *values): return b'\x0a' + name(n) + b''.join(values) + b'\x00'

definitions = []
for item in palette[1:]:
    bid, tile = item['id'] + 65, item['id']
    definitions.append(compound(f'Block{bid:03X}', byte('ID', bid), short('ID2', bid), string('Name', f'HT {item["id"]}'),
        byte('CollideType', 2 if item['solid'] else 0), float_('Speed', 1), array('Textures', [tile] * 6 + [0] * 6),
        byte('TransmitsLight', 0), byte('WalkSound', 5), byte('FullBright', 0), byte('Shape', 16),
        byte('BlockDraw', 0), array('Fog', [255, 0, 0, 0]), array('Coords', [0, 0, 0, 16, 16, 16])))
nbt = compound('ClassicWorld', byte('FormatVersion', 1), string('Name', 'HT-512-E0'), array('UUID', bytes(16)),
    short('X', w), short('Y', h), short('Z', d),
    compound('Spawn', short('X', 256), short('Y', 3), short('Z', 470), byte('H', 0), byte('P', 251)),
    array('BlockArray', blocks), compound('Metadata', compound('CPE', compound('BlockDefinitions', *definitions))))
(out / 'world.cw').write_bytes(gzip.compress(nbt, compresslevel=9, mtime=0))

def png_chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
colors = [tuple(bytes.fromhex(item['color'][1:])) for item in palette]
rows = bytearray()
for y in range(256):
    rows.append(0)
    for x in range(256):
        tile = y // 16 * 16 + x // 16
        rows.extend(colors[tile] if tile < len(colors) else (95, 110, 115))
png = b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', struct.pack('>IIBBBBB', 256, 256, 8, 2, 0, 0, 0)) + png_chunk(b'IDAT', zlib.compress(rows)) + png_chunk(b'IEND', b'')
with zipfile.ZipFile(out / 'default.zip', 'w', zipfile.ZIP_DEFLATED) as pack:
    pack.writestr('terrain.png', png)
print(f'ClassiCube: {w}×{h}×{d}, {len(definitions)} materials, {(out / "world.cw").stat().st_size:,} bytes')
