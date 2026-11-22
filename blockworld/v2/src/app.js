import './style.css';
import { createWorld, zones } from './world.js';
import { items, palette, M, tools } from './palette.js';
import { actorState } from './actors.js';

const $ = id => document.getElementById(id);
const mobile = new URLSearchParams(location.search).has('mobile') || matchMedia('(pointer:coarse)').matches;
document.body.classList.toggle('mobile', mobile);
const content = await fetch('content.json').then(r => { if (!r.ok) throw Error('内容加载失败'); return r.json(); });
const world = createWorld(content);
const selectedEngine = new URLSearchParams(location.search).get('engine') === 'noa' ? 'noa' : 'three';
let engine, toastTimer, position = [...world.spawn], yaw = 0, pitch = -.12, velocityY = 0, grounded = true, flying = false;
let selectedSlot = 0, activeTab = '材料', frame = 0, visibleActors = 0, target, lastTime = performance.now(), clock = 0;
let jumpRequested = false, joystick = [0, 0], key = {}, paused = false;
const hotbar = [tools[0], palette[M.concrete], palette[M.steel], palette[M.yellow], palette[M.blue], palette[M.glass], tools[1], tools[2], tools[3]];
const frameTimes = [], actorStates = new Map(), hits = new Map(), panelNodes = [];
const href = url => url.startsWith('/') ? '.' + url : url;
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const toolIcon = item => item.id === 'wrench' ? '🔧' : item.id === 'hammer' ? '🔨' : item.id === 'welder' ? '⚡' : '⌁';
function toast(message) { $('toast').textContent = message; $('toast').style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').style.display = 'none', 2300); }

function pause() { key = {}; joystick = [0, 0]; paused = true; document.exitPointerLock?.(); }
function openDialog(id) { pause(); for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close(); $(id).showModal(); }
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('.close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { paused = !!document.querySelector('dialog[open]'); key = {}; });
  dialog.addEventListener('click', event => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); });
}

function openCard(item) {
  $('card-kind').textContent = ({ media: 'CHARACTER / 原图', news: 'BULLETIN / 公告', book: 'LIBRARY / 书库', machine: 'WORKSHOP / 设备', info: 'HAOTONG MACHINE', link: 'PORTAL / 入口' })[item.kind] || '';
  $('card-title').textContent = item.title; $('card-date').textContent = item.date || item.character || '';
  $('card-body').textContent = item.body || '';
  const img = $('card-image'); img.hidden = !item.img;
  if (item.img) { img.src = href(item.img); img.alt = item.title; } else img.removeAttribute('src');
  const link = $('card-link'); link.hidden = !item.url;
  if (item.url) { link.href = href(item.url); link.textContent = item.cta || '查看'; link.target = item.img || /^https?:/.test(item.url) ? '_blank' : '_self'; link.rel = 'noopener'; }
  openDialog('card');
}
for (const [button, id] of [['gallery-button', 'gallery'], ['news-button', 'news'], ['map-button', 'park-map'], ['backpack-button', 'backpack'], ['help-button', 'help']]) $(button).onclick = () => openDialog(id);
for (const item of content.media) {
  const button = document.createElement('button'), img = document.createElement('img'), label = document.createElement('strong');
  button.setAttribute('aria-label', item.title);
  img.loading = 'lazy'; img.src = item.img; img.alt = item.title; label.textContent = item.title;
  button.append(img, label); button.onclick = () => openCard(item); $('gallery-items').append(button);
}
for (const item of content.news) {
  const button = document.createElement('button'), date = document.createElement('small'), title = document.createElement('span');
  date.textContent = item.date; title.textContent = item.title; button.append(date, title); button.onclick = () => openCard(item); $('news-items').append(button);
}
for (const [title, list] of [['角色画廊', content.media], ['厂区公告', content.news], ['资料室', content.books], ['传送入口', content.portals]]) {
  const section = document.createElement('section'), heading = document.createElement('h2'); heading.textContent = title; section.append(heading);
  for (const item of list) {
    const article = document.createElement('article'), h = document.createElement('h3'), p = document.createElement('p'), link = document.createElement('a');
    h.textContent = item.title; p.textContent = [item.date, item.body].filter(Boolean).join('\n');
    article.append(h); if (item.img) { const img = document.createElement('img'); img.loading = 'lazy'; img.src = item.img; img.alt = item.title; article.append(img); }
    link.textContent = item.cta || '查看'; link.href = href(item.url); article.append(p, link); section.append(article);
  }
  $('text-content').append(section);
}
const textMode = () => {
  const show = location.hash === '#text'; $('text').hidden = !show;
  if (show) pause(); else paused = !!document.querySelector('dialog[open]');
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
};
addEventListener('hashchange', textMode); textMode();

function redrawHotbar() {
  $('hotbar').replaceChildren();
  hotbar.forEach((item, slot) => {
    const button = document.createElement('button'), number = document.createElement('small');
    number.textContent = slot + 1; button.append(number); button.title = item.name; button.setAttribute('aria-label', `${slot + 1} ${item.name}`);
    if (item.tool) button.append(document.createTextNode(toolIcon(item)));
    else { const swatch = document.createElement('span'); swatch.className = 'swatch'; swatch.style.background = item.color; button.append(swatch); }
    button.classList.toggle('selected', selectedSlot === slot); button.onclick = () => { selectedSlot = slot; redrawHotbar(); }; $('hotbar').append(button);
  });
  const item = hotbar[selectedSlot]; $('held-name').textContent = item.name;
  $('held').firstElementChild.textContent = item.tool ? toolIcon(item) : '◼'; $('held').style.color = item.color;
}
function redrawInventory() {
  $('inventory').replaceChildren();
  for (const item of items.filter(i => i.category === activeTab)) {
    const button = document.createElement('button'), swatch = document.createElement('span'), label = document.createElement('span');
    button.setAttribute('aria-label', item.name);
    swatch.className = 'swatch'; swatch.style.background = item.color; if (item.tool) swatch.textContent = toolIcon(item);
    label.textContent = item.name; button.append(swatch, label); button.onclick = () => { hotbar[selectedSlot] = item; redrawHotbar(); $('backpack').close(); toast(`已选择：${item.name}`); }; $('inventory').append(button);
  }
}
document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => {
  activeTab = button.dataset.tab; document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b === button)); redrawInventory();
});
redrawHotbar(); redrawInventory();

const svgNS = 'http://www.w3.org/2000/svg';
function teleport(zone) {
  const [x0, z0, x1, z1] = zone.box;
  position = [(x0 + x1) / 2, 2, Math.min(z1 + 5, 487)]; velocityY = 0; yaw = 0; pitch = -.04; flying = false;
  $('mode-label').textContent = '步行'; $('park-map').close(); toast(`已到达：${zone.name}`);
}
for (const zone of zones) {
  const [x0, z0, x1, z1] = zone.box, rect = document.createElementNS(svgNS, 'rect'), text = document.createElementNS(svgNS, 'text');
  for (const [name, value] of Object.entries({ x: x0, y: z0, width: x1 - x0, height: z1 - z0 })) rect.setAttribute(name, value);
  rect.setAttribute('class', `zone ${zone.id > 10 ? 'life' : ''} ${zone.id === 13 ? 'entry' : ''}`); rect.setAttribute('role', 'button'); rect.setAttribute('tabindex', '0'); rect.setAttribute('aria-label', zone.name);
  rect.onclick = () => teleport(zone); rect.onkeydown = e => { if (e.key === 'Enter') teleport(zone); };
  text.setAttribute('x', (x0 + x1) / 2); text.setAttribute('y', (z0 + z1) / 2); text.setAttribute('text-anchor', 'middle'); text.textContent = zone.id + ' ' + zone.name;
  $('map-svg').append(rect, text);
  const button = document.createElement('button'), number = document.createElement('span'); number.textContent = String(zone.id).padStart(2, '0'); button.append(number, document.createTextNode(zone.name)); button.onclick = () => teleport(zone); $('map-list').append(button);
}

// A homography projects actual DOM images onto world-space planes. GIFs stay native
// animated images (no lossy resampling or frame decoding; originals remain downloadable).
function homography(corners, width, height) {
  const [p0, p1, p2, p3] = corners, dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  const den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(den) < .001) return null;
  const g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
  return `matrix3d(${(p1.x - p0.x + g * p1.x) / width},${(p1.y - p0.y + g * p1.y) / width},0,${g / width},${(p3.x - p0.x + h * p3.x) / height},${(p3.y - p0.y + h * p3.y) / height},0,${h / height},0,0,1,0,${p0.x},${p0.y},0,1)`;
}
for (const sign of world.signs) {
  const panel = document.createElement('button'); panel.className = 'world-panel'; panel.setAttribute('aria-label', sign.title);
  const media = sign.item?.img && sign.h > 2;
  const panelHeight = 512 * sign.h / sign.w;
  panel.style.height = `${panelHeight}px`;
  if (!media) { panel.style.fontSize = `${Math.min(34, Math.max(18, panelHeight * .25))}px`; panel.style.padding = `${Math.min(14, panelHeight * .07)}px`; panel.style.borderWidth = `${Math.min(10, Math.max(3, panelHeight * .05))}px`; }
  if (media) { panel.classList.add('media'); const img = document.createElement('img'); img.dataset.src = sign.item.img; img.alt = sign.title; panel.append(img); }
  else { const label = document.createElement('span'); label.textContent = sign.title; panel.append(label); if (sign.item?.date) { const date = document.createElement('small'); date.textContent = sign.item.date; panel.append(date); } }
  panel.style.borderColor = sign.color; panel.onclick = () => openCard(sign.item); $('panels').append(panel); panelNodes.push({ sign, panel, panelHeight });
}
function unobstructed(end) {
  const start = [position[0], position[1] + 1.62, position[2]], d = distance(start, end);
  for (let t = .8; t < d - 1.2; t += 1.1) {
    const p = start.map((v, a) => Math.floor(v + (end[a] - v) * t / d));
    if (engine.solid(...p)) return false;
  }
  return true;
}
function updatePanels() {
  target = null; const w = innerWidth, h = innerHeight;
  for (const { sign, panel, panelHeight } of panelNodes) {
    const center = [sign.x, sign.y, sign.z], projection = engine.project(center);
    let visible = position[2] > sign.z + .2 && projection.visible && projection.depth < (mobile ? 88 : 150) && projection.x > -w * .5 && projection.x < w * 1.5 && projection.y > -h && projection.y < h * 2;
    if (visible) visible = unobstructed(center);
    panel.hidden = !visible;
    // The hidden attribute must be paired with explicit style because display:flex
    // in the panel stylesheet otherwise wins over the user-agent [hidden] rule.
    panel.style.display = visible ? 'flex' : 'none';
    if (!visible) continue;
    const img = panel.querySelector('img[data-src]');
    if (img) { img.src = img.dataset.src; delete img.dataset.src; }
    const corners = [[-.5, .5], [.5, .5], [.5, -.5], [-.5, -.5]].map(([x, y]) => engine.project([sign.x + sign.w * x, sign.y + sign.h * y, sign.z]));
    if (corners.some(c => !c.visible)) { panel.style.display = 'none'; continue; }
    const matrix = homography(corners, 512, panelHeight);
    if (matrix) panel.style.transform = matrix;
    panel.style.zIndex = Math.round(200 - projection.depth);
    if (projection.depth < 16 && Math.hypot(projection.x - w / 2, projection.y - h / 2) < 95) {
      if (!target || projection.depth < target.depth) target = { item: sign.item, depth: projection.depth };
    }
  }
  $('target-label').style.display = target ? 'block' : 'none';
  if (target) $('target-label').textContent = `E · ${target.item.title}`;
}

function toggleFly() { flying = !flying; velocityY = 0; $('mode-label').textContent = flying ? '飞行' : '步行'; toast(flying ? '飞行 · 空格上升 / C 下降' : '已切换步行'); }
function interact() {
  if (target) return openCard(target.item);
  const closest = world.machines.find(machine => distance(position, [machine.x, machine.y, machine.z]) < 8);
  if (closest) return openCard(closest.item);
  const sato = actorStates.get('sato');
  if (sato && distance(position, sato.position) < 7) return openCard({ kind: 'media', title: '小撒 · 昊通机械', body: '两张白发角色图都是小撒。', img: content.media[0].img, url: content.media[0].img, cta: '打开原图' });
  toast('对准展板或走近设备后查看');
}
function swing() {
  const item = hotbar[selectedSlot];
  if (target) return openCard(target.item);
  if (!item.tool) { const pick = engine.pick(); if (pick && pick.position[1] > 0) engine.setBlock(0, pick.position); return; }
  $('held').classList.remove('swing'); void $('held').offsetWidth; $('held').classList.add('swing');
  const direction = [Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
  let closest;
  for (const actor of world.actors) {
    const state = actorStates.get(actor.id); if (!state) continue;
    const targetPosition = [state.position[0], state.position[1] + 1, state.position[2]];
    const offset = targetPosition.map((v, i) => v - [position[0], position[1] + 1.5, position[2]][i]);
    const depth = offset.reduce((sum, v, i) => sum + v * direction[i], 0);
    const perpendicular = Math.sqrt(Math.max(0, offset.reduce((sum, v) => sum + v * v, 0) - depth * depth));
    if (depth > 0 && depth < (item.id === 'laser' ? 14 : 4) && perpendicular < (actor.type === 'worker' || actor.type === 'sato' ? .85 : 2)) {
      if (!closest || depth < closest.depth) closest = { actor, depth };
    }
  }
  if (closest) { hits.set(closest.actor.id, clock); toast(`${item.name} · 命中反馈`); }
  for (let i = 0; i < (closest ? 12 : item.id === 'welder' ? 6 : 0); i++) {
    const spark = document.createElement('span'); spark.className = 'spark'; spark.style.left = innerWidth / 2 + 'px'; spark.style.top = innerHeight / 2 + 'px';
    spark.style.setProperty('--dx', `${Math.sin(i * 2.4) * 65}px`); spark.style.setProperty('--dy', `${Math.cos(i * 2.4) * 65}px`); document.body.append(spark); setTimeout(() => spark.remove(), 600);
  }
}
function place() {
  const item = hotbar[selectedSlot]; if (item.tool) return toast('先在背包里选一种材料');
  const pick = engine.pick(); if (!pick) return;
  const p = pick.adjacent;
  if (p[1] > 0 && !(Math.abs(p[0] + .5 - position[0]) < .8 && Math.abs(p[2] + .5 - position[2]) < .8 && p[1] < position[1] + 1.8 && p[1] + 1 > position[1])) engine.setBlock(item.id, p);
}
addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]') || location.hash === '#text') return;
  key[e.code] = true;
  if (['Space', 'KeyB', 'KeyM', 'KeyF'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'KeyB') openDialog('backpack'); if (e.code === 'KeyM') openDialog('park-map');
  if (e.code === 'KeyE') interact(); if (e.code === 'KeyF') toggleFly(); if (e.code === 'Space') jumpRequested = true;
  if (/^Digit[1-9]$/.test(e.code)) { selectedSlot = Number(e.code.at(-1)) - 1; redrawHotbar(); }
});
addEventListener('keyup', e => key[e.code] = false); addEventListener('blur', () => { key = {}; joystick = [0, 0]; });
document.addEventListener('pointerlockchange', () => { key = {}; });
document.addEventListener('mousemove', e => { if (document.pointerLockElement && !paused) { yaw += e.movementX * .0025; pitch = Math.max(-1.45, Math.min(1.45, pitch + e.movementY * .0025)); } });
$('world').addEventListener('contextmenu', e => e.preventDefault());
$('world').addEventListener('mousedown', e => {
  if (mobile || !engine || paused) return;
  if (!document.pointerLockElement) { engine.canvas.requestPointerLock?.(); return; }
  if (e.button === 0) swing(); if (e.button === 2) place();
});
const joystickElement = $('joystick');
joystickElement.addEventListener('pointerdown', e => { e.preventDefault(); joystickElement.setPointerCapture(e.pointerId); });
joystickElement.addEventListener('pointermove', e => {
  if (!joystickElement.hasPointerCapture(e.pointerId)) return;
  const rect = joystickElement.getBoundingClientRect(), dx = (e.clientX - rect.left - rect.width / 2) / 42, dy = (e.clientY - rect.top - rect.height / 2) / 42;
  const norm = Math.max(1, Math.hypot(dx, dy)); joystick = [dx / norm, -dy / norm];
  joystickElement.firstElementChild.style.transform = `translate(${joystick[0] * 30}px,${-joystick[1] * 30}px)`;
});
const releaseJoystick = () => { joystick = [0, 0]; joystickElement.firstElementChild.style.transform = ''; };
joystickElement.addEventListener('pointerup', releaseJoystick); joystickElement.addEventListener('pointercancel', releaseJoystick);
let lookTouch;
$('world').addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' && !paused) { lookTouch = [e.clientX, e.clientY]; $('world').setPointerCapture(e.pointerId); } });
$('world').addEventListener('pointermove', e => {
  if (lookTouch && e.pointerType !== 'mouse') { yaw += (e.clientX - lookTouch[0]) * .004; pitch = Math.max(-1.45, Math.min(1.45, pitch + (e.clientY - lookTouch[1]) * .004)); lookTouch = [e.clientX, e.clientY]; }
});
$('world').addEventListener('pointerup', () => lookTouch = null); $('world').addEventListener('pointercancel', () => lookTouch = null);
$('touch-interact').onclick = interact; $('touch-use').onclick = () => engine && swing(); $('touch-place').onclick = () => engine && place(); $('touch-fly').onclick = toggleFly;
$('touch-jump').addEventListener('pointerdown', e => { e.preventDefault(); key.Space = true; jumpRequested = true; });
for (const name of ['pointerup', 'pointercancel', 'pointerleave']) $('touch-jump').addEventListener(name, () => key.Space = false);

function collides(p) {
  for (const dx of [-.27, .27]) for (const dz of [-.27, .27]) for (const dy of [.12, .9, 1.7]) if (engine.solid(Math.floor(p[0] + dx), Math.floor(p[1] + dy), Math.floor(p[2] + dz))) return true;
  return false;
}
function move(dt) {
  if (paused || document.hidden || !engine.ready) return;
  const forward = (key.KeyW ? 1 : 0) - (key.KeyS ? 1 : 0) + joystick[1], side = (key.KeyD ? 1 : 0) - (key.KeyA ? 1 : 0) + joystick[0];
  const norm = Math.max(1, Math.hypot(forward, side)), speed = flying ? (key.ShiftLeft ? 42 : 22) : (key.ShiftLeft ? 10 : 6);
  const dx = (Math.sin(yaw) * forward + Math.cos(yaw) * side) / norm * speed * dt, dz = (-Math.cos(yaw) * forward + Math.sin(yaw) * side) / norm * speed * dt;
  for (const [axis, delta] of [[0, dx], [2, dz]]) {
    const p = [...position]; p[axis] = Math.max(.5, Math.min(511.5, p[axis] + delta));
    if (!collides(p)) position = p;
    else if (grounded && !flying) { p[1] += 1; if (!collides(p)) position = p; }
  }
  if (flying) {
    const p = [...position]; p[1] = Math.max(2, Math.min(93, p[1] + ((key.Space ? 1 : 0) - (key.KeyC ? 1 : 0)) * speed * dt));
    if (!collides(p)) position = p; velocityY = 0;
  } else {
    if (jumpRequested && grounded) velocityY = 7.5;
    velocityY -= 20 * dt; const steps = Math.max(1, Math.ceil(Math.abs(velocityY * dt) / .3));
    grounded = false;
    for (let i = 0; i < steps; i++) {
      const p = [...position]; p[1] += velocityY * dt / steps;
      if (!collides(p)) position = p;
      else { grounded = velocityY < 0; velocityY = 0; break; }
    }
  }
  jumpRequested = false;
  if (position[1] < -5) { position = [...world.spawn]; velocityY = 0; }
}
function tick(now) {
  const elapsed = now - lastTime, dt = Math.min(.05, elapsed / 1000); lastTime = now; clock += dt;
  if (engine.ready && !document.hidden) { frameTimes.push(elapsed); if (frameTimes.length > 600) frameTimes.shift(); }
  move(dt); engine.setView(position, yaw, pitch);
  visibleActors = 0;
  const nearby = world.actors.map(actor => ({ actor, state: actorState(actor, clock) })).sort((a, b) => distance(a.state.position, position) - distance(b.state.position, position));
  const budget = mobile ? 24 : 64;
  for (const { actor, state } of nearby) {
    const visible = visibleActors < budget && distance(state.position, position) < (mobile ? 96 : 220);
    if (visible) visibleActors++;
    const hitTime = hits.get(actor.id), hit = hitTime !== undefined && clock - hitTime < .55 ? 1 - (clock - hitTime) / .55 : 0;
    const fullState = { ...state, seconds: clock, hit }; actorStates.set(actor.id, fullState); engine.actor(actor, fullState, visible);
  }
  engine.render(); updatePanels(); frame++;
  if (frame % 30 === 0) {
    const zone = zones.find(z => position[0] >= z.box[0] && position[0] <= z.box[2] && position[2] >= z.box[1] && position[2] <= z.box[3]);
    $('zone-name').textContent = zone?.name || '厂区道路'; $('coords').textContent = `${Math.floor(position[0])} / ${Math.floor(position[2])}`;
    const fps = Math.round(1000 / (frameTimes.slice(-60).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(60, frameTimes.length))));
    $('engine-stats').textContent = `${Number.isFinite(fps) ? fps : '—'} FPS`;
  }
  if (engine.ready && !$('loading').hidden) {
    $('loading').hidden = true; $('loading').style.display = 'none';
    window.xrReady = true; window.xrLoadTime = performance.now();
  }
  requestAnimationFrame(tick);
}
try {
  const module = selectedEngine === 'noa' ? await import('./noa-engine.js') : await import('./three-engine.js');
  engine = await module.createEngine($('world'), world, mobile);
  engine.setView(position, yaw, pitch); requestAnimationFrame(tick);
  addEventListener('resize', () => engine.resize());
  // The read-only public metrics API supports reproducible E0 measurements. Scene
  // controls are useful for inspecting every region without editing browser internals.
  window.ht = {
    world, content, palette, metrics: () => {
      const sorted = [...frameTimes].sort((a, b) => a - b);
      return { engine: engine.name, ready: engine.ready, loadMS: Math.round(window.xrLoadTime || performance.now()), position: [...position], mobile,
        meanFPS: Math.round(1000 / (frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, frameTimes.length))),
        p95FrameMS: Math.round(sorted[Math.floor(sorted.length * .95)] || 0), samples: sorted.length,
        visibleActors, worldActors: world.actors.length, signs: world.signs.length, zones: zones.length,
        blocks: palette.length - 1, jsHeapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, ...engine.stats() };
    },
    visit: id => teleport(zones.find(zone => zone.id === id)),
    view: (p, y = 0, tilt = 0) => { position = [...p]; yaw = y; pitch = tilt; flying = true; $('mode-label').textContent = '飞行'; },
    resetMetrics: () => frameTimes.splice(0), inspect: openCard, state: () => ({ position: [...position], flying, selected: hotbar[selectedSlot], actorStates: [...actorStates], hits: [...hits] })
  };
} catch (error) {
  console.error(error); $('loading').querySelector('p').textContent = '当前浏览器无法打开厂区，可以查看完整文字版。';
  $('loading').querySelector('progress').remove(); if (location.hash !== '#text') location.hash = '#text';
}
