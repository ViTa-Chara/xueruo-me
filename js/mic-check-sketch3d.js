(() => {
  'use strict';

  // =========================================================================
  // MIC CHECK — PART II: USER-CHOREOGRAPHED ALWAYS-ON HOLLOW PHOTO-SCULPTURES
  // (Bar 17.1 "1, 2, 3, 4" -> Bar 52.1)
  //
  // Contract:
  //   1. PURE #000000 VOID ALWAYS — fog = null, ZERO text/lines/shapes; the 7
  //      downloaded .glb models are NEVER rendered (only invisible guides).
  //   2. ALL 416 UNIQUE REAL IMAGES, each used strictly ONCE.
  //   3. ZERO DEFORMATION HARD-PASTE: rigid 1x1 flat plane, EXACT true aspect ratio.
  //   4. ONLY 3 ORIENTATION STATES: 垂直 / 水平 / 斜45度.
  //   5. OPENING 4 BEATS (Bar 17, 0.000s..2.376s): ZERO models visible; 4 images
  //      laid out Right -> Left across screen, switching off one per beat until
  //      the first "Mic Check" (2.376s) glides seamlessly into the 3D models.
  //   6. ALL MODELS ALWAYS ON (age >= 2.376s): M1..M7 + orbiters + Rocket stay active
  //      and visible simultaneously throughout the whole camera flight.
  //   7. ZERO STATIC IMAGES: every single card continuously performs a gentle,
  //      very slow 3D wiggle / orbital Brownian float (scale === (1,1,1), opacity === 1).
  // =========================================================================

  const CHOREO_STORAGE_KEY = 'mic_check_part2_choreo_v2';
  const BASE_FOV = 46;

  // Baked production choreography from /Users/xueruomi/Downloads/mic-check-part2-choreo-2.json
  const DEFAULT_CHOREO = {
    version: 1,
    cameraKeyframes: [
      { id: 'kf_open', t: 0, pos: [0, 0, 0], lookAt: [0, -8.541, -31.876], fov: 46, label: '开场 Bar 17' },
      { id: 'kf_M1_whale_a', t: 2.676, pos: [0, 0, 0], lookAt: [0, -8.541, -31.876], fov: 46, label: 'M1 巨鲸 入场' },
      { id: 'kf_M1_whale_m', t: 5.454, pos: [15.678, -1.962, -3.593], lookAt: [-80, -8.541, -31.876], fov: 46, label: 'M1 巨鲸 中段' },
      { id: 'kf_M1_whale_b', t: 9.188, pos: [24.58860219835352, -3.948, -14.558], lookAt: [0, -8.541, -31.876], fov: 46, label: 'M1 巨鲸 离场' },
      { id: 'kf_M3_cat_a', t: 12.2, pos: [12.452, -8.388, -42.4], lookAt: [11.185, -12.204, -6.122], fov: 46, label: 'M3 巨猫 入场' },
      { id: 'kf_M2_shark_a', t: 14.2, pos: [39.00294361690954, -15.568425155044565, -45.36957585862802], lookAt: [44.413, -9.505, -41.284], fov: 46, label: 'M2 鲨鱼 入场' },
      { id: 'kf_M2_shark_m', t: 16.817, pos: [52.753086419251716, -23.41, -45.10196952860645], lookAt: [44.413, -9.505, -41.284], fov: 46, label: 'M2 鲨鱼 中段' },
      { id: 'kf_M2_shark_b', t: 20.836, pos: [12.452, -8.388, -42.4], lookAt: [44.413, -9.505, -41.284], fov: 46, label: 'M2 鲨鱼 离场' },
      { id: 'kf_M3_cat_m', t: 25.038, pos: [14.080314662485137, -14.880505488126314, -17.3677760017814], lookAt: [11.185, -12.204, -6.122], fov: 46, label: 'M3 巨猫 中段' },
      { id: 'kf_M3_cat_b', t: 27.965, pos: [-14.497, -4.615, 3.2367993065767102], lookAt: [11.435, -15.454, -6.122], fov: 46, label: 'M3 巨猫 离场' },
      { id: 'kf_M4_flamingo_a', t: 30.003, pos: [-35.89682230850644, -4.615, -1.8861616147698648], lookAt: [-40.878, -5.941, -3.605], fov: 46, label: 'M4 火烈鸟 入场' },
      { id: 'kf_M4_flamingo_m', t: 32.054, pos: [-5.838, -1.969, -17.762], lookAt: [-40.878, -5.941, -3.605], fov: 46, label: 'M4 火烈鸟 中段' },
      { id: 'kf_M4_flamingo_b', t: 34.327, pos: [-41.19617744931, 10.518864837078722, -2.298], lookAt: [-40.878, -5.941, -3.605], fov: 46, label: 'M4 火烈鸟 离场' },
      { id: 'kf_M5_beermug_a', t: 36.39, pos: [-3.478, 0.658, -30.290829926491995], lookAt: [-2.394, -11.892, -33.34], fov: 46, label: 'M5 啤酒杯 入场' },
      { id: 'kf_user_c0kyc', t: 36.906, pos: [6.333, -12.685307613610707, -23.779], lookAt: [-2.394, -11.892, -33.34], fov: 46, label: '插帧 37.2s' },
      { id: 'kf_user_c3x81', t: 37.706, pos: [11.019, -8.256, -57.82922048982887], lookAt: [-2.394, -11.892, -33.34], fov: 46, label: '插帧 38.0s' },
      { id: 'kf_M5_beermug_m', t: 38.979, pos: [13.927, -4.356, -5.072], lookAt: [-2.394, -11.892, -33.34], fov: 46, label: 'M5 啤酒杯 中段' },
      { id: 'kf_user_c4h7u', t: 39.768, pos: [-14.364, -10.909, -28.934], lookAt: [-2.394, -11.892, -33.34], fov: 37.5, label: '插帧 39.6s' },
      { id: 'kf_user_c7jln', t: 42.06, pos: [25.721, 3.125, -50.265], lookAt: [83.629, 36.126, -34.895], fov: 46, label: '插帧 42.1s' },
      { id: 'kf_user_c9otq', t: 44.766, pos: [43.937, -31.933, -40.646], lookAt: [54.136, 12.813, -42.178], fov: 46, label: '插帧 44.8s' },
      { id: 'kf_M6_shuttlecock_m', t: 47.292, pos: [63.497, 34.824, -42.907], lookAt: [41.477, 2.807, -44.667], fov: 46, label: 'M6 羽毛球 中段' },
      { id: 'kf_M6_shuttlecock_b', t: 49.351, pos: [8.678, -0.642, -45.812], lookAt: [41.477, 2.807, -44.667], fov: 46, label: 'M6 羽毛球 离场' },
      { id: 'kf_M7_chain_a', t: 52.019, pos: [-71.322, 79.358, -125.812], lookAt: [7.537, 3.95, -13.153], fov: 85, label: 'M7 金属锁链 入场' },
      { id: 'kf_M7_chain_m', t: 55.777, pos: [-5.883, 4.526, -43.296], lookAt: [-2.463, 5.2, -8.153], fov: 46, label: 'M7 金属锁链 中段' },
      { id: 'kf_M7_chain_b', t: 57.968, pos: [-17.358, 9.681, -34.043], lookAt: [-35.963, 5.95, -13.153], fov: 46, label: 'M7 金属锁链 离场' },
      { id: 'kf_FIN_a', t: 59.815, pos: [-17.358, 9.681, -34.043], lookAt: [-43.945, 16.974, -2.358], fov: 46, label: '火箭 入场' },
      { id: 'kf_FIN_m', t: 70, pos: [-17.994, 5.397, -33.285], lookAt: [-43.945, 16.974, -2.358], fov: 46, label: '火箭 悬停' },
      { id: 'kf_user_cdgre', t: 74.139, pos: [-34.284, -5.072, -12.44], lookAt: [-43.945, 10.974, -4.108], fov: 46, label: '插帧 74.4s' },
      { id: 'kf_user_ch02t', t: 81.606, pos: [-31.328, -3.858, -16.238], lookAt: [-43.945, 24.806, -1.349], fov: 46, label: '插帧 81.6s' },
      { id: 'kf_user_cfqy2', t: 83.995, pos: [-28.424, -2.665, -19.969], lookAt: [-43.945, 16.974, -1.585], fov: 46, label: '插帧 80.9s' },
      { id: 'kf_user_cf5h9', t: 84.198, pos: [-25.287, -1.377, -24], lookAt: [-43.945, 16.974, -1.84], fov: 46, label: '插帧 80.8s' },
    ],
    models: {
      M1_whale: { center: [-3.752, 0.442, -6.411], rotDeg: [3.438, 116.975, 0] },
      M2_shark: { center: [44.413, -9.505, -41.284], rotDeg: [4.584, 213.89, 0] },
      M3_cat: { center: [11.185, -12.204, -6.122], rotDeg: [0, 75.349, 0] },
      M4_flamingo: { center: [-40.878, -5.941, -3.605], rotDeg: [0, 36.214, 0] },
      M5_beermug: { center: [-2.394, -11.892, -33.34], rotDeg: [2.292, 146.487, 0] },
      M6_shuttlecock: { center: [41.477, 2.807, -44.667], rotDeg: [13.751, 174.918, 0] },
      M7_chain: { center: [7.537, 3.95, -13.153], rotDeg: [9.167, 23.783, -24.064] },
      FIN_rocket: { center: [-43.945, 16.974, -2.358], rotDeg: [0, 135, 0] },
    },
  };

  function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function lerp(a, b, u) {
    return a + (b - a) * u;
  }

  function deg(d) {
    return (d * Math.PI) / 180;
  }

  function easeOutCubic(t) {
    const x = 1 - clamp(t, 0, 1);
    return 1 - x * x * x;
  }

  function easeInCubic(t) {
    const x = clamp(t, 0, 1);
    return x * x * x;
  }

  function numArr3(v) {
    return [Number(v[0].toFixed(3)), Number(v[1].toFixed(3)), Number(v[2].toFixed(3))];
  }

  // Non-uniform monotone-safe cubic Hermite scalar evaluator
  function evalSplineScalar(kfs, age, getter) {
    const n = kfs.length;
    if (n === 0) return 0;
    if (n === 1 || age <= kfs[0].t) return getter(kfs[0]);
    if (age >= kfs[n - 1].t) return getter(kfs[n - 1]);

    let i = 0;
    while (i < n - 2 && age > kfs[i + 1].t) i++;

    const t0 = kfs[i].t;
    const t1 = kfs[i + 1].t;
    const dt = Math.max(1e-4, t1 - t0);
    const u = clamp((age - t0) / dt, 0, 1);

    const slopeAt = (idx) => {
      if (idx === 0) {
        const dtN = Math.max(1e-4, kfs[1].t - kfs[0].t);
        return (getter(kfs[1]) - getter(kfs[0])) / dtN;
      }
      if (idx === n - 1) {
        const dtP = Math.max(1e-4, kfs[n - 1].t - kfs[n - 2].t);
        return (getter(kfs[n - 1]) - getter(kfs[n - 2])) / dtP;
      }
      const dtPrev = Math.max(1e-4, kfs[idx].t - kfs[idx - 1].t);
      const dtNext = Math.max(1e-4, kfs[idx + 1].t - kfs[idx].t);
      const dPrev = (getter(kfs[idx]) - getter(kfs[idx - 1])) / dtPrev;
      const dNext = (getter(kfs[idx + 1]) - getter(kfs[idx])) / dtNext;
      if (Math.abs(dPrev) < 1e-6 || Math.abs(dNext) < 1e-6 || dPrev * dNext <= 0) {
        return 0;
      }
      const wMean = (dPrev * dtNext + dNext * dtPrev) / (dtPrev + dtNext);
      const lim = 2.5 * Math.min(Math.abs(dPrev), Math.abs(dNext));
      return clamp(wMean, -lim, lim);
    };

    const v0 = getter(kfs[i]);
    const v1 = getter(kfs[i + 1]);
    const m0 = slopeAt(i);
    const m1 = slopeAt(i + 1);

    const u2 = u * u;
    const u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;
    return h00 * v0 + h10 * dt * m0 + h01 * v1 + h11 * dt * m1;
  }

  // Calm, very slow 3-octave breathing positional wiggle (zero scale/rotation jitter)
  const WIGGLE_FREQS = [0.31, 0.57, 0.93];
  function buildSlowWiggleParams(wRng, ampScale) {
    const rawW = [1.0, 0.56, 0.30];
    let wSq = 0;
    for (let k = 0; k < rawW.length; k++) wSq += 0.5 * rawW[k] * rawW[k];
    const norm = ampScale / Math.sqrt(wSq);
    return WIGGLE_FREQS.map((bf, k) => ({
      ax: rawW[k] * norm,
      ay: rawW[k] * norm * 0.92,
      az: rawW[k] * norm * 0.85,
      fx: bf * (0.84 + 0.32 * wRng()),
      fy: bf * (0.84 + 0.32 * wRng()),
      fz: bf * (0.84 + 0.32 * wRng()),
      px: wRng() * Math.PI * 2,
      py: wRng() * Math.PI * 2,
      pz: wRng() * Math.PI * 2,
    }));
  }

  function evalSlowWiggle3D(t, octaves, outVec) {
    let x = 0, y = 0, z = 0;
    for (let k = 0; k < octaves.length; k++) {
      const o = octaves[k];
      x += o.ax * Math.sin(o.fx * t + o.px);
      y += o.ay * Math.sin(o.fy * t + o.py);
      z += o.az * Math.sin(o.fz * t + o.pz);
    }
    return outVec.set(x, y, z);
  }

  // Gentle 5-octave spectral 3D Brownian drift for orbiting small objects
  const BROWNIAN_BASE_FREQS = [0.32, 0.58, 0.97, 1.49, 2.23];
  function buildBrownianParams(bRng, ampScale) {
    const octaves = [];
    let wSq = 0;
    const rawW = BROWNIAN_BASE_FREQS.map((_, k) => 1 / Math.pow(k + 1, 0.85));
    for (let k = 0; k < rawW.length; k++) wSq += 0.5 * rawW[k] * rawW[k];
    const norm = ampScale / Math.sqrt(Math.max(1e-6, wSq));

    for (let k = 0; k < BROWNIAN_BASE_FREQS.length; k++) {
      const bf = BROWNIAN_BASE_FREQS[k];
      const amp = rawW[k] * norm;
      octaves.push({
        ampX: amp,
        ampY: amp * 0.72,
        ampZ: amp,
        fx: bf * (0.86 + 0.28 * bRng()),
        fy: bf * (0.86 + 0.28 * bRng()),
        fz: bf * (0.86 + 0.28 * bRng()),
        px: bRng() * Math.PI * 2,
        py: bRng() * Math.PI * 2,
        pz: bRng() * Math.PI * 2,
      });
    }
    return octaves;
  }

  function evalBrownian3D(t, octaves, outVec) {
    let x = 0, y = 0, z = 0;
    for (let k = 0; k < octaves.length; k++) {
      const o = octaves[k];
      x += o.ampX * Math.sin(o.fx * t + o.px);
      y += o.ampY * Math.sin(o.fy * t + o.py);
      z += o.ampZ * Math.sin(o.fz * t + o.pz);
    }
    return outVec.set(x, y, z);
  }

  function create(opts) {
    const THREE = window.THREE;
    if (!THREE) {
      console.warn('[mic-check-sketch3d] THREE not loaded');
      return null;
    }

    const parentEl = opts.parentEl;
    let vw = opts.vw || window.innerWidth;
    let vh = opts.vh || window.innerHeight;
    let aspect = vw / Math.max(1, vh);
    const BEAT = opts.beatSec || (60 / 101.0);
    const BAR = opts.barSec || (BEAT * 4);
    const isFrozen = Boolean(opts.isFrozen);
    const T_START = opts.startSec;

    function encodeUrl(url) {
      try { return encodeURI(decodeURI(url)); } catch (_) { return encodeURI(url); }
    }

    const rng = makeRng(20261299);

    // =========================================================================
    // 1. PURE #000000 WEBGL STAGE
    // =========================================================================
    const wrap = document.createElement('div');
    wrap.className = 'pv-sketch3d-wrap';
    wrap.style.visibility = 'hidden';
    parentEl.appendChild(wrap);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(vw, vh);
    renderer.setClearColor(0x000000, 1);
    wrap.appendChild(renderer.domElement);

    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
    const maxGpuTexDim = Math.min(512, (renderer.capabilities && renderer.capabilities.maxTextureSize) || 512);

    let contextLost = false;
    const onContextLost = (e) => {
      e.preventDefault();
      contextLost = true;
    };
    const onContextRestored = () => {
      contextLost = false;
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored, false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = null;

    const camera = new THREE.PerspectiveCamera(BASE_FOV, aspect, 0.25, 1100);
    camera.position.set(0, 0, 0);

    let active = false;
    let lastRenderAge = -1;
    let rerenderQueued = false;
    let sculpturesReady = false;
    let destroyed = false;
    let editModeActive = false;
    let showAllModels = false;
    let editorRenderHook = null;

    const onResize = () => {
      vw = window.innerWidth || vw;
      vh = window.innerHeight || vh;
      aspect = vw / Math.max(1, vh);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(vw, vh);
      if (active && lastRenderAge >= 0) scheduleRerender();
    };
    window.addEventListener('resize', onResize);

    function scheduleRerender() {
      if (!active || rerenderQueued || contextLost || destroyed) return;
      rerenderQueued = true;
      requestAnimationFrame(() => {
        rerenderQueued = false;
        if (!active || contextLost || destroyed) return;
        if (lastRenderAge >= 0) renderAtAge(lastRenderAge);
      });
    }

    // =========================================================================
    // 2. STRICT SINGLE-USE UNIQUE ASSET ALLOCATOR (416 / 416)
    // =========================================================================
    const rawPool = (opts.assets && Array.isArray(opts.assets.part2UniquePool) && opts.assets.part2UniquePool.length > 0)
      ? opts.assets.part2UniquePool.slice()
      : [];

    const bySrc = new Map();
    const globalUsedSrcs = new Set();
    rawPool.forEach((m) => { if (m && m.src) bySrc.set(m.src, m); });

    const ROCKET_RESERVED = [
      './items/city/冷却塔/008.png',
      './items/city/冷却塔/003.png',
      './items/city/冷却塔/005.png',
      './items/city/冷却塔/007.png',
    ];
    const reservedSrcs = new Set(ROCKET_RESERVED.filter((s) => bySrc.has(s)));

    const masterQueue = rawPool.slice();
    for (let i = masterQueue.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = masterQueue[i];
      masterQueue[i] = masterQueue[j];
      masterQueue[j] = tmp;
    }

    let qCursor = 0;
    function takeNextUnique() {
      while (qCursor < masterQueue.length) {
        const m = masterQueue[qCursor++];
        if (!m || !m.src || globalUsedSrcs.has(m.src) || reservedSrcs.has(m.src)) continue;
        globalUsedSrcs.add(m.src);
        return m;
      }
      return null;
    }

    function takeExact(src) {
      if (src && bySrc.has(src) && !globalUsedSrcs.has(src)) {
        reservedSrcs.delete(src);
        globalUsedSrcs.add(src);
        return bySrc.get(src);
      }
      return takeNextUnique();
    }

    function takeBatch(count) {
      const out = [];
      for (let i = 0; i < count; i++) {
        const m = takeNextUnique();
        if (!m) break;
        out.push(m);
      }
      return out;
    }

    // =========================================================================
    // 3. LUMINOUS RIGID HARD-PASTE SHADER + STREAMING PIPELINE (ALL 416 KEPT LIVE)
    // =========================================================================
    const VERT_SHADER = `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `;

    const FRAG_SHADER = `
      uniform sampler2D uMap;
      uniform float uAlphaTest;
      uniform float uBright;
      uniform vec3 uInnerShade;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vec4 tex = texture2D(uMap, vUv);
        if (uAlphaTest > 0.0 && tex.a < uAlphaTest) discard;
        float ndv = abs(dot(normalize(vNormalView), normalize(vViewDir)));
        float rim = pow(1.0 - clamp(ndv, 0.0, 1.0), 1.85);
        vec3 col;
        if (gl_FrontFacing) {
          col = min(vec3(1.0), tex.rgb * (1.02 + 0.08 * ndv + 0.24 * rim) * uBright);
        } else {
          col = min(vec3(1.0), tex.rgb * uInnerShade * (0.86 + 0.14 * ndv));
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const actors = [];
    let actorsByStart = [];
    const fetchQueue = [];
    const uploadQueue = [];
    const MAX_CONCURRENT_FETCH = 8;
    let inFlightFetches = 0;
    let activeTexCount = 0;
    let disposedCount = 0;

    function needsPaperKnockout(meta) {
      if (!meta || !meta.src) return false;
      return Boolean(meta.whitePaper) || /金属锁链\/0[123]\./.test(meta.src);
    }

    function createRigidActor(meta, pw, ph, tStart, tEnd, behaviorFn, opts2) {
      if (!meta) return null;
      const o = opts2 || {};
      const bw = Math.max(1, meta.bw || meta.w || 512);
      const bh = Math.max(1, meta.bh || meta.h || 512);
      const mw = Math.max(1, meta.w || bw);
      const mh = Math.max(1, meta.h || bh);

      const geo = new THREE.PlaneGeometry(pw, ph, 1, 1);
      const u0 = (meta.x0 || 0) / mw;
      const u1 = ((meta.x0 || 0) + bw) / mw;
      const vTop = 1.0 - (meta.y0 || 0) / mh;
      const vBot = 1.0 - ((meta.y0 || 0) + bh) / mh;
      const uvAttr = geo.attributes.uv;
      uvAttr.setXY(0, u0, vTop);
      uvAttr.setXY(1, u1, vTop);
      uvAttr.setXY(2, u0, vBot);
      uvAttr.setXY(3, u1, vBot);
      uvAttr.needsUpdate = true;

      const isKnockout = needsPaperKnockout(meta);
      const useAlpha = Boolean(meta.isCutout) || isKnockout;

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: null },
          uAlphaTest: { value: useAlpha ? 0.12 : 0.0 },
          uBright: { value: o.bright != null ? o.bright : 1.08 },
          uInnerShade: { value: new THREE.Vector3(0.58, 0.65, 0.78) },
        },
        vertexShader: VERT_SHADER,
        fragmentShader: FRAG_SHADER,
        side: THREE.DoubleSide,
        transparent: false,
        depthWrite: true,
      });
      mat.opacity = 1.0;

      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(1, 1, 1);
      mesh.visible = false;
      scene.add(mesh);

      const actor = {
        meta,
        mesh,
        mat,
        w: pw,
        h: ph,
        tStart,
        tEnd,
        behaviorFn,
        orientState: o.orientState || 'vertical',
        isOrbiter: Boolean(o.isOrbiter),
        isOpeningCard: Boolean(o.isOpeningCard),
        arenaId: o.arenaId || null,
        isKnockout,
        queued: false,
        imgReady: false,
        loaded: false,
        disposed: false,
        img: null,
        tex: null,
        tries: 0,
      };
      actors.push(actor);
      return actor;
    }

    function pumpFetchQueue() {
      while (inFlightFetches < MAX_CONCURRENT_FETCH && fetchQueue.length > 0) {
        const actor = fetchQueue.shift();
        if (!actor || actor.disposed || actor.imgReady || actor.loaded) continue;
        inFlightFetches++;
        const url = encodeUrl(actor.meta.src);
        const im = new Image();
        im.decoding = 'async';
        const done = (ok) => {
          inFlightFetches--;
          if (actor.disposed || destroyed) {
            pumpFetchQueue();
            return;
          }
          if (ok && im.naturalWidth > 0) {
            actor.img = im;
            actor.imgReady = true;
            uploadQueue.push(actor);
            const showForEdit = editModeActive && showAllModels && actor.arenaId != null;
            if (isFrozen || showForEdit || (active && lastRenderAge >= actor.tStart && lastRenderAge <= actor.tEnd)) {
              scheduleRerender();
            }
          } else if (actor.tries < 3) {
            actor.tries++;
            setTimeout(() => {
              if (!actor.disposed && !actor.imgReady && !destroyed) {
                fetchQueue.push(actor);
                pumpFetchQueue();
              }
            }, 180 * actor.tries);
          }
          pumpFetchQueue();
        };
        im.onload = () => done(true);
        im.onerror = () => done(false);
        const sep = url.indexOf('?') >= 0 ? '&' : '?';
        im.src = actor.tries > 0 ? (url + sep + '_r=' + actor.tries) : url;
      }
    }

    function enqueueActorFetch(actor, urgent) {
      if (!actor || actor.disposed || actor.queued || actor.imgReady || actor.loaded) return;
      actor.queued = true;
      if (urgent) fetchQueue.unshift(actor);
      else fetchQueue.push(actor);
      pumpFetchQueue();
    }

    function buildBoundedTexture(actor) {
      const im = actor.img;
      if (!im || !im.naturalWidth || !im.naturalHeight) return null;
      let texSource = im;
      const forceCanvas = actor.isKnockout || im.naturalWidth > maxGpuTexDim || im.naturalHeight > maxGpuTexDim;
      if (forceCanvas) {
        const m = actor.meta;
        const sx = clamp(m.x0 || 0, 0, im.naturalWidth - 1);
        const sy = clamp(m.y0 || 0, 0, im.naturalHeight - 1);
        const sw = clamp(m.bw || im.naturalWidth, 1, im.naturalWidth - sx);
        const sh = clamp(m.bh || im.naturalHeight, 1, im.naturalHeight - sy);
        const sc = Math.min(1, maxGpuTexDim / Math.max(sw, sh));
        const dw = Math.max(4, Math.round(sw * sc));
        const dh = Math.max(4, Math.round(sh * sc));
        const c = document.createElement('canvas');
        c.width = dw;
        c.height = dh;
        const g = c.getContext('2d', { willReadFrequently: actor.isKnockout });
        if (g) {
          g.imageSmoothingEnabled = true;
          g.imageSmoothingQuality = 'high';
          g.drawImage(im, sx, sy, sw, sh, 0, 0, dw, dh);
          if (actor.isKnockout) {
            const imgData = g.getImageData(0, 0, dw, dh);
            const px = imgData.data;
            for (let p = 0; p < px.length; p += 4) {
              const r = px[p], gr = px[p + 1], b = px[p + 2];
              const lum = 0.299 * r + 0.587 * gr + 0.114 * b;
              const ch = Math.max(r, gr, b) - Math.min(r, gr, b);
              if (lum > 188 && ch < 30) {
                px[p + 3] = 0;
              } else {
                const s = clamp(Math.round(255 - lum * 0.82), 96, 252);
                px[p] = s;
                px[p + 1] = clamp(s + 4, 0, 255);
                px[p + 2] = clamp(s + 10, 0, 255);
                px[p + 3] = (lum > 162 && ch < 30) ? Math.round(((188 - lum) / 26) * 255) : 255;
              }
            }
            g.putImageData(imgData, 0, 0);
          }
          texSource = c;
          const uvAttr = actor.mesh.geometry.attributes.uv;
          uvAttr.setXY(0, 0, 1);
          uvAttr.setXY(1, 1, 1);
          uvAttr.setXY(2, 0, 0);
          uvAttr.setXY(3, 1, 0);
          uvAttr.needsUpdate = true;
        }
      }
      const tex = new THREE.Texture(texSource);
      tex.anisotropy = maxAniso;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    }

    function uploadActorTexture(actor) {
      if (!actor || actor.disposed || actor.loaded || !actor.imgReady) return false;
      const tex = buildBoundedTexture(actor);
      if (!tex) return false;
      actor.loaded = true;
      actor.tex = tex;
      actor.mat.uniforms.uMap.value = tex;
      actor.img = null;
      activeTexCount++;
      return true;
    }

    function flushReadyUploads(age, maxLookaheadUploads) {
      if (uploadQueue.length === 0) return;
      let bgUploaded = 0;
      const showAll = editModeActive && showAllModels;
      for (let i = uploadQueue.length - 1; i >= 0; i--) {
        const a = uploadQueue[i];
        if (!a || a.disposed || a.loaded) {
          uploadQueue.splice(i, 1);
          continue;
        }
        const isOnScreen = (showAll && a.arenaId != null) || (age >= a.tStart - 0.3 && age <= a.tEnd);
        if (isOnScreen) {
          uploadActorTexture(a);
          uploadQueue.splice(i, 1);
        } else if (bgUploaded < maxLookaheadUploads) {
          if (uploadActorTexture(a)) bgUploaded++;
          uploadQueue.splice(i, 1);
        }
      }
    }

    function disposeActor(a) {
      if (!a || a.disposed) return;
      a.disposed = true;
      a.mesh.visible = false;
      scene.remove(a.mesh);
      if (a.tex) {
        a.tex.dispose();
        a.tex = null;
        activeTexCount = Math.max(0, activeTexCount - 1);
      }
      if (a.mesh.geometry) a.mesh.geometry.dispose();
      if (a.mat) a.mat.dispose();
      a.img = null;
      disposedCount++;
    }

    // =========================================================================
    // 4. TIMELINE & 8 ALWAYS-ON ARENAS (USING USER CHOREOGRAPHY DEFAULTS)
    // =========================================================================
    const T_MIC_CHECK = BAR * 1.0; // Exact first "Mic Check" downbeat (+2.376238s)

    const ARENA_SPECS = [
      { id: 'M1_whale', label: 'M1 巨鲸', glb: './items/lowpoly/鲸鱼/whale.glb', count: 58, orbitCount: 10, seed: 1101, tEnter: 2.676, tExit: 9.188, heroAge: 6.8, modelSpan: 28.0, orbitRadius: 33.0 },
      { id: 'M2_shark', label: 'M2 鲨鱼', glb: './items/lowpoly/鲨鱼/shark.glb', count: 56, orbitCount: 10, seed: 2202, tEnter: 14.200, tExit: 20.836, heroAge: 16.8, modelSpan: 28.0, orbitRadius: 32.0 },
      { id: 'M3_cat', label: 'M3 巨猫', glb: './items/lowpoly/猫/cat.glb', count: 58, orbitCount: 10, seed: 3303, tEnter: 12.200, tExit: 27.965, heroAge: 25.0, modelSpan: 26.5, orbitRadius: 36.5 },
      { id: 'M4_flamingo', label: 'M4 火烈鸟', glb: './items/lowpoly/火烈鸟/flamingo.glb', count: 54, orbitCount: 10, seed: 4404, tEnter: 30.003, tExit: 34.327, heroAge: 32.1, modelSpan: 27.5, orbitRadius: 38.0 },
      { id: 'M5_beermug', label: 'M5 啤酒杯', glb: './items/lowpoly/啤酒/beer-mug.glb', count: 52, orbitCount: 10, seed: 5505, tEnter: 36.390, tExit: 39.768, heroAge: 39.0, modelSpan: 24.5, orbitRadius: 33.5 },
      { id: 'M6_shuttlecock', label: 'M6 羽毛球', glb: './items/lowpoly/羽毛球/shuttlecock.glb', count: 52, orbitCount: 10, seed: 6606, tEnter: 44.766, tExit: 49.351, heroAge: 47.3, modelSpan: 25.5, orbitRadius: 33.0 },
      { id: 'M7_chain', label: 'M7 金属锁链', glb: './items/lowpoly/金属锁链/chain.glb', count: 42, orbitCount: 8, seed: 7707, tEnter: 52.019, tExit: 57.968, heroAge: 55.8, modelSpan: 29.0, orbitRadius: 33.0 },
      { id: 'FIN_rocket', label: 'FIN 照片火箭', glb: null, count: 40, orbitCount: 10, seed: 8808, tEnter: 59.815, tExit: 84.500, heroAge: 74.1, modelSpan: 30.0, orbitRadius: 42.0 },
    ];

    const WORLD_UP = new THREE.Vector3(0, 1, 0);
    const ARENAS = [];
    const arenaById = new Map();

    for (let i = 0; i < ARENA_SPECS.length; i++) {
      const sp = ARENA_SPECS[i];
      const defM = DEFAULT_CHOREO.models[sp.id];
      const centerVec = new THREE.Vector3(defM.center[0], defM.center[1], defM.center[2]);
      const rotArr = defM.rotDeg.slice();
      const quat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(deg(rotArr[0]), deg(rotArr[1]), deg(rotArr[2]), 'YXZ')
      );
      const arObj = {
        ...sp,
        index: i,
        defaultCenter: centerVec.clone(),
        liveCenter: centerVec.clone(),
        defaultRotDeg: rotArr.slice(),
        liveRotDeg: rotArr.slice(),
        liveQuat: quat,
        mainCards: [],
        orbitCards: [],
      };
      ARENAS.push(arObj);
      arenaById.set(arObj.id, arObj);
    }

    // =========================================================================
    // 5. STRICT {垂直 / 水平 / 斜45°} SNAP + KEYFRAMES & PERSISTENCE
    // =========================================================================
    const S45 = Math.SQRT1_2;
    const SNAP_DIRS = [
      { n: new THREE.Vector3(0, +1, 0), state: 'horizontal' },
      { n: new THREE.Vector3(0, -1, 0), state: 'horizontal' },
    ];
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const ca = Math.cos(a), sa = Math.sin(a);
      SNAP_DIRS.push({ n: new THREE.Vector3(ca, 0, sa), state: 'vertical' });
      SNAP_DIRS.push({ n: new THREE.Vector3(ca * S45, +S45, sa * S45), state: 'diag45' });
      SNAP_DIRS.push({ n: new THREE.Vector3(ca * S45, -S45, sa * S45), state: 'diag45' });
    }

    function snapNormalTo3States(rawN) {
      if (Math.abs(rawN.y) > 0.86) return SNAP_DIRS[rawN.y >= 0 ? 0 : 1];
      let best = SNAP_DIRS[2];
      let bestDot = -2;
      for (let i = 2; i < SNAP_DIRS.length; i++) {
        const dp = rawN.dot(SNAP_DIRS[i].n);
        if (dp > bestDot) {
          bestDot = dp;
          best = SNAP_DIRS[i];
        }
      }
      return best;
    }

    const _rotMat = new THREE.Matrix4();
    function quatFromSnappedNormal(snapped) {
      const Nvec = snapped.n;
      let Tvec;
      if (snapped.state === 'horizontal') {
        Tvec = new THREE.Vector3(1, 0, 0);
      } else {
        Tvec = new THREE.Vector3().crossVectors(WORLD_UP, Nvec).normalize();
      }
      const Bvec = new THREE.Vector3().crossVectors(Nvec, Tvec).normalize();
      _rotMat.makeBasis(Tvec, Bvec, Nvec);
      return new THREE.Quaternion().setFromRotationMatrix(_rotMat);
    }

    let kfSeq = 1;
    function cloneKeyframe(kf) {
      return {
        id: String(kf.id || ('kf_' + kfSeq++)),
        t: Number(kf.t),
        pos: [Number(kf.pos[0]), Number(kf.pos[1]), Number(kf.pos[2])],
        lookAt: [Number(kf.lookAt[0]), Number(kf.lookAt[1]), Number(kf.lookAt[2])],
        fov: clamp(Number(kf.fov || BASE_FOV), 22, 90),
        label: String(kf.label || 'Keyframe'),
      };
    }

    function buildDefaultKeyframes() {
      return DEFAULT_CHOREO.cameraKeyframes.map(cloneKeyframe).sort((a, b) => a.t - b.t);
    }

    let cameraKeyframes = buildDefaultKeyframes();

    function getCameraPose(age) {
      const kfs = cameraKeyframes;
      const pos = new THREE.Vector3(
        evalSplineScalar(kfs, age, (k) => k.pos[0]),
        evalSplineScalar(kfs, age, (k) => k.pos[1]),
        evalSplineScalar(kfs, age, (k) => k.pos[2])
      );
      const lookAt = new THREE.Vector3(
        evalSplineScalar(kfs, age, (k) => k.lookAt[0]),
        evalSplineScalar(kfs, age, (k) => k.lookAt[1]),
        evalSplineScalar(kfs, age, (k) => k.lookAt[2])
      );
      const fov = clamp(evalSplineScalar(kfs, age, (k) => k.fov), 22, 90);

      const fwd = lookAt.clone().sub(pos);
      if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
      else fwd.normalize();

      const right = new THREE.Vector3().crossVectors(fwd, WORLD_UP);
      if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
      else right.normalize();

      const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
      return { pos, lookAt, fwd, right, up, fov };
    }

    function updateCamera(age) {
      const p = getCameraPose(age);
      camera.fov = p.fov;
      camera.position.copy(p.pos);
      camera.up.copy(WORLD_UP);
      camera.lookAt(p.lookAt);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      return p;
    }

    function computeGuaranteedOffscreen(restPos, tTest, pw, ph, dirX, dirY) {
      const cp = getCameraPose(tTest);
      const rel = restPos.clone().sub(cp.pos);
      const depth = rel.dot(cp.fwd);
      const curX = rel.dot(cp.right);
      const curY = rel.dot(cp.up);
      const rad = Math.hypot(pw, ph) * 0.85 + 9.0;

      if (depth <= 0.5) {
        return cp.pos.clone()
          .addScaledVector(cp.fwd, -Math.max(12, rad + 6))
          .addScaledVector(cp.right, dirX * 18)
          .addScaledVector(cp.up, dirY * 10);
      }
      const safeA = Math.max(aspect, 2.58);
      const tanHalfV = Math.tan(deg(Math.max(cp.fov, 62) * 0.5));
      const halfH = depth * tanHalfV + rad;
      const halfW = depth * tanHalfV * safeA + rad;

      const alreadyOutX = Math.abs(curX) > halfW * 1.15;
      const alreadyOutY = Math.abs(curY) > halfH * 1.15;
      if (alreadyOutX || alreadyOutY) {
        return restPos.clone()
          .addScaledVector(cp.right, (curX >= 0 ? 1 : -1) * 9.0)
          .addScaledVector(cp.up, dirY * 5.0);
      }

      let targetX = curX;
      let targetY = curY;
      if (Math.abs(dirX) >= Math.abs(dirY)) {
        targetX = (dirX >= 0 ? 1 : -1) * (halfW * 1.15 + 4.0);
        targetY = curY + dirY * (halfH * 0.45);
      } else {
        targetY = (dirY >= 0 ? 1 : -1) * (halfH * 1.15 + 4.0);
        targetX = curX + dirX * (halfW * 0.35);
      }
      return cp.pos.clone()
        .addScaledVector(cp.fwd, depth)
        .addScaledVector(cp.right, targetX)
        .addScaledVector(cp.up, targetY);
    }

    function getChoreoState() {
      const models = {};
      for (let i = 0; i < ARENAS.length; i++) {
        const ar = ARENAS[i];
        models[ar.id] = {
          center: numArr3([ar.liveCenter.x, ar.liveCenter.y, ar.liveCenter.z]),
          rotDeg: numArr3(ar.liveRotDeg),
        };
      }
      return {
        version: 1,
        cameraKeyframes: cameraKeyframes.map(cloneKeyframe),
        models,
      };
    }

    function saveChoreoToStorage() {
      try {
        window.localStorage.setItem(CHOREO_STORAGE_KEY, JSON.stringify(getChoreoState()));
        return true;
      } catch (_) {
        return false;
      }
    }

    (function loadSavedChoreoOnInit() {
      try {
        const qs = new URLSearchParams(window.location.search);
        if (qs.get('default') === '1') return;
        const raw = window.localStorage.getItem(CHOREO_STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data || data.version !== 1) return;
        if (Array.isArray(data.cameraKeyframes) && data.cameraKeyframes.length >= 2) {
          cameraKeyframes = data.cameraKeyframes.map(cloneKeyframe).sort((a, b) => a.t - b.t);
        }
        if (data.models && typeof data.models === 'object') {
          for (let i = 0; i < ARENAS.length; i++) {
            const ar = ARENAS[i];
            const m = data.models[ar.id];
            if (!m) continue;
            if (Array.isArray(m.center) && m.center.length === 3 && m.center.every(Number.isFinite)) {
              ar.liveCenter.set(m.center[0], m.center[1], m.center[2]);
            }
            if (Array.isArray(m.rotDeg) && m.rotDeg.length === 3 && m.rotDeg.every(Number.isFinite)) {
              ar.liveRotDeg = m.rotDeg.map((v) => Number(v));
              ar.liveQuat.setFromEuler(
                new THREE.Euler(deg(ar.liveRotDeg[0]), deg(ar.liveRotDeg[1]), deg(ar.liveRotDeg[2]), 'YXZ')
              );
            }
          }
        }
      } catch (_) {}
    })();

    // =========================================================================
    // 6. GLB BINARY PARSER
    // =========================================================================
    async function parseGLB(url, spanMeters) {
      const resp = await fetch(encodeUrl(url), { cache: 'no-cache' });
      if (!resp.ok) throw new Error('GLB HTTP ' + resp.status + ' ' + url);
      const ab = await resp.arrayBuffer();
      const dv = new DataView(ab);
      const c0Len = dv.getUint32(12, true);
      const gltf = JSON.parse(new TextDecoder('utf-8').decode(new Uint8Array(ab, 20, c0Len)));
      const binOff = 20 + c0Len + 8;

      const TYPE_COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
      function readAcc(idx) {
        const acc = gltf.accessors[idx];
        const bv = gltf.bufferViews[acc.bufferView];
        const comp = TYPE_COMP[acc.type] || 1;
        const byteOff = binOff + (bv.byteOffset || 0) + (acc.byteOffset || 0);
        const ct = acc.componentType;
        const bpe = (ct === 5126 || ct === 5125) ? 4 : (ct === 5123 ? 2 : 1);
        const step = bv.byteStride || (comp * bpe);
        const out = new Float32Array(acc.count * comp);
        for (let i = 0; i < acc.count; i++) {
          const base = byteOff + i * step;
          for (let k = 0; k < comp; k++) {
            const p = base + k * bpe;
            if (ct === 5126) out[i * comp + k] = dv.getFloat32(p, true);
            else if (ct === 5125) out[i * comp + k] = dv.getUint32(p, true);
            else if (ct === 5123) out[i * comp + k] = dv.getUint16(p, true);
            else out[i * comp + k] = dv.getUint8(p);
          }
        }
        return out;
      }

      const nodes = gltf.nodes || [];
      const worldMats = nodes.map(() => new THREE.Matrix4());
      function walk(ni, pm) {
        const n = nodes[ni];
        const lm = new THREE.Matrix4();
        if (n.matrix) lm.fromArray(n.matrix);
        else {
          lm.compose(
            n.translation ? new THREE.Vector3(...n.translation) : new THREE.Vector3(),
            n.rotation ? new THREE.Quaternion(...n.rotation) : new THREE.Quaternion(),
            n.scale ? new THREE.Vector3(...n.scale) : new THREE.Vector3(1, 1, 1)
          );
        }
        worldMats[ni] = pm.clone().multiply(lm);
        if (Array.isArray(n.children)) n.children.forEach((c) => walk(c, worldMats[ni]));
      }
      const roots = (gltf.scenes && gltf.scenes[gltf.scene || 0] && gltf.scenes[gltf.scene || 0].nodes) || [0];
      roots.forEach((r) => walk(r, new THREE.Matrix4()));

      const tris = [];
      const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
      nodes.forEach((n, ni) => {
        if (n.mesh == null) return;
        const wm = worldMats[ni];
        (gltf.meshes[n.mesh].primitives || []).forEach((pr) => {
          if (!pr.attributes || pr.attributes.POSITION == null) return;
          const pos = readAcc(pr.attributes.POSITION);
          const idx = pr.indices != null ? readAcc(pr.indices) : null;
          const nt = idx ? Math.floor(idx.length / 3) : Math.floor(pos.length / 9);
          for (let t = 0; t < nt; t++) {
            const i0 = idx ? idx[t * 3] : t * 3;
            const i1 = idx ? idx[t * 3 + 1] : t * 3 + 1;
            const i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
            v[0].set(pos[i0 * 3], pos[i0 * 3 + 1], pos[i0 * 3 + 2]).applyMatrix4(wm);
            v[1].set(pos[i1 * 3], pos[i1 * 3 + 1], pos[i1 * 3 + 2]).applyMatrix4(wm);
            v[2].set(pos[i2 * 3], pos[i2 * 3 + 1], pos[i2 * 3 + 2]).applyMatrix4(wm);
            e1.subVectors(v[1], v[0]);
            e2.subVectors(v[2], v[0]);
            const cr = new THREE.Vector3().crossVectors(e1, e2);
            const area = cr.length() * 0.5;
            if (area < 1e-10) continue;
            tris.push({
              a: v[0].clone(), b: v[1].clone(), c: v[2].clone(),
              n: cr.normalize(),
              area,
              centroid: new THREE.Vector3().add(v[0]).add(v[1]).add(v[2]).multiplyScalar(1 / 3),
            });
          }
        });
      });

      const box = new THREE.Box3();
      tris.forEach((t) => { box.expandByPoint(t.a); box.expandByPoint(t.b); box.expandByPoint(t.c); });
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1e-5);
      const scale = spanMeters / maxDim;
      let totalArea = 0;
      tris.forEach((t) => {
        t.a.sub(center).multiplyScalar(scale);
        t.b.sub(center).multiplyScalar(scale);
        t.c.sub(center).multiplyScalar(scale);
        t.centroid.sub(center).multiplyScalar(scale);
        t.area *= scale * scale;
        totalArea += t.area;
      });
      return { tris, totalArea, normSize: size.clone().multiplyScalar(scale) };
    }

    // =========================================================================
    // 7. ALWAYS-ON HOLLOW RIGID-45° SCULPTURES + SLOW WIGGLE + BROWNIAN ORBITERS
    // =========================================================================
    const _tmpOrbLocal = new THREE.Vector3();
    const _tmpBrownian = new THREE.Vector3();
    const _tmpWorldN = new THREE.Vector3();
    const _tmpLivePos = new THREE.Vector3();
    const _tmpWig = new THREE.Vector3();
    const _tmpTarget = new THREE.Vector3();

    function evalOrbiterPos(sat, ar, age, outVec) {
      const theta = sat.theta0 + sat.omega * (age - T_MIC_CHECK);
      const r = sat.orbitR;
      const ox = Math.cos(theta) * r;
      const oz = Math.sin(theta) * r;
      const oy = sat.yBase + Math.sin(theta * 1.5 + sat.tiltPhase) * sat.tiltAmp;

      evalBrownian3D(age, sat.brownian, _tmpBrownian);
      _tmpOrbLocal.set(
        ox + _tmpBrownian.x,
        oy + _tmpBrownian.y,
        oz + _tmpBrownian.z
      );
      return outVec.copy(_tmpOrbLocal).applyQuaternion(ar.liveQuat).add(ar.liveCenter);
    }

    function updateArenaWorldCardPoses(ar, recomputeOffscreen) {
      for (let i = 0; i < ar.mainCards.length; i++) {
        const card = ar.mainCards[i];
        _tmpWorldN.copy(card.localRawN).applyQuaternion(ar.liveQuat).normalize();
        const snapped = snapNormalTo3States(_tmpWorldN);
        card.restQuat.copy(quatFromSnappedNormal(snapped));
        if (card.actor) card.actor.orientState = snapped.state;

        card.restPos
          .copy(card.localPos)
          .applyQuaternion(ar.liveQuat)
          .add(ar.liveCenter)
          .addScaledVector(snapped.n, card.relief);

        if (recomputeOffscreen) {
          card.inPos.copy(computeGuaranteedOffscreen(card.restPos, card.tStart, card.pw, card.ph, card.inDirX, card.inDirY));
        }
      }

      const _holdStartPos = new THREE.Vector3();
      for (let i = 0; i < ar.orbitCards.length; i++) {
        const sat = ar.orbitCards[i];
        _tmpWorldN.copy(sat.localRawN).applyQuaternion(ar.liveQuat).normalize();
        const snapped = snapNormalTo3States(_tmpWorldN);
        sat.restQuat.copy(quatFromSnappedNormal(snapped));
        if (sat.actor) sat.actor.orientState = snapped.state;

        if (recomputeOffscreen) {
          evalOrbiterPos(sat, ar, sat.tLock, _holdStartPos);
          sat.inPos.copy(computeGuaranteedOffscreen(_holdStartPos, sat.tStart, sat.pw, sat.ph, sat.inDirX, sat.inDirY));
        }
      }
    }

    function buildOrbiterListForArena(ar, orbiterItems, mRng, extraLiftFn) {
      for (let k = 0; k < orbiterItems.length; k++) {
        const meta = orbiterItems[k];
        const bw = Math.max(1, meta.bw || meta.w || 512);
        const bh = Math.max(1, meta.bh || meta.h || 512);
        const trueAr = bw / bh;

        const targetMax = lerp(1.45, 2.75, mRng());
        let pw, ph;
        if (trueAr >= 1) {
          pw = targetMax;
          ph = pw / trueAr;
        } else {
          ph = targetMax;
          pw = ph * trueAr;
        }

        const theta0 = (k / Math.max(1, orbiterItems.length)) * Math.PI * 2 + (mRng() - 0.5) * 0.45;
        const omega = (k % 2 === 0 ? 1 : -1) * (0.14 + mRng() * 0.14);
        const orbitR = ar.modelSpan * (0.37 + mRng() * 0.14);
        const yBase = (mRng() - 0.5) * ar.modelSpan * 0.46;
        const tiltAmp = 0.85 + mRng() * 1.25;
        const tiltPhase = mRng() * Math.PI * 2;
        const brownian = buildBrownianParams(mRng, 1.90 + mRng() * 0.65);

        const oa = ((k * 0.618034) % 1) * Math.PI * 2;
        const oy = k % 5 === 0 ? (mRng() > 0.5 ? 0.92 : -0.92) : ((mRng() - 0.5) * 1.3);
        const localRawN = new THREE.Vector3(Math.cos(oa), oy, Math.sin(oa)).normalize();
        const worldRawN = localRawN.clone().applyQuaternion(ar.liveQuat).normalize();
        const snapped = snapNormalTo3States(worldRawN);
        const restQuat = quatFromSnappedNormal(snapped);

        const waveIn = ((k * 0.618034) % 1);
        const tStart = T_MIC_CHECK + 0.06 + ar.index * 0.08 + waveIn * 0.45;
        const tLock = tStart + 1.05;
        const tEnd = 999.0; // Always ON permanently after Mic Check

        const sat = {
          pw, ph,
          theta0, omega, orbitR, yBase, tiltAmp, tiltPhase,
          brownian,
          localRawN,
          restQuat,
          tStart, tLock, tEnd,
          inDirX: k % 2 === 0 ? +1 : -1,
          inDirY: ((k % 3) - 1) * 0.5,
          inPos: new THREE.Vector3(),
          arcLiftIn: (k % 2 === 0 ? 1 : -1) * 2.2,
          actor: null,
        };

        const holdStart = evalOrbiterPos(sat, ar, tLock, new THREE.Vector3());
        sat.inPos.copy(computeGuaranteedOffscreen(holdStart, tStart, pw, ph, sat.inDirX, sat.inDirY));

        sat.actor = createRigidActor(meta, pw, ph, tStart, tEnd, (age, mesh) => {
          mesh.quaternion.copy(sat.restQuat);
          mesh.scale.set(1, 1, 1);
          evalOrbiterPos(sat, ar, age, _tmpLivePos);
          if (extraLiftFn) _tmpLivePos.y += extraLiftFn(age) * 0.35;
          if (editModeActive && showAllModels) {
            mesh.position.copy(_tmpLivePos);
            return;
          }
          if (age < sat.tLock) {
            const p = easeOutCubic((age - sat.tStart) / Math.max(0.05, sat.tLock - sat.tStart));
            mesh.position.lerpVectors(sat.inPos, _tmpLivePos, p);
            mesh.position.y += Math.sin(p * Math.PI) * sat.arcLiftIn;
          } else {
            mesh.position.copy(_tmpLivePos);
          }
        }, { bright: 1.15, orientState: snapped.state, isOrbiter: true, arenaId: ar.id });

        ar.orbitCards.push(sat);
      }
    }

    function buildHollowSculptureForArena(ar, model, items) {
      const { tris, totalArea } = model;
      const mRng = makeRng(ar.seed);
      if (!items || items.length === 0 || tris.length === 0) return;

      const wantOrbit = Math.min(ar.orbitCount || 0, Math.floor(items.length * 0.25));
      const cutouts = [];
      const solids = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].isCutout) cutouts.push(items[i]);
        else solids.push(items[i]);
      }

      const orbiterItems = [];
      while (orbiterItems.length < wantOrbit && cutouts.length > 0) orbiterItems.push(cutouts.shift());
      while (orbiterItems.length < wantOrbit && solids.length > 0) orbiterItems.push(solids.shift());
      const mainItems = cutouts.concat(solids);
      const N = mainItems.length;

      const cdf = new Float64Array(tris.length);
      let acc = 0;
      for (let i = 0; i < tris.length; i++) { acc += tris[i].area; cdf[i] = acc; }

      function sampleLocalPt() {
        const r = mRng() * acc;
        let lo = 0, hi = tris.length - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
        const tri = tris[lo];
        let u = mRng(), v = mRng();
        if (u + v > 1) { u = 1 - u; v = 1 - v; }
        const w = 1 - u - v;
        const pos = new THREE.Vector3(
          tri.a.x * w + tri.b.x * u + tri.c.x * v,
          tri.a.y * w + tri.b.y * u + tri.c.y * v,
          tri.a.z * w + tri.b.z * u + tri.c.z * v
        );
        const ext = pos.length() / (ar.modelSpan * 0.42);
        return { pos, n: tri.n, ext };
      }

      const numCand = 3200;
      const cands = Array.from({ length: numCand }, () => sampleLocalPt());

      const clusters = [];
      const cMinD = new Float32Array(numCand).fill(Infinity);
      for (let c = 0; c < 3; c++) {
        let idx = Math.floor(mRng() * numCand);
        if (c > 0) {
          let bestS = -1;
          for (let t = 0; t < 24; t++) {
            const ci = Math.floor(mRng() * numCand);
            const sc = Math.sqrt(cMinD[ci]) * (0.45 + mRng());
            if (sc > bestS) { bestS = sc; idx = ci; }
          }
        }
        const pt = cands[idx].pos;
        for (let j = 0; j < numCand; j++) {
          const d2 = cands[j].pos.distanceToSquared(pt);
          if (d2 < cMinD[j]) cMinD[j] = d2;
        }
        clusters.push({ pos: pt, radius: 4.2 + mRng() * 3.8, str: 0.85 + mRng() * 0.65 });
      }

      function densAt(p) {
        let s = 0;
        for (let c = 0; c < clusters.length; c++) {
          const d = p.distanceTo(clusters[c].pos);
          s += clusters[c].str * Math.exp(-(d * d) / (2 * clusters[c].radius * clusters[c].radius));
        }
        return s;
      }

      const baseScale = Math.sqrt(totalArea / Math.max(1, N)) * 0.60;
      const backboneN = Math.round(N * 0.65);
      const placements = [];
      const spMinD = new Float32Array(numCand).fill(Infinity);

      for (let k = 0; k < backboneN; k++) {
        let bi = Math.floor(mRng() * numCand), bs = -1;
        for (let t = 0; t < 22; t++) {
          const ci = Math.floor(mRng() * numCand);
          const dTerm = k === 0 ? 1.0 : Math.min(11.5, Math.sqrt(spMinD[ci]));
          const extBoost = 0.70 + Math.min(1.8, cands[ci].ext) * 0.90;
          const sc = dTerm * extBoost * (0.45 + 1.15 * mRng());
          if (sc > bs) { bs = sc; bi = ci; }
        }
        const site = cands[bi];
        for (let j = 0; j < numCand; j++) {
          const d2 = cands[j].pos.distanceToSquared(site.pos);
          if (d2 < spMinD[j]) spMinD[j] = d2;
        }
        const r = mRng();
        const mult = r < 0.22 ? (1.42 + mRng() * 0.53) : (r < 0.65 ? (0.88 + mRng() * 0.44) : (0.50 + mRng() * 0.32));
        placements.push({
          site, mult,
          relief: 0.05 + mRng() * 0.52,
          bright: r < 0.22 ? 1.16 : 1.06,
          isPrimary: true,
        });
      }

      for (let k = 0; k < N - backboneN; k++) {
        let bc = cands[0], bs = -1;
        for (let t = 0; t < 24; t++) {
          const c = cands[Math.floor(mRng() * numCand)];
          const sc = (0.04 + Math.pow(densAt(c.pos), 2.15)) * (0.35 + 1.3 * mRng());
          if (sc > bs) { bs = sc; bc = c; }
        }
        const r = mRng();
        const mult = r < 0.20 ? (1.45 + mRng() * 0.50) : (r < 0.55 ? (0.85 + mRng() * 0.45) : (0.45 + mRng() * 0.35));
        placements.push({
          site: bc, mult,
          relief: 0.04 + mRng() * 0.72,
          bright: r < 0.20 ? 1.18 : 1.04,
          isPrimary: false,
        });
      }

      const isFirstModel = ar.index === 0;

      for (let i = 0; i < N; i++) {
        const pl = placements[i];
        const site = pl.site;
        const meta = mainItems[i];
        const bw = Math.max(1, meta.bw || meta.w || 512);
        const bh = Math.max(1, meta.bh || meta.h || 512);
        const trueAr = bw / bh;

        const area = Math.pow(baseScale * pl.mult, 2) * (meta.isCutout ? 1.18 : 1.0);
        let pw = Math.sqrt(area * trueAr);
        let ph = pw / trueAr;
        const maxEdge = 6.4;
        const longest = Math.max(pw, ph);
        if (longest > maxEdge) {
          const kDown = maxEdge / longest;
          pw *= kDown;
          ph *= kDown;
        }
        const minEdge = 1.70;
        const shortest = Math.min(pw, ph);
        if (shortest < minEdge && longest < 5.8) {
          const kUp = Math.min(minEdge / shortest, 5.8 / longest);
          pw *= kUp;
          ph *= kUp;
        }

        const smoothN = new THREE.Vector3();
        for (let t = 0; t < tris.length; t++) {
          const tr = tris[t];
          if (tr.n.dot(site.n) < 0.18) continue;
          const d2 = tr.centroid.distanceToSquared(site.pos);
          if (d2 <= 8.5) smoothN.addScaledVector(tr.n, tr.area / (0.25 + d2));
        }
        const localRawN = smoothN.lengthSq() > 1e-6 ? smoothN.normalize() : site.n.clone().normalize();
        const worldRawN = localRawN.clone().applyQuaternion(ar.liveQuat).normalize();
        const snapped = snapNormalTo3States(worldRawN);
        const restQuat = quatFromSnappedNormal(snapped);
        const restPos = site.pos.clone().applyQuaternion(ar.liveQuat).add(ar.liveCenter).addScaledVector(snapped.n, pl.relief);

        // ZERO models before T_MIC_CHECK; smooth staggered entry right at T_MIC_CHECK (2.376s), then ALWAYS ON!
        const wave = ((i * 0.618034) % 1);
        const tStart = isFirstModel
          ? (T_MIC_CHECK + (i % 8) * 0.035)
          : (T_MIC_CHECK + 0.08 + ar.index * 0.06 + wave * 0.42);
        const tLock = tStart + (isFirstModel ? 0.85 : 1.05) + (i % 3) * 0.10;
        const tEnd = 999.0;

        const cpMid = getCameraPose(ar.heroAge);
        const relMid = restPos.clone().sub(cpMid.pos);
        const rx = relMid.dot(cpMid.right);
        const ry = relMid.dot(cpMid.up);
        const inDirX = Math.abs(rx) >= Math.abs(ry) * 1.1 ? (rx >= 0 ? 1 : -1) : ((i % 2 === 0 ? 1 : -1) * 0.45);
        const inDirY = Math.abs(rx) >= Math.abs(ry) * 1.1 ? ((i % 3 - 1) * 0.35) : (ry >= 0 ? 1 : -1);

        const wiggle = buildSlowWiggleParams(mRng, 0.28 + mRng() * 0.24);

        const card = {
          localPos: site.pos.clone(),
          localRawN,
          relief: pl.relief,
          pw, ph,
          tStart, tLock, tEnd,
          inDirX, inDirY,
          wiggle,
          restPos,
          restQuat,
          inPos: computeGuaranteedOffscreen(restPos, tStart, pw, ph, inDirX, inDirY),
          arcLiftIn: (i % 2 === 0 ? 1 : -1) * (2.5 + (i % 4) * 1.2),
          actor: null,
        };

        card.actor = createRigidActor(meta, pw, ph, tStart, tEnd, (age, mesh) => {
          mesh.quaternion.copy(card.restQuat);
          mesh.scale.set(1, 1, 1);
          evalSlowWiggle3D(age, card.wiggle, _tmpWig);
          _tmpTarget.copy(card.restPos).add(_tmpWig);

          if (editModeActive && showAllModels) {
            mesh.position.copy(_tmpTarget);
            return;
          }
          if (age < card.tLock) {
            const p = easeOutCubic((age - card.tStart) / Math.max(0.05, card.tLock - card.tStart));
            mesh.position.lerpVectors(card.inPos, _tmpTarget, p);
            mesh.position.y += Math.sin(p * Math.PI) * card.arcLiftIn;
          } else {
            mesh.position.copy(_tmpTarget);
          }
        }, { bright: pl.bright, orientState: snapped.state, arenaId: ar.id });

        ar.mainCards.push(card);
      }

      buildOrbiterListForArena(ar, orbiterItems, mRng, null);
    }

    // =========================================================================
    // 8. BAR 17 RIGHT-TO-LEFT 4-BEAT OPENING + ALWAYS-ON FINALE PHOTO-ROCKET
    // =========================================================================
    const openingItems = takeBatch(4);
    const modelBatches = ARENAS.slice(0, 7).map((ar) => takeBatch(ar.count));

    const rocketTipMeta = takeExact('./items/city/冷却塔/008.png');
    const nozzleLeftMeta = takeExact('./items/city/冷却塔/003.png');
    const nozzleCenterMeta = takeExact('./items/city/冷却塔/005.png');
    const nozzleRightMeta = takeExact('./items/city/冷却塔/007.png');
    reservedSrcs.clear();
    const rocketRestItems = [];
    while (true) {
      const m = takeNextUnique();
      if (!m) break;
      rocketRestItems.push(m);
    }

    // 8A. Opening Bar 17: 4 images spread from Right -> Left, switching off one per beat
    //     until the 4th beat / first "Mic Check" (T_MIC_CHECK = 2.376s) glides cleanly into the models!
    const openingEntries = [];
    const cpOpen = getCameraPose(0);
    const openSnapped = snapNormalTo3States(cpOpen.fwd.clone().negate());
    const openQuat = quatFromSnappedNormal(openSnapped);
    const OPEN_SLOTS = [
      { rx: +11.4, ry: +0.55 }, // Beat 1: Rightmost
      { rx:  +3.8, ry: -0.45 }, // Beat 2: Mid-Right
      { rx:  -3.8, ry: +0.45 }, // Beat 3: Mid-Left
      { rx: -11.4, ry: -0.35 }, // Beat 4: Leftmost -> transitions into models at Mic Check!
    ];

    for (let i = 0; i < openingItems.length; i++) {
      const meta = openingItems[i];
      const bw = Math.max(1, meta.bw || meta.w || 512);
      const bh = Math.max(1, meta.bh || meta.h || 512);
      const trueAr = bw / bh;
      let ph = 6.6;
      let pw = ph * trueAr;
      const maxW = 6.2;
      const maxH = 7.4;
      if (pw > maxW) { const k = maxW / pw; pw *= k; ph *= k; }
      if (ph > maxH) { const k = maxH / ph; pw *= k; ph *= k; }

      const slot = OPEN_SLOTS[i] || OPEN_SLOTS[OPEN_SLOTS.length - 1];
      const basePos = cpOpen.pos.clone()
        .addScaledVector(cpOpen.fwd, 23.0)
        .addScaledVector(cpOpen.right, slot.rx)
        .addScaledVector(cpOpen.up, slot.ry);

      const tStart = 0.0;
      const isLastSlot = i === openingItems.length - 1;
      const tHoldEnd = isLastSlot ? T_MIC_CHECK : BEAT * (i + 1);
      const tEnd = isLastSlot ? (T_MIC_CHECK + 0.78) : BEAT * (i + 1);
      const outPos = isLastSlot
        ? computeGuaranteedOffscreen(basePos, tEnd, pw, ph, -1, 0)
        : null;
      const wiggle = buildSlowWiggleParams(makeRng(9001 + i * 73), 0.22);

      const entry = {
        idx: i,
        basePos,
        outPos,
        tStart,
        tHoldEnd,
        tEnd,
        isLastSlot,
        wiggle,
        actor: null,
      };
      entry.actor = createRigidActor(meta, pw, ph, tStart, tEnd, (age, mesh) => {
        mesh.quaternion.copy(openQuat);
        mesh.scale.set(1, 1, 1);
        evalSlowWiggle3D(age, entry.wiggle, _tmpWig);
        _tmpTarget.copy(entry.basePos).add(_tmpWig);
        if (entry.isLastSlot && age > entry.tHoldEnd) {
          const p = easeInCubic((age - entry.tHoldEnd) / Math.max(0.05, entry.tEnd - entry.tHoldEnd));
          mesh.position.lerpVectors(_tmpTarget, entry.outPos, p);
        } else {
          mesh.position.copy(_tmpTarget);
        }
      }, { bright: 1.15, orientState: openSnapped.state, isOpeningCard: true, arenaId: null });
      openingEntries.push(entry);
    }

    // 8B. Always-On Finale Rocket (30 main pieces + 10 slow-Brownian orbiters = 40)
    const finArena = ARENAS[7];
    const finBasis = {
      anchor: finArena.liveCenter.clone(),
      right: new THREE.Vector3(1, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      fwd: new THREE.Vector3(0, 0, -1),
      baseQuat: new THREE.Quaternion(),
      diagL: new THREE.Quaternion(),
      diagR: new THREE.Quaternion(),
      baseState: 'vertical',
    };
    const finPieces = [];

    function rocketLiftY(age) {
      if (age <= 75.0) return 0;
      const u = clamp((age - 75.0) / 10.5, 0, 1);
      return 92.0 * Math.pow(u, 3.6);
    }

    function updateFinaleRocketWorldPoses(recomputeOffscreen) {
      finBasis.anchor.copy(finArena.liveCenter);
      const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(finArena.liveQuat).normalize();
      const snapped = snapNormalTo3States(localZ);
      finBasis.baseState = snapped.state;
      finBasis.baseQuat.copy(quatFromSnappedNormal(snapped));
      finBasis.diagL.copy(finBasis.baseQuat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), +Math.PI / 4));
      finBasis.diagR.copy(finBasis.baseQuat).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 4));
      finBasis.right.set(1, 0, 0).applyQuaternion(finBasis.baseQuat).normalize();
      finBasis.up.set(0, 1, 0).applyQuaternion(finBasis.baseQuat).normalize();
      finBasis.fwd.set(0, 0, -1).applyQuaternion(finBasis.baseQuat).normalize();

      for (let i = 0; i < finPieces.length; i++) {
        const fp = finPieces[i];
        if (fp.actor && !fp.diagSide) fp.actor.orientState = finBasis.baseState;
        if (recomputeOffscreen) {
          const restAtHover = finBasis.anchor.clone()
            .addScaledVector(finBasis.right, fp.relX)
            .addScaledVector(finBasis.up, fp.relY)
            .addScaledVector(finBasis.fwd, fp.relZ);
          fp.inPos.copy(computeGuaranteedOffscreen(restAtHover, fp.tStart, fp.pw, fp.ph, fp.spreadX >= 0 ? 1 : -1, -1));
        }
      }

      const _holdStartPos = new THREE.Vector3();
      for (let i = 0; i < finArena.orbitCards.length; i++) {
        const sat = finArena.orbitCards[i];
        _tmpWorldN.copy(sat.localRawN).applyQuaternion(finArena.liveQuat).normalize();
        const sn = snapNormalTo3States(_tmpWorldN);
        sat.restQuat.copy(quatFromSnappedNormal(sn));
        if (sat.actor) sat.actor.orientState = sn.state;
        if (recomputeOffscreen) {
          evalOrbiterPos(sat, finArena, sat.tLock, _holdStartPos);
          sat.inPos.copy(computeGuaranteedOffscreen(_holdStartPos, sat.tStart, sat.pw, sat.ph, sat.inDirX, sat.inDirY));
        }
      }
    }

    updateFinaleRocketWorldPoses(false);

    // Split rocketRestItems into 10 slow-Brownian orbiters (cutouts first) & 26 main body parts
    const finCutouts = [];
    const finSolids = [];
    for (let i = 0; i < rocketRestItems.length; i++) {
      if (rocketRestItems[i].isCutout) finCutouts.push(rocketRestItems[i]);
      else finSolids.push(rocketRestItems[i]);
    }
    const finOrbitItems = [];
    while (finOrbitItems.length < 10 && finCutouts.length > 0) finOrbitItems.push(finCutouts.shift());
    while (finOrbitItems.length < 10 && finSolids.length > 0) finOrbitItems.push(finSolids.shift());
    const phaseBItems = finCutouts.concat(finSolids);

    const finRng = makeRng(finArena.seed);
    function addRocketPiece(meta, targetH, optsPart) {
      if (!meta) return null;
      const bw = Math.max(1, meta.bw || meta.w || 512);
      const bh = Math.max(1, meta.bh || meta.h || 512);
      const trueAr = bw / bh;
      let ph = targetH;
      let pw = ph * trueAr;
      const maxEdge = optsPart.maxEdge || 8.6;
      const lg = Math.max(pw, ph);
      if (lg > maxEdge) { const k = maxEdge / lg; pw *= k; ph *= k; }

      const idxOrd = finPieces.length;
      const tStart = T_MIC_CHECK + 0.35 + (idxOrd % 12) * 0.035;
      const tLock = tStart + 1.15;
      const tEnd = 999.0; // Always ON permanently
      const relX = optsPart.relX || 0;
      const relY = optsPart.relY || 0;
      const relZ = optsPart.relZ || 0;
      const spreadX = optsPart.spreadX || 0;
      const diagSide = optsPart.diagSide || 0;
      const oState = diagSide ? 'diag45' : finBasis.baseState;

      const restAtHover = finBasis.anchor.clone()
        .addScaledVector(finBasis.right, relX)
        .addScaledVector(finBasis.up, relY)
        .addScaledVector(finBasis.fwd, relZ);

      const fp = {
        pw, ph, tStart, tLock, tEnd, relX, relY, relZ, spreadX, diagSide,
        inPos: computeGuaranteedOffscreen(restAtHover, tStart, pw, ph, spreadX >= 0 ? 1 : -1, -1),
        wiggle: buildSlowWiggleParams(finRng, 0.24 + finRng() * 0.20),
        actor: null,
      };
      finPieces.push(fp);

      fp.actor = createRigidActor(meta, pw, ph, tStart, tEnd, (age, mesh) => {
        const qTarget = diagSide === -1 ? finBasis.diagL
          : (diagSide === +1 ? finBasis.diagR : finBasis.baseQuat);
        mesh.quaternion.copy(qTarget);
        mesh.scale.set(1, 1, 1);

        const lift = (editModeActive && showAllModels) ? 0 : rocketLiftY(age);
        evalSlowWiggle3D(age, fp.wiggle, _tmpWig);
        _tmpTarget.copy(finBasis.anchor)
          .addScaledVector(finBasis.right, relX)
          .addScaledVector(finBasis.up, relY + lift)
          .addScaledVector(finBasis.fwd, relZ)
          .add(_tmpWig);

        if (editModeActive && showAllModels) {
          mesh.position.copy(_tmpTarget);
          return;
        }
        if (age < fp.tLock) {
          const p = easeOutCubic((age - fp.tStart) / Math.max(0.05, fp.tLock - fp.tStart));
          mesh.position.lerpVectors(fp.inPos, _tmpTarget, p);
        } else {
          mesh.position.copy(_tmpTarget);
        }
      }, { bright: optsPart.bright || 1.12, orientState: oState, arenaId: finArena.id });

      return fp.actor;
    }

    if (rocketTipMeta) {
      addRocketPiece(rocketTipMeta, 9.2, {
        relX: 0, relY: +15.0, relZ: -0.6, spreadX: 0, maxEdge: 9.2, bright: 1.18,
      });
    }

    let rPtr = 0;
    const takeR = () => (rPtr < phaseBItems.length ? phaseBItems[rPtr++] : null);

    const noseL = [{ y: +11.0, h: 4.8, m: 5.4 }, { y: +8.0, h: 5.4, m: 7.4 }, { y: +4.8, h: 5.8, m: 8.8 }];
    for (let i = 0; i < noseL.length; i++) {
      const m = takeR(); if (!m) break;
      addRocketPiece(m, noseL[i].h, {
        relX: 0, relY: noseL[i].y, relZ: -0.3 + i * 0.15,
        spreadX: (i % 2 === 0 ? -1 : 1) * 18, maxEdge: noseL[i].m, bright: 1.16,
      });
    }

    const fuseN = 7;
    for (let i = 0; i < fuseN; i++) {
      const m = takeR(); if (!m) break;
      const f = i / Math.max(1, fuseN - 1);
      const isCenter = i % 3 === 0;
      const side = i % 2 === 0 ? -1 : +1;
      addRocketPiece(m, 5.8, {
        relX: isCenter ? 0 : side * lerp(1.6, 2.8, f),
        relY: lerp(+2.8, -6.8, f),
        relZ: (i % 3) * 0.35,
        spreadX: side * 24,
        maxEdge: isCenter ? 9.0 : 7.4, bright: isCenter ? 1.14 : 1.06,
      });
    }

    [
      { meta: nozzleLeftMeta,   x: -5.0, y: -9.8,  z: +0.5, sx: -34, b: 1.12 },
      { meta: nozzleCenterMeta, x:  0.0, y: -10.4, z:  0.0, sx:   0, b: 1.18 },
      { meta: nozzleRightMeta,  x: +5.0, y: -9.8,  z: +0.5, sx: +34, b: 1.12 },
    ].forEach((nz) => {
      if (!nz.meta) return;
      addRocketPiece(nz.meta, 8.2, {
        relX: nz.x, relY: nz.y, relZ: nz.z,
        spreadX: nz.sx, maxEdge: 8.6, bright: nz.b,
      });
    });

    const remR = phaseBItems.length - rPtr;
    const plumeN = Math.min(4, Math.max(2, remR - 12));
    const wingPairs = Math.floor(Math.max(0, remR - plumeN) / 2);
    for (let p = 0; p < wingPairs; p++) {
      const f = p / Math.max(1, wingPairs - 1);
      const spanX = lerp(5.0, 14.2, Math.pow(f, 0.92));
      const relY = lerp(+3.2, -9.2, f);
      for (let s = 0; s < 2; s++) {
        const m = takeR(); if (!m) break;
        const side = s === 0 ? -1 : +1;
        addRocketPiece(m, lerp(5.2, 7.2, f), {
          relX: side * spanX, relY, relZ: +0.9 + f * 1.4,
          spreadX: side * 56,
          diagSide: side,
          maxEdge: 8.2, bright: 1.08,
        });
      }
    }

    const plumeList = phaseBItems.slice(rPtr);
    for (let i = 0; i < plumeList.length; i++) {
      const m = plumeList[i];
      const f = i / Math.max(1, plumeList.length - 1);
      const side = (i % 3) - 1;
      addRocketPiece(m, 4.4 + (1 - f) * 1.4, {
        relX: side * (3.2 - f * 1.0),
        relY: -12.4 - f * 2.4,
        relZ: +1.4,
        spreadX: side * 24,
        maxEdge: 6.0, bright: 1.15,
      });
    }

    buildOrbiterListForArena(finArena, finOrbitItems, finRng, rocketLiftY);

    // =========================================================================
    // 9. ASYNC LOAD ALL 7 GLBs, BUILD SCULPTURES, AUDIT & MOTION HOOKS
    // =========================================================================
    function countNonActorSceneChildren() {
      let lines = 0;
      let nonMesh = 0;
      for (let i = 0; i < scene.children.length; i++) {
        const c = scene.children[i];
        if (!c.isMesh) nonMesh++;
        if (c.isLine || c.isLineSegments) lines++;
      }
      return { lines, nonMesh };
    }

    function finalizeAuditAndSort() {
      actorsByStart = actors.slice().sort((a, b) => a.tStart - b.tStart);
      const orientStats = { vertical: 0, horizontal: 0, diag45: 0 };
      const spawnedSrcs = [];
      let brownianOrbiterCount = 0;
      let openingCardCount = 0;
      let alwaysOnModelActors = 0;
      let knockoutCount = 0;
      for (let i = 0; i < actors.length; i++) {
        const a = actors[i];
        spawnedSrcs.push(a.meta.src);
        orientStats[a.orientState] = (orientStats[a.orientState] || 0) + 1;
        if (a.isOrbiter) brownianOrbiterCount++;
        if (a.isOpeningCard) openingCardCount++;
        if (a.arenaId != null) alwaysOnModelActors++;
        if (a.isKnockout) knockoutCount++;
      }
      const uniqueSet = new Set(spawnedSrcs);
      const sc = countNonActorSceneChildren();
      window.__MIC_CHECK_PART2_AUDIT__ = {
        totalPoolSize: rawPool.length,
        totalSpawned: actors.length,
        uniqueCount: uniqueSet.size,
        duplicates: actors.length - uniqueSet.size,
        openingCardCount,
        brownianOrbiterCount,
        alwaysOnModelActors,
        sceneNonMeshChildren: sc.nonMesh,
        sceneLineChildren: sc.lines,
        hasFog: Boolean(scene.fog),
        knockoutCount,
        orientStats,
        sculpturesReady,
      };
      window.__MIC_CHECK_PART2_READY__ = sculpturesReady;
    }

    window.__MIC_CHECK_PART2_READY__ = false;

    Promise.all(
      ARENAS.slice(0, 7).map((ar) =>
        parseGLB(ar.glb, ar.modelSpan).catch((err) => {
          console.warn('[mic-check-sketch3d] GLB load fallback:', ar.glb, err);
          return null;
        })
      )
    ).then((models) => {
      if (destroyed) return;
      for (let i = 0; i < 7; i++) {
        if (models[i]) {
          buildHollowSculptureForArena(ARENAS[i], models[i], modelBatches[i]);
        }
      }
      sculpturesReady = true;
      finalizeAuditAndSort();
      if (lastRenderAge >= 0) {
        preloadAll();
        scheduleRerender();
      } else {
        preloadAll();
      }
    });

    finalizeAuditAndSort();

    window.__MIC_CHECK_PART2_INSPECT_ACTORS__ = () => {
      const results = [];
      const corners = [
        new THREE.Vector3(), new THREE.Vector3(),
        new THREE.Vector3(), new THREE.Vector3(),
      ];
      const testAt = (a, testAge) => {
        updateCamera(testAge);
        const invCam = new THREE.Matrix4().copy(camera.matrixWorld).invert();
        a.behaviorFn(testAge, a.mesh);
        a.mesh.updateMatrixWorld(true);
        const scaleOk = (
          Math.abs(a.mesh.scale.x - 1) < 1e-6 &&
          Math.abs(a.mesh.scale.y - 1) < 1e-6 &&
          Math.abs(a.mesh.scale.z - 1) < 1e-6
        );
        const hw = a.w * 0.5;
        const hh = a.h * 0.5;
        corners[0].set(-hw, +hh, 0);
        corners[1].set(+hw, +hh, 0);
        corners[2].set(-hw, -hh, 0);
        corners[3].set(+hw, -hh, 0);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let allBehindCam = true;
        let anyInFront = false;
        for (let c = 0; c < 4; c++) {
          corners[c].applyMatrix4(a.mesh.matrixWorld);
          const camPt = corners[c].clone().applyMatrix4(invCam);
          if (camPt.z < -0.25) {
            allBehindCam = false;
            anyInFront = true;
          }
          corners[c].project(camera);
          if (camPt.z < -0.05) {
            if (corners[c].x < minX) minX = corners[c].x;
            if (corners[c].x > maxX) maxX = corners[c].x;
            if (corners[c].y < minY) minY = corners[c].y;
            if (corners[c].y > maxY) maxY = corners[c].y;
          }
        }
        const outside = allBehindCam || !anyInFront || maxX < -1.0 || minX > 1.0 || maxY < -1.0 || minY > 1.0;
        return { outside, scaleOk, minX, maxX, minY, maxY };
      };

      for (let i = 0; i < actors.length; i++) {
        const a = actors[i];
        const sCheck = testAt(a, a.tStart);
        results.push({
          idx: i,
          src: a.meta.src,
          tStart: Number(a.tStart.toFixed(2)),
          tEnd: Number(a.tEnd.toFixed(2)),
          orientState: a.orientState,
          isOrbiter: Boolean(a.isOrbiter),
          isOpeningCard: Boolean(a.isOpeningCard),
          arenaId: a.arenaId || null,
          opacity: a.mat.opacity,
          scaleAlwaysOne: sCheck.scaleOk,
          startOutside: sCheck.outside,
          startBounds: sCheck,
        });
      }
      if (lastRenderAge >= 0) updateCamera(lastRenderAge);
      return results;
    };

    window.__MIC_CHECK_PART2_INSPECT_MOTION__ = () => {
      // 1. Opening 4 beats check: ZERO models visible, R->L card progression
      const beatAges = [0.25, 0.85, 1.45, 2.05];
      const openingBeats = [];
      for (let b = 0; b < beatAges.length; b++) {
        const age = beatAges[b];
        updateCamera(age);
        let modelVis = 0;
        let openVis = 0;
        const xs = [];
        for (let i = 0; i < actors.length; i++) {
          const a = actors[i];
          if (age < a.tStart || age > a.tEnd) continue;
          if (a.arenaId != null) modelVis++;
          if (a.isOpeningCard) {
            openVis++;
            a.behaviorFn(age, a.mesh);
            const p = a.mesh.position.clone().project(camera);
            xs.push(Number(p.x.toFixed(3)));
          }
        }
        xs.sort((a, c) => c - a);
        openingBeats.push({ age, modelVis, openVis, ndcXsDesc: xs });
      }

      // 2. Always-ON & Never-Static wiggle check across ALL 416 actors
      let wiggleMovingCount = 0;
      let maxWiggleJump = 0;
      let minWiggleMove = Infinity;
      const pA = new THREE.Vector3();
      const pB = new THREE.Vector3();
      for (let i = 0; i < actors.length; i++) {
        const a = actors[i];
        const t1 = a.isOpeningCard ? (i * BEAT + 0.08) : 20.0;
        const t2 = t1 + 0.45;
        a.behaviorFn(t1, a.mesh);
        pA.copy(a.mesh.position);
        a.behaviorFn(t2, a.mesh);
        pB.copy(a.mesh.position);
        const dist = pA.distanceTo(pB);
        if (dist > 0.008) wiggleMovingCount++;
        if (dist < minWiggleMove) minWiggleMove = dist;
        if (dist > maxWiggleJump) maxWiggleJump = dist;
      }

      // 3. Brownian Orbiters 3D non-collinear check
      let totalOrbiters = 0;
      let nonCollinearCount = 0;
      for (let i = 0; i < ARENAS.length; i++) {
        const ar = ARENAS[i];
        for (let k = 0; k < ar.orbitCards.length; k++) {
          const sat = ar.orbitCards[k];
          totalOrbiters++;
          const pts = [];
          for (let s = 0; s < 5; s++) {
            pts.push(evalOrbiterPos(sat, ar, 20.0 + s * 0.25, new THREE.Vector3()));
          }
          const dirs = [];
          for (let j = 1; j < pts.length; j++) {
            const diff = pts[j].clone().sub(pts[j - 1]);
            if (diff.length() > 1e-5) dirs.push(diff.normalize());
          }
          let maxTurn = 0;
          for (let j = 1; j < dirs.length; j++) {
            const turn = 1 - clamp(dirs[j].dot(dirs[j - 1]), -1, 1);
            if (turn > maxTurn) maxTurn = turn;
          }
          if (maxTurn > 0.0015) nonCollinearCount++;
        }
      }

      // 4. Always-ON count check across mid-sequence ages
      const alwaysOnCounts = {};
      [6.8, 25.0, 52.0, 74.1].forEach((tTest) => {
        let cnt = 0;
        for (let i = 0; i < actors.length; i++) {
          const a = actors[i];
          if (a.arenaId != null && !a.disposed && tTest >= a.tStart && tTest <= a.tEnd) cnt++;
        }
        alwaysOnCounts['age_' + tTest] = cnt;
      });

      if (lastRenderAge >= 0) updateCamera(lastRenderAge);

      return {
        openingBeats,
        wiggleMovingCount,
        minWiggleMove: Number(minWiggleMove.toFixed(4)),
        maxWiggleJump: Number(maxWiggleJump.toFixed(4)),
        totalOrbiters,
        nonCollinearCount,
        alwaysOnCounts,
      };
    };

    // =========================================================================
    // 10. RENDER LOOP & EDITOR API
    // =========================================================================
    function preloadAll() {
      for (let i = 0; i < actorsByStart.length; i++) {
        const a = actorsByStart[i];
        if (!a.disposed && !a.queued && !a.imgReady && !a.loaded) {
          enqueueActorFetch(a, false);
        }
      }
    }

    function renderAtAge(age) {
      lastRenderAge = age;
      preloadAll();
      flushReadyUploads(age, (isFrozen || editModeActive) ? 64 : 8);
      const pose = updateCamera(age);
      const showAll = editModeActive && showAllModels;

      let visibleNow = 0;
      for (let i = 0; i < actors.length; i++) {
        const a = actors[i];
        if (a.disposed) continue;
        const activeNow = showAll
          ? (a.arenaId != null)
          : (age >= a.tStart && age <= a.tEnd);
        if (!activeNow) {
          a.mesh.visible = false;
          continue;
        }
        if (!a.loaded) {
          if (a.imgReady) uploadActorTexture(a);
          else enqueueActorFetch(a, true);
        }
        a.behaviorFn(age, a.mesh);
        const show = a.loaded;
        a.mesh.visible = show;
        if (show) visibleNow++;
      }

      window.__MIC_CHECK_PART2_STATE__ = {
        age,
        sculpturesReady,
        visibleNow,
        activeTexCount,
        disposedCount,
        inFlightFetches,
        contextLost,
        editModeActive,
        camPos: [Number(pose.pos.x.toFixed(1)), Number(pose.pos.y.toFixed(1)), Number(pose.pos.z.toFixed(1))],
        fov: Number(pose.fov.toFixed(1)),
        bgHex: '#' + scene.background.getHexString(),
      };

      if (editModeActive && typeof editorRenderHook === 'function') {
        editorRenderHook({ renderer, scene, camera, age, pose, vw, vh });
      } else {
        renderer.render(scene, camera);
      }
    }

    function commitAllOffscreen() {
      for (let i = 0; i < 7; i++) updateArenaWorldCardPoses(ARENAS[i], true);
      updateFinaleRocketWorldPoses(true);
      saveChoreoToStorage();
      finalizeAuditAndSort();
      scheduleRerender();
    }

    function applyChoreoData(data, commit) {
      if (!data || typeof data !== 'object') return false;
      if (Array.isArray(data.cameraKeyframes) && data.cameraKeyframes.length >= 2) {
        cameraKeyframes = data.cameraKeyframes.map(cloneKeyframe).sort((a, b) => a.t - b.t);
      }
      if (data.models && typeof data.models === 'object') {
        for (let i = 0; i < ARENAS.length; i++) {
          const ar = ARENAS[i];
          const m = data.models[ar.id];
          if (!m) continue;
          if (Array.isArray(m.center) && m.center.length === 3 && m.center.every(Number.isFinite)) {
            ar.liveCenter.set(m.center[0], m.center[1], m.center[2]);
          }
          if (Array.isArray(m.rotDeg) && m.rotDeg.length === 3 && m.rotDeg.every(Number.isFinite)) {
            ar.liveRotDeg = m.rotDeg.map((v) => Number(v));
            ar.liveQuat.setFromEuler(
              new THREE.Euler(deg(ar.liveRotDeg[0]), deg(ar.liveRotDeg[1]), deg(ar.liveRotDeg[2]), 'YXZ')
            );
          }
          if (ar.index < 7) updateArenaWorldCardPoses(ar, Boolean(commit));
          else updateFinaleRocketWorldPoses(Boolean(commit));
        }
      }
      if (commit) commitAllOffscreen();
      else scheduleRerender();
      return true;
    }

    const editorApi = {
      getTHREE: () => THREE,
      getScene: () => scene,
      getCamera: () => camera,
      getRenderer: () => renderer,
      getCanvas: () => renderer.domElement,
      getViewportSize: () => ({ vw, vh, aspect }),
      isReady: () => sculpturesReady,
      getCurrentAge: () => Math.max(0, lastRenderAge),
      getTimelineBounds: () => ({
        min: 0,
        max: 85.0,
        barSec: BAR,
        beatSec: BEAT,
        startSec: T_START,
      }),
      setEditMode(on) {
        const next = Boolean(on);
        if (editModeActive === next) return;
        editModeActive = next;
        if (editModeActive) preloadAll();
        finalizeAuditAndSort();
        scheduleRerender();
      },
      isEditMode: () => editModeActive,
      setShowAllModels(on) {
        showAllModels = Boolean(on);
        if (showAllModels) preloadAll();
        scheduleRerender();
      },
      isShowAllModels: () => showAllModels,
      setEditorRenderHook(fn) {
        editorRenderHook = typeof fn === 'function' ? fn : null;
        scheduleRerender();
      },
      requestRender: () => {
        if (active && lastRenderAge >= 0) scheduleRerender();
      },
      getArenas() {
        return ARENAS.map((ar) => ({
          id: ar.id,
          label: ar.label,
          index: ar.index,
          tEnter: Number(ar.tEnter.toFixed(3)),
          tExit: Number(ar.tExit.toFixed(3)),
          heroAge: ar.heroAge,
          modelSpan: ar.modelSpan,
          orbitRadius: ar.orbitRadius,
          center: numArr3([ar.liveCenter.x, ar.liveCenter.y, ar.liveCenter.z]),
          rotDeg: numArr3(ar.liveRotDeg),
          defaultCenter: numArr3([ar.defaultCenter.x, ar.defaultCenter.y, ar.defaultCenter.z]),
          defaultRotDeg: numArr3(ar.defaultRotDeg),
        }));
      },
      getKeyframes: () => cameraKeyframes.map(cloneKeyframe),
      setKeyframes(kfs, commit) {
        if (!Array.isArray(kfs) || kfs.length < 2) return false;
        cameraKeyframes = kfs.map(cloneKeyframe).sort((a, b) => a.t - b.t);
        if (commit) commitAllOffscreen();
        else scheduleRerender();
        return true;
      },
      evalCameraAt(age) {
        const p = getCameraPose(age);
        return {
          pos: [p.pos.x, p.pos.y, p.pos.z],
          lookAt: [p.lookAt.x, p.lookAt.y, p.lookAt.z],
          fwd: [p.fwd.x, p.fwd.y, p.fwd.z],
          fov: p.fov,
        };
      },
      setModelTransform(id, patch, commit) {
        const ar = arenaById.get(id);
        if (!ar || !patch) return false;
        if (Array.isArray(patch.center) && patch.center.length === 3 && patch.center.every(Number.isFinite)) {
          ar.liveCenter.set(patch.center[0], patch.center[1], patch.center[2]);
        }
        if (Array.isArray(patch.rotDeg) && patch.rotDeg.length === 3 && patch.rotDeg.every(Number.isFinite)) {
          ar.liveRotDeg = [Number(patch.rotDeg[0]), Number(patch.rotDeg[1]), Number(patch.rotDeg[2])];
          ar.liveQuat.setFromEuler(
            new THREE.Euler(deg(ar.liveRotDeg[0]), deg(ar.liveRotDeg[1]), deg(ar.liveRotDeg[2]), 'YXZ')
          );
        }
        if (ar.index < 7) updateArenaWorldCardPoses(ar, Boolean(commit));
        else updateFinaleRocketWorldPoses(Boolean(commit));
        if (commit) {
          saveChoreoToStorage();
          finalizeAuditAndSort();
        }
        scheduleRerender();
        return true;
      },
      resetModelTransform(id) {
        const ar = arenaById.get(id);
        if (!ar) return false;
        ar.liveCenter.copy(ar.defaultCenter);
        ar.liveRotDeg = ar.defaultRotDeg.slice();
        ar.liveQuat.setFromEuler(
          new THREE.Euler(deg(ar.liveRotDeg[0]), deg(ar.liveRotDeg[1]), deg(ar.liveRotDeg[2]), 'YXZ')
        );
        if (ar.index < 7) updateArenaWorldCardPoses(ar, true);
        else updateFinaleRocketWorldPoses(true);
        saveChoreoToStorage();
        finalizeAuditAndSort();
        scheduleRerender();
        return true;
      },
      commitEdits: commitAllOffscreen,
      saveChoreo: saveChoreoToStorage,
      getChoreoState,
      exportChoreoJson: () => JSON.stringify(getChoreoState(), null, 2),
      importChoreoJson(str) {
        try {
          const parsed = typeof str === 'string' ? JSON.parse(str) : str;
          return applyChoreoData(parsed, true);
        } catch (_) {
          return false;
        }
      },
      resetChoreo() {
        try { window.localStorage.removeItem(CHOREO_STORAGE_KEY); } catch (_) {}
        for (let i = 0; i < ARENAS.length; i++) {
          const ar = ARENAS[i];
          ar.liveCenter.copy(ar.defaultCenter);
          ar.liveRotDeg = ar.defaultRotDeg.slice();
          ar.liveQuat.setFromEuler(
            new THREE.Euler(deg(ar.liveRotDeg[0]), deg(ar.liveRotDeg[1]), deg(ar.liveRotDeg[2]), 'YXZ')
          );
        }
        cameraKeyframes = buildDefaultKeyframes();
        commitAllOffscreen();
        return true;
      },
      refreshAudit: finalizeAuditAndSort,
    };

    window.__MIC_CHECK_SKETCH3D_API__ = editorApi;

    function render(t) {
      if (contextLost || destroyed) return false;
      if (t < T_START) {
        if (active) {
          active = false;
          wrap.style.visibility = 'hidden';
        }
        if (t >= T_START - 20.0) {
          preloadAll();
          flushReadyUploads(0, 6);
        }
        return false;
      }

      if (!active) {
        active = true;
        wrap.style.visibility = 'visible';
      }

      const age = Math.max(0, t - T_START);
      renderAtAge(age);
      return true;
    }

    function destroy() {
      destroyed = true;
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost, false);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored, false);
      for (let i = 0; i < actors.length; i++) {
        disposeActor(actors[i]);
      }
      renderer.dispose();
      if (wrap.parentNode) wrap.remove();
      if (window.__MIC_CHECK_SKETCH3D_API__ === editorApi) {
        delete window.__MIC_CHECK_SKETCH3D_API__;
      }
    }

    return { render, destroy, editorApi };
  }

  window.MicCheckSketch3D = { create };
})();
