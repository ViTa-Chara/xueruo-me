import { M } from './palette.js';

export const SIZE = [512, 96, 512];
export const SPAWN = [256, 2, 470];
export const zones = [
  [1, '变电站与水塔', 20, 20, 110, 75, 12], [2, '热处理车间', 20, 82, 110, 152, 18],
  [3, '巨型总装车间', 120, 20, 400, 152, 60], [4, '立体仓库', 410, 20, 492, 108, 80],
  [5, '装卸码头', 410, 112, 492, 152, 8], [6, '精密加工车间 A', 20, 178, 196, 292, 20],
  [7, '质检计量中心', 202, 178, 244, 232, 12], [8, '涂装车间', 202, 238, 244, 292, 16],
  [9, '钣金焊接车间 B', 268, 178, 400, 292, 24], [10, '重件堆场与龙门吊', 410, 166, 492, 300, 60],
  [11, '员工宿舍', 20, 318, 140, 410, 21], [12, '食堂与运动场', 20, 416, 140, 492, 12],
  [13, '入口广场与研发资料室', 150, 318, 362, 492, 10], [14, '总部大楼', 370, 318, 420, 372, 80],
  [15, '停车场', 430, 318, 492, 420, 1], [16, '中央公园与湖', 370, 380, 420, 492, 1],
  [17, '访客中心与门卫', 430, 428, 492, 492, 9]
].map(([id, name, x0, z0, x1, z1, height]) => ({ id, name, box: [x0, z0, x1, z1], height }));

// Cuboid commands are the shared format for the two new engines. No renderer data here.
export function createWorld(content = { media: [], news: [], books: [], portals: [] }) {
  const boxes = [], signs = [], machines = [], actors = [];
  const box = (x, y, z, w, h, d, material) => boxes.push([x, y, z, x + w, y + h, z + d, material]);
  const sign = (x, y, z, w, h, title, item, color = '#eaba37') => signs.push({ x, y, z, w, h, title, item, color });
  box(0, 0, 0, 512, 1, 512, M.grass);
  for (const [x, z, w, d] of [[8, 8, 496, 8], [8, 496, 496, 8], [8, 8, 8, 496], [496, 8, 8, 496], [16, 158, 480, 12], [16, 300, 480, 12], [250, 16, 12, 488]]) {
    box(x, 1, z, w, 1, d, M.asphalt);
    if (w > d) for (let i = x; i < x + w; i += 14) box(i, 2, z + d / 2, 6, 1, 1, M.yellow);
    else for (let i = z; i < z + d; i += 14) box(x + w / 2, 2, i, 1, 1, 6, M.yellow);
  }
  // Fence, light poles and fire hydrants.
  for (let i = 20; i < 496; i += 24) {
    for (const [x, z] of [[i, 5], [i, 507], [5, i], [507, i]]) {
      box(x, 1, z, 1, 5, 1, M.steel); box(x, 5, z, 3, 1, 1, M.yellow);
    }
    box(246, 2, i, 1, 8, 1, M.steel); box(244, 10, i, 3, 1, 1, M.white);
  }
  const shell = (x, z, w, d, h, facade = M.roof) => {
    box(x, 1, z, w, 1, d, M.concrete);
    box(x, 2, z, w, h - 1, 1, facade);
    box(x, 2, z, 1, h - 1, d, facade); box(x + w - 1, 2, z, 1, h - 1, d, facade);
    // South entrance is 12 metres wide and 10 high.
    const gap = Math.min(12, w / 3), wing = Math.floor((w - gap) / 2);
    box(x, 2, z + d - 1, wing, h - 1, 1, facade);
    box(x + wing + gap, 2, z + d - 1, w - wing - gap, h - 1, 1, facade);
    if (h > 11) box(x + wing, 12, z + d - 1, gap, h - 11, 1, facade);
    box(x, h + 1, z, w, 1, d, M.roof);
    // Structural column grid and roof trusses.
    for (let xx = x + 4; xx < x + w - 3; xx += 20) {
      box(xx, 2, z + 2, 1, h - 1, 1, M.steel); box(xx, 2, z + d - 3, 1, h - 1, 1, M.steel);
      box(xx, h - 1, z + 2, 1, 1, d - 4, M.steel);
    }
    box(x + 2, 3, z + 2, 1, 2, 3, M.blue); box(x + 5, 2, z + d - 4, 1, 2, 1, M.red);
    for (let xx = x + 10; xx < x + w - 8; xx += 22) box(xx, Math.min(7, h - 2), z + d - 1, 7, 3, 1, M.glass);
    box(x + 3, 2, z + 6, 1, 1, d - 12, M.yellow);
  };
  for (const id of [2, 3, 4, 6, 7, 8, 9]) {
    const zone = zones[id - 1], [x0, z0, x1, z1] = zone.box;
    shell(x0, z0, x1 - x0, z1 - z0, zone.height);
    sign((x0 + x1) / 2, 14, z1 + 0.1, Math.min(26, x1 - x0 - 4), 3.5, zone.name, { kind: 'info', title: zone.name, body: `厂区 ${id} 号区域。点击机床查看设备类型和加工状态。` });
  }
  // 15 equipment types, each a 3–8 metre model with an actual envelope and operator station.
  const kinds = ['数控车床', '五轴加工中心', '龙门铣床', '精密磨床', '电火花 EDM', '激光切割机', '液压折弯机', '焊接机器人', '三坐标 CMM', '立库货架', '货车', '叉车', '桥式行车', '龙门吊', '变压器', '水塔'];
  const machine = (type, x, z, index, base = 2) => {
    const color = type % 3 === 0 ? M.blue : type % 3 === 1 ? M.white : M.orange;
    const id = `${type}-${index}`;
    const item = { kind: 'machine', title: `${kinds[type]} ${String(index).padStart(2, '0')}`, body: '设备处于厂区模拟运行中。工人沿作业路线巡视，在操作位停下加工。', id };
    box(x, base, z, 6, 1, 4, M.dark);
    if (type === 2 || type === 5 || type === 6) {
      box(x, base + 1, z, 1, 4, 4, color); box(x + 5, base + 1, z, 1, 4, 4, color); box(x, base + 4, z, 6, 1, 2, color);
      box(x + 1, base + 2, z + 1, 4, 1, 2, M.checker);
    } else if (type === 7) {
      box(x + 2, base + 1, z + 1, 2, 2, 2, M.orange); box(x + 3, base + 3, z + 1, 1, 2, 1, M.orange); box(x + 1, base + 4, z + 1, 3, 1, 1, M.orange);
    } else if (type === 8) {
      box(x + 1, base + 1, z + 1, 4, 1, 2, M.white); box(x + 1, base + 2, z, 1, 3, 1, M.steel); box(x + 4, base + 2, z, 1, 3, 1, M.steel); box(x + 1, base + 4, z, 4, 1, 1, M.steel);
    } else {
      box(x, base + 1, z, 6, 3, 3, color); box(x + 1, base + 2, z + 3, 3, 2, 1, M.glass);
    }
    box(x + 5, base + 2, z + 3, 1, 2, 1, M.dark); box(x + 5, base + 4, z + 2, 1, 1, 1, M.green);
    machines.push({ id, type, name: kinds[type], x: x + 3, y: base + 3, z: z + 4, item, color });
    if (index <= 2) sign(x + 3, base + 5.5, z + 4.1, 5, 1, `${kinds[type]} ${index}`, item, '#a7c5cd');
    if (index % 2 === 0) actors.push({ id: `worker-${id}`, type: 'worker', path: [[x + 3, 2, z + 6], [x + 3, 2, z + 10], [x + 9, 2, z + 10], [x + 3, 2, z + 6]], machine: id, speed: 1.5, phase: index / 10 });
  };
  let n = 0;
  for (let z = 190; z < 276; z += 18) for (let x = 30; x < 182; x += 18) machine(n++ % 5, x, z, Math.floor(n / 5));
  n = 0;
  for (let z = 192; z < 278; z += 20) for (let x = 280; x < 386; x += 18) machine(5 + (n++ % 3), x, z, Math.floor(n / 3));
  machine(8, 212, 200, 1); machine(8, 226, 212, 2);
  // Assembly production lanes and mobile overhead crane trolleys.
  for (let z = 44; z < 140; z += 40) {
    box(126, 2, z, 268, 1, 5, M.checker);
    for (let x = 140; x < 380; x += 28) { box(x, 3, z, 12, 4, 4, M.blue); box(x + 4, 7, z, 4, 2, 4, M.orange); }
  }
  for (const z of [50, 90, 125]) {
    box(125, 48, z, 270, 2, 2, M.yellow);
    actors.push({ id: `crane-${z}`, type: 'crane', path: [[145, 48, z], [375, 48, z]], speed: 8, phase: z / 50 });
  }
  // Warehouse racks and stackers.
  for (let x = 417; x < 482; x += 12) {
    for (let y = 3; y < 72; y += 9) {
      box(x, y, 27, 4, 1, 66, M.orange);
      for (let z = 28; z < 92; z += 8) box(x, y + 1, z, 3, 4, 5, M.wood);
    }
    box(x, 2, 27, 1, 72, 1, M.steel); box(x, 2, 92, 1, 72, 1, M.steel);
    actors.push({ id: `stacker-${x}`, type: 'stacker', path: [[x + 7, 2, 30], [x + 7, 2, 96]], speed: 4, phase: x / 50 });
  }
  // Eight loading bays, trucks, AGVs and forklifts.
  box(410, 1, 112, 82, 1, 40, M.concrete);
  for (let i = 0; i < 8; i++) {
    const x = 414 + i * 9;
    box(x, 2, 114, 7, 2, 12, M.checker); box(x, 4, 129, 5, 4, 9, M.white); box(x, 3, 138, 5, 3, 4, M.blue);
    for (const dx of [0, 4]) for (const dz of [131, 140]) box(x + dx, 2, dz, 1, 2, 2, M.dark);
    actors.push({ id: `forklift-${i}`, type: i % 2 ? 'agv' : 'forklift', path: [[x + 3, 2, 146], [x + 3, 2, 118], [x + 6, 2, 118], [x + 6, 2, 146]], speed: 3, phase: i / 8 });
  }
  // Gantry crane: 70 metre span, 60 metre height, reachable from the yard.
  for (const x of [414, 484]) {
    box(x, 2, 173, 2, 1, 119, M.steel); box(x, 3, 230, 3, 55, 5, M.yellow);
    for (let y = 4; y < 58; y += 3) box(x + 3, y, 231, 1, 1, 3, M.steel);
  }
  box(414, 58, 230, 73, 4, 5, M.yellow);
  actors.push({ id: 'gantry', type: 'crane', path: [[420, 58, 232], [478, 58, 232]], speed: 5 });
  for (let x = 425; x < 480; x += 16) for (let z = 190; z < 288; z += 24) box(x, 2, z, 10, 3, 8, M.steel);
  // Two 70 metre water towers, transformer banks and heat treatment furnaces.
  for (const x of [37, 82]) {
    for (const dx of [-6, 6]) for (const dz of [-6, 6]) box(x + dx, 2, 43 + dz, 2, 58, 2, M.steel);
    box(x - 8, 60, 35, 18, 10, 18, M.blue); box(x - 8, 70, 35, 18, 1, 18, M.white);
  }
  for (let x = 28; x < 100; x += 15) { box(x, 2, 66, 8, 5, 5, M.steel); box(x + 2, 7, 67, 1, 3, 1, M.white); }
  for (let x = 30; x < 100; x += 18) { box(x, 2, 95, 10, 8, 12, M.red); box(x + 4, 10, 96, 2, 25, 2, M.steel); box(x + 1, 3, 107, 8, 5, 1, M.orange); }
  // Six dormitories, dining hall, basketball court.
  for (let z = 322; z < 402; z += 44) for (let x = 24; x < 130; x += 40) {
    shell(x, z, 32, 34, 21, M.brick);
    for (let y = 7; y < 21; y += 7) { box(x, y, z, 32, 1, 34, M.concrete); for (let xx = x + 4; xx < x + 29; xx += 7) box(xx, y - 4, z + 33, 3, 3, 1, M.glass); }
  }
  shell(22, 420, 62, 40, 12, M.brick); box(89, 2, 421, 46, 1, 64, M.blue);
  for (const z of [422, 482]) { box(108, 3, z, 1, 4, 1, M.steel); box(106, 7, z, 5, 3, 1, M.white); }
  box(90, 3, 452, 44, 1, 1, M.white);
  // Headquarters (80m provisional), floor plates and stair route.
  shell(370, 318, 50, 54, 80, M.glass);
  for (let y = 2; y < 80; y += 5) {
    box(370, y, 318, 50, 1, 54, M.steel);
    // Open stairwell: skip a small piece of the floor via the later air command.
    box(373, y, 322, 8, 1, 10, 0);
    for (let step = 0; step < 5; step++) box(374 + step, y + step, 324, 1, 1, 5, M.concrete);
    box(379, y + 5, 324, 2, 1, 5, M.concrete);
  }
  sign(395, 13, 372.1, 30, 4, '昊通机械 · 总部', { kind: 'info', title: '总部大楼', body: '此预览暂按 80 米方案搭建。最终高度在引擎选定后确认。' });
  // Park, trees, lake, parking lots and visitor centre.
  box(373, 1, 387, 44, 1, 35, M.water);
  for (let z = 431; z < 488; z += 12) for (const x of [375, 409]) { box(x, 2, z, 1, 5, 1, M.wood); box(x - 2, 6, z - 2, 5, 4, 5, M.grass); }
  box(430, 1, 318, 62, 1, 102, M.asphalt);
  for (let z = 328; z < 413; z += 12) for (let x = 432; x < 490; x += 8) { box(x, 2, z, 1, 1, 10, M.white); if ((x + z) % 3) { box(x + 2, 2, z + 2, 4, 2, 7, M.blue); box(x + 2, 4, z + 4, 4, 1, 3, M.glass); } }
  shell(434, 434, 52, 46, 9, M.brick);
  // Entry plaza: original media, accurate character labels, real news, books and portals.
  box(155, 1, 318, 202, 1, 175, M.checker);
  box(244, 2, 490, 24, 14, 2, M.yellow);
  sign(256, 10, 491.2, 22, 4, '昊通机械 HAOTONG', { kind: 'info', title: '昊通机械', body: '薛若米的个人站与方块厂区。HT 标识与工业配色为本站自制。' });
  box(240, 2, 418, 1, 14, 1, M.steel); box(271, 2, 418, 1, 14, 1, M.steel);
  box(240, 14, 418, 32, 2, 1, M.yellow);
  sign(256, 14, 419.1, 30, 4, 'HAOTONG · 昊通机械', { kind: 'info', title: '昊通机械', body: '精工、稳健、通达。薛若米的方块厂区与个人站。' });
  sign(256, 5.6, 456, 12, 2.5, '昊通机械 · 厂区参观', { kind: 'info', title: '欢迎来到昊通机械', body: 'WASD 移动，鼠标环视，空格跳跃；E 查看，B 背包，M 地图，F 飞行。手机使用左侧摇杆、右侧滑动环视。\n小撒是昊通机械的白发角色；鲨鱼服角色是薛若米。' });
  const locations = [[234, 6, 436], [278, 6, 436], [220, 6, 422], [292, 6, 422]];
  content.media.forEach((item, i) => {
    const [x, y, z] = locations[i];
    box(x - 5, 2, z - 1, 10, 10, 1, M.dark);
    sign(x, y + 1, z, 8, 8, item.title, item);
    sign(x, 2.8, z + 0.1, 10, 1.2, item.title, item);
  });
  content.news.forEach((item, i) => {
    const x = 170 + i * 26;
    box(x - 5, 2, 408, 10, 6, 1, M.dark);
    sign(x, 6, 409.1, 10, 5, item.title, item);
  });
  shell(200, 336, 110, 52, 12, M.brick);
  sign(255, 11, 388.1, 50, 3.5, '研发部 · 资料室', { kind: 'info', title: '资料室', body: '三部连载与阅读器保持原有地址。', url: '/library.html', cta: '打开书库' });
  content.books.forEach((item, i) => { box(219 + i * 30, 2, 344, 12, 6, 2, M.wood); sign(225 + i * 30, 5, 346.1, 10, 6, item.title, item, item.color); });
  content.portals.forEach((item, i) => { const x = 216 + i * 26; box(x - 4, 2, 476, 8, 3, 2, M.blue); sign(x, 4, 478.1, 8, 2.5, item.title, item); });
  actors.push({ id: 'sato', type: 'sato', path: [[237, 2, 447], [247, 2, 447], [247, 2, 435], [237, 2, 435]], speed: 1.2, name: '小撒 · 昊通机械' });
  return { version: 3, size: SIZE, spawn: SPAWN, zones, boxes, signs, machines, actors, equipmentTypes: kinds };
}

// Spatial index avoids scanning the whole park for each voxel/chunk.
export function spatialIndex(boxes, size = 32) {
  const index = new Map();
  boxes.forEach((box, i) => {
    const [x0, y0, z0, x1, y1, z1] = box;
    for (let x = Math.floor(x0 / size); x <= Math.floor((x1 - .001) / size); x++)
      for (let y = Math.floor(y0 / size); y <= Math.floor((y1 - .001) / size); y++)
        for (let z = Math.floor(z0 / size); z <= Math.floor((z1 - .001) / size); z++) {
          const key = `${x}|${y}|${z}`;
          if (!index.has(key)) index.set(key, []);
          index.get(key).push(i);
        }
  });
  return index;
}

export function voxelAt(x, y, z, boxes, index, edits = new Map(), size = 32) {
  const key = `${x}|${y}|${z}`;
  if (edits.has(key)) return edits.get(key);
  if (x < 0 || y < 0 || z < 0 || x >= SIZE[0] || y >= SIZE[1] || z >= SIZE[2]) return 0;
  let result = 0;
  for (const i of index.get(`${Math.floor(x / size)}|${Math.floor(y / size)}|${Math.floor(z / size)}`) || []) {
    const b = boxes[i]; if (x >= b[0] && y >= b[1] && z >= b[2] && x < b[3] && y < b[4] && z < b[5]) result = b[6];
  }
  return result;
}

export function fillChunk(origin, size, boxes, index, edits = new Map(), padding = 0) {
  const n = size + padding * 2, data = new Uint16Array(n ** 3);
  const [ox, oy, oz] = origin.map(v => v - padding);
  const candidates = new Set();
  for (let x = Math.floor(ox / 32); x <= Math.floor((ox + n - 1) / 32); x++)
    for (let y = Math.floor(oy / 32); y <= Math.floor((oy + n - 1) / 32); y++)
      for (let z = Math.floor(oz / 32); z <= Math.floor((oz + n - 1) / 32); z++)
        for (const i of index.get(`${x}|${y}|${z}`) || []) candidates.add(i);
  for (const i of [...candidates].sort((a, b) => a - b)) {
    const b = boxes[i];
    const xa = Math.max(0, Math.ceil(b[0] - ox)), xb = Math.min(n, Math.ceil(b[3] - ox));
    const ya = Math.max(0, Math.ceil(b[1] - oy)), yb = Math.min(n, Math.ceil(b[4] - oy));
    const za = Math.max(0, Math.ceil(b[2] - oz)), zb = Math.min(n, Math.ceil(b[5] - oz));
    if (xa >= xb || ya >= yb || za >= zb) continue;
    for (let y = ya; y < yb; y++)
      for (let z = za; z < zb; z++) data.fill(b[6], y * n * n + z * n + xa, y * n * n + z * n + xb);
  }
  for (const [key, value] of edits) {
    const [x, y, z] = key.split('|').map(Number), dx = x - ox, dy = y - oy, dz = z - oz;
    if (dx >= 0 && dy >= 0 && dz >= 0 && dx < n && dy < n && dz < n) data[dy * n * n + dz * n + dx] = value;
  }
  return data;
}
