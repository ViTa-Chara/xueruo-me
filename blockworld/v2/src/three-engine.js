import * as THREE from 'three';
import { palette } from './palette.js';
import { spatialIndex, voxelAt } from './world.js';
import { actorParts } from './actors.js';

export async function createEngine(container, world, mobile) {
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#c5dce1');
  const distance = mobile ? 112 : 224;
  scene.fog = new THREE.Fog('#c5dce1', distance * .68, distance);
  const camera = new THREE.PerspectiveCamera(68, container.clientWidth / container.clientHeight, .1, distance + 32);
  camera.rotation.order = 'YXZ';
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });
  const meshes = new Map(), pending = new Map(), edits = new Map();
  const index = spatialIndex(world.boxes), worker = new Worker(new URL('./mesh.worker.js', import.meta.url), { type: 'module' });
  let lastCenter = '', ready = false, revision = 0, generated = 0, meshingMS = 0;
  worker.postMessage({ type: 'init', boxes: world.boxes });
  const projected = new THREE.Vector3(), eye = new THREE.Vector3();
  const requestChunk = key => {
    const origin = key.split('|').map(v => Number(v) * 32), rev = revision;
    pending.set(key, rev);
    worker.postMessage({ type: 'mesh', key, origin, revision: rev, edits: [...edits] });
  };
  worker.onmessage = ({ data }) => {
    if (pending.get(data.key) !== data.revision) return;
    pending.delete(data.key);
    if (meshes.has(data.key)) { meshes.get(data.key).geometry.dispose(); scene.remove(meshes.get(data.key)); }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3)); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...data.key.split('|').map(v => Number(v) * 32));
    scene.add(mesh); meshes.set(data.key, mesh); generated++; meshingMS += data.ms;
    if (data.key === '8|0|14') ready = true;
  };
  const loadChunks = position => {
    const center = position.map(v => Math.floor(v / 32)), key = center.join('|');
    if (key === lastCenter) return; lastCenter = key;
    const radius = mobile ? 3 : 6, wanted = [];
    for (let x = Math.max(0, center[0] - radius); x <= Math.min(15, center[0] + radius); x++)
      for (let z = Math.max(0, center[2] - radius); z <= Math.min(15, center[2] + radius); z++) {
        if (Math.hypot(x - center[0], z - center[2]) > radius + .3) continue;
        for (let y = 0; y < 3; y++) {
          const key = `${x}|${y}|${z}`;
          if (!meshes.has(key) && !pending.has(key)) wanted.push({ key, distance: Math.hypot(x - center[0], z - center[2]) + Math.abs(y - center[1]) * .5 });
        }
      }
    wanted.sort((a, b) => a.distance - b.distance).forEach(({ key }) => requestChunk(key));
    for (const [key, mesh] of meshes) {
      const [x, , z] = key.split('|').map(Number);
      if (Math.hypot(x - center[0], z - center[2]) > radius + 2) { scene.remove(mesh); mesh.geometry.dispose(); meshes.delete(key); }
    }
  };
  const actorGroups = new Map(), actorMaterials = new Map();
  const unit = new THREE.BoxGeometry(1, 1, 1);
  for (const actor of world.actors) {
    const group = new THREE.Group();
    for (const [x, y, z, w, h, d, id] of actorParts(actor.type)) {
      if (!actorMaterials.has(id)) actorMaterials.set(id, new THREE.MeshBasicMaterial({ color: palette[id].color }));
      const mesh = new THREE.Mesh(unit, actorMaterials.get(id)); mesh.position.set(x + w / 2, y + h / 2, z + d / 2); mesh.scale.set(w, h, d); group.add(mesh);
    }
    scene.add(group); actorGroups.set(actor.id, group);
  }
  const raycaster = new THREE.Raycaster(), scratch = new THREE.Vector3();
  let currentPosition = [...world.spawn];
  return {
    name: 'Three.js + Worker', canvas: renderer.domElement, get ready() { return ready; },
    setView(position, yaw, pitch) {
      currentPosition = position; camera.position.set(position[0], position[1] + 1.62, position[2]);
      camera.rotation.set(-pitch, -yaw, 0); camera.updateMatrixWorld(); loadChunks(position);
    },
    project(position) {
      projected.set(...position); scratch.copy(projected).sub(camera.position); camera.getWorldDirection(eye);
      const front = scratch.dot(eye) > 0;
      projected.project(camera);
      return { x: (projected.x + 1) * container.clientWidth / 2, y: (1 - projected.y) * container.clientHeight / 2, visible: front && projected.z < 1, depth: scratch.length() };
    },
    solid(x, y, z) { const id = voxelAt(x, y, z, world.boxes, index, edits); return !!id && palette[id].solid; },
    pick(max = 8) {
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      const p = camera.position.clone(), dir = raycaster.ray.direction, previous = p.clone();
      for (let t = 0; t < max; t += .08) {
        p.copy(camera.position).addScaledVector(dir, t);
        const cell = p.toArray().map(Math.floor), id = voxelAt(...cell, world.boxes, index, edits);
        if (id) return { position: cell, adjacent: previous.toArray().map(Math.floor), id };
        previous.copy(p);
      }
      return null;
    },
    setBlock(id, position) {
      if (position.some((v, axis) => v < 0 || v >= world.size[axis])) return false;
      edits.set(position.join('|'), id); revision++;
      const center = position.map(v => Math.floor(v / 32));
      for (const key of new Set([center.join('|'), ...[0, 1, 2].flatMap(axis => [-1, 1].map(dir => { const p = [...center]; p[axis] += dir; return p.join('|'); }))]))
        if (meshes.has(key) || pending.has(key)) requestChunk(key);
      return true;
    },
    actor(actor, state, visible) {
      const group = actorGroups.get(actor.id); group.visible = visible;
      if (!visible) return; group.position.set(...state.position); group.rotation.y = state.heading;
      if (state.hit) group.position.x += Math.sin(state.hit * Math.PI) * .8;
      if (['worker', 'sato'].includes(actor.type)) {
        group.children[0].rotation.x = state.walking ? Math.sin(state.seconds * 8) * .35 : 0;
        group.children[1].rotation.x = -group.children[0].rotation.x;
        group.children[5].rotation.x = state.operating ? -.9 + Math.sin(state.seconds * 5) * .3 : 0;
      }
      group.scale.setScalar(state.hit ? 1 + Math.sin(state.hit * Math.PI) * .08 : 1);
    },
    render() { renderer.render(scene, camera); },
    resize() { renderer.setSize(container.clientWidth, container.clientHeight); camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); },
    stats() { return { chunks: meshes.size, pending: pending.size, generated, meshingMS: Math.round(meshingMS), drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, edits: edits.size }; },
    dispose() { worker.terminate(); renderer.dispose(); }
  };
}
