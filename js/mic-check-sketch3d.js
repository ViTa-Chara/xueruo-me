(() => {
  'use strict';

  // =========================================================================
  // MIC CHECK — COOL ARCHITECTURAL 2.5D COLLAGE STREET & FRONTAL SECTION TOWER
  // (Bar 18–40 · 101.00 BPM · Pure Deterministic render(t))
  //
  // Aesthetic Alignment with Part 1 (mic-check.js / mic-check-pv.js):
  //   - Cold, restrained, editorial print & found-object architectural collage
  //   - ZERO humans, humanoids, pedestrians, or cartoon assets
  //   - ZERO amusement-park props (no bunting, blimp, balloons, birds, Ferris
  //     wheel, windmill, barber poles, bridge hoppers, or debris particles)
  //   - ZERO strobing black<->blue sky flashes: ONE clean transition from #000000
  //     to low-saturation architectural film cool grey-blue sky
  //   - ZERO ADHD camera motion (no weaveX, breathY, dutchRoll, dutchBank,
  //     FOV jitter, or 360° orbit); pure central-axis (x = 0) 2.5D staging
  //   - 80% poised stillness, 20% crisp beat-locked swaps & structural locks
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

  function smootherstep(t) {
    const u = clamp(t, 0, 1);
    return u * u * u * (u * (6 * u - 15) + 10);
  }

  function easeOutQuart(t) {
    const u = clamp(t, 0, 1);
    const inv = 1 - u;
    return 1 - inv * inv * inv * inv;
  }

  function easeInOutQuart(t) {
    const u = clamp(t, 0, 1);
    return u < 0.5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2;
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

    const cues3d = opts.cues3d || {};
    const SHOCK_KICKS = (cues3d.shockKicks && cues3d.shockKicks.length === 4)
      ? cues3d.shockKicks
      : [16.786, 17.396, 17.966, 18.586];
    const MIC_CHECK_AGE = cues3d.micCheckAge ?? (BAR * 8.0);   // 19.010s = Bar 26.1
    const TOWER_START = cues3d.towerStartAge ?? (BAR * 9.0);   // 21.386s = Bar 27.1
    const TOWER_FINISH = cues3d.towerFinishAge ?? 53.95;       // Completes right before Bar 41.1
    const NEXT_1234 = cues3d.next1234Age ?? 54.64;

    const assets = opts.assets || {};
    const rawSignals = (assets.signalsClean && assets.signalsClean.length) ? assets.signalsClean : (assets.signals || []);
    const rawSigns = (assets.signsClean && assets.signsClean.length) ? assets.signsClean : (assets.signs || []);
    const rawHouses = (assets.housesLow && assets.housesLow.length) ? assets.housesLow : [];
    const buildingsClean = (assets.buildingsClean && assets.buildingsClean.length) ? assets.buildingsClean : (assets.buildings || []);
    const towerThemes = assets.towerThemes || [];
    const polesPool = assets.poles || [];
    const rawCars = assets.cars || [];
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
      ...itemsPool, ...rawSignals, ...rawSigns, ...polesPool, ...rawCars,
      ...rawHouses, ...buildingsClean, ...roadTextures, ...concreteTextures,
      ...brickTextures, ...archTextures, ...streetsPool,
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

    // Strict ZERO-HUMAN, ZERO-CARTOON curated photographic street pools
    const PHOTO_CAR_IDS = ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011'];
    const photoCars = PHOTO_CAR_IDS.map((id) => findBySrc(`cars/${id}.png`, rawCars, 0)).filter(Boolean);

    const PHOTO_SIGNAL_IDS = ['001', '002', '003', '004', '007', '009', '010', '012', '015', '016', '018'];
    const photoSignals = PHOTO_SIGNAL_IDS.map((id) => findBySrc(`signals/${id}.png`, rawSignals, 0)).filter(Boolean);

    const PHOTO_POLE_IDS = ['004', '005', '008', '010', '012', '013', '014', '015', '016', '018', '019', '020'];
    const photoPoles = PHOTO_POLE_IDS.map((id) => findBySrc(`poles/${id}.png`, polesPool, 0)).filter(Boolean);

    const PHOTO_SIGN_IDS = ['002', '004', '005', '006', '007', '008', '010', '011', '012', '018', '020', '021', '024', '027', '028', '029'];
    const photoSigns = PHOTO_SIGN_IDS.map((id) => findBySrc(`signs/${id}.png`, rawSigns, 0)).filter(Boolean);

    // Strictly horizontal landscape wayfinding plates for the 4 under-bridge signs (zero aspect distortion!)
    const BRIDGE_SIGN_IDS = ['002', '004', '021', '024', '028', '029'];
    const bridgeSignMetas = BRIDGE_SIGN_IDS.map((id) => findBySrc(`signs/${id}.png`, rawSigns, 0)).filter(Boolean);

    // Cold modernist & brutalist low-rise architectural photography (zero cartoon cottages!)
    const streetFacadePool = [
      findBySrc('buildings/044.png', buildingsClean, 0),
      findBySrc('buildings/046.png', buildingsClean, 1),
      findBySrc('buildings/048.png', buildingsClean, 2),
      findBySrc('buildings/049.png', buildingsClean, 3),
      findBySrc('buildings/050.png', buildingsClean, 4),
      findBySrc('buildings/051.png', buildingsClean, 5),
      findBySrc('buildings/052.png', buildingsClean, 6),
      findBySrc('buildings/042.png', buildingsClean, 7),
      findBySrc('buildings/003.png', buildingsClean, 8),
      findBySrc('buildings/013.png', buildingsClean, 9),
      findBySrc('buildings/026.png', buildingsClean, 10),
      findBySrc('buildings/029.png', buildingsClean, 11),
      findBySrc('buildings/034.png', buildingsClean, 12),
      findBySrc('buildings/036.png', buildingsClean, 13),
      findBySrc('buildings/038.png', buildingsClean, 14),
      findBySrc('buildings/040.png', buildingsClean, 15),
      findBySrc('建筑纹理/03.png', archTextures, 2),
      findBySrc('建筑纹理/04.png', archTextures, 3),
      findBySrc('建筑纹理/05.png', archTextures, 4),
      findBySrc('建筑纹理/06.png', archTextures, 5),
      findBySrc('红砖纹理/05.png', brickTextures, 3),
      findBySrc('streets/022.png', streetsPool, 0),
    ].filter(Boolean);

    const rng = makeRng(20261124);

    // -----------------------------------------------------------------------
    // 1. NATIVE 60FPS WEBGL STAGE & COOL ARCHITECTURAL FILM ATMOSPHERE
    // -----------------------------------------------------------------------
    const wrap = document.createElement('div');
    wrap.className = 'pv-sketch3d-wrap';
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
    const BLACK_COLOR = new THREE.Color(0x000000);
    const SKY_BG_COLOR = new THREE.Color(0x9fb6c8);
    const SKY_FOG_COLOR = new THREE.Color(0x9fb6c8);
    scene.background = BLACK_COLOR.clone();
    const sceneFog = new THREE.FogExp2(0x000000, 0.0028);
    scene.fog = sceneFog;

    // Restrained architectural focal length (46° = cleaner straight-line perspective!)
    const BASE_FOV = 46;
    const aspect = vw / Math.max(1, vh);
    const camera = new THREE.PerspectiveCamera(BASE_FOV, aspect, 0.25, 420);

    // Exact 1:1 top-down road collage starting geometry (seamless handoff from Bar 17 floodCanvas)
    const ROAD_PATCH_Z = 14.0;
    const TOP_CAM_Y = 8.4;
    const patchH = 2 * TOP_CAM_Y * Math.tan((BASE_FOV * Math.PI) / 360);
    const patchW = patchH * aspect;

    const ROAD_HALF_W = Math.max(9.0, patchW * 0.5 + 0.6);
    const TJUNC_Z = -34.0;
    const CROSS_DEPTH = 17.0;
    const FAR_CURB_Z = TJUNC_Z - CROSS_DEPTH; // -51.0

    // -----------------------------------------------------------------------
    // 2. LOW-SATURATION ARCHITECTURAL FILM COOL GREY-BLUE SKY DOME
    //    Zenith #243d63 -> Mid #4b6f99 -> Horizon #b7cad8 (ZERO strobing!)
    // -----------------------------------------------------------------------
    function makeArchitecturalSkyTex() {
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 512;
      const g = c.getContext('2d');
      if (g) {
        const grad = g.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0.00, '#243d63'); // cool architectural film zenith
        grad.addColorStop(0.24, '#365680'); // muted deep slate blue
        grad.addColorStop(0.42, '#4b6f99'); // mid cool grey-blue
        grad.addColorStop(0.50, '#8ba6be'); // calm atmospheric upper horizon
        grad.addColorStop(0.55, '#b7cad8'); // cool pale architectural horizon
        grad.addColorStop(0.68, '#9fb6c8'); // soft lower horizon veil
        grad.addColorStop(1.00, '#788fa3'); // quiet matte cool nadir
        g.fillStyle = grad;
        g.fillRect(0, 0, 16, 512);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    }

    const skyDomeMat = new THREE.MeshBasicMaterial({
      map: makeArchitecturalSkyTex(),
      side: THREE.BackSide,
      fog: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(340, 32, 20), skyDomeMat);
    scene.add(skyDome);

    // -----------------------------------------------------------------------
    // 3. RESTRAINED NEUTRAL DARK-GREY GROUND CONTACT SHADOWS (ZERO BLUE BLOBS)
    // -----------------------------------------------------------------------
    function makeContactShadowTex() {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 64;
      const g = c.getContext('2d');
      if (g) {
        const grad = g.createRadialGradient(64, 32, 8, 64, 32, 58);
        grad.addColorStop(0.00, 'rgba(18, 22, 28, 0.30)');
        grad.addColorStop(0.55, 'rgba(18, 22, 28, 0.14)');
        grad.addColorStop(1.00, 'rgba(18, 22, 28, 0.00)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 128, 64);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    }
    const contactShadowTex = makeContactShadowTex();
    const sharedContactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.0,
    });

    function createContactShadow(wx, wz, width, depth, opts2) {
      const o = opts2 || {};
      const geo = new THREE.PlaneGeometry(Math.max(0.8, width), Math.max(0.5, depth));
      const mat = o.ownMat ? new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: o.opacity ?? 0.65,
      }) : sharedContactShadowMat;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(wx, o.y ?? 0.028, wz);
      scene.add(mesh);
      return { mesh, mat, baseOpacity: o.opacity ?? 0.65 };
    }

    // -----------------------------------------------------------------------
    // 4. TONAL-CALIBRATED PHOTOGRAPH TEXTURE & CUTOUT FACTORY
    //    Supports clean `uvCrop` & gentle film-print tonal restraint (`tone`)
    // -----------------------------------------------------------------------
    const textureCache = new Map();
    const pendingTextures = [];

    const TONE_FILTERS = {
      none: '',
      neutral: 'saturate(0.86) brightness(0.95) contrast(1.04)',
      arch: 'saturate(0.72) brightness(0.92) contrast(1.05)',
      theme: 'saturate(0.86) brightness(0.95) contrast(1.04)',
      themeCalm: 'saturate(0.75) brightness(0.91) contrast(1.04)',
      obj: 'saturate(0.90) brightness(0.96) contrast(1.03)',
    };

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
      const repeatX = o.repeatX || 0;
      const repeatY = o.repeatY || 0;
      const tone = o.tone || 'neutral';
      const crop = o.uvCrop || null;
      const cropKey = crop ? `${crop.u0},${crop.v0},${crop.u1},${crop.v1}` : 'full';
      const key = `${maxDim}:${tone}:${cropKey}:${repeatX}x${repeatY}:${meta.src}:${meta.x0 || 0},${meta.y0 || 0},${meta.bw || 0},${meta.bh || 0}`;
      if (textureCache.has(key)) return textureCache.get(key);

      const baseBw = meta.bw || meta.w || 256;
      const baseBh = meta.bh || meta.h || 256;
      const bw = crop ? Math.max(8, Math.round(baseBw * (crop.u1 - crop.u0))) : baseBw;
      const bh = crop ? Math.max(8, Math.round(baseBh * (crop.v1 - crop.v0))) : baseBh;
      const sc = Math.min(1, maxDim / Math.max(bw, bh));

      const cnv = document.createElement('canvas');
      cnv.width = Math.max(16, Math.round(bw * sc));
      cnv.height = Math.max(16, Math.round(bh * sc));
      const ctx = cnv.getContext('2d');
      const tex = new THREE.CanvasTexture(cnv);
      const im = getImage(meta.src);

      function paint() {
        if (!ctx || !im || !im.complete || !im.naturalWidth) return false;
        ctx.clearRect(0, 0, cnv.width, cnv.height);
        ctx.save();
        const filt = TONE_FILTERS[tone] || '';
        if (filt && 'filter' in ctx) ctx.filter = filt;
        const fullSx = meta.x0 || 0;
        const fullSy = meta.y0 || 0;
        const fullSw = meta.bw || im.naturalWidth;
        const fullSh = meta.bh || im.naturalHeight;
        const sx = crop ? (fullSx + fullSw * crop.u0) : fullSx;
        const sy = crop ? (fullSy + fullSh * crop.v0) : fullSy;
        const sw = crop ? (fullSw * (crop.u1 - crop.u0)) : fullSw;
        const sh = crop ? (fullSh * (crop.v1 - crop.v0)) : fullSh;
        ctx.drawImage(im, sx, sy, sw, sh, 0, 0, cnv.width, cnv.height);
        ctx.restore();
        configureTex(tex, repeatX, repeatY);
        return true;
      }

      if (!paint()) {
        pendingTextures.push(paint);
        im.addEventListener('load', () => {
          if (paint() && active) {
            renderer.render(scene, camera);
          }
        }, { once: true });
      }
      textureCache.set(key, tex);
      return tex;
    }

    function makeCutout(meta, targetH, opts2) {
      const o = opts2 || {};
      const tex = getCutoutTex(meta, {
        maxDim: o.maxDim || 512,
        tone: o.tone || 'neutral',
        uvCrop: o.uvCrop || null,
      });
      const baseBw = (meta && meta.bw) || (meta && meta.w) || 100;
      const baseBh = (meta && meta.bh) || (meta && meta.h) || 100;
      const effBw = o.uvCrop ? baseBw * (o.uvCrop.u1 - o.uvCrop.u0) : baseBw;
      const effBh = o.uvCrop ? baseBh * (o.uvCrop.v1 - o.uvCrop.v0) : baseBh;
      const ar = effBw / Math.max(1, effBh);
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
        color: o.color ?? 0xf3f5f8,
        transparent: true,
        alphaTest: o.alphaTest ?? 0.14,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      if (o.flipX) mesh.scale.x = -1;
      return { mesh, mat, w, h, meta };
    }

    // -----------------------------------------------------------------------
    // 5. STREET ACTOR REGISTRY & BAR 25 FOUR-BEAT STRUCTURAL CLEAR-OUT GROUPS
    //    Beat 0 (16.79s): horizon buildings & crossing cars
    //    Beat 1 (17.40s): pedestrian footbridge & catenary wires
    //    Beat 2 (17.97s): flanking modernist buildings & utility poles
    //    Beat 3 (18.59s): 4 traffic signals & street surface markings
    // -----------------------------------------------------------------------
    const collageActors = [];
    const clearableActors = [];

    function registerStreetActor(obj, role, clearBeatIdx, extra) {
      const ex = extra || {};
      collageActors.push({
        obj,
        role,
        homePos: obj.position.clone(),
        homeScale: obj.scale.clone(),
      });
      clearableActors.push({
        obj,
        role,
        shadow: ex.shadow || null,
        homePos: obj.position.clone(),
        homeScale: obj.scale.clone(),
        clearBeatIdx,
        clearMode: ex.clearMode || 'lift', // 'lift' | 'partLift' | 'converge'
        sideSign: ex.sideSign || 0,
        liftDist: ex.liftDist ?? 26.0,
        partDist: ex.partDist ?? 12.0,
        riseDelay: ex.riseDelay ?? 0.0,
        riseDur: ex.riseDur ?? 0.0,
      });
    }

    // -----------------------------------------------------------------------
    // 6. SOLID REAL-PHOTO ASPHALT GROUND, CROSSWALKS & SEAMLESS BAR 17 PATCH
    //    Zero R->L blinking or disappearing floor tiles!
    // -----------------------------------------------------------------------
    // Quiet architectural matte datum horizon plane (blends seamlessly into #9fb6c8 mist!)
    const horizonDatumMat = new THREE.MeshBasicMaterial({ color: 0x99aec0 });
    const horizonDatum = new THREE.Mesh(new THREE.PlaneGeometry(540, 540), horizonDatumMat);
    horizonDatum.rotation.x = -Math.PI / 2;
    horizonDatum.position.set(0, -0.04, -34);
    horizonDatum.visible = false;
    scene.add(horizonDatum);

    // Solid photographic asphalt road base (sized cleanly to the street block — zero dark horizon bar!)
    const baseAsphaltTex = getCutoutTex(findBySrc('马路纹理/01.webp', roadTextures, 0), {
      maxDim: 512, repeatX: 16, repeatY: 12, tone: 'arch',
    });
    const roadBaseMat = new THREE.MeshBasicMaterial({
      map: baseAsphaltTex,
      color: 0xc2c9d0,
      transparent: true,
      opacity: 1,
    });
    const roadBase = new THREE.Mesh(new THREE.PlaneGeometry(210, 108), roadBaseMat);
    roadBase.rotation.x = -Math.PI / 2;
    roadBase.position.set(0, -0.015, -18);
    scene.add(roadBase);

    // Structured road markings, sidewalks & zebra crosswalks group (100% solid & grounded during Bar 18-24)
    const roadSurfaceGroup = new THREE.Group();
    scene.add(roadSurfaceGroup);

    const sidewalkMeta = findBySrc('水泥纹理/03.webp', concreteTextures, 2) || findBySrc('水泥纹理/08.webp', concreteTextures, 6);
    const avenueMeta = findBySrc('马路纹理/02.webp', roadTextures, 1) || findBySrc('马路纹理/01.webp', roadTextures, 0);

    // Single crisp centered 4-lane asphalt boulevard with double yellow centerline
    const avenueTex = getCutoutTex(avenueMeta, { maxDim: 512, repeatX: 1, repeatY: 5, tone: 'arch' });
    const avenueMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_HALF_W * 2, 86),
      new THREE.MeshBasicMaterial({ map: avenueTex, color: 0xc6cdd4, transparent: true, opacity: 1 })
    );
    avenueMesh.rotation.x = -Math.PI / 2;
    avenueMesh.position.set(0, 0.004, -12);
    roadSurfaceGroup.add(avenueMesh);

    // Horizontal cross-avenue at T-junction (clean fine-grain photographic asphalt + subtle center divider)
    const crossTex = getCutoutTex(findBySrc('马路纹理/01.webp', roadTextures, 0), {
      maxDim: 512, repeatX: 14, repeatY: 2, tone: 'arch',
    });
    const crossMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(176, CROSS_DEPTH + 1.5),
      new THREE.MeshBasicMaterial({ map: crossTex, color: 0xbcc4cc, transparent: true, opacity: 1 })
    );
    crossMesh.rotation.x = -Math.PI / 2;
    crossMesh.position.set(0, 0.006, TJUNC_Z - CROSS_DEPTH * 0.5);
    roadSurfaceGroup.add(crossMesh);

    // Subtle crisp architectural centerline along cross-street
    const crossDivider = new THREE.Mesh(
      new THREE.PlaneGeometry(170, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xc8ccd0, transparent: true, opacity: 0.45 })
    );
    crossDivider.rotation.x = -Math.PI / 2;
    crossDivider.position.set(0, 0.011, TJUNC_Z - CROSS_DEPTH * 0.5);
    roadSurfaceGroup.add(crossDivider);

    // Seamless poured-concrete sidewalks flanking both sides of the main road & far curb
    const swTex = getCutoutTex(sidewalkMeta, { maxDim: 512, repeatX: 5, repeatY: 14, tone: 'arch' });
    const swMat = new THREE.MeshBasicMaterial({ map: swTex, color: 0xcad2da, transparent: true, opacity: 1 });
    [-1, 1].forEach((side) => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(38, 72), swMat);
      sw.rotation.x = -Math.PI / 2;
      sw.position.set(side * (ROAD_HALF_W + 19.0), 0.010, +2.0);
      roadSurfaceGroup.add(sw);
      // Crisp curb edge rule line
      const curb = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 72),
        new THREE.MeshBasicMaterial({ color: 0x363f4a, transparent: true, opacity: 0.62 })
      );
      curb.rotation.x = -Math.PI / 2;
      curb.position.set(side * ROAD_HALF_W, 0.014, +2.0);
      roadSurfaceGroup.add(curb);
    });
    const farSidewalk = new THREE.Mesh(new THREE.PlaneGeometry(186, 22), swMat);
    farSidewalk.rotation.x = -Math.PI / 2;
    farSidewalk.position.set(0, 0.010, FAR_CURB_Z - 11.0);
    roadSurfaceGroup.add(farSidewalk);

    // Crisp monochrome graphic zebra crosswalks at T-mouth & both cross-branches
    const zebraMat = new THREE.MeshBasicMaterial({ color: 0xd6dde4, transparent: true, opacity: 0.84 });
    const MAIN_CW_STRIPES = 9;
    for (let s = 0; s < MAIN_CW_STRIPES; s++) {
      const sx = -ROAD_HALF_W + 1.5 + (s / (MAIN_CW_STRIPES - 1)) * (ROAD_HALF_W * 2 - 3.0);
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 4.4), zebraMat);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(sx, 0.016, TJUNC_Z + 2.8);
      roadSurfaceGroup.add(bar);
    }
    // Crisp stop-line ahead of main crosswalk
    const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF_W * 1.90, 0.32), zebraMat);
    stopLine.rotation.x = -Math.PI / 2;
    stopLine.position.set(0, 0.016, TJUNC_Z + 6.1);
    roadSurfaceGroup.add(stopLine);

    const BRANCH_CW_STRIPES = 7;
    [-1, 1].forEach((side) => {
      for (let s = 0; s < BRANCH_CW_STRIPES; s++) {
        const sz = FAR_CURB_Z + 2.0 + (s / (BRANCH_CW_STRIPES - 1)) * (CROSS_DEPTH - 4.0);
        const bar = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.78), zebraMat);
        bar.rotation.x = -Math.PI / 2;
        bar.position.set(side * (ROAD_HALF_W + 3.8), 0.016, sz);
        roadSurfaceGroup.add(bar);
      }
    });

    // 1:1 Seamless Bar 17 `floodCanvas` top-down road patch (dissolves calmly into asphalt road during Bar 18 lift!)
    const collageMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const collageMesh = new THREE.Mesh(new THREE.PlaneGeometry(patchW, patchH), collageMat);
    collageMesh.rotation.x = -Math.PI / 2;
    collageMesh.position.set(0, 0.022, ROAD_PATCH_Z);
    scene.add(collageMesh);

    // -----------------------------------------------------------------------
    // 7. FRONTAL 2.5D LAYERED STREET ARCHITECTURE (rotation.y = 0 ONLY!)
    //    All cutouts face the camera squarely — ZERO thin paper edges!
    // -----------------------------------------------------------------------

    // 7a. Flanking Low-Rise Modernist Buildings / Storefronts (Left & Right 2.5D wings)
    const flankSpecs = [
      // Inner row (defining clean single-point corridor edge)
      { side: -1, x: -(ROAD_HALF_W + 6.8), z: +1.5,  w: 9.2,  h: 6.2, idx: 0,  signIdx: 0 },
      { side: +1, x: +(ROAD_HALF_W + 6.8), z: +0.5,  w: 9.0,  h: 6.4, idx: 1,  signIdx: 1 },
      { side: -1, x: -(ROAD_HALF_W + 7.2), z: -10.0, w: 9.8,  h: 7.4, idx: 2,  signIdx: 2 },
      { side: +1, x: +(ROAD_HALF_W + 7.2), z: -11.0, w: 9.6,  h: 7.0, idx: 3,  signIdx: 3 },
      { side: -1, x: -(ROAD_HALF_W + 7.6), z: -22.5, w: 10.2, h: 8.0, idx: 4,  signIdx: 4 },
      { side: +1, x: +(ROAD_HALF_W + 7.6), z: -23.0, w: 10.0, h: 7.8, idx: 5,  signIdx: 5 },
      { side: -1, x: -(ROAD_HALF_W + 8.4), z: -33.0, w: 10.4, h: 7.2, idx: 6,  signIdx: 6 },
      { side: +1, x: +(ROAD_HALF_W + 8.4), z: -33.0, w: 10.4, h: 7.4, idx: 7,  signIdx: 7 },
      // Mid-outer depth layer (frames outer sky edges while preserving 50%+ open cool grey-blue sky)
      { side: -1, x: -(ROAD_HALF_W + 17.5), z: -5.5,  w: 11.4, h: 9.4,  idx: 8,  signIdx: -1 },
      { side: +1, x: +(ROAD_HALF_W + 17.5), z: -6.5,  w: 11.4, h: 9.8,  idx: 9,  signIdx: -1 },
      { side: -1, x: -(ROAD_HALF_W + 18.8), z: -26.5, w: 12.0, h: 10.6, idx: 10, signIdx: -1 },
      { side: +1, x: +(ROAD_HALF_W + 18.8), z: -27.5, w: 12.0, h: 10.2, idx: 11, signIdx: -1 },
    ];

    flankSpecs.forEach((fs) => {
      const grp = new THREE.Group();
      grp.position.set(fs.x, 0, fs.z);
      // Strictly frontal 2.5D plane (rotation.y = 0)
      const main = makeCutout(pickMeta(streetFacadePool, fs.idx), fs.h, {
        fixedW: fs.w, maxDim: 512, pivot: 'bottom', tone: 'arch', color: 0xe6ebf0,
      });
      grp.add(main.mesh);
      // Subtle Z-offset architectural wayfinding plate on selected inner storefronts
      if (fs.signIdx >= 0 && photoSigns.length) {
        const sg = makeCutout(pickMeta(photoSigns, fs.signIdx * 2 + 1), 1.35, {
          maxW: 3.4, maxDim: 256, pivot: 'bottom', tone: 'neutral', color: 0xe8edf2,
        });
        sg.mesh.position.set(-fs.side * (fs.w * 0.20), fs.h * 0.56, 0.24);
        grp.add(sg.mesh);
      }
      const sh = createContactShadow(fs.x, fs.z + 0.3, fs.w * 0.96, 2.2);
      scene.add(grp);
      registerStreetActor(grp, 'building', 2, {
        shadow: sh,
        clearMode: 'partLift',
        sideSign: fs.side,
        partDist: 10.0,
        liftDist: 28.0,
      });
    });

    // 7b. Low Horizontal T-Junction Horizon Buildings (z = -55, clean open sky above!)
    for (let i = -3; i <= 3; i++) {
      const fx = i * 11.4;
      const fz = FAR_CURB_Z - 4.4 - (Math.abs(i) % 2) * 1.6;
      const fh = 4.4 + (Math.abs(i) % 3) * 0.65;
      const fw = 10.2;
      const grp = new THREE.Group();
      grp.position.set(fx, 0, fz);
      const card = makeCutout(pickMeta(streetFacadePool, i + 15), fh, {
        fixedW: fw, maxDim: 384, pivot: 'bottom', tone: 'arch', color: 0xdce3ea,
      });
      grp.add(card.mesh);
      const sh = createContactShadow(fx, fz + 0.25, fw * 0.92, 1.8);
      scene.add(grp);
      registerStreetActor(grp, 'horizonBuilding', 0, {
        shadow: sh,
        clearMode: 'lift',
        liftDist: 26.0,
      });
    }

    // 7c. Utility Poles & Clean Dark Overhead Catenary Wires (ZERO bouncing wire notes, ZERO bunting!)
    const poleAnchorsL = [];
    const poleAnchorsR = [];
    const poleZs = [6.5, -6.5, -20.0, -32.5];

    poleZs.forEach((pz, idx) => {
      const poleH = 9.6 + (idx % 2) * 0.6;
      [-1, 1].forEach((side) => {
        const px = side * (ROAD_HALF_W + 1.35);
        const grp = new THREE.Group();
        grp.position.set(px, 0, pz);
        const card = makeCutout(pickMeta(photoPoles, idx * 2 + (side > 0 ? 5 : 0)), poleH, {
          maxW: 3.4, maxDim: 384, flipX: side > 0, tone: 'neutral', color: 0xdce2e8,
        });
        grp.add(card.mesh);
        const sh = createContactShadow(px, pz, 1.5, 1.1);
        scene.add(grp);
        registerStreetActor(grp, 'pole', 2, {
          shadow: sh,
          clearMode: 'partLift',
          sideSign: side,
          partDist: 8.5,
          liftDist: 28.0,
        });

        const tip = new THREE.Vector3(px, poleH * 0.88, pz);
        if (side < 0) poleAnchorsL.push(tip);
        else poleAnchorsR.push(tip);
      });
    });

    const wireMat = new THREE.LineBasicMaterial({ color: 0x161d26, transparent: true, opacity: 0.72 });
    const catenaryWires = [];

    function addStaticCatenary(aVec, bVec, sag) {
      const segs = 18;
      const pts = [];
      for (let s = 0; s <= segs; s++) {
        const f = s / segs;
        const arch = 4 * f * (1 - f);
        pts.push(new THREE.Vector3(
          aVec.x + (bVec.x - aVec.x) * f,
          aVec.y + (bVec.y - aVec.y) * f - sag * arch,
          aVec.z + (bVec.z - aVec.z) * f
        ));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, wireMat);
      scene.add(line);
      catenaryWires.push(line);
      return line;
    }

    for (let i = 0; i < poleAnchorsL.length - 1; i++) {
      addStaticCatenary(poleAnchorsL[i], poleAnchorsL[i + 1], 1.10);
      addStaticCatenary(poleAnchorsL[i].clone().add(new THREE.Vector3(0, -0.58, 0)), poleAnchorsL[i + 1].clone().add(new THREE.Vector3(0, -0.58, 0)), 1.38);
      addStaticCatenary(poleAnchorsR[i], poleAnchorsR[i + 1], 1.10);
      addStaticCatenary(poleAnchorsR[i].clone().add(new THREE.Vector3(0, -0.58, 0)), poleAnchorsR[i + 1].clone().add(new THREE.Vector3(0, -0.58, 0)), 1.38);
    }
    // Two clean graphic cross-street overhead wire spans cutting crisply across the grey-blue sky
    [1, 3].forEach((idx) => {
      if (poleAnchorsL[idx] && poleAnchorsR[idx]) {
        addStaticCatenary(poleAnchorsL[idx], poleAnchorsR[idx], 1.35);
        addStaticCatenary(poleAnchorsL[idx].clone().add(new THREE.Vector3(0, -0.42, 0)), poleAnchorsR[idx].clone().add(new THREE.Vector3(0, -0.42, 0)), 1.62);
      }
    });

    // 7d. Pedestrian Footbridge (z = -16.2, deck y = 6.7m) + 4 Under-Bridge R->L Crisp Signs
    const BRIDGE_Z = -16.2;
    const BRIDGE_Y = 6.7;
    const BRIDGE_SPAN = ROAD_HALF_W * 2 + 4.4;

    const footbridgeGrp = new THREE.Group();
    footbridgeGrp.position.set(0, 0, BRIDGE_Z);

    const pierCrop = { u0: 0.0, v0: 0.0, u1: 1.0, v1: 0.62 }; // solid form-tie concrete!
    const pierL = makeCutout(findBySrc('水泥纹理/06.webp', concreteTextures, 4), BRIDGE_Y + 0.4, {
      fixedW: 2.1, maxDim: 320, tone: 'arch', color: 0xcad2da, uvCrop: pierCrop, alphaTest: 0.01,
    });
    pierL.mesh.position.set(-(ROAD_HALF_W + 1.8), 0, -0.12);
    footbridgeGrp.add(pierL.mesh);

    const pierR = makeCutout(findBySrc('水泥纹理/06.webp', concreteTextures, 4), BRIDGE_Y + 0.4, {
      fixedW: 2.1, maxDim: 320, tone: 'arch', color: 0xcad2da, uvCrop: pierCrop, alphaTest: 0.01,
    });
    pierR.mesh.position.set(+(ROAD_HALF_W + 1.8), 0, -0.12);
    footbridgeGrp.add(pierR.mesh);

    // Clean solid poured-concrete horizontal span girder (ZERO torn alpha edge!)
    const girder = makeCutout(findBySrc('水泥纹理/02.webp', concreteTextures, 1), 1.04, {
      fixedW: BRIDGE_SPAN, maxDim: 512, pivot: 'bottom', tone: 'arch', color: 0xd4dce4, alphaTest: 0.01,
    });
    girder.mesh.position.set(0, BRIDGE_Y - 0.50, 0.0);
    footbridgeGrp.add(girder.mesh);

    // Minimalist architectural steel parapet railing (clean dark horizontal & vertical hairlines)
    const railDarkMat = new THREE.MeshBasicMaterial({ color: 0x1c232c });
    const topRail = new THREE.Mesh(new THREE.PlaneGeometry(BRIDGE_SPAN, 0.09), railDarkMat);
    topRail.position.set(0, BRIDGE_Y + 1.48, 0.08);
    footbridgeGrp.add(topRail);
    const midRail = new THREE.Mesh(new THREE.PlaneGeometry(BRIDGE_SPAN, 0.05), railDarkMat);
    midRail.position.set(0, BRIDGE_Y + 1.02, 0.08);
    footbridgeGrp.add(midRail);
    const topTrim = new THREE.Mesh(new THREE.PlaneGeometry(BRIDGE_SPAN, 0.06), railDarkMat);
    topTrim.position.set(0, BRIDGE_Y + 0.54, 0.08);
    footbridgeGrp.add(topTrim);
    const botTrim = new THREE.Mesh(new THREE.PlaneGeometry(BRIDGE_SPAN, 0.07), railDarkMat);
    botTrim.position.set(0, BRIDGE_Y - 0.52, 0.08);
    footbridgeGrp.add(botTrim);
    const POST_N = 15;
    for (let r = 0; r < POST_N; r++) {
      const rx = -BRIDGE_SPAN * 0.48 + (r / (POST_N - 1)) * (BRIDGE_SPAN * 0.96);
      const post = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.96), railDarkMat);
      post.position.set(rx, BRIDGE_Y + 1.02, 0.07);
      footbridgeGrp.add(post);
    }

    // 4 Under-Bridge Hanging Signs (index 0=R-far, 1=R-near, 2=L-near, 3=L-far)
    // Mounted on crisp matte-dark steel sign housings so every landscape wayfinding plate stays undistorted!
    const bridgeSigns = [];
    const lbXs = [+6.0, +2.0, -2.0, -6.0];
    const signBackMat = new THREE.MeshBasicMaterial({ color: 0x181e26 });
    for (let i = 0; i < 4; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(lbXs[i], BRIDGE_Y - 0.56, 0.16);
      const housing = new THREE.Mesh(new THREE.PlaneGeometry(2.58, 0.96), signBackMat);
      housing.position.set(0, -0.48, -0.02);
      pivot.add(housing);
      const baseCursor = i;
      const card = makeCutout(pickMeta(bridgeSignMetas, baseCursor), 0.80, {
        fixedW: 2.38, maxDim: 256, pivot: 'top', tone: 'neutral', color: 0xedf0f4, alphaTest: 0.04,
      });
      card.mesh.position.set(0, -0.08, 0.02);
      pivot.add(card.mesh);
      footbridgeGrp.add(pivot);
      bridgeSigns.push({
        pivot,
        mat: card.mat,
        baseY: BRIDGE_Y - 0.56,
        baseCursor,
        lastStep: -1,
      });
    }

    const bridgeShadow = createContactShadow(0, BRIDGE_Z + 0.5, BRIDGE_SPAN * 0.92, 2.6);
    scene.add(footbridgeGrp);
    registerStreetActor(footbridgeGrp, 'footbridge', 1, {
      shadow: bridgeShadow,
      clearMode: 'lift',
      liftDist: 26.0,
    });

    // 7e. 4 Curated Photographic Traffic Signals (4 completely distinct vertical columns: R-far | R-near | L-near | L-far)
    const signalSpecs = [
      { id: 'R-FAR',  x: +(ROAD_HALF_W + 4.4), z: -31.8, poleIdx: 3, sigOffset: 0, h: 8.8, armX: -0.9, side: +1 },
      { id: 'R-NEAR', x: +(ROAD_HALF_W - 0.8), z: -22.8, poleIdx: 5, sigOffset: 3, h: 7.0, armX: -0.6, side: +1 },
      { id: 'L-NEAR', x: -(ROAD_HALF_W - 0.8), z: -22.8, poleIdx: 6, sigOffset: 6, h: 7.0, armX: +0.6, side: -1 },
      { id: 'L-FAR',  x: -(ROAD_HALF_W + 4.4), z: -31.8, poleIdx: 8, sigOffset: 9, h: 8.8, armX: +0.9, side: -1 },
    ];

    const trafficSignals = signalSpecs.map((sp) => {
      const root = new THREE.Group();
      root.position.set(sp.x, 0, sp.z);
      const pole = makeCutout(pickMeta(photoPoles, sp.poleIdx), sp.h, {
        maxW: 3.0, maxDim: 320, flipX: sp.side < 0, tone: 'neutral', color: 0xdce2e8,
      });
      root.add(pole.mesh);

      const headGrp = new THREE.Group();
      const headBaseY = sp.h * 0.78;
      headGrp.position.set(sp.armX, headBaseY, 0.22);
      const head = makeCutout(pickMeta(photoSignals, sp.sigOffset), 2.85, {
        maxW: 2.3, maxDim: 320, pivot: 'center', tone: 'neutral', color: 0xf0f3f6,
      });
      headGrp.add(head.mesh);
      root.add(headGrp);

      const sh = createContactShadow(sp.x, sp.z, 1.8, 1.2);
      scene.add(root);
      registerStreetActor(root, 'trafficSignal', 3, {
        shadow: sh,
        clearMode: 'converge',
        sideSign: sp.side,
      });

      return {
        root,
        headGrp,
        headBaseY,
        mat: head.mat,
        baseOffset: sp.sigOffset,
        lastStep: -1,
      };
    });

    // 7f. Calm Horizontally Crossing Photographic Vehicles (cars/001-011 ONLY — zero bounce, zero roof stacks!)
    const crossingCars = [
      { idx: 0, dir: +1, flipX: true,  z: TJUNC_Z - 4.2,  x0: -64, speed: 12.6, span: 146, h: 2.10 },
      { idx: 2, dir: +1, flipX: true,  z: TJUNC_Z - 4.2,  x0: -14, speed: 12.6, span: 146, h: 2.20 },
      { idx: 5, dir: +1, flipX: true,  z: TJUNC_Z - 4.2,  x0: +36, speed: 12.6, span: 146, h: 2.05 },
      { idx: 7, dir: -1, flipX: false, z: TJUNC_Z - 11.4, x0: +58, speed: 14.2, span: 150, h: 2.15 },
      { idx: 9, dir: -1, flipX: false, z: TJUNC_Z - 11.4, x0: +8,  speed: 14.2, span: 150, h: 2.25 },
      { idx: 1, dir: -1, flipX: false, z: TJUNC_Z - 11.4, x0: -44, speed: 14.2, span: 150, h: 2.10 },
    ].map((spec) => {
      const grp = new THREE.Group();
      const card = makeCutout(pickMeta(photoCars, spec.idx), spec.h, {
        maxW: spec.h * 3.3, maxDim: 512, flipX: spec.flipX, pivot: 'bottom', tone: 'neutral', color: 0xebeff4,
      });
      grp.add(card.mesh);
      grp.position.set(spec.x0, 0.04, spec.z);
      scene.add(grp);
      collageActors.push({ obj: grp, role: 'car', homePos: grp.position.clone(), homeScale: grp.scale.clone() });
      const sh = createContactShadow(spec.x0, spec.z + 0.12, card.w * 0.94, 1.45, { ownMat: true, opacity: 0.72 });
      return { ...spec, grp, sh };
    });

    // -----------------------------------------------------------------------
    // 8. FRONTAL 2.5D ARCHITECTURAL SECTION TOWER (12 + 1 THEMED FLOORS)
    // -----------------------------------------------------------------------
    const TOWER_X = 0.0;
    const TOWER_Z = TJUNC_Z; // -34.0

    const towerBuilt = window.MicCheckTower && window.MicCheckTower.buildSectionTower
      ? window.MicCheckTower.buildSectionTower({
          THREE, scene, TOWER_X, TOWER_Z, BAR, BEAT,
          MIC_CHECK_AGE, TOWER_START, TOWER_FINISH,
          makeCutout, getCutoutTex, findBySrc, pickMeta,
          towerThemes, concreteTextures, brickTextures, archTextures,
          buildingsClean, streetsPool, polesPool, itemsPool,
        })
      : {
          towerRoot: new THREE.Group(),
          plinthGrp: new THREE.Group(),
          plinthH: 0.78,
          plinthStartAge: MIC_CHECK_AGE,
          towerFloors: [],
          floorAnimators: [],
          STAGE_COUNT: 13,
          totalTowerTopY: 62.27,
          maxWidth: 22.0,
        };

    const { towerRoot, plinthGrp, towerFloors, floorAnimators, totalTowerTopY, maxWidth } = towerBuilt;

    // Precompute exact responsive frontal architectural camera distances (zero clipping on any viewport!)
    const fovRad = (BASE_FOV * Math.PI) / 180;
    const tanHalfFov = Math.tan(fovRad * 0.5);
    const closeDistByWidth = (maxWidth / 0.80) / (2 * tanHalfFov * Math.max(0.55, aspect));
    const TOWER_CLOSE_DIST = clamp(Math.max(19.2, closeDistByWidth), 19.2, 38.0);
    const fullDistByHeight = ((totalTowerTopY + 7.5) / 0.88) / (2 * tanHalfFov);
    const fullDistByWidth = ((maxWidth + 8.0) / 0.82) / (2 * tanHalfFov * Math.max(0.55, aspect));
    const TOWER_FULL_DIST = Math.max(fullDistByHeight, fullDistByWidth);

    // -----------------------------------------------------------------------
    // 9. PURE DETERMINISTIC FRAME UPDATERS (100% FUNCTION OF `age`!)
    // -----------------------------------------------------------------------
    let active = false;
    let collageCaptured = false;
    let collageTexture = null;
    let currentSkyReveal = 0;

    function captureRoadCollage(srcCanvas) {
      if (!srcCanvas || collageCaptured) return;
      collageCaptured = true;
      const snap = document.createElement('canvas');
      snap.width = srcCanvas.width;
      snap.height = srcCanvas.height;
      const sCtx = snap.getContext('2d');
      if (sCtx) sCtx.drawImage(srcCanvas, 0, 0);
      collageTexture = new THREE.CanvasTexture(snap);
      collageTexture.anisotropy = maxAniso;
      collageTexture.minFilter = THREE.LinearMipmapLinearFilter;
      collageTexture.magFilter = THREE.LinearFilter;
      collageTexture.needsUpdate = true;
      collageMat.map = collageTexture;
      collageMat.needsUpdate = true;
    }

    function flushPendingTextures() {
      for (let i = pendingTextures.length - 1; i >= 0; i--) {
        if (pendingTextures[i]()) pendingTextures.splice(i, 1);
      }
    }

    // ONE single composed atmospheric transition: #000000 -> cool architectural film grey-blue sky
    // during Bar 18 camera pitch-up (0.40s -> 2.50s), then rock-steady forever after!
    function updateSkyAndAtmosphere(age) {
      const skyReveal = smootherstep((age - 0.40) / 2.10);
      currentSkyReveal = skyReveal;
      skyDomeMat.opacity = skyReveal;
      scene.background.copy(BLACK_COLOR).lerp(SKY_BG_COLOR, skyReveal);
      sceneFog.color.copy(BLACK_COLOR).lerp(SKY_FOG_COLOR, skyReveal);

      const streetShadowFade = age < SHOCK_KICKS[2]
        ? 1.0
        : (1.0 - smootherstep((age - SHOCK_KICKS[2]) / 0.45));
      sharedContactShadowMat.opacity = 0.72 * skyReveal * streetShadowFade;
    }

    // Pure central-axis (x = 0) architectural camera:
    //   - Bar 18 (0.00 -> 2.65s):    Dead-center smooth pitch-up from Bar 17 top-down floodCanvas
    //   - Bar 18-24 (2.65 -> 16.79s): Calm, level 1-point perspective forward push (ZERO weave/roll/FOV jitter)
    //   - Bar 25-26 (16.79 -> 21.39s): Smooth axial glide into Floor 1 frontal elevation framing
    //   - Bar 27-39 (21.39 -> 50.65s): Stepped-dwell vertical climb along x = 0 with readable pause on each floor
    //   - Bar 39-40 (50.65 -> 53.95s): Smooth axial pull-back to monumental full-tower frontal elevation hold
    function computeSteppedTowerY(age) {
      if (!towerFloors.length) return 3.1;
      const firstY = towerFloors[0].yMid;
      if (age <= TOWER_START) return firstY;

      let y = firstY;
      const climbFrac = 0.46; // 46% smooth climb -> 54% poised readable stillness on each floor!
      for (let i = 1; i < towerFloors.length; i++) {
        const fl = towerFloors[i];
        const prevY = towerFloors[i - 1].yMid;
        const climbDur = BAR * climbFrac;
        if (age <= fl.startAge) break;
        const u = smootherstep((age - fl.startAge) / climbDur);
        y = prevY + (fl.yMid - prevY) * u;
      }
      return y;
    }

    function updateCameraAt(age) {
      const PULLUP_DUR = 2.65;
      const uPull = smootherstep(age / PULLUP_DUR);

      const streetStartZ = ROAD_PATCH_Z + 6.0; // +20.0
      const streetEndZ = -1.5;                 // +32.5m ahead of TJUNC_Z (-34.0)
      const streetCamY = 4.6;
      const streetLookY = 5.4;

      const floor0Y = towerFloors.length ? towerFloors[0].yMid : 3.1;
      const towerCloseZ = TOWER_Z + TOWER_CLOSE_DIST;
      const towerFullZ = TOWER_Z + TOWER_FULL_DIST;
      const fullCenterY = totalTowerTopY * 0.50;

      // Guarantee constant architectural FOV (ZERO pulsing/shaking)
      if (Math.abs(camera.fov - BASE_FOV) > 0.01) {
        camera.fov = BASE_FOV;
        camera.updateProjectionMatrix();
      }

      if (age < PULLUP_DUR) {
        // Phase 1: Seamless dead-center lift from top-down floodCanvas (ZERO roll, ZERO lateral sway!)
        const camY = TOP_CAM_Y + (streetCamY - TOP_CAM_Y) * uPull;
        const camZ = ROAD_PATCH_Z + (streetStartZ - ROAD_PATCH_Z) * uPull;
        const lookY = streetLookY * Math.pow(uPull, 0.85);
        const lookZ = ROAD_PATCH_Z + (TJUNC_Z - ROAD_PATCH_Z) * Math.pow(uPull, 0.78);

        camera.position.set(0, camY, camZ);
        skyDome.position.set(0, camY, camZ);
        const upY = Math.max(0.0001, Math.sin(uPull * Math.PI * 0.5));
        const upZ = -Math.cos(uPull * Math.PI * 0.5);
        camera.up.set(0, upY, upZ).normalize();
        camera.lookAt(0, lookY, lookZ);
        return;
      }

      camera.up.set(0, 1, 0);

      if (age < SHOCK_KICKS[0]) {
        // Phase 2 (Bar 18–24): Steady, composed dead-center single-point forward push
        const pushU = clamp((age - PULLUP_DUR) / Math.max(0.1, SHOCK_KICKS[0] - PULLUP_DUR), 0, 1);
        const camZ = streetStartZ + (streetEndZ - streetStartZ) * pushU;
        camera.position.set(0, streetCamY, camZ);
        skyDome.position.set(0, streetCamY, camZ);
        camera.lookAt(0, streetLookY, TJUNC_Z);
        return;
      }

      if (age < TOWER_START) {
        // Phase 3 (Bar 25–26): Calm axial framing transition from street clear-out to Floor 1 frontal elevation
        const alignU = smootherstep((age - SHOCK_KICKS[0]) / Math.max(0.1, TOWER_START - SHOCK_KICKS[0]));
        const camY = streetCamY + (floor0Y - streetCamY) * alignU;
        const camZ = streetEndZ + (towerCloseZ - streetEndZ) * alignU;
        const lookY = streetLookY + ((floor0Y + 0.25) - streetLookY) * alignU;
        camera.position.set(0, camY, camZ);
        skyDome.position.set(0, camY, camZ);
        camera.lookAt(0, lookY, TOWER_Z);
        return;
      }

      // Phase 4 (Bar 27–40): Stepped-dwell vertical elevation climb -> monumental full-tower axial pull-back!
      const climbedY = computeSteppedTowerY(age);
      const lastFloor = towerFloors[towerFloors.length - 1];
      const pullStartAge = lastFloor ? (lastFloor.contentAge + 0.35) : (TOWER_FINISH - 3.2);
      const pullDur = Math.max(1.2, TOWER_FINISH - pullStartAge);
      const pullU = smootherstep((age - pullStartAge) / pullDur);

      const camY = climbedY + (fullCenterY - climbedY) * pullU;
      const camZ = towerCloseZ + (towerFullZ - towerCloseZ) * pullU;
      // Imperceptible +0.25m upward architectural poise during close climb, dead-level on full monument hold
      const lookY = camY + 0.25 * (1 - pullU);

      camera.position.set(0, camY, camZ);
      skyDome.position.set(0, camY, camZ);
      camera.lookAt(0, lookY, TOWER_Z);
    }

    // Solid road + Bar 17 seamless fade + Bar 25 Beat 4 clean datum settle
    function updateGroundAndRoad(age) {
      // Bar 17 top-down collage dissolves cleanly into asphalt road during Bar 18 pull-up
      if (age < 1.05) {
        collageMesh.visible = true;
        collageMat.opacity = 1.0;
      } else if (age < 2.25) {
        collageMesh.visible = true;
        collageMat.opacity = 1.0 - smootherstep((age - 1.05) / 1.20);
      } else {
        collageMesh.visible = false;
      }

      // Clean horizon architectural ground plane appears once sky opens
      horizonDatum.visible = currentSkyReveal > 0.05;

      // Street asphalt & crosswalk markings stay 100% solid through Bar 24, then cleanly clear on Bar 25 Beat 4!
      const clear4Start = SHOCK_KICKS[3];
      if (age < clear4Start) {
        roadBase.visible = true;
        roadBaseMat.opacity = 1.0;
        roadSurfaceGroup.visible = true;
        roadSurfaceGroup.position.y = 0;
        roadSurfaceGroup.scale.set(1, 1, 1);
      } else {
        const u = easeInOutQuart((age - clear4Start) / 0.44);
        if (u >= 1) {
          roadBase.visible = false;
          roadSurfaceGroup.visible = false;
        } else {
          roadBase.visible = true;
          roadBaseMat.opacity = 1 - u;
          roadSurfaceGroup.visible = true;
          roadSurfaceGroup.position.y = -u * 0.25;
          roadSurfaceGroup.scale.set(1 - u * 0.85, 1, 1);
        }
      }
    }

    // Street elements + Bar 25 Crisp 4-Beat Structural Clear-Out + 4-Note Stereo Sync (R-far -> R-near -> L-near -> L-far)
    function updateStreetAndClearOut(age) {
      // 1. Structural clear-out across Bar 25's 4 beats (SHOCK_KICKS[0..3])
      const clearDur = 0.44;
      for (let i = 0; i < clearableActors.length; i++) {
        const a = clearableActors[i];
        const kickAge = SHOCK_KICKS[a.clearBeatIdx] ?? SHOCK_KICKS[3];
        if (age < kickAge) {
          a.obj.visible = true;
          a.obj.position.copy(a.homePos);
          a.obj.scale.copy(a.homeScale);
          if (a.shadow) a.shadow.mesh.visible = currentSkyReveal > 0.05;
          continue;
        }
        const u = easeInOutQuart((age - kickAge) / clearDur);
        if (u >= 1) {
          a.obj.visible = false;
          if (a.shadow) a.shadow.mesh.visible = false;
          continue;
        }
        a.obj.visible = true;
        if (a.clearMode === 'lift') {
          a.obj.position.set(a.homePos.x, a.homePos.y + a.liftDist * u, a.homePos.z);
          a.obj.scale.copy(a.homeScale);
        } else if (a.clearMode === 'partLift') {
          a.obj.position.set(
            a.homePos.x + a.sideSign * a.partDist * u,
            a.homePos.y + a.liftDist * u,
            a.homePos.z
          );
          a.obj.scale.copy(a.homeScale);
        } else {
          // 'converge': signals cleanly gather horizontally to center datum & retract vertically
          a.obj.position.set(
            a.homePos.x * (1 - u * 0.85),
            a.homePos.y,
            a.homePos.z
          );
          const scY = Math.max(0.001, 1 - u);
          a.obj.scale.set(a.homeScale.x, a.homeScale.y * scY, a.homeScale.z);
        }
        if (a.shadow) a.shadow.mesh.visible = u < 0.35;
      }

      // Overhead catenary wires lift cleanly with Beat 2 (footbridge clear-out)
      const wireKick = SHOCK_KICKS[1];
      const wireU = age < wireKick ? 0 : easeInOutQuart((age - wireKick) / clearDur);
      for (let i = 0; i < catenaryWires.length; i++) {
        const ln = catenaryWires[i];
        if (wireU >= 1) {
          ln.visible = false;
        } else {
          ln.visible = true;
          ln.position.y = wireU * 26.0;
        }
      }

      // 2. Crisp Deterministic 4-Note Half-Bar Stereo Sync (R-far -> R-near -> L-near -> L-far)
      //    ONLY the 4 Traffic Signals and 4 Under-Bridge Signs respond with crisp hard-cut image swaps!
      if (age < SHOCK_KICKS[3] + clearDur) {
        const halfBeatPos = age / (BEAT * 0.5);
        const halfBeatIdx = Math.floor(halfBeatPos);
        const localPhase = halfBeatPos - halfBeatIdx;
        const activeIdx = ((halfBeatIdx % 4) + 4) % 4; // 0(R-far) -> 1(R-near) -> 2(L-near) -> 3(L-far)

        for (let i = 0; i < trafficSignals.length; i++) {
          const ts = trafficSignals[i];
          const swapCount = halfBeatIdx >= i ? (1 + Math.floor((halfBeatIdx - i) / 4)) : 0;
          if (swapCount !== ts.lastStep) {
            ts.lastStep = swapCount;
            const nextMeta = pickMeta(photoSignals, ts.baseOffset + swapCount);
            if (nextMeta) {
              ts.mat.map = getCutoutTex(nextMeta, { maxDim: 320, tone: 'neutral' });
              ts.mat.needsUpdate = true;
            }
          }
          const isHit = (i === activeIdx) && age >= 0.0;
          const env = isHit ? Math.exp(-10.0 * localPhase) : 0;
          ts.headGrp.position.y = ts.headBaseY + 0.14 * env;
          const sc = 1 + 0.04 * env;
          ts.headGrp.scale.set(sc, sc, 1);
        }

        for (let i = 0; i < bridgeSigns.length; i++) {
          const bs = bridgeSigns[i];
          const swapCount = halfBeatIdx >= i ? (1 + Math.floor((halfBeatIdx - i) / 4)) : 0;
          if (swapCount !== bs.lastStep) {
            bs.lastStep = swapCount;
            const nextMeta = pickMeta(bridgeSignMetas, bs.baseCursor + swapCount);
            if (nextMeta) {
              bs.mat.map = getCutoutTex(nextMeta, { maxDim: 256, tone: 'neutral' });
              bs.mat.needsUpdate = true;
            }
          }
          const isHit = (i === activeIdx) && age >= 0.0;
          const env = isHit ? Math.exp(-10.0 * localPhase) : 0;
          bs.pivot.position.y = bs.baseY - 0.10 * env;
        }
      }

      // 3. Calm Horizontally Crossing Photographic Vehicles (steady speed, ZERO bounce, clear cleanly on Beat 1!)
      const carClearKick = SHOCK_KICKS[0];
      const carClearU = age < carClearKick ? 0 : easeInOutQuart((age - carClearKick) / clearDur);
      for (let i = 0; i < crossingCars.length; i++) {
        const c = crossingCars[i];
        if (carClearU >= 1) {
          c.grp.visible = false;
          c.sh.mesh.visible = false;
          continue;
        }
        c.grp.visible = true;
        const travel = ((age * c.speed) % c.span + c.span) % c.span;
        let cx = c.dir > 0
          ? (c.x0 + travel > c.span * 0.5 ? c.x0 + travel - c.span : c.x0 + travel)
          : (c.x0 - travel < -c.span * 0.5 ? c.x0 - travel + c.span : c.x0 - travel);
        cx += c.dir * 38.0 * carClearU;
        c.grp.position.set(cx, 0.04, c.z);
        c.sh.mesh.visible = currentSkyReveal > 0.05 && carClearU < 0.7;
        c.sh.mesh.position.set(cx, 0.028, c.z + 0.12);
        c.sh.mat.opacity = c.sh.baseOpacity * currentSkyReveal * (1 - carClearU);
      }
    }

    // Frontal 2.5D Section Tower Assembly (Bar 26 plinth -> Bars 27–39 crisp floor-by-floor lock)
    function updateSectionTower(age, beatPos) {
      if (age < MIC_CHECK_AGE) {
        towerRoot.visible = false;
        plinthGrp.visible = false;
        return;
      }

      towerRoot.visible = true;
      plinthGrp.visible = true;

      // Ground architectural plinth extends cleanly horizontally on Bar 26.1
      const pU = easeOutQuart((age - MIC_CHECK_AGE) / 0.48);
      plinthGrp.scale.set(Math.max(0.001, pU), 1, 1);

      for (let i = 0; i < towerFloors.length; i++) {
        const fl = towerFloors[i];
        if (age < fl.startAge) {
          fl.root.visible = false;
          continue;
        }
        fl.root.visible = true;

        // Step A (Beat 1): Architectural slab & slender column frame drops & locks cleanly into place (ZERO overshoot!)
        const uShell = easeOutQuart((age - fl.startAge) / 0.38);
        fl.shellGrp.position.y = (1 - uShell) * 0.85;
        fl.shellGrp.scale.set(1, Math.max(0.001, 0.25 + 0.75 * uShell), 1);

        // Step B (Beat 2): 3-Layer editorial monograph collage slides crisply into its architectural bay
        if (age < fl.contentAge) {
          fl.interiorGrp.visible = false;
        } else {
          fl.interiorGrp.visible = true;
          const uInt = easeOutQuart((age - fl.contentAge) / 0.38);
          const slideDir = (i % 2 === 0) ? -1 : 1;
          fl.interiorGrp.position.set((1 - uInt) * slideDir * 1.45, 0, (1 - uInt) * -0.55);
          fl.interiorGrp.scale.set(Math.max(0.001, 0.88 + 0.12 * uInt), 1, 1);
        }
      }

      // Ultra-restrained theme-appropriate micro-motion on assembled floors
      for (let i = 0; i < floorAnimators.length; i++) {
        const fa = floorAnimators[i];
        const fl = towerFloors[fa.stageIdx];
        if (fl && age >= fl.contentAge) {
          fa.fn(age, beatPos);
        }
      }
    }

    function render(t, floodCanvas) {
      if (pendingTextures.length > 0) flushPendingTextures();

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

      updateSkyAndAtmosphere(age);
      updateCameraAt(age);
      updateGroundAndRoad(age);
      updateStreetAndClearOut(age);
      updateSectionTower(age, beatPos);

      renderer.render(scene, camera);
      return true;
    }

    function destroy() {
      if (collageTexture) collageTexture.dispose();
      contactShadowTex.dispose();
      textureCache.forEach((tex) => tex.dispose());
      textureCache.clear();
      renderer.dispose();
      if (wrap.parentNode) wrap.remove();
    }

    return { render, destroy, collageActors, NEXT_1234 };
  }

  window.MicCheckSketch3D = { create };
})();
