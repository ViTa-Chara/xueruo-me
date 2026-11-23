(() => {
  'use strict';

  const CHAIN_PROBABILITY = 0.35;
  const MONITOR_SRC = './items/screens/016_cutout.png';
  // Exact measured pixel geometry of items/screens/016_cutout.png (1009x708, transparent cut-out inner glass)
  // Screen hole tucked 2px inside the opaque black bezel so the portal behind it can NEVER bleed outside!
  const MONITOR_GEOM = {
    aspect: 1009 / 708,
    panel: { x0: 0.0129, y0: 0.0169, x1: 0.9366, y1: 0.7514 },
    screen: { x0: 0.0365, y0: 0.0500, x1: 0.9125, y1: 0.7420, cx: 0.4745, cy: 0.3960 },
  };
  const blobUrlCache = new Map();
  const blobPromises = new Map();
  const audioElCache = new Map();
  let currentVoice = null;
  let finaleStarted = false;
  let finalePreloaded = false;
  let monitorImgPreload = null;

  const stageEl = document.getElementById('stage');
  const entries = [];

  function fetchWithRetry(url, responseType, retries) {
    const maxRetries = typeof retries === 'number' ? retries : 3;
    let attempt = 0;
    function run() {
      return fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          if (responseType === 'json') return r.json();
          if (responseType === 'blob') return r.blob();
          return r.arrayBuffer();
        })
        .catch((err) => {
          if (attempt < maxRetries) {
            attempt++;
            return new Promise((res) => setTimeout(res, 180 * attempt)).then(run);
          }
          throw err;
        });
    }
    return run();
  }

  function attachImgRetry(img, url, retries) {
    const maxRetries = typeof retries === 'number' ? retries : 3;
    let tries = 0;
    img.onerror = () => {
      if (tries < maxRetries) {
        tries++;
        const sep = url.indexOf('?') >= 0 ? '&' : '?';
        setTimeout(() => {
          img.src = url + sep + '_r=' + tries;
        }, 200 * tries);
      }
    };
    img.src = url;
    return img;
  }

  function preloadMonitorImg() {
    if (monitorImgPreload) return monitorImgPreload;
    monitorImgPreload = new Image();
    monitorImgPreload.decoding = 'async';
    attachImgRetry(monitorImgPreload, MONITOR_SRC, 3);
    monitorImgPreload.addEventListener('load', () => {
      if (typeof monitorImgPreload.decode === 'function') {
        monitorImgPreload.decode().catch(() => {});
      }
    }, { once: true });
    return monitorImgPreload;
  }

  // Preload 320kbps MP3 into an in-memory Blob URL so ALL browsers (Chrome, Safari, Arc, Firefox)
  // play and seek instantaneously from RAM with ZERO 206 Range-request issues and ZERO AudioContext silence!
  function preloadAudioBlob(url) {
    if (!url) return Promise.resolve(null);
    if (blobUrlCache.has(url)) return Promise.resolve(blobUrlCache.get(url));
    if (blobPromises.has(url)) return blobPromises.get(url);
    const p = fetchWithRetry(url, 'blob', 3)
      .then((blob) => {
        const bUrl = URL.createObjectURL(blob);
        blobUrlCache.set(url, bUrl);
        blobPromises.delete(url);
        const existing = audioElCache.get(url);
        if (existing && existing.paused && existing.src !== bUrl) {
          existing.src = bUrl;
          try { existing.load(); } catch {}
        }
        return bUrl;
      })
      .catch(() => {
        blobPromises.delete(url);
        return null;
      });
    blobPromises.set(url, p);
    return p;
  }

  function getAudioEl(url) {
    const cachedBlob = blobUrlCache.get(url);
    let a = audioElCache.get(url);
    if (!a) {
      a = new Audio();
      a.preload = 'auto';
      a.playsInline = true;
      a.src = cachedBlob || url;
      audioElCache.set(url, a);
    } else if (cachedBlob && a.paused && a.src !== cachedBlob) {
      a.src = cachedBlob;
    }
    return a;
  }

  function preloadFinaleIfReady() {
    preloadMonitorImg();
    if (!finalePreloaded && entries.length) {
      const last = entries[entries.length - 1];
      if (last && last.phrase.isFinale) {
        finalePreloaded = true;
        preloadAudioBlob(last.phrase.audio);
      }
    }
    if (window.MicCheckPV) {
      window.MicCheckPV.preload();
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

  function fadeAndStopAudio(a, fadeMs) {
    if (!a) return;
    const gen = (a._fadeGen = (a._fadeGen || 0) + 1);
    if (a.paused) {
      try { a.currentTime = 0; } catch {}
      return;
    }
    const startVol = a.volume;
    const t0 = performance.now();
    function tick(now) {
      if (a._fadeGen !== gen) return;
      const u = clamp((now - t0) / fadeMs, 0, 1);
      a.volume = Math.max(0, startVol * (1 - u));
      if (u < 1 && !a.paused) {
        requestAnimationFrame(tick);
      } else if (a._fadeGen === gen) {
        try {
          a.pause();
          a.currentTime = 0;
          a.volume = 1;
        } catch {}
      }
    }
    requestAnimationFrame(tick);
  }

  function stopCurrent() {
    if (!currentVoice) return;
    const v = currentVoice;
    currentVoice = null;
    if (v.raf) cancelAnimationFrame(v.raf);
    if (v.audio && !v.keepPlaying) {
      fadeAndStopAudio(v.audio, 110);
    }
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
  function triggerDrumDrop(drumDropAtAudioTime, externalElapsedFn) {
    if (finaleStarted) return;
    finaleStarted = true;
    if (window.MicCheckPV) {
      window.MicCheckPV.preload();
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const BEAT = 60 / 101.0; // Exact measured tempo: 101.00 BPM (0.594059s)

    const rig = document.createElement('div');
    rig.className = 'camera-rig';

    const layer = document.createElement('div');
    layer.className = 'physics-layer';
    rig.appendChild(layer);

    // --- Monitor setup ---
    // Center screen hole dead-on viewport center (50%, 50%) so portal handoff has ZERO vertical jump/flash!
    const monW = Math.min(vw * (vw <= 640 ? 0.84 : 0.58), 720, vh * 0.72 * MONITOR_GEOM.aspect);
    const monH = monW / MONITOR_GEOM.aspect;
    const screenCxLocal = monW * MONITOR_GEOM.screen.cx;
    const screenCyLocal = monH * MONITOR_GEOM.screen.cy;
    const monRestLeft = vw * 0.5 - screenCxLocal;
    const monRestTop = vh * 0.5 - screenCyLocal;
    const monStartTop = vh + 64;

    const monEl = document.createElement('div');
    monEl.className = 'monitor-actor';
    monEl.style.width = monW.toFixed(1) + 'px';
    monEl.style.height = monH.toFixed(1) + 'px';
    // Pre-position & hide offscreen BEFORE appending to DOM so 016_cutout NEVER flashes on mount!
    monEl.style.transform = `translate3d(${monRestLeft.toFixed(1)}px, ${monStartTop.toFixed(1)}px, 0)`;
    monEl.style.visibility = 'hidden';

    const preloaded = preloadMonitorImg();
    const monImg = preloaded.complete && preloaded.naturalWidth > 0
      ? preloaded.cloneNode(false)
      : document.createElement('img');
    if (!monImg.src) monImg.src = MONITOR_SRC;
    monImg.alt = '';
    monImg.decoding = 'sync';
    monEl.appendChild(monImg);
    layer.appendChild(monEl);

    // Pre-promote camera-rig GPU layer from frame 0 so ZOOM_START NEVER triggers a layer-allocation flash!
    rig.style.transformOrigin = `${(monRestLeft + screenCxLocal).toFixed(1)}px ${(monRestTop + screenCyLocal).toFixed(1)}px`;
    rig.style.transform = 'scale(1)';

    const sg = MONITOR_GEOM.screen;
    const innerW = monW * (sg.x1 - sg.x0);
    const innerH = monH * (sg.y1 - sg.y0);
    const targetScale = Math.max(vw / innerW, vh / innerH) * 1.24;

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
    function spawnBody(info, x, y, vx, vy, omega, delaySec, isVisibleNow) {
      const { entry, boxW, boxH } = info;
      const wrap = document.createElement('div');
      wrap.className = 'physics-body';
      wrap.style.width = boxW + 'px';
      wrap.style.height = boxH + 'px';

      // Move the LIVE already-painted entry.crop node straight into the physics rig (NO cloneNode!)
      // so the browser reuses its already-decoded GPU texture with ZERO 1-frame decode flash!
      const cropNode = entry.crop;
      const liveImg = cropNode.querySelector('img');
      if (liveImg) {
        liveImg.loading = 'eager';
        liveImg.decoding = 'sync';
      }
      wrap.appendChild(cropNode);
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
      wrap.style.transform = `translate3d(${(x - body.halfW).toFixed(2)}px, ${(y - body.halfH).toFixed(2)}px, 0)`;
      if (!isVisibleNow) {
        wrap.style.visibility = 'hidden';
      }
      bodies.push(body);
    }

    // Beat 1: currently visible foreground objects release smoothly from REST right at their exact pixel rects!
    visibleList.sort((a, b) => b.cy - a.cy);
    visibleList.forEach((info) => {
      const vx = (Math.random() - 0.5) * 32;
      const vy = 0; // start from exact rest so frame 0 -> frame 1 has ZERO vertical jump/flash!
      const omega = (Math.random() - 0.5) * 0.42;
      spawnBody(info, info.cx, info.cy, vx, vy, omega, 0, true);
    });

    // Above-viewport objects cascade across Beat 2..Beat 8 so they naturally meet & collide with the rising monitor!
    const lateCount = Math.min(3, Math.max(0, aboveList.length - 6));
    const mainAbove = aboveList.slice(0, aboveList.length - lateCount);
    const lateAbove = aboveList.slice(aboveList.length - lateCount);

    const panelLeftTarget = monRestLeft + monW * MONITOR_GEOM.panel.x0;
    const panelRightTarget = monRestLeft + monW * MONITOR_GEOM.panel.x1;
    const panelSpan = panelRightTarget - panelLeftTarget;

    mainAbove.forEach((info, idx) => {
      // Spread arrival times smoothly from +0.30s to +2.05s (meeting the rising monitor!)
      const frac = mainAbove.length > 1 ? idx / (mainAbove.length - 1) : 0;
      const delay = 0.30 + frac * 1.75 + (Math.random() - 0.5) * 0.10;
      const spanMin = Math.max(info.boxW * 0.5 + 18, panelLeftTarget - 110);
      const spanMax = Math.min(vw - info.boxW * 0.5 - 18, panelRightTarget + 110);
      const startX = clamp(spanMin + Math.random() * (spanMax - spanMin), info.boxW * 0.5 + 18, vw - info.boxW * 0.5 - 18);
      const startY = -info.boxH * 0.65 - 24;
      spawnBody(info, startX, startY, (Math.random() - 0.5) * 70, 120 + Math.random() * 120, (Math.random() - 0.5) * 0.9, Math.max(0, delay), false);
    });

    // 3 late straggler objects arriving right as the cut-out monitor settles (~2.35s - 2.95s)
    lateAbove.forEach((info, idx) => {
      const lane = idx === 0 ? 0.20 : idx === 1 ? 0.78 : 0.48;
      const startX = clamp(
        panelLeftTarget + (lane + (Math.random() - 0.5) * 0.08) * panelSpan,
        info.boxW * 0.5 + 20,
        vw - info.boxW * 0.5 - 20
      );
      const delay = 2.35 + idx * 0.28;
      spawnBody(info, startX, -info.boxH * 0.65 - 24, (Math.random() - 0.5) * 50, 110, (Math.random() - 0.5) * 0.6, delay, false);
    });

    // Append rig BEFORE hiding stage/overflow so the live moved objects stay continuously painted!
    document.body.appendChild(rig);
    document.documentElement.classList.add('blackout');
    document.body.classList.add('blackout');

    // Beat-locked seamless timeline (seconds from drum impact @ 100.848s):
    // - Beat 4 (+1.792s): Cut-out monitor 016_cutout.png rises briskly over 2 beats -> Beat 6 (+2.987s)
    // - Live 3D vertical street corridor runs seamlessly BEHIND the cut-out hole!
    // - Beat 6.6 (+3.345s) -> Beat 10 (+5.376s): Seamless camera push straight THROUGH the cut-out glass
    //   into the street (ZERO black curtain!), arriving in time for 1st "Mic Check" Showcase at Bar 4.1 (+7.17s)!
    const RISE_START = BEAT * 3.0;   // +1.792s = Beat 4
    const RISE_DUR = BEAT * 2.2;     //  1.314s = silky decelerating rise
    const ZOOM_START = BEAT * 4.8;   // +2.867s = blends seamlessly out of rise (zero dead pause!)
    const ZOOM_DUR = BEAT * 3.8;     //  2.270s = fluid optical push-through ending @ +5.137s

    const GRAVITY = 2350;
    const RESTITUTION = 0.32;
    const MON_RESTITUTION = 0.28;
    const FRICTION = 0.42;
    const MAX_OMEGA = 3.2;
    const SUBSTEPS = 6;

    const fallbackStartMs = performance.now();
    function getAudioElapsed() {
      if (typeof externalElapsedFn === 'function') {
        return Math.max(0, externalElapsedFn());
      }
      return (performance.now() - fallbackStartMs) / 1000;
    }

    // Mount live 3D vertical street corridor IMMEDIATELY behind 016_cutout.png's transparent window!
    let pvCtrl = null;
    if (window.MicCheckPV) {
      pvCtrl = window.MicCheckPV.start({
        getElapsedSec: getAudioElapsed,
        fallenItems: entries.map((e) => e.imgMeta),
      });
      pvCtrl.setPortalWindow({ hidden: true });
    }

    let elapsed = getAudioElapsed();
    let monTop = monStartTop;
    let monRecoilY = 0;
    let monRecoilV = 0;
    let lastTs = performance.now();

    function simulate(now) {
      const rawDt = Math.min(0.033, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const dt = rawDt / SUBSTEPS;
      const airAngDamp = Math.exp(-1.15 * dt);
      const targetElapsed = getAudioElapsed();
      const stepStartElapsed = elapsed;
      const stepDelta = Math.max(0.001, Math.min(0.04, targetElapsed - stepStartElapsed)) / SUBSTEPS;

      for (let s = 0; s < SUBSTEPS; s++) {
        elapsed += stepDelta;

        // 1. Update C2-smooth rising monitor starting right on Beat 4 (+1.792s)
        // Smootherstep ramps velocity smoothly from 0 -> peak -> 0 (zero abrupt frame-1 pop!)
        const prevMonTop = monTop;
        const riseU = clamp((elapsed - RISE_START) / RISE_DUR, 0, 1);
        const riseEase = riseU * riseU * riseU * (riseU * (6 * riseU - 15) + 10);
        const baseTop = monStartTop + (monRestTop - monStartTop) * riseEase;

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

      // Render monitor (only reveal once entering viewport so offscreen texture never flashes)
      monEl.style.visibility = monTop < vh + 12 ? 'visible' : 'hidden';
      monEl.style.transform = `translate3d(${monRestLeft.toFixed(1)}px, ${monTop.toFixed(1)}px, 0)`;

      // Render falling objects (reveal delayed upper objects right as they become active)
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (!b.active) continue;
        if (b.el.style.visibility === 'hidden') b.el.style.visibility = 'visible';
        b.el.style.transform = `translate3d(${(b.x - b.halfW).toFixed(2)}px, ${(b.y - b.halfH).toFixed(2)}px, 0) rotate(${b.theta.toFixed(3)}rad)`;
      }

      // Seamless silky camera push-in straight THROUGH the cut-out transparent glass of 016_cutout.png!
      const zoomU = clamp((elapsed - ZOOM_START) / ZOOM_DUR, 0, 1);
      const originX = monRestLeft + screenCxLocal;
      const originY = monTop + screenCyLocal;
      const camScale = zoomU > 0 ? Math.pow(targetScale, easeInOutCubic(zoomU)) : 1;

      rig.style.transformOrigin = `${originX.toFixed(1)}px ${originY.toFixed(1)}px`;
      rig.style.transform = `scale(${camScale.toFixed(4)})`;

      // Sync exact portal window of the live 3D street scaled right inside 016_cutout.png's hole!
      if (pvCtrl) {
        const wx0 = monRestLeft + monW * sg.x0;
        const wy0 = monTop + monH * sg.y0;
        const wx1 = monRestLeft + monW * sg.x1;
        const wy1 = monTop + monH * sg.y1;
        const sx0 = originX + (wx0 - originX) * camScale;
        const sy0 = originY + (wy0 - originY) * camScale;
        const sx1 = originX + (wx1 - originX) * camScale;
        const sy1 = originY + (wy1 - originY) * camScale;
        if (sy0 >= vh - 2) {
          pvCtrl.setPortalWindow({ hidden: true });
        } else if (sx0 <= -2 && sy0 <= -2 && sx1 >= vw + 2 && sy1 >= vh + 2) {
          pvCtrl.setPortalWindow({ open: true });
        } else {
          pvCtrl.setPortalWindow({ x0: sx0, y0: sy0, x1: sx1, y1: sy1 });
        }
      }

      if (zoomU < 1) {
        requestAnimationFrame(simulate);
      } else {
        if (pvCtrl) pvCtrl.setPortalWindow({ open: true });
        rig.remove();
        window.scrollTo(0, 0);
      }
    }

    requestAnimationFrame(simulate);
  }

  // Silky 60fps phase-locked clock anchored to a native <audio> element (zero 20ms stair-stepping, zero drift!)
  function makeSmoothMediaClock(audioEl) {
    let lastMediaT = -1;
    let anchorMediaT = 0;
    let anchorPerfMs = performance.now();
    return function getMediaTime() {
      const nowMs = performance.now();
      const rawT = audioEl.currentTime || 0;
      if (audioEl.paused || audioEl.ended) {
        anchorMediaT = rawT;
        anchorPerfMs = nowMs;
        lastMediaT = rawT;
        return rawT;
      }
      if (rawT !== lastMediaT) {
        lastMediaT = rawT;
        const est = anchorMediaT + (nowMs - anchorPerfMs) / 1000;
        if (Math.abs(rawT - est) > 0.045 || rawT < est - 0.02) {
          anchorMediaT = rawT;
          anchorPerfMs = nowMs;
        } else {
          anchorMediaT = est + (rawT - est) * 0.25;
          anchorPerfMs = nowMs;
        }
      }
      const smooth = anchorMediaT + (nowMs - anchorPerfMs) / 1000;
      return Math.max(0, clamp(smooth, rawT - 0.04, rawT + 0.06));
    };
  }

  // 100% Native <audio> playback for ALL 23 320kbps MP3 phrases:
  // Called SYNCHRONOUSLY inside click -> 0ms Web Audio overhead, ZERO AudioContext silence!
  function playEntry(entry, isChained) {
    if (finaleStarted) return;
    stopCurrent();

    const isFinale = Boolean(entry.phrase.isFinale);
    const drumDropSec = isFinale ? (entry.phrase.drumDropSec || 1.648) : null;

    if (isFinale) {
      preloadMonitorImg();
      if (window.MicCheckPV) window.MicCheckPV.preload();
    } else if (entry.order >= 12) {
      preloadFinaleIfReady();
    }

    if (isChained) {
      entry.slot.classList.add('visible');
      ensureInViewQuietly(entry);
    }

    const audioEl = getAudioEl(entry.phrase.audio);
    audioEl._fadeGen = (audioEl._fadeGen || 0) + 1; // cancel any pending fade-out on re-click
    try { audioEl.currentTime = 0; } catch {}
    audioEl.volume = 1.0;
    audioEl.muted = false;

    const waypoints = buildWaypoints(entry);
    const fallbackDur = entry.phrase.durationSec || 3.5;
    const getMediaT = makeSmoothMediaClock(audioEl);

    const nextEntry = !isFinale ? entries[entry.order + 1] : null;
    const isContiguousWithNext = Boolean(
      nextEntry && (nextEntry.phrase.startSec - entry.phrase.endSec) <= 0.05
    );
    const willChain = Boolean(nextEntry && Math.random() < CHAIN_PROBABILITY);

    if (nextEntry) {
      preloadAudioBlob(nextEntry.phrase.audio);
    }

    const voice = {
      entry,
      audio: audioEl,
      raf: null,
      dropped: false,
      handedOver: false,
      keepPlaying: false,
    };
    currentVoice = voice;

    const playPromise = audioEl.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err) => {
        console.warn('[mic-check] Audio play failed:', entry.phrase.audio, err);
      });
    }

    function handoverToNext() {
      if (currentVoice !== voice || voice.handedOver || !nextEntry || finaleStarted) return;
      voice.handedOver = true;
      const lastPt = waypoints[waypoints.length - 1];
      entry.currentPct = lastPt.x;
      entry.btn.style.left = lastPt.x.toFixed(3) + '%';
      playEntry(nextEntry, true);
    }

    function step() {
      if (currentVoice !== voice) return;
      const t = getMediaT();
      const dur = (audioEl.duration && isFinite(audioEl.duration) && audioEl.duration > 0.2)
        ? audioEl.duration
        : fallbackDur;

      if (isFinale) {
        if (!voice.dropped && t >= drumDropSec) {
          voice.dropped = true;
          voice.keepPlaying = true; // keep 23.mp3 playing uninterrupted through entire PV!
          triggerDrumDrop(null, () => Math.max(0, getMediaT() - drumDropSec));
          return;
        }
        const progress = clamp(t / drumDropSec, 0, 1);
        let seg = 0;
        while (seg < waypoints.length - 2 && progress > waypoints[seg + 1].t) seg++;
        const p0 = waypoints[seg];
        const p1 = waypoints[seg + 1];
        const localT = p1.t > p0.t ? clamp((progress - p0.t) / (p1.t - p0.t), 0, 1) : 1;
        const x = p0.x + (p1.x - p0.x) * easeInOutCubic(localT);
        entry.currentPct = x;
        entry.btn.style.left = x.toFixed(3) + '%';
        voice.raf = requestAnimationFrame(step);
        return;
      }

      // 35% smooth recursive chain into next entry right before clip ends
      if (willChain && !voice.handedOver) {
        const overlap = isContiguousWithNext ? 0.055 : 0.025;
        if (t >= dur - overlap) {
          handoverToNext();
          return;
        }
      } else if (!willChain) {
        // Silky tail fade-out when stopping at end of phrase
        const fadeSec = isContiguousWithNext ? Math.min(0.22, dur * 0.24) : Math.min(0.14, dur * 0.20);
        const rem = dur - t;
        if (rem < fadeSec && rem > 0) {
          audioEl.volume = clamp(rem / fadeSec, 0, 1);
        }
      }

      const progress = clamp(t / dur, 0, 1);
      let seg = 0;
      while (seg < waypoints.length - 2 && progress > waypoints[seg + 1].t) seg++;
      const p0 = waypoints[seg];
      const p1 = waypoints[seg + 1];
      const localT = p1.t > p0.t ? clamp((progress - p0.t) / (p1.t - p0.t), 0, 1) : 1;
      const x = p0.x + (p1.x - p0.x) * easeInOutCubic(localT);
      entry.currentPct = x;
      entry.btn.style.left = x.toFixed(3) + '%';

      if (progress < 1 && !audioEl.ended) {
        voice.raf = requestAnimationFrame(step);
      } else {
        if (willChain && !voice.handedOver) {
          handoverToNext();
          return;
        }
        currentVoice = null;
        audioEl.volume = 1.0;
      }
    }

    audioEl.onended = () => {
      if (currentVoice !== voice) return;
      if (willChain && !voice.handedOver && !isFinale) {
        handoverToNext();
        return;
      }
      if (voice.raf) cancelAnimationFrame(voice.raf);
      currentVoice = null;
      audioEl.volume = 1.0;
    };

    voice.raf = requestAnimationFrame(step);
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
      img.alt = '';
      img.decoding = 'async';
      img.loading = i < 6 ? 'eager' : 'lazy';
      attachImgRetry(img, imgMeta.src, 3);

      layoutCrop(imgMeta, crop, img);
      crop.appendChild(img);
      btn.appendChild(crop);
      slot.appendChild(btn);
      stageEl.appendChild(slot);

      const entry = { order: i, phrase, imgMeta, slot, btn, crop, img, currentPct: xPct };
      entries.push(entry);

      btn.addEventListener('click', () => playEntry(entry, false));
    });

    const obs = new IntersectionObserver(
      (list) => {
        list.forEach((ev) => {
          if (ev.isIntersecting) {
            ev.target.classList.add('visible');
            const idx = parseInt(ev.target.dataset.order || '-1', 10);
            if (idx >= 0 && entries[idx]) {
              // Preload visible item's 320kbps MP3 (~200KB) into RAM Blob so click starts at 0ms!
              preloadAudioBlob(entries[idx].phrase.audio);
            }
            if (ev.target === entries[entries.length - 1]?.slot || ev.target === entries[Math.max(0, entries.length - 6)]?.slot) {
              preloadFinaleIfReady();
            }
          }
        });
      },
      { rootMargin: '120px 0px -40px 0px', threshold: 0.05 }
    );
    entries.forEach((e) => {
      e.slot.dataset.order = String(e.order);
      obs.observe(e.slot);
    });

    // Staged background preloading: 01.mp3 + 02.mp3 + 016_cutout immediately, 23.mp3 (4.8MB) + PV assets right after!
    preloadMonitorImg();
    if (entries[0]) preloadAudioBlob(entries[0].phrase.audio);
    if (entries[1]) preloadAudioBlob(entries[1].phrase.audio);
    setTimeout(() => {
      if (!finaleStarted) preloadFinaleIfReady();
    }, 350);

    // Optional direct PV scene inspection via URL query (?scene=pv&t=15.0[&freeze=1])
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('scene') === 'pv' && window.MicCheckPV) {
      finaleStarted = true;
      const startT = parseFloat(qs.get('t') || '10.5');
      const freeze = qs.get('freeze') === '1';
      let wallT0 = performance.now();
      let previewAudio = null;
      let previewClock = null;
      let previewDropSec = 1.648;
      const getPreviewT = () => {
        if (previewAudio && previewClock && !previewAudio.paused) {
          return Math.max(0, previewClock() - previewDropSec);
        }
        return startT + (performance.now() - wallT0) / 1000;
      };
      // In non-frozen preview mode, clicking anywhere starts synced native <audio> from 23.mp3
      if (!freeze) {
        const lastPhrase = phrases[phrases.length - 1];
        if (lastPhrase && lastPhrase.audio) {
          previewDropSec = lastPhrase.drumDropSec || 1.648;
          preloadAudioBlob(lastPhrase.audio);
          window.addEventListener(
            'pointerdown',
            () => {
              const a = getAudioEl(lastPhrase.audio);
              const curT = getPreviewT();
              const offset = previewDropSec + curT;
              try { a.currentTime = Math.max(0, offset); } catch {}
              a.volume = 1.0;
              a.muted = false;
              a.play().then(() => {
                previewAudio = a;
                previewClock = makeSmoothMediaClock(a);
              }).catch(() => {});
            },
            { once: true }
          );
        }
      }
      window.MicCheckPV.preload().then(() => {
        wallT0 = performance.now();
        window.MicCheckPV.start({
          getElapsedSec: getPreviewT,
          fallenItems: pickedItems,
          freezeAt: freeze ? startT : null,
        });
      });
    }
  }

  window.addEventListener('resize', () => {
    if (finaleStarted) return;
    entries.forEach((e) => layoutCrop(e.imgMeta, e.crop, e.img));
  });

  fetchWithRetry('./data/mic_check_stage.json', 'json', 3)
    .then(build)
    .catch((err) => {
      console.warn('[mic-check] Failed to load stage data:', err);
    });
})();
