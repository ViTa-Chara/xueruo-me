(() => {
  'use strict';

  const CHAIN_PROBABILITY = 0.35;
  const MONITOR_SRC = './items/screens/016.png';
  // Exact measured pixel geometry of items/screens/016.png (1009x708)
  const MONITOR_GEOM = {
    aspect: 1009 / 708,
    panel: { x0: 0.0129, y0: 0.0169, x1: 0.9366, y1: 0.7514 },
    screen: { x0: 0.0327, y0: 0.0466, x1: 0.9167, y1: 0.7486, cx: 0.4747, cy: 0.3976 },
  };
  const AudioCtx = window.AudioContext || window.webkitAudioContext;

  let audioCtx = null;
  const bufferCache = new Map();
  const pendingLoads = new Map();
  let currentVoice = null;
  let finaleStarted = false;
  let finalePreloaded = false;
  let monitorImgPreload = null;

  const stageEl = document.getElementById('stage');
  const entries = [];

  function ensureAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function loadBuffer(url) {
    if (bufferCache.has(url)) return Promise.resolve(bufferCache.get(url));
    if (pendingLoads.has(url)) return pendingLoads.get(url);
    const ac = ensureAudio();
    const p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then((ab) => ac.decodeAudioData(ab))
      .then((buf) => {
        bufferCache.set(url, buf);
        pendingLoads.delete(url);
        return buf;
      })
      .catch((err) => {
        pendingLoads.delete(url);
        throw err;
      });
    pendingLoads.set(url, p);
    return p;
  }

  function preloadFinaleIfReady() {
    if (!monitorImgPreload) {
      monitorImgPreload = new Image();
      monitorImgPreload.src = MONITOR_SRC;
    }
    if (finalePreloaded || !audioCtx || !entries.length) return;
    const last = entries[entries.length - 1];
    if (last && last.phrase.isFinale) {
      finalePreloaded = true;
      loadBuffer(last.phrase.audio).catch(() => {
        finalePreloaded = false;
      });
    }
  }

  function shuffleUnique(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function pickInitialRandomX(phrase, prevX) {
    const isNarrow = window.innerWidth <= 640;
    const edgeMin = isNarrow ? 20 : 14;
    const edgeMax = isNarrow ? 80 : 86;

    const firstMove = phrase.moves[0];
    let lo = edgeMin;
    let hi = edgeMax;
    if (firstMove && Math.abs(firstMove.pan) >= 0.2) {
      if (firstMove.dir === 'right') hi = isNarrow ? 64 : 62;
      else lo = isNarrow ? 36 : 38;
    }

    let x = lo + Math.random() * (hi - lo);
    if (prevX !== null) {
      for (let tries = 0; tries < 12 && Math.abs(x - prevX) < 16; tries++) {
        x = lo + Math.random() * (hi - lo);
      }
    }
    return x;
  }

  function buildWaypoints(entry) {
    const isNarrow = window.innerWidth <= 640;
    const edgeMin = isNarrow ? 18 : 12;
    const edgeMax = isNarrow ? 82 : 88;
    const moves = entry.phrase.moves || [];
    const pts = [{ t: 0, x: entry.currentPct }];

    let curX = entry.currentPct;
    moves.forEach((m) => {
      const sign = m.dir === 'right' ? 1 : -1;
      const strength = Math.abs(m.pan || 0);
      const baseDist = isNarrow
        ? (strength < 0.15 ? 9 : 16 + strength * 12)
        : (strength < 0.15 ? 11 : 20 + strength * 16);

      let nextX = clamp(curX + sign * baseDist, edgeMin, edgeMax);
      if (Math.abs(nextX - curX) < 6) {
        nextX = clamp(curX - sign * baseDist * 0.7, edgeMin, edgeMax);
      }
      pts.push({ t: m.t, x: nextX });
      curX = nextX;
    });

    return pts;
  }

  function layoutCrop(imgMeta, cropEl, imgEl) {
    const vw = window.innerWidth;
    const target = vw <= 640 ? 126 : Math.min(186, Math.max(136, vw * 0.13));
    const scale = target / Math.max(imgMeta.bw, imgMeta.bh);
    const boxW = Math.round(imgMeta.bw * scale);
    const boxH = Math.round(imgMeta.bh * scale);
    cropEl.style.width = boxW + 'px';
    cropEl.style.height = boxH + 'px';
    imgEl.style.width = Math.round(imgMeta.w * scale) + 'px';
    imgEl.style.height = Math.round(imgMeta.h * scale) + 'px';
    imgEl.style.left = -Math.round(imgMeta.x0 * scale) + 'px';
    imgEl.style.top = -Math.round(imgMeta.y0 * scale) + 'px';
    return { boxW, boxH };
  }

  function stopCurrent() {
    if (!currentVoice) return;
    const v = currentVoice;
    currentVoice = null;
    if (v.raf) cancelAnimationFrame(v.raf);
    if (v.handoverTimer) clearTimeout(v.handoverTimer);
    if (v.dropTimer) clearTimeout(v.dropTimer);
    if (v.scheduledNext && v.scheduledNext.src) {
      try { v.scheduledNext.src.stop(); } catch {}
    }
    if (audioCtx && v.gain && v.src) {
      const now = audioCtx.currentTime;
      const curVal = Math.max(0.0001, v.gain.gain.value || v.linearGain || 0.5);
      try {
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setValueAtTime(curVal, now);
        v.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        v.src.stop(now + 0.155);
      } catch {}
    }
  }

  function scheduleTailFade(ac, gainNode, linearGain, startAt, dur, isContiguousCut) {
    const fadeSec = isContiguousCut ? Math.min(0.24, dur * 0.25) : Math.min(0.14, dur * 0.2);
    const endAt = startAt + dur;
    const fadeStart = Math.max(ac.currentTime + 0.005, endAt - fadeSec);
    if (fadeStart >= endAt - 0.01) return;
    const level = Math.max(0.0001, linearGain);
    gainNode.gain.setValueAtTime(level, fadeStart);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);
  }

  function ensureInViewQuietly(entry) {
    const rect = entry.slot.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.bottom < 0 || rect.top > vh) {
      entry.slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  // =========================================================================
  // DRUM DROP SEQUENCE (synced to 100.45 BPM, 1 beat = 0.5973s):
  // - Beat 1 (+0.000s): Drums hit -> all objects gain gravity and begin falling
  // - Beat 4 (+1.792s): Black-screen monitor (items/screens/016.png) begins
  //   a slow, weighty 4-beat rise (+1.792s -> +4.181s)
  // - True 4-corner OBB rigid-body collisions against the monitor's flat top
  //   bezel & sides (real r x J torque, natural damping, zero LCD overlap,
  //   zero weird spinning on screen) + 3 late straggler drops
  // - Beat 10 (+5.376s) -> Beat 15 (+8.362s): Exponential cinema dolly-in
  //   straight into the monitor's black LCD -> pure #000000 black
  // =========================================================================
  function triggerDrumDrop() {
    if (finaleStarted) return;
    finaleStarted = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const BEAT = 60 / 100.45; // 0.59731s

    const rig = document.createElement('div');
    rig.className = 'camera-rig';

    const layer = document.createElement('div');
    layer.className = 'physics-layer';
    rig.appendChild(layer);

    // --- Monitor setup ---
    const monW = Math.min(vw * (vw <= 640 ? 0.84 : 0.58), 720, vh * 0.72 * MONITOR_GEOM.aspect);
    const monH = monW / MONITOR_GEOM.aspect;
    const screenCxLocal = monW * MONITOR_GEOM.screen.cx;
    const screenCyLocal = monH * MONITOR_GEOM.screen.cy;
    const monRestLeft = vw * 0.5 - screenCxLocal;
    const monRestTop = vh * 0.54 - screenCyLocal;
    const monStartTop = vh + 48;

    const monEl = document.createElement('div');
    monEl.className = 'monitor-actor';
    monEl.style.width = monW.toFixed(1) + 'px';
    monEl.style.height = monH.toFixed(1) + 'px';

    const monImg = document.createElement('img');
    monImg.src = MONITOR_SRC;
    monImg.alt = '';
    monImg.decoding = 'sync';
    monEl.appendChild(monImg);

    const veilEl = document.createElement('div');
    veilEl.className = 'monitor-screen-veil';
    const sg = MONITOR_GEOM.screen;
    veilEl.style.left = (sg.x0 * 100).toFixed(3) + '%';
    veilEl.style.top = (sg.y0 * 100).toFixed(3) + '%';
    veilEl.style.width = ((sg.x1 - sg.x0) * 100).toFixed(3) + '%';
    veilEl.style.height = ((sg.y1 - sg.y0) * 100).toFixed(3) + '%';
    monEl.appendChild(veilEl);
    layer.appendChild(monEl);

    const innerW = monW * (sg.x1 - sg.x0);
    const innerH = monH * (sg.y1 - sg.y0);
    const targetScale = Math.max(vw / innerW, vh / innerH) * 1.32;

    // --- Gather all 23 objects ---
    const visibleList = [];
    const aboveList = [];

    entries.forEach((e) => {
      const rect = e.crop.getBoundingClientRect();
      const boxW = rect.width || parseFloat(e.crop.style.width) || 140;
      const boxH = rect.height || parseFloat(e.crop.style.height) || 140;
      const cx = rect.left + boxW * 0.5;
      const cy = rect.top + boxH * 0.5;
      const info = { entry: e, cx, cy, boxW, boxH };
      if (rect.bottom > -80 && rect.top < vh + 80) {
        visibleList.push(info);
      } else if (rect.bottom <= -80) {
        aboveList.push(info);
      }
    });

    aboveList.sort((a, b) => b.cy - a.cy);

    const bodies = [];
    function spawnBody(info, x, y, vx, vy, omega, delaySec) {
      const { entry, boxW, boxH } = info;
      const wrap = document.createElement('div');
      wrap.className = 'physics-body';
      wrap.style.width = boxW + 'px';
      wrap.style.height = boxH + 'px';

      const cropClone = entry.crop.cloneNode(true);
      const imgClone = cropClone.querySelector('img');
      if (imgClone) imgClone.loading = 'eager';
      wrap.appendChild(cropClone);
      layer.appendChild(wrap);

      // True oriented rectangular collider (slightly inset to match sculptural silhouette)
      const colHW = boxW * 0.44;
      const colHH = boxH * 0.44;
      const radius = Math.max(30, 0.44 * Math.sqrt(boxW * boxH));
      const mass = Math.max(0.65, (boxW * boxH) / (155 * 155));
      // Real 2D box moment of inertia I = m * (w^2 + h^2) / 12
      const inertia = (mass * ((colHW * 2) ** 2 + (colHH * 2) ** 2)) / 12;

      const body = {
        el: wrap,
        x,
        y,
        vx,
        vy,
        theta: 0,
        omega,
        colHW,
        colHH,
        r: radius,
        m: mass,
        invM: 1 / mass,
        invI: 1 / inertia,
        halfW: boxW * 0.5,
        halfH: boxH * 0.5,
        delay: delaySec,
        active: delaySec <= 0,
      };
      wrap.style.transform = `translate3d(${(x - body.halfW).toFixed(1)}px, ${(y - body.halfH).toFixed(1)}px, 0)`;
      bodies.push(body);
    }

    // Beat 1: currently visible foreground objects drop immediately from their exact screen coordinates
    visibleList.sort((a, b) => b.cy - a.cy);
    visibleList.forEach((info, idx) => {
      const vx = (Math.random() - 0.5) * 55;
      const vy = 40 + idx * 50;
      const omega = (Math.random() - 0.5) * 0.65;
      spawnBody(info, info.cx, info.cy, vx, vy, omega, 0);
    });

    // Above-viewport objects cascade across Beat 2..Beat 8 so they naturally meet & collide with the rising monitor!
    const lateCount = Math.min(3, Math.max(0, aboveList.length - 6));
    const mainAbove = aboveList.slice(0, aboveList.length - lateCount);
    const lateAbove = aboveList.slice(aboveList.length - lateCount);

    const panelLeftTarget = monRestLeft + monW * MONITOR_GEOM.panel.x0;
    const panelRightTarget = monRestLeft + monW * MONITOR_GEOM.panel.x1;
    const panelSpan = panelRightTarget - panelLeftTarget;

    mainAbove.forEach((info, idx) => {
      // Spread arrival times smoothly from +0.45s to +3.15s (meeting the monitor as it rises from Beat 4 -> Beat 8!)
      const frac = mainAbove.length > 1 ? idx / (mainAbove.length - 1) : 0;
      const delay = 0.45 + frac * 2.70 + (Math.random() - 0.5) * 0.14;
      const spanMin = Math.max(info.boxW * 0.5 + 18, panelLeftTarget - 110);
      const spanMax = Math.min(vw - info.boxW * 0.5 - 18, panelRightTarget + 110);
      const startX = clamp(spanMin + Math.random() * (spanMax - spanMin), info.boxW * 0.5 + 18, vw - info.boxW * 0.5 - 18);
      const startY = -info.boxH * 0.65 - 24;
      spawnBody(info, startX, startY, (Math.random() - 0.5) * 70, 90 + Math.random() * 110, (Math.random() - 0.5) * 0.9, Math.max(0, delay));
    });

    // 3 late straggler objects arriving right as the monitor settles (~3.6s - 4.4s)
    lateAbove.forEach((info, idx) => {
      // Aim toward left/center/right thirds of the monitor top bezel so they hit, tip naturally, and drop off sides
      const lane = idx === 0 ? 0.20 : idx === 1 ? 0.78 : 0.48;
      const startX = clamp(
        panelLeftTarget + (lane + (Math.random() - 0.5) * 0.08) * panelSpan,
        info.boxW * 0.5 + 20,
        vw - info.boxW * 0.5 - 20
      );
      const delay = 3.55 + idx * 0.40;
      spawnBody(info, startX, -info.boxH * 0.65 - 24, (Math.random() - 0.5) * 50, 80, (Math.random() - 0.5) * 0.6, delay);
    });

    document.body.appendChild(rig);
    document.documentElement.classList.add('blackout');
    document.body.classList.add('blackout');

    // Beat-locked timeline (seconds from drum impact @ 100.848s):
    const RISE_START = BEAT * 3;     // +1.792s = EXACTLY Beat 4 ("进鼓第四拍上升"!)
    const RISE_DUR = BEAT * 4;       //  2.389s = slow, weighty 4-beat rise (Beat 4 -> Beat 8 @ +4.181s)
    const ZOOM_START = BEAT * 9;     // +5.376s = after late stragglers clear off monitor
    const ZOOM_DUR = BEAT * 5;       //  2.987s = smooth cinema dolly-in -> pure #000000 black

    const GRAVITY = 2150;
    const RESTITUTION = 0.32;
    const MON_RESTITUTION = 0.28;
    const FRICTION = 0.42;
    const MAX_OMEGA = 3.2;           // Natural physical spin cap (never fidget-spins!)
    const SUBSTEPS = 6;

    let elapsed = 0;
    let monTop = monStartTop;
    let monRecoilY = 0;
    let monRecoilV = 0;
    let lastTs = performance.now();

    monEl.style.transform = `translate3d(${monRestLeft.toFixed(1)}px, ${monTop.toFixed(1)}px, 0)`;

    function simulate(now) {
      const rawDt = Math.min(0.033, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const dt = rawDt / SUBSTEPS;
      const airAngDamp = Math.exp(-1.15 * dt);

      for (let s = 0; s < SUBSTEPS; s++) {
        elapsed += dt;

        // 1. Update slow, heavy rising monitor starting right on Beat 4 (+1.792s)
        const prevMonTop = monTop;
        const riseU = clamp((elapsed - RISE_START) / RISE_DUR, 0, 1);
        const baseTop = monStartTop + (monRestTop - monStartTop) * easeInOutCubic(riseU);

        // Subtle physical weight recoil spring when hit from above
        const springAcc = -240 * monRecoilY - 26 * monRecoilV;
        monRecoilV += springAcc * dt;
        monRecoilY = clamp(monRecoilY + monRecoilV * dt, 0, 12);

        monTop = baseTop + monRecoilY;
        const monVy = (monTop - prevMonTop) / dt;

        // Monitor solid outer panel AABB
        const mx0 = monRestLeft + monW * MONITOR_GEOM.panel.x0;
        const mx1 = monRestLeft + monW * MONITOR_GEOM.panel.x1;
        const my0 = monTop + monH * MONITOR_GEOM.panel.y0;
        const my1 = monTop + monH * MONITOR_GEOM.panel.y1;
        const mCx = (mx0 + mx1) * 0.5;

        // 2. Integrate active objects & resolve true 4-corner OBB vs Monitor Panel collisions
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i];
          if (!b.active) {
            if (elapsed >= b.delay) b.active = true;
            else continue;
          }

          b.vy += GRAVITY * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.omega = clamp(b.omega * airAngDamp, -MAX_OMEGA, MAX_OMEGA);
          b.theta += b.omega * dt;

          // Left / right viewport walls
          const cos = Math.cos(b.theta);
          const sin = Math.sin(b.theta);
          const extX = Math.abs(cos) * b.colHW + Math.abs(sin) * b.colHH;
          if (b.x - extX < 0) {
            b.x = extX;
            if (b.vx < 0) b.vx = -b.vx * 0.35;
          } else if (b.x + extX > vw) {
            b.x = vw - extX;
            if (b.vx > 0) b.vx = -b.vx * 0.35;
          }

          // Skip monitor check if monitor hasn't started entering viewport yet
          if (my0 >= vh + 40) continue;

          // Compute all 4 rotated corners of object OBB
          const ux = cos * b.colHW, uy = sin * b.colHW;
          const vxL = -sin * b.colHH, vyL = cos * b.colHH;
          const corners = [
            [b.x - ux - vxL, b.y - uy - vyL],
            [b.x + ux - vxL, b.y + uy - vyL],
            [b.x + ux + vxL, b.y + uy + vyL],
            [b.x - ux + vxL, b.y - uy + vyL],
          ];

          // Find deepest penetrating corner(s) against the monitor panel box [mx0..mx1, my0..my1]
          let contactCount = 0;
          let sumPx = 0, sumPy = 0;
          let bestPen = 0;
          let bestNx = 0, bestNy = 0;

          for (let c = 0; c < 4; c++) {
            const px = corners[c][0];
            const py = corners[c][1];
            if (px > mx0 && px < mx1 && py > my0 && py < my1) {
              const dTop = py - my0;
              const dBot = my1 - py;
              const dLeft = px - mx0;
              const dRight = mx1 - px;
              // Prefer top bezel unless clearly grazing left/right outer edges
              const minD = Math.min(dTop, dLeft, dRight, dBot);
              let nx = 0, ny = -1;
              if (minD === dTop) { nx = 0; ny = -1; }
              else if (minD === dLeft) { nx = -1; ny = 0; }
              else if (minD === dRight) { nx = 1; ny = 0; }
              else { nx = 0; ny = 1; }

              contactCount++;
              sumPx += px;
              sumPy += py;
              if (minD > bestPen) {
                bestPen = minD;
                bestNx = nx;
                bestNy = ny;
              }
            }
          }

          // Also check monitor top-left / top-right corners penetrating the object's OBB
          if (contactCount === 0) {
            const monCorners = [[mx0, my0], [mx1, my0]];
            for (let mc = 0; mc < 2; mc++) {
              const mpx = monCorners[mc][0] - b.x;
              const mpy = monCorners[mc][1] - b.y;
              const localX = mpx * cos + mpy * sin;
              const localY = -mpx * sin + mpy * cos;
              if (Math.abs(localX) < b.colHW && Math.abs(localY) < b.colHH) {
                const ox = b.colHW - Math.abs(localX);
                const oy = b.colHH - Math.abs(localY);
                let lnx = 0, lny = 0, pen = 0;
                if (ox < oy) { lnx = localX > 0 ? -1 : 1; pen = ox; }
                else { lny = localY > 0 ? -1 : 1; pen = oy; }
                const wnx = lnx * cos - lny * sin;
                const wny = lnx * sin + lny * cos;
                contactCount = 1;
                sumPx = monCorners[mc][0];
                sumPy = monCorners[mc][1];
                bestPen = pen;
                bestNx = wnx;
                bestNy = wny;
                break;
              }
            }
          }

          if (contactCount > 0) {
            // Average contact manifold point (prevents artificial spinning when 2 corners land flat!)
            const cpx = sumPx / contactCount;
            const cpy = sumPy / contactCount;

            // Positional separation so object NEVER overlaps the monitor glass
            b.x += bestNx * bestPen;
            b.y += bestNy * bestPen;

            // Lever arm from object center to contact point
            const rx = cpx - b.x;
            const ry = cpy - b.y;

            // Contact point relative velocity against rising monitor
            const vpx = b.vx - b.omega * ry;
            const vpy = b.vy + b.omega * rx - monVy;
            const velNorm = vpx * bestNx + vpy * bestNy;

            if (velNorm < 0) {
              const rCrossN = rx * bestNy - ry * bestNx;
              const effInvM = b.invM + (rCrossN * rCrossN) * b.invI;
              // Resting contact (<120px/s) has 0 bounce so objects don't jitter
              const e = Math.abs(velNorm) < 120 ? 0 : MON_RESTITUTION;
              const jn = (-(1 + e) * velNorm) / effInvM;

              b.vx += jn * bestNx * b.invM;
              b.vy += jn * bestNy * b.invM;
              b.omega += rCrossN * jn * b.invI;

              // Coulomb tangential friction + exact torque
              const tx = -bestNy;
              const ty = bestNx;
              const velTan = vpx * tx + vpy * ty;
              const rCrossT = rx * ty - ry * tx;
              const effInvT = b.invM + (rCrossT * rCrossT) * b.invI;
              const jt = clamp(-velTan / effInvT, -jn * FRICTION, jn * FRICTION);

              b.vx += jt * tx * b.invM;
              b.vy += jt * ty * b.invM;
              b.omega += rCrossT * jt * b.invI;

              // Strong contact angular damping prevents any unnatural spinning on the bezel
              if (contactCount >= 2) {
                b.omega *= 0.65;
              } else {
                b.omega *= 0.88;
              }

              // Gentle natural slide toward the nearer side edge if balanced on the thin top bezel
              if (bestNy < -0.8 && Math.abs(b.vx) < 90) {
                const sideDir = b.x < mCx ? -1 : 1;
                b.vx += sideDir * 140 * dt * SUBSTEPS;
              }

              // Realistic downward micro-recoil on the monitor when struck from above
              if (bestNy < -0.5 && -velNorm > 120) {
                monRecoilV += clamp(-velNorm * b.m * 0.035, 0, 38);
              }
            }
          }
        }

        // 3. Pairwise object-to-object rigid-body collisions (weighty, natural, non-jittery)
        for (let i = 0; i < bodies.length; i++) {
          const a = bodies[i];
          if (!a.active) continue;
          for (let j = i + 1; j < bodies.length; j++) {
            const b = bodies[j];
            if (!b.active) continue;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const minDist = a.r + b.r;
            const distSq = dx * dx + dy * dy;
            if (distSq >= minDist * minDist || distSq < 0.0001) continue;

            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;

            const invSum = a.invM + b.invM;
            const sep = overlap / invSum;
            a.x -= nx * sep * a.invM;
            a.y -= ny * sep * a.invM;
            b.x += nx * sep * b.invM;
            b.y += ny * sep * b.invM;

            const rvx = b.vx - a.vx;
            const rvy = b.vy - a.vy;
            const velNormal = rvx * nx + rvy * ny;
            if (velNormal > 0) continue;

            const jImp = (-(1 + RESTITUTION) * velNormal) / invSum;
            a.vx -= jImp * nx * a.invM;
            a.vy -= jImp * ny * a.invM;
            b.vx += jImp * nx * b.invM;
            b.vy += jImp * ny * b.invM;

            const tx = -ny;
            const ty = nx;
            const velTan = rvx * tx + rvy * ty;
            const jt = clamp(-velTan / invSum, -jImp * 0.22, jImp * 0.22);
            a.vx -= jt * tx * a.invM;
            a.vy -= jt * ty * a.invM;
            b.vx += jt * tx * b.invM;
            b.vy += jt * ty * b.invM;

            // Gentle capped spin transfer between colliding objects
            const spinDelta = clamp(jt * 0.0022, -0.6, 0.6);
            a.omega = clamp(a.omega - spinDelta * a.invM, -MAX_OMEGA, MAX_OMEGA);
            b.omega = clamp(b.omega + spinDelta * b.invM, -MAX_OMEGA, MAX_OMEGA);
          }
        }
      }

      // Render monitor
      monEl.style.transform = `translate3d(${monRestLeft.toFixed(1)}px, ${monTop.toFixed(1)}px, 0)`;

      // Render falling objects
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        b.el.style.transform = `translate3d(${(b.x - b.halfW).toFixed(1)}px, ${(b.y - b.halfH).toFixed(1)}px, 0) rotate(${b.theta.toFixed(3)}rad)`;
      }

      // Camera push-in straight into the monitor's black LCD screen -> pure #000000 black
      const zoomU = clamp((elapsed - ZOOM_START) / ZOOM_DUR, 0, 1);
      if (zoomU > 0) {
        const originX = monRestLeft + screenCxLocal;
        const originY = monTop + screenCyLocal;
        rig.style.transformOrigin = `${originX.toFixed(1)}px ${originY.toFixed(1)}px`;
        const camScale = Math.pow(targetScale, easeInOutQuart(zoomU));
        rig.style.transform = `scale(${camScale.toFixed(4)})`;

        const veilAlpha = clamp((zoomU - 0.52) / 0.44, 0, 1);
        veilEl.style.opacity = veilAlpha.toFixed(3);
      }

      if (zoomU < 1) {
        requestAnimationFrame(simulate);
      } else {
        rig.remove();
        window.scrollTo(0, 0);
      }
    }

    requestAnimationFrame(simulate);
  }

  function startVoice(entry, src, gain, startAt, dur, isChained, linearGain) {
    const ac = ensureAudio();
    const waypoints = buildWaypoints(entry);
    const isFinale = Boolean(entry.phrase.isFinale);
    const drumDropSec = isFinale ? (entry.phrase.drumDropSec || 1.648) : null;
    const motionDur = isFinale ? drumDropSec : dur;

    if (isChained) {
      entry.slot.classList.add('visible');
      ensureInViewQuietly(entry);
    }

    const voice = {
      entry,
      src,
      gain,
      linearGain,
      startAt,
      dur,
      raf: null,
      handoverTimer: null,
      dropTimer: null,
      scheduledNext: null,
      handedOver: false,
      dropped: false,
    };
    currentVoice = voice;

    // Eagerly preload the finale full track once user is in the second half
    if (entry.order >= 14) {
      preloadFinaleIfReady();
    }

    // Finale: schedule drum-impact physics drop on exact Web Audio clock!
    if (isFinale) {
      const dropAt = startAt + drumDropSec;
      const waitMs = Math.max(0, (dropAt - ac.currentTime) * 1000);
      voice.dropTimer = setTimeout(() => {
        if (currentVoice === voice && !voice.dropped) {
          voice.dropped = true;
          triggerDrumDrop();
        }
      }, waitMs + 4);
    }

    // Preload next phrase immediately so either manual click or 35% chain has 0ms gap
    const nextEntry = entries[entry.order + 1];
    const isContiguousWithNext = Boolean(
      nextEntry && (nextEntry.phrase.startSec - entry.phrase.endSec) <= 0.05
    );
    const willChain = Boolean(!isFinale && nextEntry && Math.random() < CHAIN_PROBABILITY);

    if (!willChain && !isFinale) {
      scheduleTailFade(ac, gain, linearGain, startAt, dur, isContiguousWithNext);
    }

    if (nextEntry && !isFinale) {
      const bufPromise = loadBuffer(nextEntry.phrase.audio);

      if (willChain) {
        bufPromise
          .then((nextBuf) => {
            if (currentVoice !== voice || voice.handedOver) return;

            const overlap = isContiguousWithNext ? 0.036 : 0.008;
            const targetStart = Math.max(ac.currentTime + 0.005, startAt + dur - overlap);

            const nextSrc = ac.createBufferSource();
            nextSrc.buffer = nextBuf;
            const nextGain = ac.createGain();
            const nextLinear = Math.pow(10, (nextEntry.phrase.gainDb || 0) / 20);
            if (isContiguousWithNext && Math.abs(nextLinear - linearGain) > 0.05) {
              nextGain.gain.setValueAtTime(linearGain, targetStart);
              nextGain.gain.linearRampToValueAtTime(nextLinear, targetStart + 0.45);
            } else {
              nextGain.gain.setValueAtTime(nextLinear, targetStart);
            }
            nextSrc.connect(nextGain).connect(ac.destination);
            nextSrc.start(targetStart);

            voice.scheduledNext = {
              entry: nextEntry,
              src: nextSrc,
              gain: nextGain,
              linearGain: nextLinear,
              startAt: targetStart,
              dur: nextBuf.duration,
            };

            const waitMs = Math.max(0, (targetStart - ac.currentTime) * 1000);
            voice.handoverTimer = setTimeout(() => {
              handoverToNext(voice);
            }, waitMs + 8);
          })
          .catch(() => {
            if (currentVoice === voice && !voice.handedOver) {
              scheduleTailFade(ac, gain, linearGain, startAt, dur, isContiguousWithNext);
            }
          });
      }
    }

    function handoverToNext(fromVoice) {
      if (currentVoice !== fromVoice || fromVoice.handedOver || !fromVoice.scheduledNext) return;
      fromVoice.handedOver = true;
      if (fromVoice.raf) cancelAnimationFrame(fromVoice.raf);
      if (fromVoice.handoverTimer) clearTimeout(fromVoice.handoverTimer);

      const lastPt = waypoints[waypoints.length - 1];
      entry.currentPct = lastPt.x;
      entry.btn.style.left = lastPt.x.toFixed(3) + '%';

      const nxt = fromVoice.scheduledNext;
      startVoice(nxt.entry, nxt.src, nxt.gain, nxt.startAt, nxt.dur, true, nxt.linearGain);
    }

    function step() {
      if (currentVoice !== voice) return;
      const now = ac.currentTime;

      if (isFinale && !voice.dropped && now >= startAt + drumDropSec) {
        voice.dropped = true;
        if (voice.dropTimer) clearTimeout(voice.dropTimer);
        triggerDrumDrop();
        return;
      }

      if (voice.scheduledNext && now >= voice.scheduledNext.startAt) {
        handoverToNext(voice);
        return;
      }

      const progress = clamp((now - startAt) / motionDur, 0, 1);
      let seg = 0;
      while (seg < waypoints.length - 2 && progress > waypoints[seg + 1].t) {
        seg++;
      }
      const p0 = waypoints[seg];
      const p1 = waypoints[seg + 1];
      const localT = p1.t > p0.t ? clamp((progress - p0.t) / (p1.t - p0.t), 0, 1) : 1;
      const x = p0.x + (p1.x - p0.x) * easeInOutCubic(localT);

      entry.currentPct = x;
      entry.btn.style.left = x.toFixed(3) + '%';

      if (progress < 1 || voice.scheduledNext || (isFinale && !voice.dropped)) {
        voice.raf = requestAnimationFrame(step);
      }
    }

    voice.raf = requestAnimationFrame(step);

    src.onended = () => {
      if (currentVoice !== voice) return;
      if (voice.scheduledNext && !voice.handedOver) {
        handoverToNext(voice);
        return;
      }
      if (voice.raf) cancelAnimationFrame(voice.raf);
      if (voice.handoverTimer) clearTimeout(voice.handoverTimer);
      if (voice.dropTimer) clearTimeout(voice.dropTimer);
      currentVoice = null;
    };
  }

  async function playEntry(entry) {
    if (finaleStarted) return;
    stopCurrent();
    const ac = ensureAudio();

    let buf;
    try {
      buf = await loadBuffer(entry.phrase.audio);
    } catch {
      return;
    }

    if (finaleStarted) return;

    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    const linearGain = Math.pow(10, (entry.phrase.gainDb || 0) / 20);
    gain.gain.value = linearGain;
    src.connect(gain).connect(ac.destination);

    const t0 = ac.currentTime;
    src.start(t0);
    startVoice(entry, src, gain, t0, buf.duration, false, linearGain);
  }

  function build(data) {
    const phrases = data.phrases || [];
    const pickedItems = shuffleUnique(data.items || []).slice(0, phrases.length);

    let prevX = null;
    phrases.forEach((phrase, i) => {
      const imgMeta = pickedItems[i];
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.style.height = Math.round(250 + Math.random() * 170) + 'px';

      const xPct = pickInitialRandomX(phrase, prevX);
      prevX = xPct;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'item';
      btn.style.left = xPct.toFixed(2) + '%';

      const crop = document.createElement('div');
      crop.className = 'crop';

      const img = document.createElement('img');
      img.src = imgMeta.src;
      img.alt = '';
      img.decoding = 'async';
      img.loading = i < 4 ? 'eager' : 'lazy';

      layoutCrop(imgMeta, crop, img);
      crop.appendChild(img);
      btn.appendChild(crop);
      slot.appendChild(btn);
      stageEl.appendChild(slot);

      const entry = { order: i, phrase, imgMeta, slot, btn, crop, img, currentPct: xPct };
      entries.push(entry);

      btn.addEventListener('click', () => playEntry(entry));
    });

    const obs = new IntersectionObserver(
      (list) => {
        list.forEach((ev) => {
          if (ev.isIntersecting) {
            ev.target.classList.add('visible');
            if (ev.target === entries[entries.length - 1]?.slot || ev.target === entries[Math.max(0, entries.length - 6)]?.slot) {
              preloadFinaleIfReady();
            }
          }
        });
      },
      { rootMargin: '80px 0px -40px 0px', threshold: 0.06 }
    );
    entries.forEach((e) => obs.observe(e.slot));
  }

  window.addEventListener('resize', () => {
    if (finaleStarted) return;
    entries.forEach((e) => layoutCrop(e.imgMeta, e.crop, e.img));
  });

  fetch('./data/mic_check_stage.json')
    .then((r) => r.json())
    .then(build);
})();
