import { M } from './palette.js';

// Deliberately uses project-made industrial people, not inferred redraws of supplied art.
export function actorParts(type) {
  if (type === 'forklift') return [
    [-1, .3, -1.6, 2, 1, 3.2, M.yellow], [-.9, .1, -1.2, .45, .65, .7, M.dark], [.5, .1, -1.2, .45, .65, .7, M.dark],
    [-.9, .1, .7, .45, .65, .7, M.dark], [.5, .1, .7, .45, .65, .7, M.dark], [-.8, 1.3, .8, .2, 2.3, .2, M.steel],
    [.6, 1.3, .8, .2, 2.3, .2, M.steel], [-.8, 3.4, -1, 1.6, .2, 2, M.steel], [-.8, .7, -2.8, .2, .2, 1.5, M.steel], [.6, .7, -2.8, .2, .2, 1.5, M.steel]
  ];
  if (type === 'agv') return [[-1.1, .15, -1.8, 2.2, .5, 3.6, M.orange], [-.8, .65, -1.2, 1.6, .8, 2.4, M.wood], [-.9, .7, 1.2, 1.8, .1, .2, M.green]];
  if (type === 'crane') return [[-2, 0, -1.5, 4, 2, 3, M.orange], [-.1, -12, -.1, .2, 12, .2, M.steel], [-.5, -13, -.5, 1, 1, 1, M.dark]];
  if (type === 'stacker') return [[-1, .2, -2, 2, 1, 4, M.orange], [-.5, 1, -.5, 1, 65, 1, M.yellow], [-1, 12, -2, 2, 1, 4, M.checker]];
  return [
    [-.27, 0, -.18, .22, .8, .36, M.navy], [.05, 0, -.18, .22, .8, .36, M.navy],
    [-.35, .8, -.2, .7, .7, .4, type === 'sato' ? M.white : M.orange], [-.26, 1.5, -.25, .52, .48, .5, M.skin],
    [-.3, 1.92, -.3, .6, .15, .6, type === 'sato' ? M.hair : M.yellow],
    [-.52, .8, -.16, .17, .6, .32, M.skin], [.35, .8, -.16, .17, .6, .32, M.skin]
  ];
}

export function actorState(actor, seconds) {
  const path = actor.path, segments = path.map((p, i) => Math.hypot(...p.map((v, a) => v - path[(i + 1) % path.length][a])));
  // A six-second dwell at the operation station, then return along the patrol path.
  const dwell = ['worker', 'sato'].includes(actor.type) ? 6 : 0;
  const length = segments.reduce((a, b) => a + b, 0), cycle = length / actor.speed + dwell;
  let t = (seconds + (actor.phase || 0) * cycle) % cycle;
  if (t < dwell) return { position: path[0], heading: Math.PI, operating: true, walking: false };
  let dist = (t - dwell) * actor.speed;
  for (let i = 0; i < path.length; i++) {
    if (dist <= segments[i]) {
      const next = path[(i + 1) % path.length], f = dist / (segments[i] || 1);
      return { position: path[i].map((v, a) => v + (next[a] - v) * f), heading: Math.atan2(next[0] - path[i][0], next[2] - path[i][2]), operating: false, walking: true };
    }
    dist -= segments[i];
  }
  return { position: path[0], heading: 0, operating: false, walking: false };
}
