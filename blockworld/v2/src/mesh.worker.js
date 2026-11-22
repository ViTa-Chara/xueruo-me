import { fillChunk, spatialIndex } from './world.js';
import { palette } from './palette.js';
let boxes, index;
const colours = palette.map(p => {
  const hex = parseInt(p.color.slice(1), 16);
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
});

// Greedy rectangle merger: internal faces disappear; adjacent coplanar faces of the
// same material become one quad. Runs off the UI thread, with a one-voxel neighbour halo.
function mesh(data, n) {
  const stride = n + 2, positions = [], colors = [], mask = new Int16Array(n * n);
  const sample = v => data[(v[1] + 1) * stride * stride + (v[2] + 1) * stride + v[0] + 1];
  const transparent = id => id && (palette[id].opacity || 1) < 1;
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, v = (d + 2) % 3, x = [0, 0, 0], q = [0, 0, 0]; q[d] = 1;
    for (x[d] = -1; x[d] < n; x[d]++) {
      let k = 0;
      for (x[v] = 0; x[v] < n; x[v]++) for (x[u] = 0; x[u] < n; x[u]++) {
        const a = sample(x), b = sample(x.map((value, axis) => value + q[axis]));
        let face = 0;
        if (a !== b) {
          if (a && (!b || transparent(b)) && x[d] >= 0) face = a;
          else if (b && (!a || transparent(a)) && x[d] < n - 1) face = -b;
        }
        mask[k++] = face;
      }
      for (let j = 0; j < n; j++) for (let i = 0; i < n;) {
        const value = mask[j * n + i];
        if (!value) { i++; continue; }
        let w = 1, h = 1;
        while (i + w < n && mask[j * n + i + w] === value) w++;
        outer: while (j + h < n) {
          for (let t = 0; t < w; t++) if (mask[(j + h) * n + i + t] !== value) break outer;
          h++;
        }
        const p = [0, 0, 0], du = [0, 0, 0], dv = [0, 0, 0];
        p[d] = x[d] + 1; p[u] = i; p[v] = j; du[u] = w; dv[v] = h;
        const verts = [p, p.map((t, a) => t + du[a]), p.map((t, a) => t + du[a] + dv[a]), p.map((t, a) => t + dv[a])];
        const order = value > 0 ? [0, 1, 2, 0, 2, 3] : [0, 3, 2, 0, 2, 1];
        const brightness = d === 1 ? (value > 0 ? 1 : .52) : d === 0 ? .8 : .68;
        const c = colours[Math.abs(value)];
        for (const idx of order) { positions.push(...verts[idx]); colors.push(...c.map(t => t * brightness)); }
        for (let yy = 0; yy < h; yy++) mask.fill(0, (j + yy) * n + i, (j + yy) * n + i + w);
        i += w;
      }
    }
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors) };
}

self.onmessage = ({ data }) => {
  if (data.type === 'init') { boxes = data.boxes; index = spatialIndex(boxes); return; }
  const start = performance.now();
  const raw = fillChunk(data.origin, 32, boxes, index, new Map(data.edits), 1);
  const geometry = mesh(raw, 32);
  self.postMessage({ key: data.key, revision: data.revision, ...geometry, ms: performance.now() - start }, [geometry.positions.buffer, geometry.colors.buffer]);
};
