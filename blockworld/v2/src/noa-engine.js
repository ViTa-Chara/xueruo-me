import { Engine } from 'noa-engine';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { palette } from './palette.js';
import { spatialIndex, voxelAt, fillChunk } from './world.js';
import { actorParts } from './actors.js';

export async function createEngine(container, world, mobile) {
  const noa = new Engine({ domElement: container, debug: false, showFPS: false, chunkSize: 32,
    chunkAddDistance: [mobile ? 3 : 6, 3], chunkRemoveDistance: [mobile ? 5 : 8, 4],
    manuallyControlChunkLoading: true,
    playerStart: world.spawn, playerHeight: 1.8, playerWidth: .6, worldGenWhilePaused: true,
    useAO: false, antiAlias: !mobile, clearColor: [.77, .86, .88, 1],
    ambientColor: [.8, .8, .8], lightDiffuse: [.4, .4, .4], originRebaseDistance: 1024,
    preserveDrawingBuffer: true, tickRate: 30, maxRenderRate: 60 });
  const scene = noa.rendering.getScene();
  noa.rendering.camera.fov = 68 * Math.PI / 180;
  // noa meshes use left-handed winding. Reflect only its rendered canvas and
  // projected X coordinate to keep the shared world's east/right convention.
  // This preserves its terrain culling instead of mutating renderer internals.
  noa.container.canvas.style.transform = 'scaleX(-1)';
  scene.fogMode = 3; scene.fogColor = Color3.FromHexString('#c5dce1');
  scene.fogStart = (mobile ? 112 : 224) * .68; scene.fogEnd = mobile ? 112 : 224;
  noa.camera.sensitivityMult = 0;
  noa.ents.removeComponent(noa.playerEntity, noa.ents.names.receivesInputs);
  noa.ents.removeComponent(noa.playerEntity, noa.ents.names.movement);
  noa.ents.removeComponent(noa.playerEntity, noa.ents.names.physics);
  noa.inputs.unbind('fire'); noa.inputs.unbind('alt-fire');
  noa.container.setPointerLock(false);
  noa.rendering.engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, mobile ? 1.25 : 1.5));
  noa.rendering.camera.maxZ = mobile ? 144 : 256;
  for (const item of palette.slice(1)) {
    const color = Color3.FromHexString(item.color).asArray();
    noa.registry.registerMaterial(`material-${item.id}`, { color, alpha: item.opacity || 1 });
    noa.registry.registerBlock(item.id, { material: `material-${item.id}`, solid: item.solid, opaque: !item.opacity });
  }
  const index = spatialIndex(world.boxes), edits = new Map();
  let generated = 0, ready = false, renderReady = false, lastCenter = '';
  const chunks = new Set();
  const loadChunks = position => {
    const center = position.map(v => Math.floor(v / 32)), key = center.join('|');
    if (key === lastCenter) return; lastCenter = key;
    const radius = mobile ? 3 : 6, wanted = [];
    for (let x = Math.max(0, center[0] - radius); x <= Math.min(15, center[0] + radius); x++)
      for (let z = Math.max(0, center[2] - radius); z <= Math.min(15, center[2] + radius); z++) {
        if (Math.hypot(x - center[0], z - center[2]) > radius + .3) continue;
        for (let y = 0; y < 3; y++) {
          const key = `${x}|${y}|${z}`;
          if (!chunks.has(key)) wanted.push({ key, origin: [x * 32, y * 32, z * 32], distance: Math.hypot(x - center[0], z - center[2]) + Math.abs(y - center[1]) * .5 });
        }
      }
    // noa's request queue pops the last entry, so enqueue distant chunks first.
    wanted.sort((a, b) => b.distance - a.distance).forEach(({ key, origin }) => { chunks.add(key); noa.world.manuallyLoadChunk(...origin); });
    for (const key of chunks) {
      const [x, y, z] = key.split('|').map(Number);
      if (Math.hypot(x - center[0], z - center[2]) > radius + 2) { noa.world.manuallyUnloadChunk(x * 32, y * 32, z * 32); chunks.delete(key); }
    }
  };
  noa.world.on('worldDataNeeded', (id, data, x, y, z) => {
    const raw = fillChunk([x, y, z], data.shape[0], world.boxes, index, edits);
    const size = data.shape[0];
    for (let dx = 0; dx < size; dx++) for (let dy = 0; dy < size; dy++) for (let dz = 0; dz < size; dz++)
      data.set(dx, dy, dz, raw[dy * size * size + dz * size + dx]);
    noa.world.setChunkData(id, data); generated++;
    if (x <= 256 && x + size > 256 && y === 0 && z <= 470 && z + size > 470) ready = true;
  });
  const materials = new Map(), actors = new Map();
  for (const actor of world.actors) {
    const root = new TransformNode(actor.id, scene), parts = [];
    for (const [x, y, z, w, h, d, id] of actorParts(actor.type)) {
      const mesh = CreateBox(`${actor.id}-part`, { width: w, height: h, depth: d }, scene);
      if (!materials.has(id)) { const mat = noa.rendering.makeStandardMaterial(`actor-${id}`); mat.diffuseColor = Color3.FromHexString(palette[id].color); mat.ambientColor = mat.diffuseColor.clone(); materials.set(id, mat); }
      mesh.material = materials.get(id); mesh.parent = root; mesh.position.set(x + w / 2, y + h / 2, z + d / 2);
      noa.rendering.addMeshToScene(mesh); parts.push(mesh);
    }
    actors.set(actor.id, { root, parts });
  }
  const point = new Vector3();
  return {
    name: 'noa 0.33 + Babylon', canvas: noa.container.canvas,
    get ready() {
      // Latch initial readiness: the spawn chunk is deliberately unloaded after
      // travelling far away, and must not disable movement or metrics afterwards.
      if (!renderReady) renderReady = ready && !!noa.world._getChunkByCoords(...world.spawn)?._timesMeshed;
      return renderReady;
    },
    setView(position, yaw, pitch) {
      noa.ents.setPosition(noa.playerEntity, position); noa.camera.heading = Math.PI - yaw; noa.camera.pitch = pitch;
      // Input sensitivity is disabled for the shared controller. Keep noa's
      // targeting direction updated when the shared controller turns the camera.
      noa.camera._dirVector[0] = Math.sin(yaw) * Math.cos(pitch);
      noa.camera._dirVector[1] = -Math.sin(pitch);
      noa.camera._dirVector[2] = -Math.cos(yaw) * Math.cos(pitch);
      loadChunks(position);
    },
    project(position) {
      point.set(...position); point.subtractInPlace(Vector3.FromArray(noa.worldOriginOffset));
      const camera = noa.rendering.camera, direction = camera.getForwardRay().direction;
      const offset = point.subtract(camera.globalPosition);
      const projected = Vector3.Project(point, Matrix.IdentityReadOnly, scene.getTransformMatrix(), camera.viewport.toGlobal(container.clientWidth, container.clientHeight));
      return { x: container.clientWidth - projected.x, y: projected.y, visible: Vector3.Dot(offset, direction) > 0 && projected.z < 1, depth: offset.length() };
    },
    solid(x, y, z) { const id = voxelAt(x, y, z, world.boxes, index, edits); return !!id && palette[id].solid; },
    pick() { return noa.targetedBlock && { position: [...noa.targetedBlock.position], adjacent: [...noa.targetedBlock.adjacent], id: noa.targetedBlock.blockID }; },
    setBlock(id, position) { if (position.some((v, axis) => v < 0 || v >= world.size[axis])) return false; edits.set(position.join('|'), id); noa.setBlock(id, ...position); return true; },
    actor(actor, state, visible) {
      const { root, parts } = actors.get(actor.id); root.setEnabled(visible);
      if (!visible) return; root.position.set(...state.position); root.position.subtractInPlace(Vector3.FromArray(noa.worldOriginOffset)); root.rotation.y = state.heading;
      if (state.hit) root.position.x += Math.sin(state.hit * Math.PI) * .8;
      if (['worker', 'sato'].includes(actor.type)) {
        parts[0].rotation.x = state.walking ? Math.sin(state.seconds * 8) * .35 : 0; parts[1].rotation.x = -parts[0].rotation.x;
        parts[5].rotation.x = state.operating ? -.9 + Math.sin(state.seconds * 5) * .3 : 0;
      }
      root.scaling.setAll(state.hit ? 1 + Math.sin(state.hit * Math.PI) * .08 : 1);
    },
    render() {}, resize() { noa.rendering.resize(); },
    stats() { return { chunks: chunks.size, generated, meshes: scene.meshes.length, activeMeshes: scene.getActiveMeshes().length, edits: edits.size }; },
    dispose() { noa.setPaused(true); noa.rendering.engine.dispose(); }
  };
}
