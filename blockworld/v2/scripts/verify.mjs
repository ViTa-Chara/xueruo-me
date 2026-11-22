import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createWorld, spatialIndex, voxelAt, fillChunk } from '../src/world.js';
import { palette, items } from '../src/palette.js';
import { actorState } from '../src/actors.js';

const content = JSON.parse(await readFile(new URL('../public/content.json', import.meta.url), 'utf8'));
const world = createWorld(content), index = spatialIndex(world.boxes);
assert.equal(world.zones.length, 17);
assert.deepEqual(world.size, [512, 96, 512]);
assert.ok(palette.length > 100);
assert.deepEqual(new Set(items.map(i => i.category)), new Set(['材料', '机械', '标识', '工具']));
assert.equal(content.news.length, 7); assert.equal(content.books.length, 3); assert.equal(content.media.length, 4);
assert.ok(world.equipmentTypes.length >= 15); assert.equal(world.zones[13].height, 80);
for (const box of world.boxes) {
  assert.ok(box.slice(0, 6).every(Number.isFinite));
  assert.ok(box[0] >= 0 && box[1] >= 0 && box[2] >= 0);
  assert.ok(box[3] <= 512 && box[4] <= 96 && box[5] <= 512);
  assert.ok(palette[box[6]]);
}
// Compare bulk chunk painting with random-access queries, including overwrite-to-air
// and one-voxel halos at chunk boundaries. This guards both engine adapters.
for (const origin of [[224, 0, 448], [256, 0, 448], [384, 0, 320], [416, 32, 32], [0, 0, 0]]) {
  const edits = new Map([[origin.join('|'), 1]]);
  const chunk = fillChunk(origin, 32, world.boxes, index, edits, 1), n = 34;
  for (let y = 0; y < n; y += 3) for (let z = 0; z < n; z += 3) for (let x = 0; x < n; x += 3) {
    assert.equal(chunk[y * n * n + z * n + x], voxelAt(origin[0] + x - 1, origin[1] + y - 1, origin[2] + z - 1, world.boxes, index, edits));
  }
}
for (const item of content.media) {
  const bytes = await readFile(new URL(`../public/${item.img}`, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
}
assert.equal(content.media[0].character, '小撒'); assert.equal(content.media[1].character, '小撒');
assert.equal(content.media[2].character, '薛若米'); assert.equal(content.media[3].character, '薛若米');
const worker = world.actors.find(a => a.type === 'worker');
assert.ok(actorState({ ...worker, phase: 0 }, 1).operating);
assert.ok(actorState({ ...worker, phase: 0 }, 9).walking);
assert.notDeepEqual(actorState({ ...worker, phase: 0 }, 9).position, actorState({ ...worker, phase: 0 }, 12).position);
const classic = await readFile(new URL('../public/classic/index.html', import.meta.url), 'utf8');
assert.ok(classic.includes('"../css/site.css"')); assert.ok(classic.includes("'../data/books.json'"));
console.log('通过：厂区边界、区块一致性、角色身份与原图校验、真实内容、工人状态、旧站路径。');
