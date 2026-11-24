(() => {
  'use strict';

  // =========================================================================
  // MIC CHECK — FRONTAL 2.5D ARCHITECTURAL SECTION TOWER (Bar 26–40)
  //
  // Strict Editorial & Spatial Discipline:
  //   - Pure frontal architectural cutaway (正面建筑剖面图, rotation.y = 0)
  //   - ZERO floating low-poly CylinderGeometry mesa
  //   - ZERO crossed-plane 3D cutouts (no addCrossedPiece)
  //   - ZERO carousel / orbital / toy spinning animations
  //   - ZERO humans, humanoids, or cartoon elements
  //   - 100% solid rectangular architectural materials for every slab & column
  //     (zero jagged cutout silhouettes on structural frames!)
  //   - 13 ordered personal theme floors (01_anhui_noodles -> 13_jiaomian_temple)
  //     composed as 3-layer Z-offset monograph collage boxes inside a crisp
  //     horizontal-slab + slender-column architectural section grid.
  // =========================================================================

  function buildSectionTower(ctx) {
    const {
      THREE, scene, TOWER_X, TOWER_Z, BAR, BEAT,
      MIC_CHECK_AGE, TOWER_START, TOWER_FINISH,
      makeCutout, getCutoutTex, findBySrc,
      towerThemes, concreteTextures, brickTextures, archTextures,
      buildingsClean, streetsPool, polesPool, itemsPool,
    } = ctx;

    // -----------------------------------------------------------------------
    // 1. 100% SOLID RECTANGULAR ARCHITECTURAL TEXTURES (ZERO JAGGED EDGES!)
    // -----------------------------------------------------------------------
    const conc02 = findBySrc('水泥纹理/02.webp', concreteTextures, 1); // smooth poured concrete
    const conc03 = findBySrc('水泥纹理/03.webp', concreteTextures, 2); // clean light concrete
    const conc06 = findBySrc('水泥纹理/06.webp', concreteTextures, 4); // Tadao Ando form-tie concrete (top 65% UV)
    const conc08 = findBySrc('水泥纹理/08.webp', concreteTextures, 6); // matte pale concrete
    const conc09 = findBySrc('水泥纹理/09.webp', concreteTextures, 7); // cool dark slate concrete
    const brick01 = findBySrc('红砖纹理/01.webp', brickTextures, 0);
    const brick07 = findBySrc('红砖纹理/07.webp', brickTextures, 5);
    const brick08 = findBySrc('红砖纹理/08.webp', brickTextures, 6);
    const brick05 = findBySrc('红砖纹理/05.png', brickTextures, 3);
    const stone08 = findBySrc('建筑纹理/08.webp', archTextures, 7);
    const stone09 = findBySrc('建筑纹理/09.webp', archTextures, 8);
    const stone10 = findBySrc('建筑纹理/10.webp', archTextures, 9);
    const archZig = findBySrc('建筑纹理/06.png', archTextures, 5);

    const FORM_TIE_CROP = { u0: 0.0, v0: 0.0, u1: 1.0, v1: 0.62 };

    function themeMetas(idx) {
      const th = towerThemes[idx];
      return (th && th.items && th.items.length) ? th.items : [conc02];
    }

    // Crisp architectural hairline & archival mat materials
    const hairlineMat = new THREE.MeshBasicMaterial({ color: 0x161c24, side: THREE.DoubleSide });
    const matFrameDark = new THREE.MeshBasicMaterial({ color: 0x181e26, side: THREE.DoubleSide });
    const matFrameSubtle = new THREE.MeshBasicMaterial({ color: 0x2a323c, side: THREE.DoubleSide });

    function addSolidRect(parent, w, h, x, yCenter, z, mat) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.set(x, yCenter, z);
      parent.add(mesh);
      return mesh;
    }

    function addHorizontalDeck(parent, w, d, y, meta, tintHex, uvCrop) {
      const tex = getCutoutTex(meta || conc03, { maxDim: 512, tone: 'arch', uvCrop: uvCrop || null });
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: tintHex ?? 0xc4ccd4,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0, y, 0);
      parent.add(mesh);
      return mesh;
    }

    // Crisp frontal elevation architectural frame (100% solid rectilinear slabs & columns)
    function addSectionFrame(shellGrp, w, d, h, cfg) {
      const slabMeta = cfg.slabMeta || conc03;
      const slabCrop = cfg.slabCrop || null;
      const colMeta = cfg.colMeta || conc02;
      const colCrop = cfg.colCrop || null;
      const backMeta = cfg.backMeta || conc09;
      const mullions = cfg.mullions || [-4.2, +4.2];
      const recessTint = cfg.recessTint ?? 0x626c76;
      const slabTint = cfg.slabTint ?? 0xd8dfe6;
      const colTint = cfg.colTint ?? 0xd0d7de;
      const isCrown = Boolean(cfg.isCrown);

      const botSlabH = 0.28;
      const topSlabH = isCrown ? 0.26 : 0.34;
      const innerH = h - botSlabH - topSlabH;
      const frontZ = d * 0.5;
      const backZ = -d * 0.5;

      // 1. Recessed matte architectural interior back wall
      if (cfg.solidBackColor !== undefined) {
        const backMat = new THREE.MeshBasicMaterial({ color: cfg.solidBackColor, side: THREE.DoubleSide });
        addSolidRect(shellGrp, w - 0.50, h - 0.20, 0, h * 0.5, backZ, backMat);
      } else {
        const backPlate = makeCutout(backMeta, h - 0.24, {
          fixedW: w - 0.52,
          maxDim: 512,
          pivot: 'bottom',
          tone: 'arch',
          color: recessTint,
          alphaTest: 0.01,
        });
        backPlate.mesh.position.set(0, 0.12, backZ);
        shellGrp.add(backPlate.mesh);
      }

      // 2. Floor deck & ceiling soffit planes
      addHorizontalDeck(shellGrp, w + 0.44, d, 0.02, slabMeta, 0xb8c2cc, slabCrop);
      if (!isCrown) {
        addHorizontalDeck(shellGrp, w + 0.44, d, h - 0.02, slabMeta, 0xaab5c0, slabCrop);
      }

      // 3. Bottom & Top horizontal structural slab elevation fascias (frontal, razor-straight!)
      const botBeam = makeCutout(slabMeta, botSlabH, {
        fixedW: w + 0.48,
        maxDim: 384,
        pivot: 'bottom',
        tone: 'arch',
        color: slabTint,
        uvCrop: slabCrop,
        alphaTest: 0.01,
      });
      botBeam.mesh.position.set(0, 0, frontZ);
      shellGrp.add(botBeam.mesh);
      addSolidRect(shellGrp, w + 0.48, 0.055, 0, botSlabH + 0.02, frontZ + 0.02, hairlineMat);

      const topBeam = makeCutout(slabMeta, topSlabH, {
        fixedW: w + (isCrown ? 0.64 : 0.54),
        maxDim: 384,
        pivot: 'bottom',
        tone: 'arch',
        color: slabTint,
        uvCrop: slabCrop,
        alphaTest: 0.01,
      });
      topBeam.mesh.position.set(0, h - topSlabH, frontZ);
      shellGrp.add(topBeam.mesh);
      addSolidRect(shellGrp, w + (isCrown ? 0.64 : 0.54), 0.055, 0, h - topSlabH - 0.025, frontZ + 0.02, hairlineMat);

      // 4. Outer left & right structural section walls (100% solid rectangular stone/concrete/brick!)
      const outerW = 0.70;
      [-1, 1].forEach((side) => {
        const cx = side * (w * 0.5 - outerW * 0.5);
        const col = makeCutout(colMeta, innerH, {
          fixedW: outerW,
          maxDim: 256,
          pivot: 'bottom',
          tone: 'arch',
          color: colTint,
          uvCrop: colCrop,
          alphaTest: 0.01,
        });
        col.mesh.position.set(cx, botSlabH, frontZ - 0.04);
        shellGrp.add(col.mesh);
        // Clean inner & outer dark architectural edge hairlines
        addSolidRect(shellGrp, 0.05, innerH, cx - side * (outerW * 0.5 + 0.02), botSlabH + innerH * 0.5, frontZ + 0.01, hairlineMat);
        addSolidRect(shellGrp, 0.045, h, side * (w * 0.5 + 0.01), h * 0.5, frontZ + 0.01, hairlineMat);
      });

      // 5. Slender interior architectural grid mullions dividing bays cleanly
      const mulW = cfg.mullionW || 0.24;
      for (let i = 0; i < mullions.length; i++) {
        const mx = mullions[i];
        const mul = makeCutout(colMeta, innerH, {
          fixedW: mulW,
          maxDim: 224,
          pivot: 'bottom',
          tone: 'arch',
          color: colTint,
          uvCrop: colCrop,
          alphaTest: 0.01,
        });
        mul.mesh.position.set(mx, botSlabH, frontZ - 0.06);
        shellGrp.add(mul.mesh);
        addSolidRect(shellGrp, 0.036, innerH, mx - mulW * 0.5 - 0.015, botSlabH + innerH * 0.5, frontZ - 0.03, hairlineMat);
        addSolidRect(shellGrp, 0.036, innerH, mx + mulW * 0.5 + 0.015, botSlabH + innerH * 0.5, frontZ - 0.03, hairlineMat);
      }
    }

    // Layer 1: Background architectural / atmospheric bay plate (z ~ -0.92 .. -0.70)
    function addBackPlate(parent, meta, x, yBottom, w, h, opts) {
      if (!meta) return null;
      const o = opts || {};
      const c = makeCutout(meta, h, {
        fixedW: w,
        maxDim: o.maxDim || 512,
        pivot: 'bottom',
        tone: o.tone || 'arch',
        color: o.color ?? 0xc6cfd8,
        uvCrop: o.uvCrop || null,
        alphaTest: o.alphaTest ?? 0.03,
      });
      c.mesh.position.set(x, yBottom, o.z ?? -0.88);
      parent.add(c.mesh);
      return c.mesh;
    }

    // Layer 2: Midground hero curated theme plate (z ~ -0.10 .. +0.26)
    function addHeroPlate(parent, meta, x, yBottom, targetH, opts) {
      if (!meta) return null;
      const o = opts || {};
      const grp = new THREE.Group();
      grp.position.set(x, yBottom, o.z ?? 0.08);
      const c = makeCutout(meta, targetH, {
        fixedW: o.fixedW,
        maxW: o.maxW || 9.0,
        maxDim: o.maxDim || 512,
        pivot: 'bottom',
        tone: o.tone || 'theme',
        color: o.color ?? 0xf2f4f7,
        uvCrop: o.uvCrop || null,
        alphaTest: o.alphaTest ?? 0.06,
      });
      if (o.matBorder) {
        const pad = o.matPad ?? 0.09;
        const frameMat = o.matBorder === 'subtle' ? matFrameSubtle : matFrameDark;
        const bg = new THREE.Mesh(new THREE.PlaneGeometry(c.w + pad * 2, c.h + pad * 2), frameMat);
        bg.position.set(0, c.h * 0.5, -0.04);
        grp.add(bg);
      }
      grp.add(c.mesh);
      parent.add(grp);
      return grp;
    }

    // Layer 3: Foreground gallery found-object or framing prop (z ~ +0.72 .. +1.00)
    function addForeObj(parent, meta, x, yPos, targetH, opts) {
      if (!meta) return null;
      const o = opts || {};
      const c = makeCutout(meta, targetH, {
        fixedW: o.fixedW,
        maxW: o.maxW || targetH * 1.6,
        maxDim: o.maxDim || 256,
        pivot: o.pivot || 'bottom',
        tone: o.tone || 'obj',
        color: o.color ?? 0xf2f4f7,
        flipX: Boolean(o.flipX),
        alphaTest: o.alphaTest ?? 0.12,
      });
      c.mesh.position.set(x, yPos, o.z ?? 0.84);
      parent.add(c.mesh);
      return c.mesh;
    }

    // -----------------------------------------------------------------------
    // 2. GROUNDED ARCHITECTURAL FOUNDATION PLINTH (ZERO FLOATING MESA!)
    // -----------------------------------------------------------------------
    const PLINTH_H = 0.82;
    const towerRoot = new THREE.Group();
    towerRoot.position.set(TOWER_X, 0, TOWER_Z);
    towerRoot.visible = false;
    scene.add(towerRoot);

    const plinthGrp = new THREE.Group();
    plinthGrp.visible = false;
    const plinthW = 24.8;
    const plinthFront = makeCutout(stone08 || conc09, PLINTH_H, {
      fixedW: plinthW,
      maxDim: 512,
      pivot: 'bottom',
      tone: 'arch',
      color: 0xbac3cc,
      alphaTest: 0.01,
    });
    plinthFront.mesh.position.set(0, 0, 1.48);
    plinthGrp.add(plinthFront.mesh);
    addHorizontalDeck(plinthGrp, plinthW, 3.2, PLINTH_H, conc03, 0xc2cbd4);
    addSolidRect(plinthGrp, plinthW, 0.06, 0, PLINTH_H + 0.01, 1.50, hairlineMat);
    // Subtle neutral-grey ground contact strip beneath plinth
    const plinthShadowMat = new THREE.MeshBasicMaterial({
      color: 0x1a2028,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const plinthShadow = new THREE.Mesh(new THREE.PlaneGeometry(plinthW + 3.2, 4.2), plinthShadowMat);
    plinthShadow.rotation.x = -Math.PI / 2;
    plinthShadow.position.set(0, 0.012, 0.5);
    plinthGrp.add(plinthShadow);
    towerRoot.add(plinthGrp);

    // -----------------------------------------------------------------------
    // 3. ALL 13 ORDERED THEME FLOORS (FRONTAL 2.5D MONOGRAPH SECTION BOXES)
    //    Strict bay discipline: zero plates crossing mullions, solid columns!
    // -----------------------------------------------------------------------
    const towerBlueprint = [
      { id: '01_anhui_noodles',   w: 22.0, d: 2.8, h: 4.65 },
      { id: '02_metal_chains',    w: 22.0, d: 2.8, h: 4.65 },
      { id: '03_badminton',       w: 22.0, d: 2.8, h: 4.65 },
      { id: '04_whale',           w: 22.0, d: 2.8, h: 4.65 },
      { id: '05_jasmine',         w: 22.0, d: 2.8, h: 4.65 },
      { id: '06_onion',           w: 22.0, d: 2.8, h: 4.65 },
      { id: '07_shark',           w: 22.0, d: 2.8, h: 4.65 },
      { id: '08_cat',             w: 22.0, d: 2.8, h: 4.65 },
      { id: '09_minecraft',       w: 22.0, d: 2.8, h: 4.65 },
      { id: '10_flamingo',        w: 22.0, d: 2.8, h: 4.65 },
      { id: '11_beer',            w: 22.0, d: 2.8, h: 4.65 },
      { id: '12_soviet',          w: 22.0, d: 2.8, h: 4.90 },
      { id: '13_jiaomian_temple', w: 18.2, d: 2.6, h: 5.50 },
    ];

    const STAGE_COUNT = towerBlueprint.length;
    const floorAnimators = [];
    const towerFloors = [];
    let curY = PLINTH_H;

    towerBlueprint.forEach((bp, idx) => {
      const floorRoot = new THREE.Group();
      floorRoot.position.set(0, curY, 0);
      floorRoot.visible = false;

      const shellGrp = new THREE.Group();
      const interiorGrp = new THREE.Group();

      const th = themeMetas(idx);
      const { w, d, h } = bp;
      const sillY = 0.30;
      const clearH = h - 0.68;

      if (idx === 0) {
        // FLOOR 1: 安徽板面 — Warm-muted stone & brick 3-bay culinary archive (mullions ±3.9)
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: stone08, colMeta: brick08, backMeta: brick01,
          mullions: [-3.9, +3.9], recessTint: 0x5c6168, slabTint: 0xd0d5da, colTint: 0xc5c0bc,
        });
        addBackPlate(interiorGrp, findBySrc('buildings/050.png', buildingsClean, 36), -7.1, sillY, 5.6, clearH, { tone: 'arch', color: 0xbac2ca, z: -0.92 });
        addBackPlate(interiorGrp, findBySrc('streets/022.png', streetsPool, 0), +7.1, sillY, 5.6, clearH, { tone: 'arch', color: 0xb4bcc4, z: -0.92 });
        const centerPot = addHeroPlate(interiorGrp, th[1] || th[0], 0.0, sillY + 0.14, clearH - 0.28, {
          maxW: 6.6, tone: 'themeCalm', matBorder: 'dark', z: 0.08,
        });
        addHeroPlate(interiorGrp, th[0], -7.1, sillY + 0.20, clearH - 0.40, {
          maxW: 4.6, tone: 'themeCalm', matBorder: 'dark', z: 0.05,
        });
        addHeroPlate(interiorGrp, th[0], +7.1, sillY + 0.20, clearH - 0.40, {
          maxW: 4.6, tone: 'themeCalm', matBorder: 'dark', z: 0.05,
        });
        const bowlL = addForeObj(interiorGrp, findBySrc('items/029.png', itemsPool, 28), -5.0, sillY, 1.15, { z: 0.86 });
        const bowlR = addForeObj(interiorGrp, findBySrc('items/030.png', itemsPool, 29), +5.1, sillY, 1.18, { z: 0.86 });
        addForeObj(interiorGrp, findBySrc('items/047.png', itemsPool, 46), 0.0, sillY, 0.72, { maxW: 3.1, z: 0.92 });
        floorAnimators.push({
          stageIdx: idx,
          fn: (age) => {
            if (centerPot) centerPot.position.y = sillY + 0.14 + Math.sin(age * 1.15) * 0.045;
            if (bowlL) bowlL.position.y = sillY + Math.sin(age * 1.15 + 0.8) * 0.025;
            if (bowlR) bowlR.position.y = sillY + Math.sin(age * 1.15 + 2.1) * 0.025;
          },
        });

      } else if (idx === 1) {
        // FLOOR 2: 金属锁链 — Brutalist Tadao Ando form-tie concrete gallery + muted silver-gelatin chains
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: conc03, colMeta: conc06, colCrop: FORM_TIE_CROP,
          solidBackColor: 0x1b2028, mullions: [-4.4, +4.4], slabTint: 0xd0d6dc, colTint: 0xc2c9d0,
        });
        addBackPlate(interiorGrp, conc06, 0, sillY, 8.2, clearH, {
          tone: 'arch', color: 0x86909a, uvCrop: FORM_TIE_CROP, z: -0.92,
        });
        // Taut vertical chain strips + muted cool archival silver-gelatin graphic prints (no glaring white!)
        const chainStrips = [];
        const stripXs = [-9.2, -5.5, -3.1, +3.1, +5.5, +9.2];
        stripXs.forEach((sx, k) => {
          const st = addHeroPlate(interiorGrp, th[1] || th[0], sx, sillY + 0.04, clearH - 0.08, {
            fixedW: 0.84, maxDim: 384, tone: 'themeCalm', color: 0xcbd3dc, z: (k % 2 === 0 ? 0.12 : -0.14),
          });
          if (st) chainStrips.push({ obj: st, baseY: sillY + 0.04, phase: k * 0.9 });
        });
        addHeroPlate(interiorGrp, th[0], 0.0, sillY + 0.18, clearH - 0.36, {
          maxW: 4.5, tone: 'themeCalm', color: 0xcfd7e0, matBorder: 'dark', z: 0.14,
        });
        addHeroPlate(interiorGrp, th[0], -7.35, sillY + 0.32, clearH - 0.64, {
          maxW: 2.9, tone: 'themeCalm', color: 0xc6cfd8, matBorder: 'dark', z: -0.22,
        });
        addHeroPlate(interiorGrp, th[0], +7.35, sillY + 0.32, clearH - 0.64, {
          maxW: 2.9, tone: 'themeCalm', color: 0xc6cfd8, matBorder: 'dark', z: -0.22,
        });
        addForeObj(interiorGrp, findBySrc('items/038.png', itemsPool, 37), -2.8, sillY, 1.50, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/039.png', itemsPool, 38), +2.9, sillY, 1.58, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/014.png', itemsPool, 13), -8.6, sillY, 1.72, { z: 0.82 });
        floorAnimators.push({
          stageIdx: idx,
          fn: (age) => {
            for (let k = 0; k < chainStrips.length; k++) {
              chainStrips[k].obj.position.y = chainStrips[k].baseY + Math.sin(age * 1.35 + chainStrips[k].phase) * 0.04;
            }
          },
        });

      } else if (idx === 2) {
        // FLOOR 3: 羽毛球 — Human-free emerald court geometry + ceramic lattice net + porcelain shuttle
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: conc08, colMeta: conc02,
          solidBackColor: 0x1b2b28, mullions: [-5.5, +5.5], slabTint: 0xd8dfe5, colTint: 0xcad2da,
        });
        const courtCrop = { u0: 0.0, v0: 0.0, u1: 0.56, v1: 1.0 };
        addBackPlate(interiorGrp, th[1] || th[0], 0.0, sillY, 10.4, clearH, {
          tone: 'themeCalm', color: 0xdee8e3, uvCrop: courtCrop, z: -0.92,
        });
        addBackPlate(interiorGrp, th[1] || th[0], -8.0, sillY, 4.4, clearH, {
          tone: 'themeCalm', color: 0xc4d3cc, uvCrop: courtCrop, z: -0.92,
        });
        addBackPlate(interiorGrp, th[1] || th[0], +8.0, sillY, 4.4, clearH, {
          tone: 'themeCalm', color: 0xc4d3cc, uvCrop: courtCrop, z: -0.92,
        });
        // Ceramic net strictly inside [-5.0, +5.0]
        addHeroPlate(interiorGrp, findBySrc('items/037.png', itemsPool, 36), 0.0, sillY + 0.14, 1.98, {
          fixedW: 9.2, tone: 'obj', z: 0.16,
        });
        addHeroPlate(interiorGrp, findBySrc('buildings/008.png', buildingsClean, 4), -8.0, sillY + 0.16, clearH - 0.32, {
          maxW: 3.4, tone: 'arch', matBorder: 'dark', z: 0.04,
        });
        addHeroPlate(interiorGrp, findBySrc('buildings/035.png', buildingsClean, 21), +8.0, sillY + 0.16, clearH - 0.32, {
          maxW: 3.4, tone: 'arch', matBorder: 'dark', z: 0.04,
        });
        const shuttle = addForeObj(interiorGrp, findBySrc('items/016.png', itemsPool, 15), 0, sillY + 2.45, 1.15, {
          pivot: 'center', z: 0.90,
        });
        addForeObj(interiorGrp, findBySrc('items/017.png', itemsPool, 16), -4.5, sillY, 1.82, { z: 0.82 });
        addForeObj(interiorGrp, findBySrc('items/017.png', itemsPool, 16), +4.5, sillY, 1.82, { flipX: true, z: 0.82 });
        addForeObj(interiorGrp, findBySrc('items/019.png', itemsPool, 18), -7.6, sillY, 0.86, { z: 0.88 });
        floorAnimators.push({
          stageIdx: idx,
          fn: (age, beatPos) => {
            if (!shuttle) return;
            const glide = Math.sin(beatPos * Math.PI * 0.25);
            shuttle.position.x = glide * 3.8;
            shuttle.position.y = sillY + 2.15 + (1 - glide * glide) * 0.68;
            shuttle.rotation.z = -glide * 0.20;
          },
        });

      } else if (idx === 3) {
        // FLOOR 4: 鲸鱼 — Pale-mist ocean observatory (solid cool concrete columns!)
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: conc02, colMeta: conc09,
          solidBackColor: 0x20303e, mullions: [-5.2, +5.2], slabTint: 0xd0dae2, colTint: 0xbfc9d4,
        });
        addBackPlate(interiorGrp, th[0], -7.8, sillY, 4.6, clearH, { tone: 'theme', color: 0xd0dce6, z: -0.90 });
        addBackPlate(interiorGrp, findBySrc('buildings/007.png', buildingsClean, 3), +7.8, sillY, 4.6, clearH, { tone: 'arch', color: 0xb6c4d0, z: -0.90 });
        const podPlane = addHeroPlate(interiorGrp, th[1] || th[0], 0.0, sillY + 0.14, clearH - 0.28, {
          maxW: 8.6, tone: 'theme', matBorder: 'dark', z: 0.10,
        });
        addHeroPlate(interiorGrp, th[0], +7.8, sillY + 0.22, clearH - 0.44, {
          maxW: 3.8, tone: 'theme', matBorder: 'dark', z: 0.06,
        });
        const opal = addForeObj(interiorGrp, findBySrc('items/010.png', itemsPool, 9), -6.6, sillY + 0.24, 1.42, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/027.png', itemsPool, 26), +6.0, sillY, 1.04, { z: 0.86 });
        addForeObj(interiorGrp, findBySrc('items/028.png', itemsPool, 27), -4.1, sillY, 1.50, { z: 0.84 });
        floorAnimators.push({
          stageIdx: idx,
          fn: (age) => {
            if (podPlane) podPlane.position.x = Math.sin(age * 0.42) * 0.42;
            if (opal) opal.position.y = sillY + 0.24 + Math.sin(age * 0.95) * 0.06;
          },
        });

      } else if (idx === 4) {
        // FLOOR 5: 夜来香 — Quiet stone nocturnal conservatory & herbarium plates
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: stone09, colMeta: stone08,
          solidBackColor: 0x161c1a, mullions: [-4.2, +4.2], slabTint: 0xd6d4ce, colTint: 0xc6c4be,
        });
        addBackPlate(interiorGrp, findBySrc('buildings/045.png', buildingsClean, 31), -7.2, sillY, 5.4, clearH, { tone: 'arch', color: 0x98a09d, z: -0.90 });
        addBackPlate(interiorGrp, findBySrc('buildings/045.png', buildingsClean, 31), +7.2, sillY, 5.4, clearH, { tone: 'arch', color: 0x98a09d, z: -0.90 });
        addHeroPlate(interiorGrp, th[0], 0.0, sillY + 0.14, clearH - 0.28, {
          maxW: 7.2, tone: 'theme', matBorder: 'dark', z: 0.10,
        });
        addHeroPlate(interiorGrp, th[1] || th[0], -7.2, sillY + 0.16, clearH - 0.32, {
          maxW: 3.1, tone: 'theme', matBorder: 'dark', z: 0.08,
        });
        addHeroPlate(interiorGrp, th[1] || th[0], +7.2, sillY + 0.16, clearH - 0.32, {
          maxW: 3.1, tone: 'theme', matBorder: 'dark', z: 0.08,
        });
        const vases = [
          addForeObj(interiorGrp, findBySrc('items/003.png', itemsPool, 2),  -8.9, sillY, 2.00, { z: 0.86 }),
          addForeObj(interiorGrp, findBySrc('items/026.png', itemsPool, 25), -4.9, sillY, 1.92, { z: 0.88 }),
          addForeObj(interiorGrp, findBySrc('items/035.png', itemsPool, 34), +4.9, sillY, 2.10, { z: 0.88 }),
          addForeObj(interiorGrp, findBySrc('items/036.png', itemsPool, 35), +8.7, sillY, 1.72, { z: 0.86 }),
          addForeObj(interiorGrp, findBySrc('items/050.png', itemsPool, 49), -2.4, sillY, 1.60, { z: 0.92 }),
        ].filter(Boolean);
        floorAnimators.push({
          stageIdx: idx,
          fn: (age) => {
            for (let k = 0; k < vases.length; k++) {
              vases[k].rotation.z = Math.sin(age * 0.85 + k * 1.1) * 0.016;
            }
          },
        });

      } else if (idx === 5) {
        // FLOOR 6: 洋葱 — Calm limestone geometric triptych (solid concrete/stone columns!)
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: stone09, colMeta: conc08, backMeta: conc02,
          mullions: [-3.8, +3.8], recessTint: 0x8e959c, slabTint: 0xd6d6d4, colTint: 0xcac8c6,
        });
        addBackPlate(interiorGrp, conc02, 0.0, sillY, 7.0, clearH, { tone: 'arch', color: 0xb6bcc2, z: -0.92 });
        addHeroPlate(interiorGrp, th[0], -7.1, sillY + 0.16, clearH - 0.32, {
          maxW: 5.0, tone: 'themeCalm', matBorder: 'subtle', z: 0.08,
        });
        const midOnion = addHeroPlate(interiorGrp, th[1] || th[0], 0.0, sillY + 0.16, clearH - 0.32, {
          maxW: 6.4, tone: 'themeCalm', matBorder: 'dark', z: 0.14,
        });
        addHeroPlate(interiorGrp, th[2] || th[0], +7.1, sillY + 0.16, clearH - 0.32, {
          maxW: 5.0, tone: 'themeCalm', matBorder: 'dark', z: 0.08,
        });
        addForeObj(interiorGrp, findBySrc('items/032.png', itemsPool, 31), -4.9, sillY, 1.42, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/023.png', itemsPool, 22), +5.0, sillY, 1.36, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/002.png', itemsPool, 1),  -9.0, sillY, 1.18, { z: 0.84 });
        floorAnimators.push({
          stageIdx: idx,
          fn: (age) => {
            if (midOnion) midOnion.position.x = Math.sin(age * 0.55) * 0.20;
          },
        });

      } else if (idx === 6) {
        // FLOOR 7: 鲨鱼 — Cool dark-slate deep-water viewing tank (solid concrete columns, calm glide!)
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: conc09, colMeta: conc06, colCrop: FORM_TIE_CROP,
          solidBackColor: 0x142536, mullions: [-5.4, +5.4], slabTint: 0xbec8d2, colTint: 0xb0bcc8,
        });
        addBackPlate(interiorGrp, th[2] || th[0], 0.0, sillY, 10.2, clearH, { tone: 'themeCalm', color: 0xb4cadc, z: -0.92 });
        addBackPlate(interiorGrp, th[2] || th[0], -7.9, sillY, 4.4, clearH, { tone: 'themeCalm', color: 0x94aec2, z: -0.92 });
        addBackPlate(interiorGrp, th[2] || th[0], +7.9, sillY, 4.4, clearH, { tone: 'themeCalm', color: 0x94aec2, z: -0.92 });
        const sharkMain = addHeroPlate(interiorGrp, th[0], -0.3, sillY + 0.22, clearH - 0.44, {
          maxW: 5.8, tone: 'themeCalm', matBorder: 'dark', z: 0.14,
        });
        addHeroPlate(interiorGrp, th[1] || th[0], +7.9, sillY + 0.22, clearH - 0.44, {
          maxW: 3.6, tone: 'themeCalm', matBorder: 'dark', z: 0.06,
        });
        addHeroPlate(interiorGrp, th[0], -7.9, sillY + 0.22, clearH - 0.44, {
          maxW: 3.6, tone: 'themeCalm', matBorder: 'dark', z: 0.06,
        });
        addForeObj(interiorGrp, findBySrc('items/046.png', itemsPool, 45), -4.1, sillY, 1.46, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/039.png', itemsPool, 38), +4.3, sillY, 1.56, { z: 0.88 });
        floorAnimators.push({
          stageIdx: idx,
          fn: (age) => {
            if (sharkMain) sharkMain.position.x = -0.3 + Math.sin(age * 0.50) * 0.85;
          },
        });

      } else if (idx === 7) {
        // FLOOR 8: 猫 — Symmetrical modernist stone apartment triptych (dark hairline frames, solid stone columns!)
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: stone09, colMeta: stone10, backMeta: conc03,
          mullions: [-3.6, +3.6], recessTint: 0x828990, slabTint: 0xd6d4d0, colTint: 0xc8c6c2,
        });
        addBackPlate(interiorGrp, findBySrc('buildings/049.png', buildingsClean, 35), -7.0, sillY, 5.8, clearH, { tone: 'arch', color: 0xb0b8be, z: -0.92 });
        addBackPlate(interiorGrp, findBySrc('buildings/048.png', buildingsClean, 34), +7.0, sillY, 5.8, clearH, { tone: 'arch', color: 0xb0b8be, z: -0.92 });
        const catA = addHeroPlate(interiorGrp, th[0], -7.0, sillY + 0.16, clearH - 0.32, {
          maxW: 4.8, tone: 'theme', matBorder: 'dark', matPad: 0.08, z: 0.10,
        });
        const catB = addHeroPlate(interiorGrp, th[1] || th[0], 0.0, sillY + 0.14, clearH - 0.28, {
          maxW: 5.2, tone: 'theme', matBorder: 'dark', matPad: 0.08, z: 0.16,
        });
        const catC = addHeroPlate(interiorGrp, th[2] || th[0], +7.0, sillY + 0.16, clearH - 0.32, {
          maxW: 4.8, tone: 'theme', matBorder: 'dark', matPad: 0.08, z: 0.10,
        });
        addForeObj(interiorGrp, findBySrc('items/040.png', itemsPool, 39), -4.5, sillY, 1.04, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/049.png', itemsPool, 48), +4.6, sillY, 1.10, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/048.png', itemsPool, 47), -9.2, sillY, 0.96, { z: 0.86 });
        floorAnimators.push({
          stageIdx: idx,
          fn: (age, beatPos) => {
            const pulse = Math.exp(-9.0 * (((beatPos * 0.5) % 1 + 1) % 1)) * 0.04;
            if (catA) catA.position.y = sillY + 0.16 + pulse;
            if (catB) catB.position.y = sillY + 0.14;
            if (catC) catC.position.y = sillY + 0.16 + pulse;
          },
        });

      } else if (idx === 8) {
        // FLOOR 9: 我的世界 — Brutalist cellular voxel archive (solid concrete columns, zero mullion overlap!)
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: conc02, colMeta: conc09,
          solidBackColor: 0x1d232b, mullions: [-4.8, +4.8], slabTint: 0xcfd6dc, colTint: 0xbec6ce,
        });
        addBackPlate(interiorGrp, th[0], -7.5, sillY, 4.8, clearH, { tone: 'themeCalm', color: 0xb4c0c8, z: -0.92 });
        addBackPlate(interiorGrp, th[0], +7.5, sillY, 4.8, clearH, { tone: 'themeCalm', color: 0xb4c0c8, z: -0.92 });
        addHeroPlate(interiorGrp, th[0], 0.0, sillY + 0.14, clearH - 0.28, {
          maxW: 7.4, tone: 'themeCalm', matBorder: 'dark', z: 0.06,
        });
        const strataPlate = addHeroPlate(interiorGrp, th[1] || th[0], -7.55, sillY + 0.40, clearH - 0.80, {
          maxW: 4.3, tone: 'themeCalm', matBorder: 'dark', uvCrop: { u0: 0.0, v0: 0.0, u1: 0.78, v1: 1.0 }, z: 0.14,
        });
        addHeroPlate(interiorGrp, findBySrc('buildings/038.png', buildingsClean, 24), +7.55, sillY + 0.18, clearH - 0.36, {
          maxW: 3.8, tone: 'arch', matBorder: 'dark', z: 0.10,
        });
        const voxSculpt = addForeObj(interiorGrp, findBySrc('items/044.png', itemsPool, 43), +3.4, sillY, 1.90, { z: 0.90 });
        addForeObj(interiorGrp, findBySrc('items/045.png', itemsPool, 44), -3.5, sillY, 1.60, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/022.png', itemsPool, 21), +8.7, sillY, 1.42, { z: 0.86 });
        addForeObj(interiorGrp, findBySrc('items/020.png', itemsPool, 19), -8.9, sillY, 1.02, { z: 0.86 });
        floorAnimators.push({
          stageIdx: idx,
          fn: (age, beatPos) => {
            const step = (Math.floor(beatPos * 0.5) % 2 === 0) ? -0.09 : 0.09;
            if (voxSculpt) voxSculpt.position.x = 3.4 + step;
            if (strataPlate) strataPlate.position.x = -7.55 - step * 0.45;
          },
        });

      } else if (idx === 9) {
        // FLOOR 10: 火烈鸟 — Pale concrete lagoon gallery (widened ±4.6 mullions = ZERO overlap!)
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: conc08, colMeta: conc03,
          solidBackColor: 0x243646, mullions: [-4.6, +4.6], slabTint: 0xdce2e6, colTint: 0xd0d6dc,
        });
        const lagoonBg = addBackPlate(interiorGrp, th[1] || th[0], 0.0, sillY, 8.6, clearH, {
          tone: 'theme', color: 0xcfdce6, z: -0.92,
        });
        addHeroPlate(interiorGrp, th[0], -7.45, sillY + 0.16, clearH - 0.32, {
          maxW: 4.4, tone: 'themeCalm', matBorder: 'dark', z: 0.10,
        });
        addHeroPlate(interiorGrp, th[1] || th[0], 0.0, sillY + 0.14, clearH - 0.28, {
          maxW: 6.4, tone: 'theme', matBorder: 'dark', z: 0.16,
        });
        addHeroPlate(interiorGrp, th[2] || th[0], +7.45, sillY + 0.16, clearH - 0.32, {
          maxW: 4.4, tone: 'themeCalm', matBorder: 'dark', z: 0.10,
        });
        addForeObj(interiorGrp, findBySrc('items/007.png', itemsPool, 6),  -3.6, sillY, 2.00, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/026.png', itemsPool, 25), +3.6, sillY, 1.92, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/035.png', itemsPool, 34), +9.2, sillY, 1.82, { z: 0.84 });
        floorAnimators.push({
          stageIdx: idx,
          fn: (age) => {
            if (lagoonBg) lagoonBg.position.x = Math.sin(age * 0.38) * 0.22;
          },
        });

      } else if (idx === 10) {
        // FLOOR 11: 啤酒 — Muted brick & dark glass minimalist taproom archive (mullions ±4.0)
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: stone08, colMeta: brick08, backMeta: brick07,
          mullions: [-4.0, +4.0], recessTint: 0x56595e, slabTint: 0xcfcac4, colTint: 0xc2b8b2,
        });
        addBackPlate(interiorGrp, brick01, -7.1, sillY, 5.6, clearH, { tone: 'arch', color: 0x9aa0a6, z: -0.92 });
        addBackPlate(interiorGrp, findBySrc('streets/022.png', streetsPool, 0), +7.1, sillY, 5.6, clearH, { tone: 'arch', color: 0xadb6be, z: -0.92 });
        addHeroPlate(interiorGrp, th[0], -7.1, sillY + 0.16, clearH - 0.32, {
          maxW: 4.6, tone: 'themeCalm', matBorder: 'dark', z: 0.08,
        });
        const beerHero = addHeroPlate(interiorGrp, th[1] || th[0], 0.0, sillY + 0.14, clearH - 0.28, {
          maxW: 6.2, tone: 'themeCalm', matBorder: 'dark', z: 0.14,
        });
        addHeroPlate(interiorGrp, findBySrc('buildings/018.png', buildingsClean, 9), +7.1, sillY + 0.16, clearH - 0.32, {
          maxW: 4.1, tone: 'arch', matBorder: 'dark', z: 0.08,
        });
        addForeObj(interiorGrp, findBySrc('items/012.png', itemsPool, 11), -3.1, sillY, 1.12, { z: 0.90 });
        addForeObj(interiorGrp, findBySrc('items/021.png', itemsPool, 20), +5.0, sillY, 1.28, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/018.png', itemsPool, 17), +8.7, sillY, 1.10, { z: 0.86 });
        addForeObj(interiorGrp, findBySrc('items/031.png', itemsPool, 30), -9.0, sillY, 1.44, { z: 0.84 });
        floorAnimators.push({
          stageIdx: idx,
          fn: (age) => {
            if (beerHero) beerHero.position.y = sillY + 0.14 + Math.sin(age * 0.9) * 0.032;
          },
        });

      } else if (idx === 11) {
        // FLOOR 12: 苏联美学设计 — Monumental Constructivist concrete & terracotta cantilever (ZERO humans!)
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: conc03, colMeta: conc06, colCrop: FORM_TIE_CROP,
          solidBackColor: 0x20262e, mullions: [-5.6, +5.6], slabTint: 0xd0d4d8, colTint: 0xc0c6cc,
        });
        addBackPlate(interiorGrp, archZig, -8.0, sillY, 4.4, clearH, { tone: 'arch', color: 0xb6bec6, z: -0.92 });
        addBackPlate(interiorGrp, brick05, +8.0, sillY, 4.4, clearH, { tone: 'arch', color: 0xb8b2ae, z: -0.92 });
        const sovMonument = addHeroPlate(interiorGrp, th[0], 0.0, sillY + 0.14, clearH - 0.28, {
          maxW: 9.2, tone: 'theme', matBorder: 'dark', z: 0.14,
        });
        addHeroPlate(interiorGrp, findBySrc('buildings/003.png', buildingsClean, 0), -8.0, sillY + 0.18, clearH - 0.36, {
          maxW: 4.0, tone: 'arch', matBorder: 'dark', z: 0.08,
        });
        addHeroPlate(interiorGrp, findBySrc('buildings/025.png', buildingsClean, 13), +8.0, sillY + 0.16, clearH - 0.32, {
          maxW: 3.6, tone: 'themeCalm', matBorder: 'dark', z: 0.10,
        });
        addForeObj(interiorGrp, findBySrc('items/001.png', itemsPool, 0),  -4.3, sillY, 1.44, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/011.png', itemsPool, 10), +4.4, sillY, 1.30, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/034.png', itemsPool, 33), +9.0, sillY, 1.15, { z: 0.86 });
        floorAnimators.push({
          stageIdx: idx,
          fn: (age) => {
            if (sovMonument) sovMonument.position.x = Math.sin(age * 0.45) * 0.28;
          },
        });

      } else {
        // FLOOR 13 (TOP CROWN): 郊眠寺 — Setback dark-brick sanctuary (wide unobstructed center bay ±5.6!)
        addSectionFrame(shellGrp, w, d, h, {
          slabMeta: brick08, colMeta: brick07,
          solidBackColor: 0x0d1016, mullions: [-5.6, +5.6], isCrown: true,
          slabTint: 0xc2bab6, colTint: 0xb6aea8,
        });
        [-1, 1].forEach((side) => {
          const spire = makeCutout(findBySrc('poles/019.png', polesPool, 18), 3.3, {
            maxW: 0.90, maxDim: 224, pivot: 'bottom', tone: 'arch', color: 0xbac4ce,
          });
          spire.mesh.position.set(side * (w * 0.5 - 0.34), h - 0.10, d * 0.5 - 0.05);
          shellGrp.add(spire.mesh);
        });
        addBackPlate(interiorGrp, th[1] || brick07, 0.0, sillY, w - 1.5, clearH + 0.14, {
          tone: 'theme', color: 0xc6cbd2, z: -0.90,
        });
        const emblem = addHeroPlate(interiorGrp, th[0], 0.0, sillY + 0.30, clearH - 0.42, {
          maxW: 7.2, tone: 'theme', matBorder: 'dark', z: 0.16,
        });
        addForeObj(interiorGrp, findBySrc('items/018.png', itemsPool, 17), -6.9, sillY, 1.32, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/019.png', itemsPool, 18), -3.8, sillY, 1.08, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/033.png', itemsPool, 32), +3.8, sillY, 1.12, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/034.png', itemsPool, 33), +6.9, sillY, 1.28, { z: 0.88 });
        addForeObj(interiorGrp, findBySrc('items/005.png', itemsPool, 4),  0.0,  sillY, 1.02, { z: 0.92 });
        floorAnimators.push({
          stageIdx: idx,
          fn: (age) => {
            if (emblem) emblem.position.y = sillY + 0.30 + Math.sin(age * 0.72) * 0.09;
          },
        });
      }

      floorRoot.add(shellGrp);
      floorRoot.add(interiorGrp);
      towerRoot.add(floorRoot);

      const startAge = TOWER_START + idx * BAR;
      const contentAge = startAge + BEAT * 0.92;
      const finishAge = idx === STAGE_COUNT - 1 ? Math.min(TOWER_FINISH - 2.6, contentAge + 0.48) : (contentAge + 0.42);

      towerFloors.push({
        idx,
        id: bp.id,
        root: floorRoot,
        shellGrp,
        interiorGrp,
        yBase: curY,
        yMid: curY + h * 0.5,
        w,
        d,
        h,
        startAge,
        contentAge,
        finishAge,
      });
      curY += h;
    });

    return {
      towerRoot,
      plinthGrp,
      plinthH: PLINTH_H,
      plinthStartAge: MIC_CHECK_AGE,
      towerFloors,
      floorAnimators,
      STAGE_COUNT,
      totalTowerTopY: curY,
      maxWidth: 22.0,
    };
  }

  window.MicCheckTower = {
    buildSectionTower,
    buildMesaAndTower: buildSectionTower,
  };
})();
