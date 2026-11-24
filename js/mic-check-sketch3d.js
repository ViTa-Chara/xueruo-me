(() => {
  'use strict';

  // =========================================================================
  // MIC CHECK — PART II (BAR 18–52): PURE BLACK VOID, C∞ CONTINUOUS MOTION,
  // FORWARD-BIASED HARD CUTS, STAIRCASE -> CUBOID SKYSCRAPER & HAND-DRAWN
  // ABSTRACT SUN / BACKLIT SILHOUETTE / MOON FINALE
  //
  // Core Guarantees:
  //   1. PURE BLACK SKY (#000000) throughout Bars 18–41 (ZERO blue sky, ZERO strobing).
  //   2. ZERO velocity zero-points: every street element, tower floor, white model,
  //      photo sticker, camera & celestial layer moves on C∞ differentiable curves.
  //   3. After 1st "1 2 3 4" (age = 0.00s): seamless Bar 17 floodCanvas ground tilt ->
  //      forward street rush with crisp forward-moving hard cuts & close-ups ->
  //      ascending forward staircase (F00..F06) straight ahead of T-junction ->
  //      mid-chorus (38.02s) cuboid convergence + 180° camera turnaround locking
  //      skyscraper onto LEFT majority of frame + continuous upward lift (F07..F12).
  //   4. START Chant 1 (57.03s): Hand-drawn abstract Sun on LEFT expands concentric
  //      light layers illuminating the sky behind the tower -> pure backlit silhouette.
  //      START Harmony 2 (64.16s): Hand-drawn abstract Moon emerges on RIGHT.
  // =========================================================================

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

  // Infinitely differentiable C∞ smooth step (strictly positive derivative everywhere!)
  function tanhStep(t, t0, w) {
    return 0.5 * (1 + Math.tanh((t - t0) / w));
  }

  function lerp(a, b, u) {
    return a + (b - a) * u;
  }

  function create(opts) {
    const THREE = window.THREE;
    if (!THREE) {
      console.warn('[mic-check-sketch3d] THREE not loaded');
      return null;
    }

    const parentEl = opts.parentEl;
    const vw = opts.vw || window.innerWidth;
    const vh = opts.vh || window.innerHeight;
    const BEAT = opts.beatSec || (60 / 101.0);
    const BAR = opts.barSec || (BEAT * 4);
    const T_START = opts.startSec; // Bar 18.1 (+40.396s)

    // Exact measured stem timeline (age = seconds since Bar 18.1)
    const cues3d = opts.cues3d || {};
    const SHOCK_KICKS = (cues3d.shockKicks && cues3d.shockKicks.length === 4)
      ? cues3d.shockKicks
      : [16.786, 17.396, 17.966, 18.586];
    const MIC_CHECK_AGE = cues3d.micCheckAge ?? (BAR * 8.0);   // 19.010s = Bar 26.1
    const SNAP_AGE = 38.02;                                    // Bar 34.1 = Midpoint of final chorus!
    const START_1_AGE = 57.03;                                 // Bar 42.1 = "START" chant 1 (Sun LEFT + light + silhouette)
    const START_2_AGE = 64.16;                                 // Bar 45.1 = "START" harmony 2 (Moon RIGHT)

    const KICKS = (opts.kicks3d && opts.kicks3d.length)
      ? opts.kicks3d
      : [0.000, 2.376, 4.746, 7.126, 9.496, 11.876, 14.257, 16.786, 17.396, 17.966, 18.586, 19.006, 19.456, 19.896, 20.486];

    const assets = opts.assets || {};
    const signalsPool = (assets.signalsClean && assets.signalsClean.length) ? assets.signalsClean : (assets.signals || []);
    const signsPool = (assets.signsClean && assets.signsClean.length) ? assets.signsClean : (assets.signs || []);
    const housesPool = (assets.housesLow && assets.housesLow.length) ? assets.housesLow : (assets.buildingsClean || assets.buildings || []);
    const buildingsClean = (assets.buildingsClean && assets.buildingsClean.length) ? assets.buildingsClean : (assets.buildings || []);
    const towerThemes = assets.towerThemes || [];
    const polesPool = assets.poles || [];
    const carsPool = assets.cars || [];
    const screensPool = assets.screens || [];
    const streetsPool = assets.streets || [];
    const roadTextures = assets.roadTextures || [];
    const concreteTextures = assets.concreteTextures || [];
    const brickTextures = assets.brickTextures || [];
    const archTextures = assets.archTextures || [];
    const itemsPool = opts.fallenItems || [];

    const rawGetImage = opts.getImage || ((url) => {
      const im = new Image();
      im.decoding = 'async';
      im.src = url;
      return im;
    });
    const getImage = (url) => {
      let safe = url;
      try { safe = encodeURI(decodeURI(url)); } catch (_) { safe = encodeURI(url); }
      return rawGetImage(safe);
    };

    const allSearchPools = [
      ...itemsPool, ...signalsPool, ...signsPool, ...polesPool, ...carsPool, ...screensPool,
      ...housesPool, ...buildingsClean, ...roadTextures, ...concreteTextures, ...brickTextures, ...archTextures, ...streetsPool,
    ];

    function pickMeta(pool, idx) {
      if (!pool || !pool.length) return null;
      return pool[((idx % pool.length) + pool.length) % pool.length];
    }

    function findBySrc(suffix, preferredPool, fallbackIdx) {
      if (preferredPool && preferredPool.length) {
        for (let i = 0; i < preferredPool.length; i++) {
          const m = preferredPool[i];
          if (m && m.src && m.src.endsWith(suffix)) return m;
        }
      }
      for (let i = 0; i < allSearchPools.length; i++) {
        const m = allSearchPools[i];
        if (m && m.src && m.src.endsWith(suffix)) return m;
      }
      return pickMeta(preferredPool || itemsPool, fallbackIdx || 0);
    }

    const rng = makeRng(20261126);

    // =========================================================================
    // 1. WEBGL STAGE — PURE BLACK SKY (#000000) & SCULPTURAL STUDIO LIGHTING
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const sceneFog = new THREE.FogExp2(0x000000, 0.0013);
    scene.fog = sceneFog;

    // 4-point architectural studio lighting so ALL 3D white models (白模) show crisp facets
    // against pure black from both forward (-Z) and turned-around (+Z) viewpoints!
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3b4354, 0.96);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.18);
    keyLight.position.set(58, 92, 46);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd9e8ff, 0.78);
    rimLight.position.set(-64, 48, -82);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xf2f5fa, 0.62);
    fillLight.position.set(-42, 34, -145);
    scene.add(fillLight);

    const BASE_FOV = 56;
    const aspect = vw / Math.max(1, vh);
    const camera = new THREE.PerspectiveCamera(BASE_FOV, aspect, 0.25, 680);

    // Exact 1:1 top-down road collage starting geometry (Bar 17 floodCanvas handoff!)
    const ROAD_PATCH_Z = 14.0;
    const TOP_CAM_Y = 8.4;
    const patchH = 2 * TOP_CAM_Y * Math.tan((BASE_FOV * Math.PI) / 360);
    const patchW = patchH * aspect;

    const ROAD_HALF_W = Math.max(9.2, patchW * 0.5 + 0.7);
    const TJUNC_Z = -34.0;
    const CROSS_DEPTH = 17.0;
    const FAR_CURB_Z = TJUNC_Z - CROSS_DEPTH; // -51.0

    // Tower spatial coordinates:
    //   Staircase F00..F06 ascends straight ahead of T-junction: z = -38, -58.5, -79, -99.5, -120, -140.5, -161
    //   Cuboid snaps together at (TOWER_X = 0, CUBOID_Z = -86) when camera whips 180° around to face +Z!
    const TOWER_X = 0.0;
    const STAIR_Z0 = -38.0;
    const CUBOID_Z = -86.0;

    let active = false;
    let rerenderQueued = false;
    function scheduleRerender() {
      if (!active || rerenderQueued) return;
      rerenderQueued = true;
      requestAnimationFrame(() => {
        rerenderQueued = false;
        if (active) renderer.render(scene, camera);
      });
    }

    // =========================================================================
    // 2. FULL-COLOR REAL-PHOTO TEXTURE & PIVOTED CUTOUT FACTORY (WITH DRIP-PAINT)
    // =========================================================================
    const textureCache = new Map();
    const pendingTextures = [];

    function configureTex(tex, repeatX, repeatY) {
      tex.anisotropy = maxAniso;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      if (repeatX || repeatY) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX || 1, repeatY || 1);
      }
      tex.needsUpdate = true;
      return tex;
    }

    function getCutoutTex(meta, opts2) {
      if (!meta || !meta.src) return null;
      const o = opts2 || {};
      const maxDim = o.maxDim || 512;
      const clipShape = o.clipShape || 'none';
      const variant = o.variant ?? 0;
      const repeatX = o.repeatX || 0;
      const repeatY = o.repeatY || 0;
      const key = `${maxDim}:${clipShape}:${variant}:${repeatX}x${repeatY}:${meta.src}:${meta.x0 || 0},${meta.y0 || 0},${meta.bw || 0},${meta.bh || 0}`;
      if (textureCache.has(key)) return textureCache.get(key);

      const cnv = document.createElement('canvas');
      const bw = meta.bw || meta.w || 256;
      const bh = meta.bh || meta.h || 256;
      const sc = Math.min(1, maxDim / Math.max(bw, bh));
      cnv.width = Math.max(16, Math.round(bw * sc));
      cnv.height = Math.max(16, Math.round(bh * sc));
      const ctx = cnv.getContext('2d');
      const tex = new THREE.CanvasTexture(cnv);
      const im = getImage(meta.src);

      function paint() {
        if (!ctx || !im || !im.complete || !im.naturalWidth) return false;
        ctx.clearRect(0, 0, cnv.width, cnv.height);
        ctx.save();
        const w = cnv.width;
        const h = cnv.height;
        if (clipShape === 'torn') {
          const trng = makeRng(44101 + variant * 7919);
          ctx.beginPath();
          const pts = [];
          for (let i = 0; i <= 5; i++) pts.push([w * (0.02 + 0.96 * (i / 5)), h * (0.01 + trng() * 0.07)]);
          for (let i = 1; i <= 6; i++) pts.push([w * (0.985 - trng() * 0.08), h * (0.04 + 0.92 * (i / 6))]);
          for (let i = 4; i >= 0; i--) pts.push([w * (0.02 + 0.96 * (i / 5)), h * (0.985 - trng() * 0.07)]);
          for (let i = 5; i >= 1; i--) pts.push([w * (0.015 + trng() * 0.08), h * (0.04 + 0.92 * (i / 6))]);
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.closePath();
          ctx.clip();
        }
        const sx = meta.x0 || 0;
        const sy = meta.y0 || 0;
        const sw = meta.bw || im.naturalWidth;
        const sh = meta.bh || im.naturalHeight;
        ctx.drawImage(im, sx, sy, sw, sh, 0, 0, w, h);
        ctx.restore();
        configureTex(tex, repeatX, repeatY);
        return true;
      }

      if (opts.deferTextures) {
        pendingTextures.push(paint);
        im.addEventListener('load', () => {
          if (active && paint()) scheduleRerender();
        }, { once: true });
      } else if (!paint()) {
        pendingTextures.push(paint);
        im.addEventListener('load', () => {
          if (paint() && active) scheduleRerender();
        }, { once: true });
      }
      textureCache.set(key, tex);
      return tex;
    }

    function makeCutout(meta, targetH, opts2) {
      const o = opts2 || {};
      const tex = getCutoutTex(meta, {
        maxDim: o.maxDim || 512,
        clipShape: o.clipShape || 'none',
        variant: o.variant ?? 0,
      });
      const ar = ((meta && meta.bw) || 100) / Math.max(1, (meta && meta.bh) || 100);
      const h = targetH;
      const w = o.fixedW || clamp(h * ar, o.minW || 0.25, o.maxW || 999);
      const geo = new THREE.PlaneGeometry(w, h);
      const pivot = o.pivot || 'bottom';
      if (pivot === 'bottom') geo.translate(0, h * 0.5, 0);
      else if (pivot === 'top') geo.translate(0, -h * 0.5, 0);
      else if (pivot === 'left') geo.translate(w * 0.5, 0, 0);
      else if (pivot === 'right') geo.translate(-w * 0.5, 0, 0);
      else if (pivot === 'bottom-left') geo.translate(w * 0.5, h * 0.5, 0);
      else if (pivot === 'bottom-right') geo.translate(-w * 0.5, h * 0.5, 0);

      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: 0xffffff,
        transparent: true,
        alphaTest: o.alphaTest ?? 0.14,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      if (o.flipX) mesh.scale.x = -1;
      return { mesh, mat, w, h, meta };
    }

    function flushPendingTextures(budget) {
      const limit = typeof budget === 'number' ? budget : pendingTextures.length;
      let done = 0;
      for (let i = pendingTextures.length - 1; i >= 0 && done < limit; i--) {
        if (pendingTextures[i]()) {
          pendingTextures.splice(i, 1);
          done++;
        }
      }
    }

    // =========================================================================
    // 3. CONTINUOUS C∞ STREET STAGE (BAR 18–25, age = 0 -> 19s)
    //    ZERO velocity zero-points! Every road slab, shop, pole, signal,
    //    footbridge panel & car moves smoothly from age = 0 onward, then sweeps
    //    gracefully out after Bar 25 so the 180° turnaround sees pure black void!
    // =========================================================================
    const streetRoot = new THREE.Group();
    scene.add(streetRoot);
    const collageActors = [];

    const asphaltCorePool = [
      findBySrc('马路纹理/01.webp', roadTextures, 0),
      findBySrc('马路纹理/02.webp', roadTextures, 1),
      findBySrc('马路纹理/03.webp', roadTextures, 2),
      findBySrc('马路纹理/05.webp', roadTextures, 3),
      findBySrc('马路纹理/06.webp', roadTextures, 4),
      findBySrc('马路纹理/07.webp', roadTextures, 5),
      findBySrc('马路纹理/08.webp', roadTextures, 6),
      findBySrc('马路纹理/09.webp', roadTextures, 7),
      findBySrc('马路纹理/10.webp', roadTextures, 8),
    ].filter(Boolean);

    const crosswalkPhotoPool = [
      findBySrc('streets/001.png', roadTextures, 11),
      findBySrc('马路/01.png', roadTextures, 9),
      findBySrc('马路纹理/02.webp', roadTextures, 1),
    ].filter(Boolean);

    const sidewalkPhotoPool = [
      findBySrc('马路/02.png', roadTextures, 10),
      findBySrc('建筑纹理/08.webp', roadTextures, 12),
      findBySrc('建筑纹理/09.webp', roadTextures, 13),
      findBySrc('水泥纹理/03.webp', concreteTextures, 2),
      findBySrc('水泥纹理/07.png', concreteTextures, 5),
    ].filter(Boolean);

    // Solid dark-asphalt roadbed underlay beneath torn photo strips so Bar 18-25 road has zero harsh gaps
    const roadUnderlayMat = new THREE.MeshBasicMaterial({ color: 0x151820, side: THREE.DoubleSide });
    const roadUnderlayMain = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF_W * 2.25, 86), roadUnderlayMat);
    roadUnderlayMain.rotation.x = -Math.PI / 2;
    roadUnderlayMain.position.set(0, -0.02, -16);
    streetRoot.add(roadUnderlayMain);
    const roadUnderlayCross = new THREE.Mesh(new THREE.PlaneGeometry(170, CROSS_DEPTH + 4), roadUnderlayMat);
    roadUnderlayCross.rotation.x = -Math.PI / 2;
    roadUnderlayCross.position.set(0, -0.022, TJUNC_Z - CROSS_DEPTH * 0.5);
    streetRoot.add(roadUnderlayCross);

    // Seamless 1:1 Bar 17 floodCanvas top-down road patch
    let collageTexture = null;
    const collageMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const collageMesh = new THREE.Mesh(new THREE.PlaneGeometry(patchW, patchH), collageMat);
    collageMesh.rotation.x = -Math.PI / 2;
    collageMesh.position.set(0, 0.03, ROAD_PATCH_Z);
    streetRoot.add(collageMesh);

    function captureRoadCollage(floodCanvas) {
      if (!floodCanvas || collageTexture) return;
      collageTexture = new THREE.CanvasTexture(floodCanvas);
      collageTexture.minFilter = THREE.LinearFilter;
      collageTexture.magFilter = THREE.LinearFilter;
      collageTexture.needsUpdate = true;
      collageMat.map = collageTexture;
      collageMat.needsUpdate = true;
    }

    // Continuous dark-asphalt collage road & T-junction slabs
    const roadStrips = [];
    let stripY = 0.004;
    function addRoadStrip(meta, x, z, w, len, yaw, variant, driftSpeed) {
      if (!meta) return;
      const tex = getCutoutTex(meta, { maxDim: 512, clipShape: 'torn', variant });
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: 0xd8dce4,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
      mesh.rotation.order = 'YXZ';
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.y = yaw;
      mesh.position.set(x, stripY, z);
      stripY += 0.00025;
      streetRoot.add(mesh);
      roadStrips.push({
        mesh,
        x0: x,
        y0: mesh.position.y,
        z0: z,
        yaw0: yaw,
        driftSpeed,
        phase: rng() * 6.28,
        exitDir: new THREE.Vector3((x >= 0 ? 1 : -1) * (24 + rng() * 32), -(12 + rng() * 18), (rng() - 0.5) * 28),
        exitSpin: (rng() - 0.5) * 2.2,
      });
    }

    // Main asphalt avenue & T-junction cross street
    for (let i = 0; i < 48; i++) {
      const isCross = i >= 30;
      const px = isCross ? (-76 + rng() * 152) : ((rng() - 0.5) * ROAD_HALF_W * 1.9);
      const pz = isCross ? (FAR_CURB_Z + 1.5 + rng() * (CROSS_DEPTH - 2.0)) : (-48 + rng() * 76);
      addRoadStrip(pickMeta(asphaltCorePool, i * 2), px, pz, 5.2 + rng() * 8.5, 7.2 + rng() * 13.0, (rng() - 0.5) * 0.07, i % 10, (isCross ? 0.35 : -0.65) * (0.7 + rng() * 0.6));
    }
    // Sidewalk plates flanking both sides
    for (let i = 0; i < 28; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const px = side * (ROAD_HALF_W + 3.0 + rng() * 18.0);
      const pz = -48 + rng() * 78;
      addRoadStrip(pickMeta(sidewalkPhotoPool, i), px, pz, 6.0 + rng() * 8.0, 8.0 + rng() * 12.0, (rng() - 0.5) * 0.06, (i + 4) % 9, -0.45 * (0.8 + rng() * 0.5));
    }
    // Real-photo crosswalk bands at T-mouth
    for (let i = 0; i < 10; i++) {
      const px = -ROAD_HALF_W + 1.6 + (i / 9) * (ROAD_HALF_W * 2 - 3.2);
      const pz = TJUNC_Z + 2.4 + (rng() - 0.5) * 2.4;
      addRoadStrip(pickMeta(crosswalkPhotoPool, i), px, pz, 3.6 + rng() * 2.4, 4.8 + rng() * 3.2, (rng() - 0.5) * 0.05, i % 7, -0.30);
    }

    // Kinetic street props (buildings, shops, vending, utility poles, signals, footbridge)
    // Every single prop has continuous C∞ drift/motion from age = 0 (ZERO velocity zero-points!)
    const streetProps = [];
    function registerStreetProp(obj, opts2) {
      const o = opts2 || {};
      streetRoot.add(obj);
      collageActors.push({ obj, role: o.role || 'street' });
      streetProps.push({
        obj,
        x0: obj.position.x,
        y0: obj.position.y,
        z0: obj.position.z,
        rx0: obj.rotation.x,
        ry0: obj.rotation.y,
        rz0: obj.rotation.z,
        s0: obj.scale.clone(),
        vx: o.vx || 0,
        vy: o.vy || 0,
        vz: o.vz ?? -0.55,
        swayAmp: o.swayAmp ?? 0.035,
        swayFreq: o.swayFreq ?? (0.75 + rng() * 0.55),
        phase: o.phase ?? (rng() * 6.28),
        stereoZone: o.stereoZone ?? -1, // 0..3 for 4-note R->L synth response
        kickPop: o.kickPop ?? 0.06,
        exitVec: new THREE.Vector3(
          (obj.position.x >= 0 ? 1 : -1) * (26 + rng() * 36),
          14 + rng() * 24,
          (rng() - 0.5) * 32 - 12
        ),
        exitOmega: new THREE.Vector3((rng() - 0.5) * 2.2, (rng() - 0.5) * 2.6, (rng() - 0.5) * 2.0),
        shockIdx: obj.position.z <= -36 ? 0 : (obj.position.z <= -18 ? 1 : (obj.position.z <= -2 ? 2 : 3)),
      });
    }

    // 3a. Flanking Low-Rise Shops & Quirky Houses (both sides of avenue, ZERO humans!)
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const bx = side * (ROAD_HALF_W + 4.8 + (row % 2) * 2.4);
      const bz = 8.0 - row * 6.2;
      const grp = new THREE.Group();
      grp.position.set(bx, 0, bz);
      grp.rotation.y = -side * (Math.PI * 0.44);

      const meta = pickMeta(i % 2 === 0 ? housesPool : buildingsClean, i * 3);
      if (meta) {
        const bH = 5.4 + (i % 4) * 1.45;
        const card = makeCutout(meta, bH, { maxW: 8.6, maxDim: 384 });
        grp.add(card.mesh);
        // Overlapping photo sign or screen plastered onto facade!
        const sgMeta = pickMeta(i % 2 === 0 ? signsPool : screensPool, i * 5 + 2);
        if (sgMeta) {
          const sg = makeCutout(sgMeta, 1.85, { maxW: 3.1, maxDim: 224, pivot: 'center' });
          sg.mesh.position.set((i % 2 === 0 ? -1 : 1) * 1.1, bH * 0.58, 0.35);
          grp.add(sg.mesh);
        }
      }
      registerStreetProp(grp, { role: 'shop', vz: -0.42, swayAmp: 0.028, kickPop: 0.07 });
    }

    // 3b. Streetlight / Utility Poles + Overhead Catenary Black/White Wires
    const poleCoords = [];
    for (let i = 0; i < 10; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const px = side * (ROAD_HALF_W + 0.9);
      const pz = 6.0 - row * 9.8;
      const grp = new THREE.Group();
      grp.position.set(px, 0, pz);
      const poleMeta = pickMeta(polesPool, i);
      if (poleMeta) {
        const pole = makeCutout(poleMeta, 8.8 + (i % 2) * 1.1, { maxW: 3.6, maxDim: 320 });
        grp.add(pole.mesh);
      }
      poleCoords.push({ side, x: px, z: pz, y: 7.8 });
      registerStreetProp(grp, { role: 'pole', vz: -0.52, swayAmp: 0.04, kickPop: 0.06 });
    }

    // Sleek overhead catenary wires between consecutive poles & across avenue
    const wireMat = new THREE.LineBasicMaterial({ color: 0xdbe2ee, transparent: true, opacity: 0.52 });
    const wireGroup = new THREE.Group();
    for (let i = 0; i < poleCoords.length - 2; i++) {
      const a = poleCoords[i];
      const b = poleCoords[i + 2];
      const pts = [];
      for (let s = 0; s <= 10; s++) {
        const u = s / 10;
        const sag = Math.sin(u * Math.PI) * 1.15;
        pts.push(new THREE.Vector3(lerp(a.x, b.x, u), lerp(a.y, b.y, u) - sag, lerp(a.z, b.z, u)));
      }
      wireGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    }
    for (let i = 0; i < poleCoords.length - 1; i += 2) {
      const a = poleCoords[i];
      const b = poleCoords[i + 1];
      const pts = [];
      for (let s = 0; s <= 12; s++) {
        const u = s / 12;
        const sag = Math.sin(u * Math.PI) * 1.45;
        pts.push(new THREE.Vector3(lerp(a.x, b.x, u), a.y - 0.5 - sag, lerp(a.z, b.z, u)));
      }
      wireGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    }
    registerStreetProp(wireGroup, { role: 'wires', vz: -0.52, swayAmp: 0.02, kickPop: 0.03 });

    // 3c. 4 Stereo R->L Responsive Traffic Signals (R-far=0, R-near=1, L-near=2, L-far=3)
    const signalSpecs = [
      { x: +(ROAD_HALF_W - 0.8), z: -30.5, zone: 0 },
      { x: +(ROAD_HALF_W - 1.2), z: -13.5, zone: 1 },
      { x: -(ROAD_HALF_W - 1.2), z: -13.5, zone: 2 },
      { x: -(ROAD_HALF_W - 0.8), z: -30.5, zone: 3 },
    ];
    signalSpecs.forEach((sp, idx) => {
      const grp = new THREE.Group();
      grp.position.set(sp.x, 0, sp.z);
      const sigMeta = pickMeta(signalsPool, idx * 2);
      if (sigMeta) {
        const sig = makeCutout(sigMeta, 7.6, { maxW: 5.2, maxDim: 320, flipX: sp.x < 0 });
        grp.add(sig.mesh);
      }
      registerStreetProp(grp, { role: 'signal', vz: -0.48, stereoZone: sp.zone, swayAmp: 0.055, kickPop: 0.12 });
    });

    // 3d. Pedestrian Footbridge Spanning the Avenue (with 4 R->L Stereo Under-Lightboxes)
    const bridgeGrp = new THREE.Group();
    bridgeGrp.position.set(0, 5.8, -16.5);
    const spanW = ROAD_HALF_W * 2 + 4.4;
    const beamMat = new THREE.MeshStandardMaterial({ color: 0xe6eaf0, roughness: 0.72, metalness: 0.08 });
    const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(spanW, 1.05, 3.2), beamMat);
    bridgeGrp.add(deckMesh);
    [-1, 1].forEach((side) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.95, 6.2, 1.2), beamMat);
      leg.position.set(side * (ROAD_HALF_W + 1.2), -2.9, 0);
      bridgeGrp.add(leg);
    });
    const bridgeLightboxes = [];
    for (let zIdx = 0; zIdx < 4; zIdx++) {
      // Ordered R-far (0) -> R-near (1) -> L-near (2) -> L-far (3)
      const lx = (1.5 - zIdx) * (ROAD_HALF_W * 0.56);
      const lbMeta = pickMeta(screensPool, zIdx * 3 + 1);
      if (lbMeta) {
        const lb = makeCutout(lbMeta, 1.85, { maxW: 3.4, maxDim: 256, pivot: 'center' });
        lb.mesh.position.set(lx, 0.25, 1.72);
        bridgeGrp.add(lb.mesh);
        bridgeLightboxes.push({ mesh: lb.mesh, zone: zIdx });
      }
    }
    registerStreetProp(bridgeGrp, { role: 'footbridge', vz: -0.45, swayAmp: 0.015, kickPop: 0.05 });

    // 3e. Continuously Gliding Real-Photo Vehicles (Crossing T-Junction + Avenue Lanes — ZERO Stops!)
    const streetCars = [];
    for (let i = 0; i < 10; i++) {
      const meta = pickMeta(carsPool, i);
      if (!meta) continue;
      const isCross = i < 6;
      const car = makeCutout(meta, isCross ? 2.55 : 2.35, { maxW: 5.8, maxDim: 320 });
      const grp = new THREE.Group();
      grp.add(car.mesh);
      streetRoot.add(grp);

      const dir = i % 2 === 0 ? 1 : -1;
      if (isCross) {
        grp.rotation.y = dir > 0 ? 0 : Math.PI;
        streetCars.push({
          grp,
          isCross: true,
          dir,
          laneZ: TJUNC_Z - 3.0 - (i % 3) * 4.2,
          startX: -54 + (i / 6) * 108,
          speed: 11.5 + (i % 3) * 3.8,
          span: 132,
          phase: i * 1.1,
        });
      } else {
        grp.rotation.y = Math.PI * 0.5;
        streetCars.push({
          grp,
          isCross: false,
          dir: -1,
          laneX: (i % 2 === 0 ? -1 : 1) * (ROAD_HALF_W * 0.42),
          startZ: 10 - (i - 6) * 14,
          speed: 9.5 + (i % 2) * 3.4,
          span: 76,
          phase: i * 0.9,
        });
      }
    }

    // 3f. Roadside Vending & Guardrail Clusters (continuous sliding motion!)
    for (let i = 0; i < 12; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const grp = new THREE.Group();
      grp.position.set(side * (ROAD_HALF_W + 2.1), 0, 6.0 - row * 7.6);
      grp.rotation.y = -side * Math.PI * 0.45;
      const meta = pickMeta(i % 2 === 0 ? itemsPool : signsPool, i * 4 + 3);
      if (meta) {
        const card = makeCutout(meta, 2.25 + (i % 3) * 0.35, { maxW: 2.4, maxDim: 224 });
        grp.add(card.mesh);
      }
      registerStreetProp(grp, { role: 'roadside', vz: -0.62, swayAmp: 0.045, kickPop: 0.09 });
    }

    // =========================================================================
    // 4. 13-STORY EXAGGERATED 3D WHITE-MODEL + PACKED STICKER SKYSCRAPER
    //    (Staircase F00..F06 -> Mid-Chorus Cuboid Convergence -> F07..F12!)
    // =========================================================================
    const tower = window.MicCheckTower && window.MicCheckTower.buildStaircaseToCuboidTower({
      THREE,
      scene,
      TOWER_X,
      CUBOID_Z,
      STAIR_Z0,
      SNAP_AGE,
      makeCutout,
      getCutoutTex,
      getImage,
      findBySrc,
      pickMeta,
      towerThemes,
      concreteTextures,
      brickTextures,
      archTextures,
      buildingsClean,
      streetsPool,
      screensPool,
      signsPool,
      itemsPool,
      onTextureReady: scheduleRerender,
    });

    // Combine KICKS + MIC_CHECK_HITS for ultra-crisp C∞ beat/vocal responsiveness!
    const allBeatImpulses = KICKS.concat((tower && tower.MIC_CHECK_HITS) || []);

    function computeKickEnergy(age) {
      let sum = 0;
      for (let i = 0; i < allBeatImpulses.length; i++) {
        const dt = age - allBeatImpulses[i];
        if (dt > -0.35 && dt < 0.45) {
          sum += Math.exp(-(dt * dt) / (0.11 * 0.11));
        }
      }
      return Math.min(1.5, sum);
    }

    // =========================================================================
    // 5. HAND-DRAWN ABSTRACT SUN (LEFT), EXPANDING CONCENTRIC LIGHT LAYERS,
    //    & HAND-DRAWN ABSTRACT MOON (RIGHT) FOR "START" CHANT FINALE (57.03s+)
    //
    //    Mounted behind the cuboid skyscraper (z = -20..-28, facing -Z toward the
    //    turned-around camera at z = -130..-174) so real 3D Z-buffering turns the
    //    entire skyscraper into a razor-sharp backlit silhouette!
    // =========================================================================
    const celestialRoot = new THREE.Group();
    celestialRoot.visible = false;
    scene.add(celestialRoot);

    // Helper: jittered hand-drawn ink circle / organic closed path
    function strokeHandCircle(g, cx, cy, r, segs, amp, rngFn, lineW, strokeStyle) {
      g.save();
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const wob = (Math.sin(a * 3 + rngFn() * 0.4) * 0.5 + (rngFn() - 0.5)) * amp;
        const rr = r + wob;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
      g.lineWidth = lineW;
      g.strokeStyle = strokeStyle;
      g.stroke();
      g.restore();
    }

    // 5a. Hand-Drawn Concentric Light Wash Ring Texture (expressive dry-brush organic aura!)
    function makeLightWaveTex(seed, fillHex, rimHex, innerCut) {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1024;
      const g = c.getContext('2d');
      const hr = makeRng(seed);
      const cx = 512, cy = 512;
      if (g) {
        // Organic imperfect hand-painted radial wash
        const grad = g.createRadialGradient(cx, cy, innerCut * 512, cx, cy, 490);
        grad.addColorStop(0.0, fillHex);
        grad.addColorStop(0.76, fillHex);
        grad.addColorStop(0.93, rimHex);
        grad.addColorStop(1.0, 'rgba(255, 250, 236, 0)');
        g.fillStyle = grad;

        // Paint organic wobbly polygon disk instead of sterile perfect circle!
        g.beginPath();
        const segs = 72;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          const r = 468 + Math.sin(a * 5 + seed) * 14 + Math.cos(a * 9 - seed) * 8 + (hr() - 0.5) * 10;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.closePath();
        g.fill();

        // Expressive hand-drawn sketchy ink/chalk concentric contours near outer rim!
        strokeHandCircle(g, cx, cy, 456, 84, 9.0, hr, 4.2, 'rgba(42, 34, 26, 0.28)');
        strokeHandCircle(g, cx, cy, 444, 72, 11.0, hr, 2.2, 'rgba(255, 253, 245, 0.55)');
        strokeHandCircle(g, cx, cy, 412, 64, 8.0, hr, 1.8, 'rgba(65, 52, 38, 0.16)');

        // Subtle hand-stippled charcoal/paper grain ticks around circumference
        g.fillStyle = 'rgba(40, 32, 24, 0.16)';
        for (let k = 0; k < 140; k++) {
          const a = hr() * Math.PI * 2;
          const r = 380 + hr() * 88;
          g.beginPath();
          g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.5 + hr() * 2.8, 0, Math.PI * 2);
          g.fill();
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    }

    // 5b. Hand-Drawn Abstract Sun Texture (LEFT side — raw painterly ink, gouache & abstract rays!)
    function makeAbstractSunTex(variant) {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1024;
      const g = c.getContext('2d');
      const sr = makeRng(variant === 0 ? 77101 : 77999);
      const cx = 512, cy = 512;
      if (g) {
        if (variant === 0) {
          // Core warm parchment-gold hand-painted glow disc
          const glow = g.createRadialGradient(cx, cy, 20, cx, cy, 340);
          glow.addColorStop(0.0, 'rgba(255, 252, 240, 1.0)');
          glow.addColorStop(0.42, 'rgba(255, 238, 192, 0.96)');
          glow.addColorStop(0.68, 'rgba(244, 198, 122, 0.55)');
          glow.addColorStop(1.0, 'rgba(244, 198, 122, 0.0)');
          g.fillStyle = glow;
          g.fillRect(0, 0, 1024, 1024);

          // Hand-drawn wobbly abstract core disc
          g.beginPath();
          for (let i = 0; i <= 64; i++) {
            const a = (i / 64) * Math.PI * 2;
            const r = 178 + Math.sin(a * 4) * 11 + Math.cos(a * 7) * 7 + (sr() - 0.5) * 9;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.closePath();
          g.fillStyle = '#fff9e6';
          g.fill();

          // Bold imperfect hand-inked abstract concentric spirals & rings inside Sun!
          strokeHandCircle(g, cx, cy, 182, 72, 10, sr, 7.5, 'rgba(28, 22, 16, 0.88)');
          strokeHandCircle(g, cx, cy, 166, 60, 12, sr, 3.8, 'rgba(196, 118, 42, 0.72)');
          strokeHandCircle(g, cx, cy, 124, 52, 9, sr, 5.2, 'rgba(28, 22, 16, 0.65)');
          strokeHandCircle(g, cx, cy, 74, 40, 7, sr, 4.5, 'rgba(214, 136, 48, 0.82)');

          // Abstract spiral calligraphic brushstroke in the center
          g.beginPath();
          for (let s = 0; s < 160; s++) {
            const u = s / 160;
            const a = u * Math.PI * 7.5;
            const r = 12 + u * 145 + Math.sin(a * 3) * 5;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (s === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.strokeStyle = 'rgba(34, 24, 14, 0.55)';
          g.lineWidth = 4.0;
          g.stroke();

          // Expressive irregular hand-drawn rays (alternating bold ink strokes & golden brush arcs!)
          const nRays = 28;
          for (let i = 0; i < nRays; i++) {
            const a = (i / nRays) * Math.PI * 2 + (sr() - 0.5) * 0.09;
            const r0 = 192 + (sr() - 0.5) * 14;
            const r1 = (i % 2 === 0 ? 455 : 340) + (sr() - 0.5) * 58;
            const ctrlA = a + (sr() - 0.5) * 0.20;
            const ctrlR = (r0 + r1) * 0.52;
            g.beginPath();
            g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
            g.quadraticCurveTo(
              cx + Math.cos(ctrlA) * ctrlR,
              cy + Math.sin(ctrlA) * ctrlR,
              cx + Math.cos(a + (sr() - 0.5) * 0.08) * r1,
              cy + Math.sin(a + (sr() - 0.5) * 0.08) * r1
            );
            g.lineCap = 'round';
            g.lineWidth = i % 3 === 0 ? (7.5 + sr() * 5.0) : (3.2 + sr() * 3.5);
            g.strokeStyle = i % 3 === 0 ? 'rgba(26, 20, 14, 0.82)' : 'rgba(232, 166, 74, 0.88)';
            g.stroke();
          }
        } else {
          // Second counter-rotating abstract outer sketchy ray & dashed halo layer
          strokeHandCircle(g, cx, cy, 295, 76, 15, sr, 4.0, 'rgba(30, 24, 18, 0.48)');
          strokeHandCircle(g, cx, cy, 385, 88, 18, sr, 2.8, 'rgba(235, 178, 92, 0.58)');
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2 + 0.14;
            const r0 = 230 + sr() * 30;
            const r1 = 468 + (sr() - 0.5) * 40;
            g.beginPath();
            g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
            g.lineTo(cx + Math.cos(a + 0.05) * r1, cy + Math.sin(a + 0.05) * r1);
            g.lineWidth = 3.0 + sr() * 3.5;
            g.strokeStyle = i % 2 === 0 ? 'rgba(255, 248, 224, 0.82)' : 'rgba(42, 32, 22, 0.55)';
            g.stroke();
          }
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    }

    // 5c. Hand-Drawn Abstract CRESCENT Moon Texture (RIGHT side — bold unmistakable hand-inked crescent + stars + orbits!)
    function makeAbstractMoonTex() {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1024;
      const g = c.getContext('2d');
      const mr = makeRng(88421);
      const cx = 512, cy = 512;
      if (g) {
        // Soft cool silver-indigo halo around the crescent so it contrasts cleanly even over warm Sun light!
        const glow = g.createRadialGradient(cx, cy, 40, cx, cy, 420);
        glow.addColorStop(0.0, 'rgba(246, 250, 255, 0.78)');
        glow.addColorStop(0.45, 'rgba(182, 200, 232, 0.34)');
        glow.addColorStop(0.80, 'rgba(128, 150, 192, 0.10)');
        glow.addColorStop(1.0, 'rgba(128, 150, 192, 0.0)');
        g.fillStyle = glow;
        g.fillRect(0, 0, 1024, 1024);

        // Build bold hand-drawn CRESCENT silhouette using an offscreen mask canvas (pure crescent, ZERO dark eyeball!)
        const mc = document.createElement('canvas');
        mc.width = 1024;
        mc.height = 1024;
        const mg = mc.getContext('2d');
        if (mg) {
          // Outer organic lunar disk
          mg.beginPath();
          for (let i = 0; i <= 72; i++) {
            const a = (i / 72) * Math.PI * 2;
            const r = 232 + Math.sin(a * 4) * 7 + (mr() - 0.5) * 6;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i === 0) mg.moveTo(x, y);
            else mg.lineTo(x, y);
          }
          mg.closePath();
          const cGrad = mg.createLinearGradient(cx - 240, cy - 180, cx + 160, cy + 200);
          cGrad.addColorStop(0.0, '#ffffff');
          cGrad.addColorStop(0.55, '#dfe9fa');
          cGrad.addColorStop(1.0, '#a4b7d8');
          mg.fillStyle = cGrad;
          mg.fill();

          // Subtle hand-sketched inner ink craters & painterly diagonal hatch strokes inside the crescent
          mg.save();
          mg.clip();
          mg.strokeStyle = 'rgba(26, 36, 58, 0.34)';
          mg.lineWidth = 2.6;
          for (let h = -260; h <= 260; h += 18) {
            mg.beginPath();
            mg.moveTo(cx - 250, cy + h - 40);
            mg.lineTo(cx + 80, cy + h + 75 + (mr() - 0.5) * 10);
            mg.stroke();
          }
          strokeHandCircle(mg, cx - 125, cy - 58, 28, 30, 4, mr, 3.2, 'rgba(24, 34, 56, 0.55)');
          strokeHandCircle(mg, cx - 150, cy + 44, 34, 30, 5, mr, 3.4, 'rgba(24, 34, 56, 0.52)');
          strokeHandCircle(mg, cx - 86, cy + 124, 22, 24, 4, mr, 3.0, 'rgba(24, 34, 56, 0.48)');
          mg.restore();

          // Carve crisp transparent crescent bite on the right-upper side (so luminous crescent faces LEFT toward Sun!)
          mg.globalCompositeOperation = 'destination-out';
          mg.beginPath();
          for (let i = 0; i <= 72; i++) {
            const a = (i / 72) * Math.PI * 2;
            const r = 196 + Math.sin(a * 5) * 6 + (mr() - 0.5) * 5;
            const x = cx + 104 + Math.cos(a) * r;
            const y = cy - 22 + Math.sin(a) * r;
            if (i === 0) mg.moveTo(x, y);
            else mg.lineTo(x, y);
          }
          mg.closePath();
          mg.fill();
          mg.globalCompositeOperation = 'source-over';

          // Stamp carved crescent onto main Moon canvas
          g.drawImage(mc, 0, 0);
        }

        // Bold raw hand-inked charcoal outlines along BOTH outer & inner crescent curves!
        g.save();
        g.strokeStyle = 'rgba(18, 24, 38, 0.94)';
        g.lineWidth = 8.5;
        g.lineCap = 'round';
        // Outer crescent arc
        g.beginPath();
        for (let i = 0; i <= 54; i++) {
          const a = 0.54 + (i / 54) * (Math.PI * 2 - 1.38); // wraps around the left illuminated arc!
          const r = 232 + Math.sin(a * 4) * 7 + (mr() - 0.5) * 6;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
        // Inner crescent arc
        g.lineWidth = 7.2;
        g.beginPath();
        for (let i = 0; i <= 44; i++) {
          const a = 1.94 + (i / 44) * 2.16;
          const r = 196 + Math.sin(a * 5) * 6 + (mr() - 0.5) * 5;
          const x = cx + 104 + Math.cos(a) * r;
          const y = cy - 22 + Math.sin(a) * r;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
        g.restore();

        // Delicate dashed/hand-inked ghostly full-orbit rings & abstract celestial star crosses!
        strokeHandCircle(g, cx, cy, 276, 76, 12, mr, 3.2, 'rgba(26, 36, 58, 0.52)');
        strokeHandCircle(g, cx, cy, 344, 84, 15, mr, 2.4, 'rgba(26, 36, 58, 0.34)');
        strokeHandCircle(g, cx, cy, 404, 90, 16, mr, 2.0, 'rgba(255, 255, 255, 0.65)');

        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2 + mr() * 0.2;
          const r = 248 + mr() * 185;
          const sx = cx + Math.cos(a) * r;
          const sy = cy + Math.sin(a) * r;
          const sz = 8 + mr() * 15;
          g.strokeStyle = k % 3 === 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(20, 28, 46, 0.78)';
          g.lineWidth = 2.8;
          g.beginPath();
          g.moveTo(sx - sz, sy); g.lineTo(sx + sz, sy);
          g.moveTo(sx, sy - sz); g.lineTo(sx, sy + sz);
          g.stroke();
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    }

    // Position Sun BOLDLY VISIBLE on LEFT side of screen (+X when camera looks +Z!) and Moon on RIGHT side (-X!)
    // Sky plane sits BEHIND the cuboid skyscraper (CUBOID_Z = -86 -> Sky Z = -20)
    const SKY_Z = -20.0;
    const SUN_POS = new THREE.Vector3(+82.0, 68.0, SKY_Z);
    const MOON_POS = new THREE.Vector3(-82.0, 64.0, SKY_Z - 1.5);

    // 10 Concentric Expanding Hand-Drawn Light Layers radiating from the Sun!
    const lightWaveColors = [
      ['rgba(255, 250, 236, 0.96)', 'rgba(255, 244, 212, 0.85)'],
      ['rgba(250, 241, 218, 0.90)', 'rgba(242, 224, 184, 0.78)'],
      ['rgba(244, 232, 204, 0.84)', 'rgba(232, 212, 174, 0.72)'],
      ['rgba(236, 222, 194, 0.78)', 'rgba(220, 202, 168, 0.68)'],
      ['rgba(228, 214, 188, 0.74)', 'rgba(212, 196, 168, 0.62)'],
      ['rgba(220, 208, 186, 0.70)', 'rgba(202, 188, 166, 0.58)'],
      ['rgba(212, 202, 184, 0.68)', 'rgba(196, 184, 166, 0.54)'],
      ['rgba(206, 198, 184, 0.66)', 'rgba(188, 180, 168, 0.50)'],
      ['rgba(202, 196, 186, 0.64)', 'rgba(182, 176, 168, 0.46)'],
      ['rgba(198, 194, 188, 0.62)', 'rgba(176, 172, 168, 0.42)'],
    ];

    const sunLightLayers = [];
    for (let i = 0; i < lightWaveColors.length; i++) {
      const [cFill, cRim] = lightWaveColors[i];
      const tex = makeLightWaveTex(51001 + i * 733, cFill, cRim, i < 2 ? 0.0 : 0.12);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        fog: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      // Stack concentric waves slightly behind the Sun disc (facing -Z toward camera!)
      mesh.position.set(SUN_POS.x, SUN_POS.y, SKY_Z + 1.2 + i * 0.35);
      mesh.rotation.y = Math.PI;
      celestialRoot.add(mesh);
      sunLightLayers.push({
        mesh,
        mat,
        idx: i,
        startAge: START_1_AGE + i * 0.48,
        targetDiam: 78 + i * 62, // Outermost layers expand to 636m+ covering ENTIRE sky behind skyscraper!
        spinRate: (i % 2 === 0 ? 1 : -1) * (0.045 + i * 0.006),
      });
    }

    // Hand-Drawn Abstract Sun (2 counter-rotating painterly layers on LEFT!)
    const sunCoreMat = new THREE.MeshBasicMaterial({
      map: makeAbstractSunTex(0),
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const sunCoreMesh = new THREE.Mesh(new THREE.PlaneGeometry(66, 66), sunCoreMat);
    sunCoreMesh.position.set(SUN_POS.x, SUN_POS.y, SKY_Z - 0.5);
    sunCoreMesh.rotation.y = Math.PI;
    celestialRoot.add(sunCoreMesh);

    const sunRaysMat = new THREE.MeshBasicMaterial({
      map: makeAbstractSunTex(1),
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const sunRaysMesh = new THREE.Mesh(new THREE.PlaneGeometry(84, 84), sunRaysMat);
    sunRaysMesh.position.set(SUN_POS.x, SUN_POS.y, SKY_Z - 0.1);
    sunRaysMesh.rotation.y = Math.PI;
    celestialRoot.add(sunRaysMesh);

    // Hand-Drawn Abstract Moon (RIGHT side, emerges on START Harmony 2 = 64.16s!)
    const moonMat = new THREE.MeshBasicMaterial({
      map: makeAbstractMoonTex(),
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const moonMesh = new THREE.Mesh(new THREE.PlaneGeometry(58, 58), moonMat);
    moonMesh.position.set(MOON_POS.x, MOON_POS.y, SKY_Z - 0.6);
    moonMesh.rotation.y = Math.PI;
    celestialRoot.add(moonMesh);

    // 4 Cool-Silver Concentric Expanding Hand-Drawn Halo Rings around the Moon
    const moonHaloLayers = [];
    for (let i = 0; i < 4; i++) {
      const tex = makeLightWaveTex(
        69001 + i * 911,
        'rgba(222, 232, 250, 0.34)',
        'rgba(176, 194, 228, 0.28)',
        0.35
      );
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        fog: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.position.set(MOON_POS.x, MOON_POS.y, SKY_Z + 0.2 + i * 0.22);
      mesh.rotation.y = Math.PI;
      celestialRoot.add(mesh);
      moonHaloLayers.push({
        mesh,
        mat,
        startAge: START_2_AGE + i * 0.55,
        targetDiam: 58 + i * 38,
        spinRate: (i % 2 === 0 ? -1 : 1) * (0.06 + i * 0.012),
      });
    }

    // =========================================================================
    // 6. CAMERA CHOREOGRAPHY — SMOOTH C∞, NEVER STATIC, FORWARD-BIASED HARD CUTS,
    //    STAIRCASE FOLLOW -> 180° TURNAROUND (TOWER ON LEFT!) -> UPWARD LIFT
    // =========================================================================
    // Forward-moving shot table for Act 1 (Street, 0..19.01s) & Act 2 (Staircase, 19.01..37.82s).
    // EVERY single shot has strictly nonzero forward velocity (vz < 0) and smooth C∞ motion!
    const FORWARD_SHOTS = [
      // --- ACT 1: STREET SURGE AFTER 1st "1 2 3 4" (0.00 -> 19.01s) ---
      // Shot 0 (Bar 18): handled specially below for 1:1 floodCanvas top-down ground tilt!
      // Shot 1 (Bar 19): Extreme low curb perspective rushing forward!
      { t0: 2.38,  t1: 4.75,  p0: [4.4, 1.25, 4.0],     p1: [3.2, 1.55, -13.5],    l0: [-1.4, 2.8, -28],     l1: [-0.8, 3.6, -50],     fov0: 68, fov1: 65, roll0: 0.03,  roll1: -0.02 },
      // Shot 2 (Bar 20.1-2): Crisp brief hard-cut close-up skimming right past signal & wires (STILL moving forward!)
      { t0: 4.75,  t1: 5.94,  p0: [-5.2, 4.9, -4.0],    p1: [-4.6, 5.4, -12.5],    l0: [-2.6, 5.1, -24],     l1: [-1.8, 5.3, -38],     fov0: 38, fov1: 36, roll0: -0.04, roll1: -0.01 },
      // Shot 3 (Bar 20.3-21): Center avenue dramatic wide perspective rushing under footbridge!
      { t0: 5.94,  t1: 9.50,  p0: [-0.8, 2.5, 1.0],     p1: [0.9, 3.7, -21.0],     l0: [0.0, 3.6, -34],      l1: [0.2, 4.4, -64],      fov0: 64, fov1: 68, roll0: 0.0,   roll1: 0.02  },
      // Shot 4 (Bar 22 "Echo"): Tight low hard-cut close-up past crossing cars & crosswalk!
      { t0: 9.50,  t1: 11.88, p0: [5.6, 1.65, -15.0],   p1: [2.4, 2.25, -28.0],    l0: [-1.2, 2.4, -36],     l1: [-0.4, 3.0, -54],     fov0: 44, fov1: 42, roll0: 0.04,  roll1: 0.0   },
      // Shot 5 (Bar 23): Elevated diagonal forward cut looking down toward T-junction!
      { t0: 11.88, t1: 14.26, p0: [-8.2, 8.6, -9.0],    p1: [-4.4, 6.8, -25.0],    l0: [0.6, 2.4, -38],      l1: [0.2, 3.2, -60],      fov0: 58, fov1: 54, roll0: -0.03, roll1: 0.01  },
      // Shot 6 (Bar 24 "Reverb"): Extreme wide-angle surge straight down centerline!
      { t0: 14.26, t1: 16.63, p0: [0.5, 2.4, -10.0],    p1: [-0.4, 4.5, -29.0],    l0: [0.0, 3.6, -44],      l1: [0.0, 5.5, -76],      fov0: 72, fov1: 68, roll0: 0.0,   roll1: -0.02 },
      // Shot 7 (Bar 25, 4 Drum Hits): Camera clears below footbridge, tilts toward ground while surging into T-junction!
      { t0: 16.63, t1: 19.01, p0: [-0.6, 3.0, -25.8],   p1: [2.2, 3.8, -33.8],     l0: [0.0, 2.2, -38],      l1: [0.0, 1.6, -46],      fov0: 64, fov1: 60, roll0: -0.02, roll1: 0.01  },

      // --- ACT 2: STAIRCASE ASCENSION STRAIGHT AHEAD OF T-JUNCTION (19.01 -> 37.82s) ---
      // Staircase coords: F00(z=-38,y=1.6), F01(z=-56.5,y=6.9), F02(z=-75,y=12.1), F03(z=-93.5,y=17.4), F04(z=-112,y=22.6), F05(z=-130.5,y=27.9), F06(z=-149,y=33.1)
      // Shot 8 (Bar 26 — F00 Ramen): Unobstructed forward-upward glide showcasing Floor 0's colossal white ramen bowls!
      { t0: 19.01, t1: 21.39, p0: [5.5, 6.2, -18.0],    p1: [17.8, 10.2, -27.0],   l0: [0.0, 3.4, -38],      l1: [0.0, 5.2, -44],      fov0: 62, fov1: 58, roll0: 0.01,  roll1: 0.03  },
      // Shot 9 (Bar 27 — F00 -> F01 Chains Staircase Reveal): Wide diagonal showing F1 forming AHEAD & ABOVE F0!
      { t0: 21.39, t1: 23.76, p0: [-17.0, 10.2, -22.0], p1: [-20.5, 14.8, -40.0],  l0: [0.0, 7.2, -50],      l1: [0.0, 11.4, -64],     fov0: 64, fov1: 62, roll0: -0.03, roll1: -0.01 },
      // Shot 10 (Bar 28.1-3 — Close-Up on F01 Chains & F02 Badminton White Models + Stickers!):
      { t0: 23.76, t1: 25.54, p0: [15.5, 13.6, -45.0],  p1: [17.2, 17.4, -60.0],   l0: [0.0, 11.8, -58],     l1: [0.0, 15.6, -75],     fov0: 46, fov1: 44, roll0: 0.03,  roll1: 0.01  },
      // Shot 11 (Bar 28.4-29 — F02 -> F03 Colossal Breaching Whale Staircase Wide!):
      { t0: 25.54, t1: 28.51, p0: [-19.5, 16.0, -52.0], p1: [-22.5, 22.8, -76.0],  l0: [0.0, 16.2, -78],     l1: [0.0, 21.5, -98],     fov0: 66, fov1: 64, roll0: -0.02, roll1: 0.0   },
      // Shot 12 (Bar 30 — Close-Up on F03 Whale & F04 Jasmine White Models + Packed Stickers!):
      { t0: 28.51, t1: 30.89, p0: [16.2, 22.2, -76.0],  p1: [18.0, 26.8, -96.0],   l0: [0.0, 21.0, -94],     l1: [0.0, 25.4, -112],    fov0: 44, fov1: 42, roll0: 0.02,  roll1: -0.01 },
      // Shot 13 (Bar 31 — F04 -> F05 Onion Cathedral Monumental Staircase Wide!):
      { t0: 30.89, t1: 33.27, p0: [-21.0, 25.2, -88.0], p1: [-24.0, 31.2, -108.0], l0: [0.0, 25.8, -115],    l1: [0.0, 31.0, -133],    fov0: 66, fov1: 64, roll0: -0.03, roll1: -0.01 },
      // Shot 14 (Bar 32 — Tight Forward Close-Up Past F05 Onion & F06 Circling Sharks!):
      { t0: 33.27, t1: 35.64, p0: [16.5, 31.8, -109.0], p1: [18.2, 36.8, -128.0],  l0: [0.0, 31.6, -131],    l1: [0.0, 36.2, -149],    fov0: 45, fov1: 43, roll0: 0.03,  roll1: 0.01  },
      // Shot 15 (Bar 33 — Final Forward Staircase Rush right up to 180° Turnaround!):
      { t0: 35.64, t1: 37.82, p0: [-19.0, 34.8, -118.0],p1: [-21.0, 37.0, -134.0], l0: [0.0, 33.8, -142],    l1: [0.0, 34.5, -154],    fov0: 64, fov1: 60, roll0: -0.02, roll1: 0.0   },
    ];

    const camPosVec = new THREE.Vector3();
    const camLookVec = new THREE.Vector3();
    const camUpVec = new THREE.Vector3(0, 1, 0);

    // Helper: compute continuous left-framed upward-lifting cuboid camera for age >= 37.82s
    // Remember: camera faces +Z toward CUBOID_Z (-86), so:
    //   Screen RIGHT is -X, Screen LEFT is +X!
    //   Placing lookX negatively (toward -X) anchors the x=0 cuboid squarely onto the LEFT majority of screen!
    function evalCuboidAscentPose(age) {
      // Smooth C∞ continuous upward lift & pullback across Bar 34 -> Bar 52 (38s -> 85s)
      const uMid = clamp((age - 38.02) / (START_1_AGE - 38.02), 0, 1); // 0 -> 1 across Bar 34..41
      const uFin = tanhStep(age, START_1_AGE + 1.8, 3.6);             // 0 -> 1 during START Sun/Moon finale!
      const eternalClimb = (age - 38.02) * 0.18;                      // Guarantees vy != 0 even at 85s!

      // During Bar 34-41 (Cuboid forming F07..F12): CLOSE monumental distance D = 24 -> 34m so skyscraper
      // fills the LEFT MAJORITY (~2% -> 58% of viewport width!) as the camera smoothly rises upward!
      // During Bar 42-52 (START Sun/Moon finale): smoothly pulls back to D = 78m so FULL 13-story silhouette
      // + fully visible Hand-Drawn Sun (far LEFT) + Hand-Drawn Crescent Moon (RIGHT) shine together!
      const dist = lerp(24.5, 34.5, uMid) + uFin * 44.5 + (age - 38.02) * 0.12;
      const fov = lerp(55, 57, uMid) + uFin * 2.5;

      // Half-width of frustum at tower plane -> shift lookX toward screen RIGHT (-X) so tower sits on LEFT!
      const halfW = dist * Math.tan((fov * Math.PI) / 360) * aspect;
      // During ascent: center tower at ndcX ≈ -0.44 (fills LEFT MAJORITY 2%..58% of frame!);
      // During START finale: center tower at ndcX ≈ -0.22 (fills 25%..50%, leaving bold open room for Sun at far-left 10% & Moon at right 80%!)
      const leftFrac = lerp(0.44, 0.22, uFin);

      // Slight architectural 3/4 offset so two sculpted faces of the rectangular cuboid catch studio light!
      const camX = -halfW * leftFrac - lerp(5.2, 8.8, uFin) + Math.sin(age * 0.24) * 0.75;
      const lookX = -halfW * leftFrac - lerp(1.0, 2.0, uFin);

      // Continuous upward lift (`镜头开始向上拉升`) climbing steadily past F05 -> F12, then holding grand silhouette horizon!
      const ascentY = 17.5 + 45.0 * tanhStep(age, 47.5, 7.0);
      const finaleLookDrop = uFin * 16.5;
      const camY = ascentY - uFin * 5.0 + eternalClimb;
      const lookY = ascentY + 4.0 - finaleLookDrop + eternalClimb * 0.55;

      const camZ = CUBOID_Z - dist;
      const lookZ = CUBOID_Z;

      return {
        pos: [camX, camY, camZ],
        look: [lookX, lookY, lookZ],
        fov,
      };
    }

    function updateCameraAt(age, kickEnergy) {
      let roll = 0;

      if (age < 2.38) {
        // --- SHOT 0 (Bar 18.1 -> 18.4): 1:1 TOP-DOWN FLOOD COLLAGE -> GROUND TILT + CONTINUOUS FORWARD SURGE! ---
        const u = clamp(age / 2.38, 0, 1);
        // Smooth C∞ pitch-up curve starting gently at 0.00s (so exact frame 0 is pixel-locked 1:1 to floodCanvas!)
        const tiltU = u * u * (3 - 2 * u);
        const surgeU = u * u * 0.85 + u * 0.15;

        const cx = Math.sin(u * Math.PI) * 0.45;
        const cy = lerp(TOP_CAM_Y, 2.0, tiltU);
        const cz = lerp(ROAD_PATCH_Z, 3.8, surgeU);
        const lx = 0;
        const ly = lerp(0.0, 2.6, tiltU);
        const lz = lerp(ROAD_PATCH_Z, -36.0, tiltU);

        camPosVec.set(cx, cy, cz);
        camLookVec.set(lx, ly, lz);
        // Seamlessly rotate up vector from (0, 0, -1) (top-down exact alignment) to (0, 1, 0) (upright!)
        camUpVec.set(0, tiltU, -(1 - tiltU)).normalize();
        camera.fov = lerp(BASE_FOV, 64, tiltU);
      } else if (age < 37.82) {
        // --- ACT 1 (Street Forward Cuts) & ACT 2 (Staircase Ascending Forward Cuts) ---
        let shot = FORWARD_SHOTS[FORWARD_SHOTS.length - 1];
        for (let i = 0; i < FORWARD_SHOTS.length; i++) {
          if (age >= FORWARD_SHOTS[i].t0 && age < FORWARD_SHOTS[i].t1) {
            shot = FORWARD_SHOTS[i];
            break;
          }
        }
        const u = clamp((age - shot.t0) / Math.max(0.001, shot.t1 - shot.t0), 0, 1);
        // Smooth strictly-monotonic C∞ pacing inside every cut (nonzero velocity everywhere!)
        const m = 0.82 * u + 0.18 * (0.5 - 0.5 * Math.cos(u * Math.PI));

        const px = lerp(shot.p0[0], shot.p1[0], m);
        const py = lerp(shot.p0[1], shot.p1[1], m);
        const pz = lerp(shot.p0[2], shot.p1[2], m);
        const lx = lerp(shot.l0[0], shot.l1[0], m);
        const ly = lerp(shot.l0[1], shot.l1[1], m);
        const lz = lerp(shot.l0[2], shot.l1[2], m);

        camPosVec.set(px, py, pz);
        camLookVec.set(lx, ly, lz);
        camUpVec.set(0, 1, 0);
        const r0 = shot.roll0 || 0;
        const r1 = shot.roll1 ?? r0;
        roll = lerp(r0, r1, m);
        camera.fov = lerp(shot.fov0 || BASE_FOV, shot.fov1 || BASE_FOV, m) - kickEnergy * 0.9;
      } else if (age < 39.45) {
        // --- SILKY 180° CAMERA TURNAROUND ("然后镜头也回头") KEEPING THE CONVERGING FLOORS IN FRAME! ---
        const turnU = tanhStep(age, 38.42, 0.34);
        const target = evalCuboidAscentPose(age);

        // Smooth wide curved orbit from end of Shot 15 (-21, 37, -134) around to left-framed cuboid pose
        // while tracking the converging staircase-to-cuboid mass (ZERO empty black frame during turnaround!)
        const swingOut = Math.sin(turnU * Math.PI) * 14.0;
        const px = lerp(-21.0, target.pos[0], turnU) - swingOut;
        const py = lerp(37.0, target.pos[1], turnU) + Math.sin(turnU * Math.PI) * 4.5;
        const pz = lerp(-134.0, target.pos[2], turnU) - Math.sin(turnU * Math.PI) * 12.0;

        // Track the converging skyscraper center directly (morphs smoothly from staircase F06 z=-149 to cuboid z=-86!)
        const lx = lerp(0.0, target.look[0], turnU);
        const ly = lerp(32.0, target.look[1], turnU);
        const lz = lerp(-144.0, target.look[2], turnU);

        camPosVec.set(px, py, pz);
        camLookVec.set(lx, ly, lz);
        camUpVec.set(0, 1, 0);
        roll = Math.sin(turnU * Math.PI) * 0.06; // subtle dramatic whip-orbit banking!
        camera.fov = lerp(60, target.fov, turnU);
      } else {
        // --- ACT 3 & ACT 4 (39.45s -> 85s): CUBOID LEFT-FRAMED CONTINUOUS UPWARD LIFT + START FINALE! ---
        const pose = evalCuboidAscentPose(age);
        camPosVec.set(pose.pos[0], pose.pos[1], pose.pos[2]);
        camLookVec.set(pose.look[0], pose.look[1], pose.look[2]);
        camUpVec.set(0, 1, 0);
        // Subtle rhythmic camera breathing synced to kicks (dims smoothly into serene awe during START!)
        const calmU = tanhStep(age, START_1_AGE, 1.8);
        camera.fov = pose.fov - kickEnergy * 0.75 * (1 - calmU);
        roll = Math.sin(age * 0.32) * 0.012 * (1 - calmU);
      }

      camera.position.copy(camPosVec);
      camera.up.copy(camUpVec);
      camera.lookAt(camLookVec);
      if (Math.abs(roll) > 0.0001) {
        camera.rotateZ(roll);
      }
      camera.updateProjectionMatrix();
    }

    // =========================================================================
    // 7. PER-FRAME UPDATE FUNCTIONS (100% DETERMINISTIC AT ANY `age`!)
    // =========================================================================
    function updateStreet(age, beatPos, kickEnergy) {
      // Fade street completely out before the 180° camera turnaround (age ~26s) so sky behind tower is pure black!
      if (age > 29.0) {
        streetRoot.visible = false;
        return;
      }
      streetRoot.visible = true;

      // Smooth dissolve of initial Bar 17 top-down flood patch
      const patchFade = 1 - tanhStep(age, 1.55, 0.42);
      collageMesh.visible = patchFade > 0.01;
      collageMat.opacity = patchFade;

      // 4-note R->L stereo wave pulse (0=R-far -> 1=R-near -> 2=L-near -> 3=L-far every half-bar!)
      const activeZone = Math.floor(beatPos * 2) % 4;

      // Global Staircase graceful street exit stream (stays grounded through Bar 25 T-junction, clears by age 27s!)
      const exitGlobal = tanhStep(age, 23.0, 1.5);
      roadUnderlayMain.visible = exitGlobal < 0.72;
      roadUnderlayCross.visible = exitGlobal < 0.72;

      // Update road strips (continuous gentle flow + smooth exit after entering staircase!)
      for (let i = 0; i < roadStrips.length; i++) {
        const rs = roadStrips[i];
        const ex = tanhStep(age, 22.0 + (i % 4) * 0.35, 1.25);
        rs.mesh.position.set(
          rs.x0 + rs.exitDir.x * ex,
          rs.y0 + rs.exitDir.y * ex + Math.sin(age * 1.1 + rs.phase) * 0.015,
          rs.z0 + age * rs.driftSpeed + rs.exitDir.z * ex
        );
        rs.mesh.rotation.y = rs.yaw0 + rs.exitSpin * ex;
        const sc = 1 - 0.85 * exitGlobal;
        rs.mesh.scale.set(sc, sc, sc);
      }

      // Update all street buildings, poles, signals, footbridge & roadside cutouts (ZERO velocity zero-points!)
      for (let i = 0; i < streetProps.length; i++) {
        const sp = streetProps[i];
        const shockT = SHOCK_KICKS[sp.shockIdx] || 17.5;
        const shockEx = tanhStep(age, shockT + 3.4, 1.25);

        const zonePulse = sp.stereoZone >= 0
          ? (sp.stereoZone === activeZone ? 0.14 : 0.0)
          : 0.0;
        const beatLift = kickEnergy * sp.kickPop + zonePulse;

        sp.obj.position.set(
          sp.x0 + Math.sin(age * sp.swayFreq + sp.phase) * 0.22 + sp.exitVec.x * shockEx,
          sp.y0 + Math.abs(Math.sin(age * sp.swayFreq * 0.7 + sp.phase)) * 0.16 + sp.exitVec.y * shockEx,
          sp.z0 + age * sp.vz + sp.exitVec.z * shockEx
        );
        sp.obj.rotation.set(
          sp.rx0 + Math.sin(age * sp.swayFreq + sp.phase) * sp.swayAmp + sp.exitOmega.x * shockEx,
          sp.ry0 + Math.cos(age * sp.swayFreq * 0.8 + sp.phase) * (sp.swayAmp * 0.7) + sp.exitOmega.y * shockEx,
          sp.rz0 + Math.sin(age * sp.swayFreq * 1.15 + sp.phase) * sp.swayAmp + sp.exitOmega.z * shockEx
        );
        const sc = (1.0 + beatLift) * (1.0 - 0.88 * exitGlobal);
        sp.obj.scale.set(sp.s0.x * sc, sp.s0.y * sc, sp.s0.z * sc);
      }

      // Footbridge 4 stereo lightboxes crisp rhythmic pulse
      for (let i = 0; i < bridgeLightboxes.length; i++) {
        const lb = bridgeLightboxes[i];
        const hit = lb.zone === activeZone ? 1.16 : 0.96;
        lb.mesh.scale.set(hit, hit, 1);
      }

      // Continuously gliding real-photo cars (never stop!)
      for (let i = 0; i < streetCars.length; i++) {
        const c = streetCars[i];
        const carExit = tanhStep(age, 18.2 + (i % 3) * 0.4, 1.1);
        const carScale = 1 - 0.9 * carExit;
        if (c.isCross) {
          const rawX = c.startX + c.dir * c.speed * age;
          const wrapX = ((((rawX + c.span * 0.5) % c.span) + c.span) % c.span) - c.span * 0.5;
          c.grp.position.set(wrapX, 0.06 + carExit * 14, c.laneZ);
        } else {
          const rawZ = c.startZ + c.dir * c.speed * age;
          const wrapZ = ((((rawZ + 46) % c.span) + c.span) % c.span) - 46;
          c.grp.position.set(c.laneX, 0.06 + carExit * 14, wrapZ);
        }
        c.grp.scale.set(carScale, carScale, carScale);
      }
    }

    function updateCelestialsAndLighting(age) {
      // Silhouette transition synced with START_1_AGE (57.03s):
      // As Sun appears on LEFT and its concentric light layers expand across the sky behind the skyscraper,
      // the tower lighting smoothly fades out so the entire skyscraper turns into a bold ink-black silhouette!
      const silU = tanhStep(age, START_1_AGE + 2.3, 1.35);

      const lightGain = 1.0 - 0.97 * silU;
      hemiLight.intensity = 0.96 * lightGain;
      keyLight.intensity = 1.18 * lightGain;
      rimLight.intensity = 0.78 * lightGain;
      fillLight.intensity = 0.62 * lightGain;

      if (tower && tower.setSilhouetteAmount) {
        tower.setSilhouetteAmount(silU);
      }

      // Keep celestial backdrop invisible until just before START_1_AGE so pure black sky stays untouched!
      if (age < START_1_AGE - 2.0) {
        celestialRoot.visible = false;
        return;
      }
      celestialRoot.visible = true;

      // 1. Hand-Drawn Abstract Sun (LEFT side, emerges smoothly at START_1_AGE = 57.03s!)
      const sunU = tanhStep(age, START_1_AGE + 0.55, 0.95);
      const sunScale = 0.15 + 0.85 * sunU + Math.max(0, age - START_1_AGE) * 0.008;
      sunCoreMesh.scale.set(sunScale, sunScale, 1);
      sunCoreMesh.rotation.z = age * 0.095;
      sunCoreMat.opacity = clamp(sunU * 1.05, 0, 1);

      const raysScale = (0.12 + 0.88 * sunU) * (1.0 + Math.sin(age * 1.4) * 0.03) + Math.max(0, age - START_1_AGE) * 0.011;
      sunRaysMesh.scale.set(raysScale, raysScale, 1);
      sunRaysMesh.rotation.z = -age * 0.068;
      sunRaysMat.opacity = clamp(sunU * 0.92, 0, 1);

      // 2. Expanding Concentric Layers of Light from Sun (illuminates sky behind tower!)
      for (let i = 0; i < sunLightLayers.length; i++) {
        const lw = sunLightLayers[i];
        const wU = tanhStep(age, lw.startAge + 0.9, 1.65);
        // Smooth eternal radial expansion (NEVER hits zero velocity!)
        const extraDrift = Math.max(0, age - lw.startAge) * (2.6 + i * 0.45);
        const diam = Math.max(0.5, lw.targetDiam * wU + extraDrift);
        lw.mesh.scale.set(diam, diam, 1);
        lw.mesh.rotation.z = age * lw.spinRate + i * 0.6;
        lw.mat.opacity = clamp(wU * 1.08, 0, 1);
      }

      // 3. Hand-Drawn Abstract Moon (RIGHT side, emerges smoothly at START_2_AGE = 64.16s!)
      const moonU = tanhStep(age, START_2_AGE + 0.65, 1.05);
      const moonScale = 0.12 + 0.88 * moonU + Math.max(0, age - START_2_AGE) * 0.006;
      moonMesh.visible = moonU > 0.01;
      moonMesh.scale.set(moonScale, moonScale, 1);
      moonMesh.rotation.z = 0.22 + Math.sin(age * 0.35) * 0.08 - Math.max(0, age - START_2_AGE) * 0.014;
      moonMat.opacity = clamp(moonU * 1.05, 0, 1);

      for (let i = 0; i < moonHaloLayers.length; i++) {
        const mh = moonHaloLayers[i];
        const mU = tanhStep(age, mh.startAge + 0.8, 1.55);
        mh.mesh.visible = mU > 0.01;
        const extraM = Math.max(0, age - mh.startAge) * (1.8 + i * 0.35);
        const diam = Math.max(0.5, mh.targetDiam * mU + extraM);
        mh.mesh.scale.set(diam, diam, 1);
        mh.mesh.rotation.z = age * mh.spinRate + i * 0.9;
        mh.mat.opacity = clamp(mU * 0.92, 0, 1);
      }
    }

    // =========================================================================
    // 8. MAIN DETERMINISTIC RENDER ENTRY POINT
    // =========================================================================
    function render(t, floodCanvas) {
      if (pendingTextures.length > 0) {
        // Before Bar 18.1, drip-paint at most 4 textures per frame (~1ms) so Beat-1 & monitors NEVER drop frames!
        flushPendingTextures(t < T_START ? 4 : pendingTextures.length);
      }
      if (tower && tower.flushStickerAtlases) {
        tower.flushStickerAtlases(t < T_START ? 1 : 20);
      }

      if (t < T_START) {
        if (active) {
          active = false;
          wrap.style.visibility = 'hidden';
        }
        return false;
      }

      if (!active) {
        active = true;
        captureRoadCollage(floodCanvas);
        wrap.style.visibility = 'visible';
      }

      const age = Math.max(0, t - T_START);
      const beatPos = age / BEAT;
      const kickEnergy = computeKickEnergy(age);

      updateStreet(age, beatPos, kickEnergy);
      if (tower && tower.updateTower) {
        tower.updateTower(age, beatPos, kickEnergy);
      }
      updateCelestialsAndLighting(age);
      updateCameraAt(age, kickEnergy);

      renderer.render(scene, camera);
      return true;
    }

    function destroy() {
      if (collageTexture) collageTexture.dispose();
      textureCache.forEach((tex) => tex.dispose());
      textureCache.clear();
      renderer.dispose();
      if (wrap.parentNode) wrap.remove();
    }

    return { render, destroy, collageActors };
  }

  window.MicCheckSketch3D = { create };
})();
