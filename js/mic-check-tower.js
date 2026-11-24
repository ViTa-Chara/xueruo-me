(() => {
  'use strict';

  // =========================================================================
  // MIC CHECK — 13-STORY EXAGGERATED 3D WHITE-MODEL (白模) + PACKED STICKER
  // COLLAGE SKYSCRAPER (Staircase Formation -> Mid-Chorus Cuboid Convergence)
  //
  // Features:
  //   - Massive, dense, exaggerated 3D GLB white models occupying >60% of every
  //     floor (all 15 items/lowpoly/**/*.glb + sculptural white-clay F12/F13)
  //   - Every floor plastered full of photo stickers (per-floor 1024x1024
  //     sticker-wrapped white-clay atlas + 28-36 3D cutout collage stickers)
  //   - ZERO velocity zero-points: every floor, white model & sticker moves on
  //     C∞ differentiable continuous trajectories from age = 0 onward
  //   - Exact vocal sync:
  //       * Every "MIC CHECK" triggers smooth C∞ arrival of new model batches
  //       * Every stereo Left/Right "啊 啊" smoothly rotates a target floor L/R
  //       * Mid-chorus (SNAP_AGE = 38.02s) smoothly converges the forward-upward
  //         staircase into ONE unified rectangular cuboid skyscraper
  //       * START chant (57.03s+) smoothly turns the entire skyscraper into a
  //         razor-sharp backlit silhouette against the Sun's expanding light
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

  // Exact measured "MIC CHECK" vocal hits (age in seconds from Bar 18.1 = 40.396s)
  const MIC_CHECK_HITS = [
    19.01, 20.49, 21.68, 22.87, 23.76, 25.25,
    26.14, 27.62, 28.51, 30.00, 30.89, 32.38,
    33.27, 34.75, 35.64, 37.13,
    // Second half of chorus (after cuboid convergence at 38.02s)
    38.02, 39.50, 40.39, 41.88, 42.77, 44.26,
    45.15, 46.04, 47.52, 49.01, 49.90, 50.79,
    52.28, 53.46, 54.65, 55.84,
  ];

  // Exact measured stereo LEFT / RIGHT "啊 啊" hits from 01_vocals.wav
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
    // Second half of chorus (unified rectangular cuboid — floors twist left & right on every Ah!)
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

  function buildStaircaseToCuboidTower(ctx) {
    const {
      THREE, scene, TOWER_X, CUBOID_Z, STAIR_Z0, SNAP_AGE,
      makeCutout, getCutoutTex, getImage, findBySrc, pickMeta,
      towerThemes, concreteTextures, brickTextures, archTextures,
      buildingsClean, streetsPool, screensPool, signsPool, itemsPool,
      onTextureReady,
    } = ctx;

    const rng = makeRng(20261125);
    const towerRoot = new THREE.Group();
    scene.add(towerRoot);

    // -----------------------------------------------------------------------
    // 1. SHARED WHITE-CLAY (白模) & SILHOUETTE-CAPABLE MATERIALS
    // -----------------------------------------------------------------------
    const silhouetteTargets = []; // { mat, baseColor: THREE.Color, kind: 'lit'|'unlit' }
    const pendingAtlasPainters = [];

    function trackMat(mat, hex, kind) {
      silhouetteTargets.push({ mat, baseColor: new THREE.Color(hex), kind });
      return mat;
    }

    // Crisp matte alabaster plaster white-model shader (catches dramatic sculptural shadows!)
    const pureWhiteClayMat = trackMat(new THREE.MeshStandardMaterial({
      color: 0xf4f5f8,
      roughness: 0.72,
      metalness: 0.06,
      flatShading: true,
      side: THREE.DoubleSide,
    }), 0xf4f5f8, 'lit');

    const warmWhiteClayMat = trackMat(new THREE.MeshStandardMaterial({
      color: 0xe6e8ee,
      roughness: 0.80,
      metalness: 0.04,
      flatShading: true,
      side: THREE.DoubleSide,
    }), 0xe6e8ee, 'lit');

    const slabWhiteMat = trackMat(new THREE.MeshStandardMaterial({
      color: 0xdce0e8,
      roughness: 0.78,
      metalness: 0.08,
      flatShading: true,
      side: THREE.DoubleSide,
    }), 0xdce0e8, 'lit');

    const darkEdgeMat = trackMat(new THREE.MeshBasicMaterial({
      color: 0x1a1e26,
      side: THREE.DoubleSide,
    }), 0x1a1e26, 'unlit');

    // Create a dense 1024x1024 photo-sticker collage atlas plastered onto a white-plaster base!
    function createFloorStickerAtlasMat(floorIdx, themeList) {
      const cnv = document.createElement('canvas');
      cnv.width = 512;
      cnv.height = 512;
      const g = cnv.getContext('2d');
      const tex = new THREE.CanvasTexture(cnv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;

      // Gather rich pool of real images for this floor's sticker wrap
      const srcPool = [];
      (themeList || []).forEach((m) => { if (m && m.src) srcPool.push(m); });
      for (let k = 0; k < 6; k++) {
        const it = pickMeta(itemsPool, floorIdx * 5 + k * 3);
        if (it) srcPool.push(it);
      }
      for (let k = 0; k < 4; k++) {
        const b = pickMeta(buildingsClean, floorIdx * 3 + k * 2);
        if (b) srcPool.push(b);
      }
      for (let k = 0; k < 3; k++) {
        const sg = pickMeta(signsPool, floorIdx * 4 + k);
        if (sg) srcPool.push(sg);
      }
      const imgs = srcPool.map((m) => ({ meta: m, im: getImage(m.src) }));

      // Deterministic sticker layout (48 dense overlapping photo stickers plastered on white clay!)
      const arng = makeRng(88001 + floorIdx * 997);
      const stamps = [];
      for (let s = 0; s < 48; s++) {
        const isTheme = s < 24 && themeList && themeList.length;
        const pickIdx = isTheme ? (s % themeList.length) : (Math.floor(arng() * imgs.length));
        stamps.push({
          idx: pickIdx % Math.max(1, imgs.length),
          cx: arng() * 512,
          cy: arng() * 512,
          size: isTheme ? (105 + arng() * 115) : (58 + arng() * 88),
          rot: (arng() - 0.5) * 0.95,
        });
      }

      let paintedReadyCount = -1;
      function repaint() {
        if (!g) return true;
        let readyCount = 0;
        for (let i = 0; i < imgs.length; i++) {
          if (imgs[i].im && imgs[i].im.complete && imgs[i].im.naturalWidth > 0) readyCount++;
        }
        if (readyCount === paintedReadyCount && paintedReadyCount > 0) {
          return readyCount >= imgs.length;
        }
        paintedReadyCount = readyCount;

        // Crisp white plaster clay base so white-model facets peek through stickers!
        g.fillStyle = '#eceff4';
        g.fillRect(0, 0, 512, 512);
        // Subtle architectural pencil grid lines on white clay
        g.strokeStyle = 'rgba(20, 26, 36, 0.14)';
        g.lineWidth = 1;
        for (let p = 64; p < 512; p += 64) {
          g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 512); g.stroke();
          g.beginPath(); g.moveTo(0, p); g.lineTo(512, p); g.stroke();
        }

        for (let s = 0; s < stamps.length; s++) {
          const st = stamps[s];
          const entry = imgs[st.idx];
          if (!entry || !entry.im || !entry.im.complete || !entry.im.naturalWidth) continue;
          const m = entry.meta;
          const sx = m.x0 || 0;
          const sy = m.y0 || 0;
          const sw = m.bw || entry.im.naturalWidth;
          const sh = m.bh || entry.im.naturalHeight;
          const ar = sw / Math.max(1, sh);
          const dw = ar >= 1 ? st.size : st.size * ar;
          const dh = ar >= 1 ? st.size / ar : st.size;
          g.save();
          g.translate(st.cx, st.cy);
          g.rotate(st.rot);
          g.drawImage(entry.im, sx, sy, sw, sh, -dw * 0.5, -dh * 0.5, dw, dh);
          g.restore();
        }
        tex.needsUpdate = true;
        if (onTextureReady) onTextureReady();
        return readyCount >= imgs.length;
      }

      if (!repaint()) {
        pendingAtlasPainters.push(repaint);
        imgs.forEach((entry) => {
          if (entry.im && !entry.im.complete) {
            entry.im.addEventListener('load', () => { repaint(); }, { once: true });
          }
        });
      }

      const mat = trackMat(new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        roughness: 0.68,
        metalness: 0.05,
        flatShading: true,
        side: THREE.DoubleSide,
      }), 0xffffff, 'lit');
      return mat;
    }

    // -----------------------------------------------------------------------
    // 2. GLB WHITE-MODEL INSTANCE HELPER (Async Geometry Binding, Shared VBO!)
    // -----------------------------------------------------------------------
    const glbBindings = []; // { mesh, url }
    const fallbackGeo = new THREE.IcosahedronGeometry(0.45, 0);
    fallbackGeo.translate(0, 0.45, 0);

    function createWhiteGlbInstance(url, scaleVec, mat) {
      const mesh = new THREE.Mesh(fallbackGeo, mat);
      if (typeof scaleVec === 'number') mesh.scale.set(scaleVec, scaleVec, scaleVec);
      else mesh.scale.set(scaleVec[0], scaleVec[1], scaleVec[2]);
      glbBindings.push({ mesh, url });
      return mesh;
    }

    // Kick off non-blocking load of all 15 GLBs (only ~1.3MB total!) and bind immediately on resolve
    function loadAllWhiteModels() {
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

    // Sculptural white-clay procedural geometries for Floor 12 (Soviet) & Floor 13 (JiaoMian Temple)
    const sovietConesGeo = new THREE.ConeGeometry(0.5, 1.0, 6);
    sovietConesGeo.translate(0, 0.5, 0);
    const sovietRingGeo = new THREE.TorusGeometry(0.45, 0.11, 6, 16);
    sovietRingGeo.translate(0, 0.5, 0);
    const sovietSlabGeo = new THREE.BoxGeometry(0.85, 1.0, 0.28);
    sovietSlabGeo.translate(0, 0.5, 0);
    const templeRoofGeo = new THREE.ConeGeometry(0.72, 0.55, 4);
    templeRoofGeo.rotateY(Math.PI * 0.25);
    templeRoofGeo.translate(0, 0.72, 0);
    const templePillarGeo = new THREE.CylinderGeometry(0.14, 0.18, 1.0, 6);
    templePillarGeo.translate(0, 0.5, 0);

    // -----------------------------------------------------------------------
    // 3. BUILD ALL 13 FLOORS: HUGE WHITE MODELS (>60% VOLUME) + FULL STICKERS!
    // -----------------------------------------------------------------------
    const FLOOR_W = 21.0;
    const FLOOR_D = 17.6;
    const FLOOR_H = 5.25;
    const STAGE_COUNT = 13;

    const FLOOR_GLB_SPECS = [
      // F00 安徽板面 — colossal steaming ramen bowls crowding >70% of deck!
      { id: '01_anhui_noodles',  glbs: ['./items/lowpoly/安徽板面/ramen.glb'], count: 24, heroScale: 13.8, swarmMin: 4.8, swarmMax: 8.8 },
      // F01 金属锁链 — colossal thick overlapping iron chain sculptures!
      { id: '02_metal_chains',   glbs: ['./items/lowpoly/金属锁链/chain.glb'], count: 32, heroScale: 16.5, swarmMin: 6.8, swarmMax: 12.2 },
      // F02 羽毛球 — monumental rackets + massive dense swarm of giant shuttlecocks!
      { id: '03_badminton',      glbs: ['./items/lowpoly/羽毛球/racket.glb', './items/lowpoly/羽毛球/shuttlecock.glb', './items/lowpoly/羽毛球/shuttlecock.glb'], count: 28, heroScale: 14.8, swarmMin: 4.6, swarmMax: 9.2 },
      // F03 鲸鱼 — giant breaching whale + surging colossal whale pod!
      { id: '04_whale',          glbs: ['./items/lowpoly/鲸鱼/whale.glb'], count: 20, heroScale: 18.6, swarmMin: 6.8, swarmMax: 12.5 },
      // F04 夜来香 — gigantic overflowing white-clay jasmine jungle!
      { id: '05_jasmine',        glbs: ['./items/lowpoly/夜来香/night-jasmine.glb'], count: 26, heroScale: 14.2, swarmMin: 5.5, swarmMax: 10.0 },
      // F05 洋葱 — colossal nested white-model onion cathedral!
      { id: '06_onion',          glbs: ['./items/lowpoly/洋葱/onion.glb'], count: 26, heroScale: 13.6, swarmMin: 5.0, swarmMax: 9.4 },
      // F06 鲨鱼 — ferocious dense colossal shark swarm!
      { id: '07_shark',          glbs: ['./items/lowpoly/鲨鱼/shark.glb'], count: 22, heroScale: 17.5, swarmMin: 7.2, swarmMax: 12.4 },
      // F07 猫 — exaggerated army of colossal white-clay cats!
      { id: '08_cat',            glbs: ['./items/lowpoly/猫/cat.glb'], count: 24, heroScale: 13.8, swarmMin: 5.0, swarmMax: 9.2 },
      // F08 我的世界 — dense 36-piece voxel mountain of giant trees, stone, dirt, wood!
      { id: '09_minecraft',      glbs: ['./items/lowpoly/我的世界/tree.glb', './items/lowpoly/我的世界/stone.glb', './items/lowpoly/我的世界/dirt-grass.glb', './items/lowpoly/我的世界/wood.glb'], count: 36, heroScale: 11.8, swarmMin: 4.0, swarmMax: 7.6 },
      // F09 火烈鸟 — towering dense flock of exaggerated white-clay flamingos!
      { id: '10_flamingo',       glbs: ['./items/lowpoly/火烈鸟/flamingo.glb'], count: 24, heroScale: 14.2, swarmMin: 5.8, swarmMax: 10.2 },
      // F10 啤酒 — monumental banquet of giant white-clay beer mugs!
      { id: '11_beer',           glbs: ['./items/lowpoly/啤酒/beer-mug.glb'], count: 24, heroScale: 13.8, swarmMin: 5.0, swarmMax: 9.4 },
      // F11 苏联美学设计 — Constructivist white-clay monuments + chain tension struts!
      { id: '12_soviet',         glbs: ['./items/lowpoly/金属锁链/chain.glb'], count: 24, heroScale: 14.5, swarmMin: 5.4, swarmMax: 9.8, procedural: 'soviet' },
      // F12 郊眠寺 — Monumental white-clay Temple Sanctuary Crown + jasmine garlands!
      { id: '13_jiaomian_temple',glbs: ['./items/lowpoly/夜来香/night-jasmine.glb'], count: 22, heroScale: 15.2, swarmMin: 5.6, swarmMax: 9.6, procedural: 'temple' },
    ];

    // Assign exact MIC CHECK emergence batches across all 13 floors:
    //   Floors 0..6 (Staircase Half): MIC CHECK hits 0..15 (19.01s -> 37.13s)
    //   Floors 7..12 (Cuboid Upper Half): MIC CHECK hits 16..31 (38.02s -> 55.84s)
    const towerFloors = [];
    const trackedStickers = [];

    function makeTrackedCutout(meta, targetH, opts2) {
      const c = makeCutout(meta, targetH, opts2);
      trackMat(c.mat, 0xffffff, 'unlit');
      return c;
    }

    FLOOR_GLB_SPECS.forEach((spec, idx) => {
      const thObj = towerThemes[idx];
      const th = (thObj && thObj.items && thObj.items.length) ? thObj.items : [findBySrc('水泥纹理/01.png', concreteTextures, 0)];
      const stickerAtlasMat = createFloorStickerAtlasMat(idx, th);

      const floorRoot = new THREE.Group();
      const rotPivot = new THREE.Group(); // Dedicated smooth L/R rotation pivot for stereo "啊 啊"!
      floorRoot.add(rotPivot);
      towerRoot.add(floorRoot);

      // Floor slab & ceiling beam frame (crisp white-clay architectural slabs plastered with stickers!)
      const slabGroup = new THREE.Group();
      const w = idx === 12 ? FLOOR_W * 0.88 : FLOOR_W;
      const d = idx === 12 ? FLOOR_D * 0.88 : FLOOR_D;
      const h = idx === 12 ? FLOOR_H * 1.15 : FLOOR_H;

      const botSlab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.52, d), stickerAtlasMat);
      botSlab.position.y = 0.26;
      slabGroup.add(botSlab);
      const topSlab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.42, d + 0.4), slabWhiteMat);
      topSlab.position.y = h - 0.21;
      slabGroup.add(topSlab);

      // 4 crisp corner architectural white-clay columns
      const colGeo = new THREE.BoxGeometry(0.95, h - 0.5, 0.95);
      [-1, 1].forEach((sx) => {
        [-1, 1].forEach((sz) => {
          const col = new THREE.Mesh(colGeo, pureWhiteClayMat);
          col.position.set(sx * (w * 0.5 - 0.55), h * 0.5, sz * (d * 0.5 - 0.55));
          slabGroup.add(col);
        });
      });

      // Plaster ALL 4 perimeter slab edges with dense photo collage stickers!
      const hw = w * 0.5, hd = d * 0.5;
      for (let side = 0; side < 4; side++) {
        const isFB = side < 2;
        const span = isFB ? w : d;
        const nSt = 5;
        for (let s = 0; s < nSt; s++) {
          const frac = ((s + 0.5) / nSt - 0.5) * (span * 0.92);
          const meta = (s % 2 === 0) ? th[s % th.length] : pickMeta(s % 3 === 0 ? signsPool : buildingsClean, idx * 7 + side * 3 + s);
          if (!meta) continue;
          const card = makeTrackedCutout(meta, 1.55 + (s % 2) * 0.75, {
            maxW: 3.8, maxDim: 256, pivot: 'bottom', alphaTest: 0.08,
          });
          if (side === 0) { card.mesh.position.set(frac, 0.15, +hd + 0.12); card.mesh.rotation.y = 0; }
          else if (side === 1) { card.mesh.position.set(frac, 0.15, -hd - 0.12); card.mesh.rotation.y = Math.PI; }
          else if (side === 2) { card.mesh.position.set(+hw + 0.12, 0.15, frac); card.mesh.rotation.y = Math.PI * 0.5; }
          else { card.mesh.position.set(-hw - 0.12, 0.15, frac); card.mesh.rotation.y = -Math.PI * 0.5; }
          slabGroup.add(card.mesh);
        }
      }
      rotPivot.add(slabGroup);

      // Determine exact MIC CHECK wave timestamps for this floor (2–3 batches per floor!)
      const isUpper = idx >= 7;
      const baseHitIdx = isUpper
        ? (16 + Math.floor(((idx - 7) / 6) * 15))
        : Math.floor((idx / 7) * 16);
      const hit0 = MIC_CHECK_HITS[clamp(baseHitIdx, 0, MIC_CHECK_HITS.length - 1)];
      const hit1 = MIC_CHECK_HITS[clamp(baseHitIdx + 1, 0, MIC_CHECK_HITS.length - 1)];
      const hit2 = MIC_CHECK_HITS[clamp(baseHitIdx + 2, 0, MIC_CHECK_HITS.length - 1)];
      const waveHits = [hit0, hit1, hit2];

      // Build 3 kinetic emergence batches per floor (each triggered smoothly on a MIC CHECK!)
      const batches = [
        { grp: new THREE.Group(), tHit: waveHits[0], items: [], stickers: [] },
        { grp: new THREE.Group(), tHit: waveHits[1], items: [], stickers: [] },
        { grp: new THREE.Group(), tHit: waveHits[2], items: [], stickers: [] },
      ];
      batches.forEach((b) => rotPivot.add(b.grp));

      // --- A. MASSIVE, EXAGGERATED 3D WHITE MODELS (Occupying >60% of each floor!) ---
      for (let m = 0; m < spec.count; m++) {
        const batchIdx = m === 0 ? 0 : (1 + (m % 2));
        const batch = batches[batchIdx];
        const isHero = m === 0 || m === 1;
        // ~55% crisp alabaster white-clay, ~45% dense sticker-wrapped white-clay!
        const mat = (m % 5 === 1 || m % 5 === 3) ? stickerAtlasMat : (m % 2 === 0 ? pureWhiteClayMat : warmWhiteClayMat);

        let obj3d = null;
        const sc = isHero
          ? (m === 0 ? spec.heroScale : spec.heroScale * 0.72)
          : (spec.swarmMin + rng() * (spec.swarmMax - spec.swarmMin));

        if (spec.procedural === 'soviet' && m % 3 !== 2) {
          const geoPick = m % 3 === 0 ? (m === 0 ? sovietRingGeo : sovietConesGeo) : sovietSlabGeo;
          obj3d = new THREE.Mesh(geoPick, mat);
          obj3d.scale.set(sc * 0.85, sc * 0.95, sc * 0.85);
        } else if (spec.procedural === 'temple' && m % 3 !== 2) {
          const geoPick = m % 2 === 0 ? templeRoofGeo : templePillarGeo;
          obj3d = new THREE.Mesh(geoPick, mat);
          obj3d.scale.set(sc * 0.92, sc * 0.90, sc * 0.92);
        } else {
          const url = spec.glbs[m % spec.glbs.length];
          obj3d = createWhiteGlbInstance(url, sc, mat);
        }

        // Pack tightly & dramatically across the entire floor footprint (even overhanging edges!)
        const ang = (m / Math.max(1, spec.count)) * Math.PI * 2 + idx * 0.5;
        const radFrac = isHero ? (m === 0 ? 0.04 : 0.24) : (0.28 + rng() * 0.62);
        const homeX = Math.cos(ang) * (hw * 0.88 * radFrac);
        const homeZ = Math.sin(ang) * (hd * 0.88 * radFrac);
        const homeY = isHero ? 0.35 : (0.35 + rng() * (h * 0.42));

        // Wrap in a kinetic container so every model ALWAYS has continuous C∞ motion (v != 0)!
        const holder = new THREE.Group();
        holder.add(obj3d);

        // Plaster 1-2 crisp 3D cutout stickers DIRECTLY ONTO the surface of larger white models!
        if (m < 10) {
          const stMeta = th[m % th.length];
          const stCard = makeTrackedCutout(stMeta, clamp(sc * 0.42, 1.6, 3.8), {
            maxW: clamp(sc * 0.52, 1.8, 4.4), maxDim: 256, pivot: 'center', alphaTest: 0.08,
          });
          stCard.mesh.position.set(0, sc * 0.38, sc * 0.36);
          holder.add(stCard.mesh);
          if (m < 5) {
            const stCard2 = makeTrackedCutout(pickMeta(itemsPool, idx * 9 + m * 3), clamp(sc * 0.36, 1.3, 3.0), {
              maxW: 3.2, maxDim: 224, pivot: 'center', alphaTest: 0.08,
            });
            stCard2.mesh.position.set(sc * 0.32, sc * 0.50, -sc * 0.28);
            stCard2.mesh.rotation.y = Math.PI * 0.5;
            holder.add(stCard2.mesh);
          }
        }

        batch.grp.add(holder);
        batch.items.push({
          obj: holder,
          homeX, homeY, homeZ,
          // Continuous eternal motion parameters (ZERO zero-velocity points!)
          orbitSpeed: (m % 2 === 0 ? 1 : -1) * (0.14 + (m % 4) * 0.06),
          spinSpeed: (m % 2 === 0 ? 1 : -1) * (0.28 + rng() * 0.38),
          driftAmp: 0.35 + rng() * 0.65,
          driftFreq: 0.65 + rng() * 0.55,
          phase: rng() * 6.28,
          tiltX: (rng() - 0.5) * 0.38,
          tiltZ: (rng() - 0.5) * 0.38,
          // Stream-in offset before MIC CHECK wave arrives (slides smoothly in from outer space!)
          enterOffset: new THREE.Vector3(
            Math.cos(ang) * (18 + rng() * 14),
            (m % 2 === 0 ? 1 : -1) * (9 + rng() * 10),
            Math.sin(ang) * (18 + rng() * 14) - 12
          ),
        });
      }

      // --- B. DENSE STICKER COLLAGE PLATES PLASTERED ALL OVER THE FLOOR (24 extra cutouts!) ---
      for (let s = 0; s < 24; s++) {
        const batchIdx = s % 3;
        const batch = batches[batchIdx];
        const useTheme = s < 14;
        const meta = useTheme
          ? th[s % th.length]
          : pickMeta(s % 3 === 0 ? itemsPool : (s % 3 === 1 ? screensPool : buildingsClean), idx * 11 + s * 2);
        if (!meta) continue;
        const cardH = useTheme ? (2.6 + (s % 3) * 0.85) : (1.7 + (s % 3) * 0.55);
        const card = makeTrackedCutout(meta, cardH, {
          maxW: cardH * 1.45, maxDim: 288, pivot: 'center', alphaTest: 0.08,
        });
        const ang = (s / 24) * Math.PI * 2 + 0.22;
        const rx = Math.cos(ang) * (hw * (0.55 + (s % 3) * 0.18));
        const rz = Math.sin(ang) * (hd * (0.55 + (s % 3) * 0.18));
        const ry = 1.15 + ((s * 37) % 100) / 100 * (h - 2.1);

        batch.grp.add(card.mesh);
        batch.stickers.push({
          mesh: card.mesh,
          homeX: rx, homeY: ry, homeZ: rz,
          baseRotY: -ang + Math.PI * 0.5,
          spinRate: (s % 2 === 0 ? 1 : -1) * (0.18 + (s % 4) * 0.07),
          bobPhase: s * 0.72,
          enterOffset: new THREE.Vector3(Math.cos(ang) * 20, (s % 2 === 0 ? 10 : -8), Math.sin(ang) * 20 - 10),
        });
        trackedStickers.push(card.mesh);
      }

      // Pre-bind all stereo Left/Right "啊" rotation events assigned to this floor
      const myAhEvents = AH_STEREO_ROT_HITS.filter((ev) => ev.floorIdx === idx);

      // Staircase position (ahead & above previous floor straight down T-junction!) vs Cuboid stack!
      const stairX = Math.sin(idx * 0.85) * 1.4;
      const stairY = 1.6 + idx * FLOOR_H;
      const stairZ = STAIR_Z0 - idx * 18.5;

      const cuboidX = TOWER_X;
      const cuboidY = 1.2 + idx * FLOOR_H;
      const cuboidZ = CUBOID_Z;

      towerFloors.push({
        idx,
        id: spec.id,
        root: floorRoot,
        rotPivot,
        slabGroup,
        batches,
        myAhEvents,
        baseSpin: (idx % 2 === 0 ? 1 : -1) * (0.09 + (idx % 3) * 0.03),
        stairPos: new THREE.Vector3(stairX, stairY, stairZ),
        cuboidPos: new THREE.Vector3(cuboidX, cuboidY, cuboidZ),
        firstHitAge: waveHits[0],
        w, d, h,
      });
    });

    // Trigger background fetch of all 15 GLB white models right away
    loadAllWhiteModels();

    const BLACK_SIL = new THREE.Color(0x040508);
    const tmpCol = new THREE.Color();

    function setSilhouetteAmount(silU) {
      const s = clamp(silU, 0, 1);
      for (let i = 0; i < silhouetteTargets.length; i++) {
        const t = silhouetteTargets[i];
        tmpCol.copy(t.baseColor).lerp(BLACK_SIL, s);
        t.mat.color.copy(tmpCol);
      }
    }

    function flushStickerAtlases(budget) {
      const limit = typeof budget === 'number' ? budget : pendingAtlasPainters.length;
      let done = 0;
      for (let i = pendingAtlasPainters.length - 1; i >= 0 && done < limit; i--) {
        if (pendingAtlasPainters[i]()) {
          pendingAtlasPainters.splice(i, 1);
          done++;
        }
      }
    }

    // Update ALL 13 floors with C∞ differentiable continuous motion (ZERO zero-velocity points!)
    function updateTower(age, beatPos, kickEnergy) {
      if (pendingAtlasPainters.length > 0) flushStickerAtlases(2);

      // Mid-chorus convergence curve (Bar 34.1 = 38.02s): staircase suddenly coalesces into ONE rectangular cuboid!
      const snapU = tanhStep(age, SNAP_AGE, 0.44);
      // Continuous eternal subtle upward breath so the skyscraper itself never freezes at v = 0
      const eternalRise = age * 0.08;

      for (let i = 0; i < towerFloors.length; i++) {
        const fl = towerFloors[i];
        // Smooth C∞ floor presence (starts emerging smoothly slightly ahead of its first MIC CHECK hit!)
        const floorU = tanhStep(age, fl.firstHitAge - 0.55, 0.28);
        if (floorU < 0.008) {
          fl.root.visible = false;
          continue;
        }
        fl.root.visible = true;

        // Smooth C∞ Staircase -> Unified Rectangular Cuboid morph!
        const fx = fl.stairPos.x + (fl.cuboidPos.x - fl.stairPos.x) * snapU;
        const fy = fl.stairPos.y + (fl.cuboidPos.y - fl.stairPos.y) * snapU + eternalRise;
        const fz = fl.stairPos.z + (fl.cuboidPos.z - fl.stairPos.z) * snapU;
        fl.root.position.set(fx, fy, fz);

        // Slab frame scale glides smoothly into full dimensions + subtle C∞ kick pulse
        const slabScale = 0.08 + 0.92 * floorU;
        const kickLift = 1.0 + kickEnergy * 0.03;
        fl.slabGroup.scale.set(slabScale * kickLift, slabScale, slabScale * kickLift);

        // Floor Y-rotation: crisp 90° Left/Right twists on EVERY stereo "啊 啊" hit!
        // During staircase (snapU < 1) floors drift freely; after cuboid snap (snapU -> 1)
        // they lock orthogonally into ONE crisp rectangular cuboid while still twisting +-90° on "啊 啊"!
        let ahAngle = 0;
        for (let a = 0; a < fl.myAhEvents.length; a++) {
          const ev = fl.myAhEvents[a];
          ahAngle += ev.dir * (Math.PI * 0.5) * tanhStep(age, ev.t, 0.11);
        }
        const stairDrift = (1 - snapU) * (fl.baseSpin * age);
        const cuboidBreath = snapU * Math.sin(age * 0.55 + i * 0.7) * 0.025;
        fl.rotPivot.rotation.y = stairDrift + cuboidBreath + ahAngle;

        // Update all 3 MIC CHECK model & sticker emergence batches inside this floor!
        for (let b = 0; b < fl.batches.length; b++) {
          const batch = fl.batches[b];
          const bU = tanhStep(age, batch.tHit, 0.30);
          if (bU < 0.01) {
            batch.grp.visible = false;
            continue;
          }
          batch.grp.visible = true;
          const invB = 1 - bU;

          // Update exaggerated 3D white models (NEVER velocity 0 — constant smooth spin + drift!)
          for (let m = 0; m < batch.items.length; m++) {
            const it = batch.items[m];
            const driftX = Math.cos(age * it.driftFreq + it.phase) * it.driftAmp;
            const driftY = Math.sin(age * it.driftFreq * 1.13 + it.phase) * (it.driftAmp * 0.55);
            const driftZ = Math.sin(age * it.driftFreq * 0.87 + it.phase) * it.driftAmp;
            it.obj.position.set(
              it.homeX + it.enterOffset.x * invB + driftX,
              it.homeY + it.enterOffset.y * invB + driftY,
              it.homeZ + it.enterOffset.z * invB + driftZ
            );
            it.obj.rotation.set(
              it.tiltX + Math.sin(age * 0.7 + it.phase) * 0.14,
              age * it.spinSpeed + it.phase + invB * 1.8,
              it.tiltZ + Math.cos(age * 0.65 + it.phase) * 0.12
            );
            const sc = (0.12 + 0.88 * bU) * (1.0 + kickEnergy * 0.035);
            it.obj.scale.set(sc, sc, sc);
          }

          // Update dense 3D cutout photo stickers (continuous smooth orbit/spin — never static!)
          for (let s = 0; s < batch.stickers.length; s++) {
            const st = batch.stickers[s];
            const orb = age * st.spinRate;
            const cosO = Math.cos(orb);
            const sinO = Math.sin(orb);
            const rx = st.homeX * cosO - st.homeZ * sinO;
            const rz = st.homeX * sinO + st.homeZ * cosO;
            st.mesh.position.set(
              rx + st.enterOffset.x * invB,
              st.homeY + st.enterOffset.y * invB + Math.sin(age * 1.2 + st.bobPhase) * 0.38,
              rz + st.enterOffset.z * invB
            );
            st.mesh.rotation.y = st.baseRotY - orb;
            const sc = 0.10 + 0.90 * bU;
            st.mesh.scale.set(sc, sc, sc);
          }
        }
      }
    }

    return {
      towerRoot,
      towerFloors,
      STAGE_COUNT,
      FLOOR_H,
      totalTowerTopY: 1.2 + STAGE_COUNT * FLOOR_H,
      updateTower,
      setSilhouetteAmount,
      flushStickerAtlases,
      MIC_CHECK_HITS,
      AH_STEREO_ROT_HITS,
    };
  }

  window.MicCheckTower = {
    buildStaircaseToCuboidTower,
    buildMesaAndTower: buildStaircaseToCuboidTower,
  };
})();
