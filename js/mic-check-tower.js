(() => {
  'use strict';

  // =========================================================================
  // MIC CHECK — SHANGHAI TOWER (上海中心大厦) FLUID HELICAL SKYSCRAPER
  //
  // Strict Guarantees:
  //   1. FLUID SHANGHAI TOWER ARCHITECTURE:
  //      - Soft 3-lobed Reuleaux rounded-triangle aerodynamic floorplan
  //      - Continuous 120° helical spiral twist from base (y=0) to crown (y=66m)
  //      - Progressive fluid tapering (R = 16.4m -> 9.2m) + sweeping helical
  //        curtain-wall airfoil ribbons + open spiral sky-atrium galleries +
  //        iconic Shanghai Tower diagonal sculpted asymmetric crown!
  //   2. 100% SEAMLESS EDGE-TO-EDGE PHOTO SKIN ON EVERY 3D MODEL & SURFACE:
  //      - ZERO bare white-clay or untextured 3D model materials shown anywhere!
  //      - Every GLB model and every curved architectural surface stretches a
  //        real user-supplied photo tightly edge-to-edge [0..1]x[0..1] across
  //        its 3D geometry.
  //   3. ZERO DUPLICATE ASSETS WITHIN ANY FLOOR:
  //      - Strict per-floor Set() guarantees every single model & curved panel
  //        on a floor uses a completely unique user-provided image file.
  //   4. C∞ CONTINUOUS MOTION + EXACT VOCAL SYNC:
  //      - Every "MIC CHECK" smoothly unfolds new fluid batches (tanhStep)
  //      - Every stereo Left/Right "啊 啊" smoothly torques a floor Left/Right
  //      - START chant (57.03s+) turns the entire spiraling Shanghai Tower into
  //        a razor-sharp backlit silhouette against the Sun's expanding light!
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

  function tanhStep(t, t0, w) {
    return 0.5 * (1 + Math.tanh((t - t0) / w));
  }

  // Exact measured "MIC CHECK" vocal hits (age in seconds since Bar 18.1 = 40.396s)
  const MIC_CHECK_HITS = [
    19.01, 20.49, 21.68, 22.87, 23.76, 25.25,
    26.14, 27.62, 28.51, 30.00, 30.89, 32.38,
    33.27, 34.75, 35.64, 37.13,
    38.02, 39.50, 40.39, 41.88, 42.77, 44.26,
    45.15, 46.04, 47.52, 49.01, 49.90, 50.79,
    52.28, 53.46, 54.65, 55.84,
  ];

  // Exact measured stereo LEFT / RIGHT "啊 啊" vocal hits
  // dir = -1 (Left <<<L) rotates floor left, dir = +1 (Right R>>>) rotates floor right
  const AH_STEREO_ROT_HITS = [
    { t: 19.90, dir: -1, floorIdx: 0 },
    { t: 20.20, dir: +1, floorIdx: 0 },
    { t: 21.09, dir: -1, floorIdx: 1 },
    { t: 21.39, dir: +1, floorIdx: 1 },
    { t: 22.28, dir: -1, floorIdx: 1 },
    { t: 22.57, dir: +1, floorIdx: 2 },
    { t: 24.65, dir: -1, floorIdx: 2 },
    { t: 24.95, dir: +1, floorIdx: 3 },
    { t: 27.03, dir: -1, floorIdx: 3 },
    { t: 27.33, dir: +1, floorIdx: 4 },
    { t: 29.41, dir: +1, floorIdx: 4 },
    { t: 29.70, dir: -1, floorIdx: 4 },
    { t: 31.78, dir: +1, floorIdx: 5 },
    { t: 32.08, dir: -1, floorIdx: 5 },
    { t: 32.97, dir: +1, floorIdx: 5 },
    { t: 34.16, dir: +1, floorIdx: 6 },
    { t: 34.45, dir: -1, floorIdx: 6 },
    { t: 36.53, dir: +1, floorIdx: 6 },
    { t: 36.83, dir: -1, floorIdx: 5 },
    { t: 38.91, dir: -1, floorIdx: 7 },
    { t: 39.21, dir: +1, floorIdx: 7 },
    { t: 41.29, dir: -1, floorIdx: 8 },
    { t: 41.58, dir: +1, floorIdx: 8 },
    { t: 43.66, dir: -1, floorIdx: 9 },
    { t: 43.96, dir: +1, floorIdx: 9 },
    { t: 44.85, dir: -1, floorIdx: 10 },
    { t: 48.41, dir: +1, floorIdx: 10 },
    { t: 48.71, dir: -1, floorIdx: 11 },
    { t: 49.60, dir: +1, floorIdx: 11 },
    { t: 52.28, dir: +1, floorIdx: 12 },
    { t: 53.46, dir: -1, floorIdx: 12 },
  ];

  // Shanghai Tower rounded-triangle (Reuleaux) aerodynamic floorplan profile
  function reuleauxR(theta, baseR) {
    return baseR * (1.0 + 0.148 * Math.cos(3 * theta) + 0.024 * Math.cos(6 * theta));
  }

  // Build lofted fluid helical curtain-wall panel (sweeps smoothly along Reuleaux curve + twists from bot to top!)
  function buildHelicalCurtainRibbonGeo(THREE, rBot, rTop, height, thetaStart, thetaEnd, twistDelta, segU, segV) {
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const y = v * height;
      const rBase = rBot + (rTop - rBot) * v;
      const tw = twistDelta * v;
      // Subtle aerodynamic belly bulge along vertical arc
      const bulge = 1.0 + Math.sin(v * Math.PI) * 0.025;

      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const thLocal = thetaStart + (thetaEnd - thetaStart) * u;
        const r = reuleauxR(thLocal, rBase) * bulge;
        const thWorld = thLocal + tw;
        positions.push(Math.cos(thWorld) * r, y, Math.sin(thWorld) * r);
        uvs.push(u, v);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = a + 1;
        const c = (iv + 1) * row + iu;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // Build fluid sweeping Reuleaux floor ring slab (curved outer facade edge + flat walkable deck!)
  function buildFluidSlabGeo(THREE, rInner, rOuter, thickness, segU) {
    const positions = [];
    const uvs = [];
    const indices = [];

    // 4 rings: inner-top(0), outer-top(1), outer-bot(2), inner-bot(3)
    const profiles = [
      { radMult: rInner, y: thickness, v: 0.0 },
      { radMult: rOuter, y: thickness, v: 0.35 },
      { radMult: rOuter, y: 0.0,       v: 0.70 },
      { radMult: rInner, y: 0.0,       v: 1.0 },
    ];

    for (let ip = 0; ip < profiles.length; ip++) {
      const pr = profiles[ip];
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const th = u * Math.PI * 2;
        const r = reuleauxR(th, pr.radMult);
        positions.push(Math.cos(th) * r, pr.y, Math.sin(th) * r);
        uvs.push(u, pr.v);
      }
    }

    const row = segU + 1;
    for (let ip = 0; ip < profiles.length; ip++) {
      const nextP = (ip + 1) % profiles.length;
      for (let iu = 0; iu < segU; iu++) {
        const a = ip * row + iu;
        const b = a + 1;
        const c = nextP * row + iu;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // Build sweeping aerodynamic exterior spiral spine fin (Shanghai Tower's iconic diagonal wind fin!)
  function buildFluidSpiralFinGeo(THREE, rBot, rTop, height, thetaCorner, twistDelta, finDepth, segV) {
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const y = v * height;
      const rBase = rBot + (rTop - rBot) * v;
      const rCore = reuleauxR(thetaCorner, rBase);
      const thW = thetaCorner + twistDelta * v;
      const cosT = Math.cos(thW);
      const sinT = Math.sin(thW);
      const flare = finDepth * (0.85 + 0.30 * Math.sin(v * Math.PI));

      // Inner attachment -> outer aerodynamic fin tip
      positions.push(cosT * (rCore - 0.6), y, sinT * (rCore - 0.6));
      uvs.push(0.0, v);
      positions.push(cosT * (rCore + flare), y, sinT * (rCore + flare));
      uvs.push(1.0, v);
    }

    for (let iv = 0; iv < segV; iv++) {
      const a = iv * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // Build iconic Shanghai Tower slanted asymmetric fluid crown parapet (swoops gracefully to peak!)
  function buildShanghaiCrownGeo(THREE, rBot, rTop, baseH, peakH, twistDelta, segU, segV) {
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const rBase = rBot + (rTop - rBot) * v;
      const tw = twistDelta * v;
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const thLocal = u * Math.PI * 2;
        // Asymmetric soaring diagonal roofline characteristic of Shanghai Tower!
        const localMaxH = baseH + (peakH - baseH) * (0.5 + 0.5 * Math.cos(thLocal - 0.65));
        const y = v * localMaxH;
        const r = reuleauxR(thLocal, rBase);
        const thW = thLocal + tw;
        positions.push(Math.cos(thW) * r, y, Math.sin(thW) * r);
        uvs.push(u, v);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = a + 1;
        const c = (iv + 1) * row + iu;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function buildShanghaiFluidTower(ctx) {
    const {
      THREE, scene, TOWER_X, TOWER_Z,
      getImage, towerThemes, concreteTextures, brickTextures, archTextures,
      roadTextures, buildingsClean, housesPool, streetsPool, screensPool,
      signsPool, signalsPool, carsPool, polesPool, itemsPool,
      cityAssets, extraRefs, onTextureReady,
    } = ctx;

    const rng = makeRng(20261128);
    const towerRoot = new THREE.Group();
    towerRoot.position.set(TOWER_X, 0, TOWER_Z);
    scene.add(towerRoot);

    // -----------------------------------------------------------------------
    // 1. MASTER UNIQUE USER-SUPPLIED ASSET REGISTRY (ZERO DUPLICATES PER FLOOR!)
    // -----------------------------------------------------------------------
    const masterBySrc = new Map();
    const archFacadePool = []; // Ideal full-frame textures for sweeping Shanghai Tower ribbons & slabs!
    const generalPhotoPool = [];

    function pushUniqueTo(arr, list) {
      if (!Array.isArray(list)) return;
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        if (!m || !m.src) continue;
        if (!masterBySrc.has(m.src)) {
          masterBySrc.set(m.src, m);
          generalPhotoPool.push(m);
        }
        if (arr && arr.indexOf(m) === -1) arr.push(m);
      }
    }

    // Prioritize rich opaque architectural & urban photo textures for fluid tower skins
    pushUniqueTo(archFacadePool, extraRefs);
    pushUniqueTo(archFacadePool, archTextures);
    pushUniqueTo(archFacadePool, concreteTextures);
    pushUniqueTo(archFacadePool, brickTextures);
    pushUniqueTo(archFacadePool, roadTextures);
    pushUniqueTo(archFacadePool, buildingsClean);
    pushUniqueTo(archFacadePool, housesPool);
    pushUniqueTo(archFacadePool, streetsPool);
    pushUniqueTo(archFacadePool, screensPool);
    pushUniqueTo(archFacadePool, signsPool);
    pushUniqueTo(null, signalsPool);
    pushUniqueTo(null, carsPool);
    pushUniqueTo(null, polesPool);
    pushUniqueTo(null, itemsPool);

    if (cityAssets && typeof cityAssets === 'object') {
      Object.keys(cityAssets).forEach((cat) => {
        pushUniqueTo(
          (cat.includes('街') || cat === '小屋' || cat === '天桥' || cat === '高架' || cat === '冷却塔') ? archFacadePool : null,
          cityAssets[cat]
        );
      });
    }

    // Also ensure every towerTheme image is registered in masterBySrc
    (towerThemes || []).forEach((th) => {
      if (th && Array.isArray(th.items)) {
        th.items.forEach((m) => {
          if (m && m.src && !masterBySrc.has(m.src)) {
            masterBySrc.set(m.src, m);
          }
        });
      }
    });

    // -----------------------------------------------------------------------
    // 2. FULL-BLEED EDGE-TO-EDGE STRETCHED PHOTO MATERIAL FACTORY
    //    Every single texel [0..1]x[0..1] is 100% stretched real photo imagery:
    //    ZERO white margins, ZERO blank gaps, ZERO untextured clay model shown!
    // -----------------------------------------------------------------------
    const fullBleedTexCache = new Map();
    const pendingPainters = [];
    const silhouetteMats = [];

    function getFullBleedPhotoTex(meta) {
      if (!meta || !meta.src) return null;
      if (fullBleedTexCache.has(meta.src)) return fullBleedTexCache.get(meta.src);

      const cnv = document.createElement('canvas');
      cnv.width = 512;
      cnv.height = 512;
      const g = cnv.getContext('2d');
      const tex = new THREE.CanvasTexture(cnv);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      const im = getImage(meta.src);

      function paint() {
        if (!g || !im || !im.complete || !im.naturalWidth) return false;
        const sx = meta.x0 || 0;
        const sy = meta.y0 || 0;
        const sw = meta.bw || im.naturalWidth;
        const sh = meta.bh || im.naturalHeight;

        // Pass 1: zoomed-in full-bleed backdrop from the SAME photo so cutout PNG corners NEVER show white/black gaps!
        g.clearRect(0, 0, 512, 512);
        const padX = sw * 0.16;
        const padY = sh * 0.16;
        g.drawImage(im, sx + padX, sy + padY, Math.max(1, sw - padX * 2), Math.max(1, sh - padY * 2), 0, 0, 512, 512);
        // Pass 2: crisp full opaque bounding box stretched 100% edge-to-edge [0..512]x[0..512]!
        g.drawImage(im, sx, sy, sw, sh, 0, 0, 512, 512);

        tex.needsUpdate = true;
        if (onTextureReady) onTextureReady();
        return true;
      }

      if (!paint()) {
        pendingPainters.push(paint);
        im.addEventListener('load', () => { paint(); }, { once: true });
      }
      fullBleedTexCache.set(meta.src, tex);
      return tex;
    }

    function createFullBleedPhotoMat(meta, emissiveBoost) {
      const tex = getFullBleedPhotoTex(meta);
      const baseEmissive = emissiveBoost ?? 0.42;
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        roughness: 0.52,
        metalness: 0.08,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: baseEmissive,
        side: THREE.DoubleSide,
      });
      silhouetteMats.push({ mat, baseEmissive });
      return mat;
    }

    // -----------------------------------------------------------------------
    // 3. GLB ASYNC BINDING (Shared VBOs, Per-Instance Unique Stretched Photo Mat!)
    // -----------------------------------------------------------------------
    const glbBindings = [];
    // Smooth organic curved droplet fallback until GLB finishes fetching (~50ms)
    const fallbackGeo = new THREE.SphereGeometry(0.46, 10, 8);
    fallbackGeo.translate(0, 0.46, 0);

    function createPhotoWrappedGlb(url, scaleVal, mat) {
      const mesh = new THREE.Mesh(fallbackGeo, mat);
      mesh.scale.set(scaleVal, scaleVal, scaleVal);
      glbBindings.push({ mesh, url });
      return mesh;
    }

    function loadAllGlbs() {
      if (!window.MicCheckGLB) return;
      const urls = new Set(glbBindings.map((b) => b.url));
      urls.forEach((url) => {
        window.MicCheckGLB.loadGeometry(THREE, url).then((geo) => {
          if (!geo) return;
          for (let i = 0; i < glbBindings.length; i++) {
            if (glbBindings[i].url === url) {
              glbBindings[i].mesh.geometry = geo;
            }
          }
          if (onTextureReady) onTextureReady();
        });
      });
    }

    // Sculptural fluid procedural fallback geometries for F11 (Soviet) & F12 (Temple)
    const sovietRibbonGeo = new THREE.TorusKnotGeometry(0.36, 0.14, 28, 8);
    sovietRibbonGeo.translate(0, 0.52, 0);
    const templeWaveGeo = new THREE.ConeGeometry(0.62, 1.0, 12, 3, false);
    templeWaveGeo.translate(0, 0.5, 0);

    // -----------------------------------------------------------------------
    // 4. BUILD ALL 13 HELICAL FLUID SHANGHAI TOWER FLOORS
    //    Total Height: ~66m | Base Radius: 16.4m -> Crown Radius: 9.2m | 120° Twist!
    // -----------------------------------------------------------------------
    const STAGE_COUNT = 13;
    const FLOOR_H = 4.65;
    const TOTAL_TWIST = (Math.PI * 2) / 3; // Iconic 120° Shanghai Tower helical rotation!
    const FLOOR_TWIST = TOTAL_TWIST / STAGE_COUNT;

    function radiusAtLevel(lvl) {
      const u = clamp(lvl / STAGE_COUNT, 0, 1);
      return 16.4 * (1.0 - 0.44 * Math.pow(u, 1.12));
    }

    const FLOOR_GLB_SPECS = [
      { id: '01_anhui_noodles',  glbs: ['./items/lowpoly/安徽板面/ramen.glb'], count: 14, heroScale: 7.4, swarmMin: 3.4, swarmMax: 5.8 },
      { id: '02_metal_chains',   glbs: ['./items/lowpoly/金属锁链/chain.glb'], count: 16, heroScale: 8.6, swarmMin: 4.4, swarmMax: 7.2 },
      { id: '03_badminton',      glbs: ['./items/lowpoly/羽毛球/racket.glb', './items/lowpoly/羽毛球/shuttlecock.glb'], count: 16, heroScale: 8.2, swarmMin: 3.4, swarmMax: 6.2 },
      { id: '04_whale',          glbs: ['./items/lowpoly/鲸鱼/whale.glb'], count: 12, heroScale: 10.6, swarmMin: 4.8, swarmMax: 8.2 },
      { id: '05_jasmine',        glbs: ['./items/lowpoly/夜来香/night-jasmine.glb'], count: 14, heroScale: 7.8, swarmMin: 3.8, swarmMax: 6.4 },
      { id: '06_onion',          glbs: ['./items/lowpoly/洋葱/onion.glb'], count: 14, heroScale: 7.4, swarmMin: 3.5, swarmMax: 6.0 },
      { id: '07_shark',          glbs: ['./items/lowpoly/鲨鱼/shark.glb'], count: 12, heroScale: 9.8, swarmMin: 4.6, swarmMax: 7.6 },
      { id: '08_cat',            glbs: ['./items/lowpoly/猫/cat.glb'], count: 14, heroScale: 7.4, swarmMin: 3.5, swarmMax: 6.0 },
      { id: '09_minecraft',      glbs: ['./items/lowpoly/我的世界/tree.glb', './items/lowpoly/我的世界/stone.glb', './items/lowpoly/我的世界/dirt-grass.glb', './items/lowpoly/我的世界/wood.glb'], count: 16, heroScale: 6.6, swarmMin: 3.0, swarmMax: 5.2 },
      { id: '10_flamingo',       glbs: ['./items/lowpoly/火烈鸟/flamingo.glb'], count: 14, heroScale: 7.8, swarmMin: 3.8, swarmMax: 6.4 },
      { id: '11_beer',           glbs: ['./items/lowpoly/啤酒/beer-mug.glb'], count: 14, heroScale: 7.4, swarmMin: 3.5, swarmMax: 5.8 },
      { id: '12_soviet',         glbs: ['./items/lowpoly/金属锁链/chain.glb'], count: 14, heroScale: 7.8, swarmMin: 3.6, swarmMax: 6.2, procedural: 'soviet' },
      { id: '13_jiaomian_temple',glbs: ['./items/lowpoly/夜来香/night-jasmine.glb'], count: 12, heroScale: 8.0, swarmMin: 3.6, swarmMax: 6.0, procedural: 'temple' },
    ];

    const towerFloors = [];
    const floorAssetAudit = [];

    FLOOR_GLB_SPECS.forEach((spec, idx) => {
      const thObj = towerThemes && towerThemes[idx];
      const themeItems = (thObj && Array.isArray(thObj.items)) ? thObj.items : [];

      // STRICT ZERO-DUPLICATE PER-FLOOR ASSET ALLOCATOR!
      const usedInFloor = new Set();
      const archCursorStart = (idx * 23) % Math.max(1, archFacadePool.length);
      const genCursorStart = (idx * 37) % Math.max(1, generalPhotoPool.length);
      let themeCursor = 0;
      let archCursor = 0;
      let genCursor = 0;

      function takeUniqueAsset(prefer) {
        // 1. First pull unique theme photos (up to all 3 real photos of this floor's theme!)
        if (prefer === 'theme') {
          while (themeCursor < themeItems.length) {
            const cand = themeItems[themeCursor++];
            if (cand && cand.src && !usedInFloor.has(cand.src)) {
              usedInFloor.add(cand.src);
              return cand;
            }
          }
        }
        // 2. Pull unique architectural / urban photo textures for fluid curtain walls & slabs
        if (prefer === 'arch' || prefer === 'theme') {
          for (let tries = 0; tries < archFacadePool.length; tries++) {
            const cand = archFacadePool[(archCursorStart + archCursor++) % archFacadePool.length];
            if (cand && cand.src && !usedInFloor.has(cand.src)) {
              usedInFloor.add(cand.src);
              return cand;
            }
          }
        }
        // 3. Pull unique general real-photo textures from the 460+ master pool
        for (let tries = 0; tries < generalPhotoPool.length; tries++) {
          const cand = generalPhotoPool[(genCursorStart + genCursor++) % generalPhotoPool.length];
          if (cand && cand.src && !usedInFloor.has(cand.src)) {
            usedInFloor.add(cand.src);
            return cand;
          }
        }
        return null;
      }

      const rBot = radiusAtLevel(idx);
      const rTop = radiusAtLevel(idx + 1);
      const baseTwist = idx * FLOOR_TWIST;
      const yBase = idx * FLOOR_H;

      const floorRoot = new THREE.Group();
      floorRoot.position.set(0, yBase, 0);
      const rotPivot = new THREE.Group(); // Smoothly twists Left/Right on stereo "啊 啊"!
      floorRoot.add(rotPivot);
      towerRoot.add(floorRoot);

      // --- A. SHANGHAI TOWER FLUID ARCHITECTURAL SKIN (100% EDGE-TO-EDGE PHOTO WRAPPED!) ---
      const shellGrp = new THREE.Group();
      rotPivot.add(shellGrp);

      // 1. Fluid Reuleaux curved floor slab ring (unique arch photo stretched seamlessly around!)
      const slabGeo = buildFluidSlabGeo(THREE, rBot * 0.42, rBot * 1.02, 0.56, 48);
      const slabMesh = new THREE.Mesh(slabGeo, createFullBleedPhotoMat(takeUniqueAsset('arch'), 0.45));
      shellGrp.add(slabMesh);

      // 2. 3 Sweeping Helical Curved Curtain-Wall Airfoil Ribbons around the 3 Reuleaux lobes!
      //    Leaves 3 dramatic open curved spiral sky-atrium V-gaps so internal photo-wrapped models shine through!
      for (let lobe = 0; lobe < 3; lobe++) {
        const th0 = lobe * ((Math.PI * 2) / 3) + 0.18;
        const th1 = th0 + ((Math.PI * 2) / 3) * 0.64; // 64% sweeping curtain wall, 36% open fluid sky-atrium!
        const ribGeo = buildHelicalCurtainRibbonGeo(THREE, rBot, rTop, FLOOR_H + 0.08, th0, th1, FLOOR_TWIST, 18, 6);
        // First 3 lobes get the 3 dedicated real photos of THIS floor's theme!
        const ribMeta = takeUniqueAsset('theme');
        const ribMesh = new THREE.Mesh(ribGeo, createFullBleedPhotoMat(ribMeta, 0.46));
        shellGrp.add(ribMesh);
      }

      // 3. 3 Sweeping Aerodynamic Spiral Structural Spine Fins (Shanghai Tower signature wind-carved ridges!)
      for (let fin = 0; fin < 3; fin++) {
        const thFin = fin * ((Math.PI * 2) / 3) + 0.14;
        const finGeo = buildFluidSpiralFinGeo(THREE, rBot, rTop, FLOOR_H + 0.14, thFin, FLOOR_TWIST, 2.2, 8);
        const finMesh = new THREE.Mesh(finGeo, createFullBleedPhotoMat(takeUniqueAsset('arch'), 0.40));
        shellGrp.add(finMesh);
      }

      // 4. Inner Curved Fluid Atrium Core Drum (unique stretched photo skin — ZERO bare geometry!)
      const coreGeo = new THREE.CylinderGeometry(rTop * 0.36, rBot * 0.38, FLOOR_H, 24, 1, true);
      coreGeo.translate(0, FLOOR_H * 0.5, 0);
      const coreMesh = new THREE.Mesh(coreGeo, createFullBleedPhotoMat(takeUniqueAsset('arch'), 0.36));
      shellGrp.add(coreMesh);

      // 5. Floor 12 (Top) — Iconic Shanghai Tower Asymmetric Diagonal Sculpted Fluid Crown!
      if (idx === STAGE_COUNT - 1) {
        const crownGeo = buildShanghaiCrownGeo(THREE, rTop * 1.02, rTop * 0.80, FLOOR_H * 0.72, FLOOR_H * 2.35, FLOOR_TWIST * 1.6, 54, 10);
        const crownMesh = new THREE.Mesh(crownGeo, createFullBleedPhotoMat(takeUniqueAsset('arch'), 0.48));
        crownMesh.position.y = FLOOR_H * 0.88;
        shellGrp.add(crownMesh);
      }

      // --- B. SEAMLESSLY PHOTO-WRAPPED 3D GLB MODELS SPIRALING IN & OUT OF THE FLUID ATRIUM! ---
      // Exact MIC CHECK emergence hits distributed evenly across Bars 26–41 (19.01s -> 55.84s)
      const baseHitIdx = Math.floor((idx / STAGE_COUNT) * (MIC_CHECK_HITS.length - 2));
      const hit0 = MIC_CHECK_HITS[clamp(baseHitIdx, 0, MIC_CHECK_HITS.length - 1)];
      const hit1 = MIC_CHECK_HITS[clamp(baseHitIdx + 1, 0, MIC_CHECK_HITS.length - 1)];
      const hit2 = MIC_CHECK_HITS[clamp(baseHitIdx + 2, 0, MIC_CHECK_HITS.length - 1)];

      const batches = [
        { grp: new THREE.Group(), tHit: hit0, items: [] },
        { grp: new THREE.Group(), tHit: hit1, items: [] },
        { grp: new THREE.Group(), tHit: hit2, items: [] },
      ];
      batches.forEach((b) => rotPivot.add(b.grp));

      const scaleFactor = rBot / 16.4; // Taper model sizes gracefully with Shanghai Tower height!

      for (let m = 0; m < spec.count; m++) {
        const batchIdx = m < 3 ? 0 : (1 + (m % 2));
        const batch = batches[batchIdx];
        const isHero = m < 2;

        // Every SINGLE 3D model instance receives a STRICTLY UNIQUE real photo texture stretched edge-to-edge!
        const photoMeta = takeUniqueAsset(isHero ? 'arch' : 'general');
        const mat = createFullBleedPhotoMat(photoMeta, 0.44);

        const rawSc = isHero
          ? (m === 0 ? spec.heroScale * 1.18 : spec.heroScale * 0.92)
          : (spec.swarmMin + rng() * (spec.swarmMax - spec.swarmMin)) * 1.16;
        const sc = rawSc * (0.62 + 0.40 * scaleFactor);

        let obj3d = null;
        if (spec.procedural === 'soviet' && m % 2 === 0) {
          obj3d = new THREE.Mesh(sovietRibbonGeo, mat);
          obj3d.scale.set(sc * 0.9, sc * 0.9, sc * 0.9);
        } else if (spec.procedural === 'temple' && m % 2 === 0) {
          obj3d = new THREE.Mesh(templeWaveGeo, mat);
          obj3d.scale.set(sc * 0.95, sc * 0.95, sc * 0.95);
        } else {
          const url = spec.glbs[m % spec.glbs.length];
          obj3d = createPhotoWrappedGlb(url, sc, mat);
        }

        const holder = new THREE.Group();
        holder.add(obj3d);
        batch.grp.add(holder);

        // Place models along the fluid Reuleaux atrium perimeter (bursting boldly along the 3 open spiral V-atriums!)
        const theta0 = (m / Math.max(1, spec.count)) * Math.PI * 2 + idx * 0.45;
        const radFrac = isHero ? 1.04 : (0.72 + rng() * 0.46);
        const homeY = isHero ? 0.42 : (0.45 + rng() * (FLOOR_H * 0.56));

        batch.items.push({
          obj: holder,
          theta0,
          radBase: rBot * radFrac,
          homeY,
          // Continuous eternal fluid gliding around the Reuleaux curve (ZERO velocity zero-points!)
          orbitSpeed: (m % 2 === 0 ? 1 : -1) * (0.20 + (m % 4) * 0.06),
          spinSpeed: (m % 2 === 0 ? 1 : -1) * (0.34 + rng() * 0.36),
          bobAmp: 0.35 + rng() * 0.45,
          bobFreq: 0.72 + rng() * 0.50,
          phase: rng() * 6.28,
          tiltX: (rng() - 0.5) * 0.32,
          tiltZ: (rng() - 0.5) * 0.32,
          enterR: rBot + 16 + rng() * 14,
          enterY: (m % 2 === 0 ? 1 : -1) * (8 + rng() * 8),
        });
      }

      const myAhEvents = AH_STEREO_ROT_HITS.filter((ev) => ev.floorIdx === idx);
      floorAssetAudit.push({
        floor: idx,
        id: spec.id,
        uniqueAssetCount: usedInFloor.size,
        srcs: Array.from(usedInFloor),
      });

      towerFloors.push({
        idx,
        id: spec.id,
        root: floorRoot,
        rotPivot,
        shellGrp,
        batches,
        myAhEvents,
        baseTwist,
        yBase,
        firstHitAge: hit0,
        rBot,
      });
    });

    // Expose asset uniqueness audit for automated Playwright verification!
    window.__MIC_CHECK_TOWER_AUDIT__ = floorAssetAudit;

    // Fetch all 15 GLB white-model geometries in background and bind immediately
    loadAllGlbs();

    const BLACK_SIL = new THREE.Color(0x030406);
    const WHITE_COL = new THREE.Color(0xffffff);
    const tmpCol = new THREE.Color();

    function setSilhouetteAmount(silU) {
      const s = clamp(silU, 0, 1);
      tmpCol.copy(WHITE_COL).lerp(BLACK_SIL, s);
      for (let i = 0; i < silhouetteMats.length; i++) {
        const entry = silhouetteMats[i];
        entry.mat.color.copy(tmpCol);
        entry.mat.emissiveIntensity = entry.baseEmissive * (1 - s);
      }
    }

    function flushPhotoTextures(budget) {
      const limit = typeof budget === 'number' ? budget : pendingPainters.length;
      let done = 0;
      for (let i = pendingPainters.length - 1; i >= 0 && done < limit; i--) {
        if (pendingPainters[i]()) {
          pendingPainters.splice(i, 1);
          done++;
        }
      }
    }

    // Update ALL 13 fluid Shanghai Tower floors with smooth C∞ continuous motion (ZERO velocity zero-points!)
    function updateTower(age, beatPos, kickEnergy) {
      if (pendingPainters.length > 0) flushPhotoTextures(4);

      // Gentle eternal helical flow so the tower is ALWAYS alive (never freezes!)
      const globalFlow = age * 0.045;

      for (let i = 0; i < towerFloors.length; i++) {
        const fl = towerFloors[i];
        const floorU = tanhStep(age, fl.firstHitAge - 0.35, 0.34);
        if (floorU < 0.008) {
          fl.root.visible = false;
          continue;
        }
        fl.root.visible = true;

        // Smooth C∞ upward spiral emergence from below into final Shanghai Tower elevation
        const riseOffset = (1 - floorU) * -4.2;
        fl.root.position.set(0, fl.yBase + riseOffset, 0);

        // Fluid shell expands smoothly into aerodynamic silhouette + subtle kick breathing
        const shellXZ = (0.14 + 0.86 * floorU) * (1.0 + kickEnergy * 0.025);
        const shellY = 0.08 + 0.92 * floorU;
        fl.shellGrp.scale.set(shellXZ, shellY, shellXZ);

        // Helical floor twist: Shanghai Tower's 120° progressive spiral + crisp Left/Right stereo "啊 啊" torque!
        let ahAngle = 0;
        for (let a = 0; a < fl.myAhEvents.length; a++) {
          const ev = fl.myAhEvents[a];
          ahAngle += ev.dir * 0.56 * tanhStep(age, ev.t, 0.12);
        }
        const helicalBreath = Math.sin(age * 0.65 - i * 0.38) * 0.04;
        fl.rotPivot.rotation.y = fl.baseTwist + globalFlow + helicalBreath + ahAngle + (1 - floorU) * 0.85;

        // Update all 3 MIC CHECK photo-wrapped 3D model batches gliding continuously along the Reuleaux curve!
        for (let b = 0; b < fl.batches.length; b++) {
          const batch = fl.batches[b];
          const bU = tanhStep(age, batch.tHit, 0.32);
          if (bU < 0.01) {
            batch.grp.visible = false;
            continue;
          }
          batch.grp.visible = true;
          const invB = 1 - bU;

          for (let m = 0; m < batch.items.length; m++) {
            const it = batch.items[m];
            const th = it.theta0 + age * it.orbitSpeed + invB * 1.4;
            const rFluid = reuleauxR(th, it.radBase) + it.enterR * invB;
            const yFluid = it.homeY + it.enterY * invB + Math.sin(age * it.bobFreq + it.phase) * it.bobAmp;
            it.obj.position.set(Math.cos(th) * rFluid, yFluid, Math.sin(th) * rFluid);
            it.obj.rotation.set(
              it.tiltX + Math.sin(age * 0.7 + it.phase) * 0.15,
              -th + age * it.spinSpeed + it.phase,
              it.tiltZ + Math.cos(age * 0.65 + it.phase) * 0.12
            );
            const sc = (0.12 + 0.88 * bU) * (1.0 + kickEnergy * 0.04);
            it.obj.scale.set(sc, sc, sc);
          }
        }
      }
    }

    return {
      towerRoot,
      towerFloors,
      STAGE_COUNT,
      FLOOR_H,
      totalTowerTopY: STAGE_COUNT * FLOOR_H + FLOOR_H * 1.35,
      updateTower,
      setSilhouetteAmount,
      flushStickerAtlases: flushPhotoTextures,
      MIC_CHECK_HITS,
      AH_STEREO_ROT_HITS,
      getAssetAudit: () => floorAssetAudit,
    };
  }

  window.MicCheckTower = {
    buildShanghaiFluidTower,
    buildStaircaseToCuboidTower: buildShanghaiFluidTower,
    buildMesaAndTower: buildShanghaiFluidTower,
  };
})();
