(() => {
  'use strict';

  // =========================================================================
  // MIC CHECK — VISUAL 3D CAMERA PATH & MODEL FINAL-POSITION EDITOR
  // Cleanly mounts gizmos/splines ONLY while open; removes everything on close.
  // =========================================================================

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function deg(d) {
    return (d * Math.PI) / 180;
  }

  function attach(opts) {
    const sketch3d = opts.sketch3d;
    const clockCtrl = opts.clockCtrl;
    if (!sketch3d) return null;

    const THREE = sketch3d.getTHREE();
    const scene = sketch3d.getScene();
    const pvCamera = sketch3d.getCamera();
    const renderer = sketch3d.getRenderer();
    const canvas = sketch3d.getCanvas();
    const WORLD_UP = new THREE.Vector3(0, 1, 0);

    const bounds = sketch3d.getTimelineBounds();
    const MAX_AGE = bounds.max || 84.5;
    const BAR = bounds.barSec || (240 / 101);

    let isOpen = false;
    let destroyed = false;
    let viewMode = 'director'; // 'director' | 'pov'
    let pipEnabled = true;
    let showAllModels = false;
    let inspectorTab = 'camera'; // 'camera' | 'models'
    let sel = { type: 'model', id: 'M1_whale', subTarget: 'pos' };
    let povOverride = null; // { pos: THREE.Vector3, lookAt: THREE.Vector3, fov: number }

    // Director free camera spherical orbit state
    const initVp = sketch3d.getViewportSize();
    const editorCamera = new THREE.PerspectiveCamera(50, initVp.aspect || 16 / 9, 0.25, 2200);
    const orbit = {
      target: new THREE.Vector3(0, 0, -33),
      yaw: 0.58,
      pitch: 0.34,
      dist: 58,
    };

    function syncEditorCamera() {
      const vp = sketch3d.getViewportSize();
      editorCamera.aspect = vp.aspect || (vp.vw / Math.max(1, vp.vh));
      const cosP = Math.cos(orbit.pitch);
      editorCamera.position.set(
        orbit.target.x + Math.sin(orbit.yaw) * cosP * orbit.dist,
        orbit.target.y + Math.sin(orbit.pitch) * orbit.dist,
        orbit.target.z + Math.cos(orbit.yaw) * cosP * orbit.dist
      );
      editorCamera.up.copy(WORLD_UP);
      editorCamera.lookAt(orbit.target);
      editorCamera.updateProjectionMatrix();
      editorCamera.updateMatrixWorld(true);
    }

    function focusDirectorOn(x, y, z, distOpt) {
      orbit.target.set(x, y, z);
      if (typeof distOpt === 'number') orbit.dist = clamp(distOpt, 8, 420);
      syncEditorCamera();
    }

    function seekAge(newAge) {
      const clamped = clamp(newAge, 0, MAX_AGE);
      povOverride = null;
      if (clockCtrl && typeof clockCtrl.setElapsedSec === 'function') {
        clockCtrl.setElapsedSec(bounds.startSec + clamped);
      }
      sketch3d.requestRender();
      refreshHudValues();
    }

    // =========================================================================
    // 1. 3D EDITOR OVERLAY GROUP (SPLINES, FRUSTUM, MODEL HANDLES, XYZ GIZMO)
    // =========================================================================
    const editorGroup = new THREE.Group();
    editorGroup.name = 'MicCheckEditorOverlay';

    const camSplineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92 });
    const camSplineLine = new THREE.Line(new THREE.BufferGeometry(), camSplineMat);
    editorGroup.add(camSplineLine);

    const lookSplineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.42 });
    const lookSplineLine = new THREE.Line(new THREE.BufferGeometry(), lookSplineMat);
    editorGroup.add(lookSplineLine);

    const sightLineMat = new THREE.LineBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.85 });
    const sightLine = new THREE.Line(new THREE.BufferGeometry(), sightLineMat);
    editorGroup.add(sightLine);

    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.001,
      depthWrite: false,
      colorWrite: false,
    });

    const lookHandleMat = new THREE.MeshBasicMaterial({ color: 0xfb923c });
    const lookHandle = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 10), lookHandleMat);
    const lookHandleHit = new THREE.Mesh(new THREE.SphereGeometry(2.3, 10, 8), hitMat);
    lookHandleHit.userData = { pickType: 'kf_look' };
    lookHandle.add(lookHandleHit);
    editorGroup.add(lookHandle);

    // Live PV Camera body + frustum wireframe
    const liveCamGroup = new THREE.Group();
    const liveCamBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.9, 1.7),
      new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
    );
    liveCamGroup.add(liveCamBox);

    const frustumPositions = new Float32Array(24 * 3);
    const frustumGeo = new THREE.BufferGeometry();
    frustumGeo.setAttribute('position', new THREE.BufferAttribute(frustumPositions, 3));
    const liveCamFrustum = new THREE.LineSegments(
      frustumGeo,
      new THREE.LineBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9 })
    );
    liveCamGroup.add(liveCamFrustum);
    editorGroup.add(liveCamGroup);

    function updateFrustumVisual(fovDeg, aspectVal) {
      const fNear = 1.1;
      const fFar = 8.5;
      const tHalfV = Math.tan(deg(fovDeg * 0.5));
      const nh = fNear * tHalfV, nw = nh * aspectVal;
      const fh = fFar * tHalfV, fw = fh * aspectVal;
      const segs = [
        -nw, nh, -fNear,  nw, nh, -fNear,
         nw, nh, -fNear,  nw,-nh, -fNear,
         nw,-nh, -fNear, -nw,-nh, -fNear,
        -nw,-nh, -fNear, -nw, nh, -fNear,

        -fw, fh, -fFar,   fw, fh, -fFar,
         fw, fh, -fFar,   fw,-fh, -fFar,
         fw,-fh, -fFar,  -fw,-fh, -fFar,
        -fw,-fh, -fFar,  -fw, fh, -fFar,

        -nw, nh, -fNear, -fw, fh, -fFar,
         nw, nh, -fNear,  fw, fh, -fFar,
         nw,-nh, -fNear,  fw,-fh, -fFar,
        -nw,-nh, -fNear, -fw,-fh, -fFar,
      ];
      const attr = frustumGeo.attributes.position;
      for (let i = 0; i < segs.length; i++) attr.array[i] = segs[i];
      attr.needsUpdate = true;
    }

    // Selected Model Oriented Bounds Helper
    const modelBoxHelper = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.72, 1)),
      new THREE.LineBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.55 })
    );
    editorGroup.add(modelBoxHelper);

    const kfPoolGroup = new THREE.Group();
    editorGroup.add(kfPoolGroup);

    const modelAnchorsGroup = new THREE.Group();
    editorGroup.add(modelAnchorsGroup);

    // Interactive RGB XYZ Gizmo
    const gizmoGroup = new THREE.Group();
    const gizmoHitMeshes = [];
    const GIZMO_AXES = [
      { axis: 'x', color: 0xef4444, rotZ: -Math.PI / 2, rotX: 0, vec: new THREE.Vector3(1, 0, 0) },
      { axis: 'y', color: 0x22c55e, rotZ: 0, rotX: 0, vec: new THREE.Vector3(0, 1, 0) },
      { axis: 'z', color: 0x3b82f6, rotZ: 0, rotX: Math.PI / 2, vec: new THREE.Vector3(0, 0, 1) },
    ];
    GIZMO_AXES.forEach((ax) => {
      const sub = new THREE.Group();
      sub.rotation.set(ax.rotX, 0, ax.rotZ);
      const mat = new THREE.MeshBasicMaterial({ color: ax.color, depthTest: false });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), mat);
      shaft.position.y = 0.5;
      shaft.renderOrder = 999;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 12), mat);
      cone.position.y = 1.16;
      cone.renderOrder = 999;
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.45, 8), hitMat);
      hit.position.y = 0.7;
      hit.userData = { gizmoAxis: ax.axis, axisVec: ax.vec };
      gizmoHitMeshes.push(hit);
      sub.add(shaft, cone, hit);
      gizmoGroup.add(sub);
    });
    editorGroup.add(gizmoGroup);

    let kfMeshes = [];
    let modelAnchorMeshes = [];
    let pickableNodes = [];

    const kfGeom = new THREE.OctahedronGeometry(0.92);
    const kfHitGeom = new THREE.SphereGeometry(2.1, 10, 8);
    const modelGeom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const modelHitGeom = new THREE.SphereGeometry(3.0, 10, 8);

    function rebuildPathAndNodeVisuals() {
      // Sample camera spline and lookAt spline across 0..MAX_AGE
      const camPts = [];
      const lookPts = [];
      for (let t = 0; t <= MAX_AGE + 0.01; t += 0.30) {
        const p = sketch3d.evalCameraAt(Math.min(t, MAX_AGE));
        camPts.push(new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]));
        lookPts.push(new THREE.Vector3(p.lookAt[0], p.lookAt[1], p.lookAt[2]));
      }
      camSplineLine.geometry.dispose();
      camSplineLine.geometry = new THREE.BufferGeometry().setFromPoints(camPts);
      lookSplineLine.geometry.dispose();
      lookSplineLine.geometry = new THREE.BufferGeometry().setFromPoints(lookPts);

      // Rebuild keyframe handles
      while (kfPoolGroup.children.length > 0) kfPoolGroup.remove(kfPoolGroup.children[0]);
      kfMeshes = [];
      const kfs = sketch3d.getKeyframes();
      for (let i = 0; i < kfs.length; i++) {
        const kf = kfs[i];
        const isSel = sel.type === 'kf' && sel.id === kf.id;
        const m = new THREE.Mesh(
          kfGeom,
          new THREE.MeshBasicMaterial({ color: isSel ? 0xfde047 : 0x38bdf8 })
        );
        m.position.set(kf.pos[0], kf.pos[1], kf.pos[2]);
        m.scale.setScalar(isSel ? 1.45 : 1.0);
        const h = new THREE.Mesh(kfHitGeom, hitMat);
        h.userData = { pickType: 'kf', kfId: kf.id };
        m.add(h);
        kfPoolGroup.add(m);
        kfMeshes.push(h);
      }

      // Sightline + LookAt handle for selected keyframe (or closest to current age)
      let activeKf = kfs.find((k) => k.id === sel.id);
      if (sel.type === 'kf' && activeKf) {
        sightLine.visible = true;
        lookHandle.visible = true;
        sightLine.geometry.dispose();
        sightLine.geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(activeKf.pos[0], activeKf.pos[1], activeKf.pos[2]),
          new THREE.Vector3(activeKf.lookAt[0], activeKf.lookAt[1], activeKf.lookAt[2]),
        ]);
        lookHandle.position.set(activeKf.lookAt[0], activeKf.lookAt[1], activeKf.lookAt[2]);
        lookHandleMat.color.setHex(sel.subTarget === 'lookAt' ? 0xfde047 : 0xfb923c);
        lookHandle.scale.setScalar(sel.subTarget === 'lookAt' ? 1.35 : 1.0);
      } else {
        sightLine.visible = false;
        lookHandle.visible = false;
      }

      // Rebuild model anchor handles
      while (modelAnchorsGroup.children.length > 0) modelAnchorsGroup.remove(modelAnchorsGroup.children[0]);
      modelAnchorMeshes = [];
      const arenas = sketch3d.getArenas();
      let selArena = null;
      for (let i = 0; i < arenas.length; i++) {
        const ar = arenas[i];
        const isSel = sel.type === 'model' && sel.id === ar.id;
        if (isSel) selArena = ar;
        const m = new THREE.Mesh(
          modelGeom,
          new THREE.MeshBasicMaterial({ color: isSel ? 0xfde047 : 0xc084fc, wireframe: !isSel })
        );
        m.position.set(ar.center[0], ar.center[1], ar.center[2]);
        m.scale.setScalar(isSel ? 1.35 : 1.0);
        const h = new THREE.Mesh(modelHitGeom, hitMat);
        h.userData = { pickType: 'model', arenaId: ar.id };
        m.add(h);
        modelAnchorsGroup.add(m);
        modelAnchorMeshes.push(h);
      }

      if (selArena) {
        modelBoxHelper.visible = true;
        modelBoxHelper.position.set(selArena.center[0], selArena.center[1], selArena.center[2]);
        modelBoxHelper.rotation.set(deg(selArena.rotDeg[0]), deg(selArena.rotDeg[1]), deg(selArena.rotDeg[2]), 'YXZ');
        modelBoxHelper.scale.set(selArena.modelSpan, selArena.modelSpan, selArena.modelSpan);
      } else {
        modelBoxHelper.visible = false;
      }

      pickableNodes = [...kfMeshes, ...modelAnchorMeshes];
      if (lookHandle.visible) pickableNodes.push(lookHandleHit);

      // Update Gizmo target & size
      let gPos = null;
      if (sel.type === 'model' && selArena) {
        gPos = new THREE.Vector3(selArena.center[0], selArena.center[1], selArena.center[2]);
      } else if (sel.type === 'kf' && activeKf) {
        const arr = sel.subTarget === 'lookAt' ? activeKf.lookAt : activeKf.pos;
        gPos = new THREE.Vector3(arr[0], arr[1], arr[2]);
      }
      if (gPos) {
        gizmoGroup.visible = true;
        gizmoGroup.position.copy(gPos);
        const dCam = Math.max(8, editorCamera.position.distanceTo(gPos));
        gizmoGroup.scale.setScalar(dCam * 0.14);
      } else {
        gizmoGroup.visible = false;
      }
    }

    // =========================================================================
    // 2. EDITOR RENDER HOOK (DIRECTOR VIEWPORT + LIVE POV PIP / POV OVERRIDE)
    // =========================================================================
    let pipFrameEl = null;

    function applyPovOverrideToCamera() {
      if (!povOverride) return null;
      pvCamera.fov = povOverride.fov;
      pvCamera.position.copy(povOverride.pos);
      pvCamera.up.copy(WORLD_UP);
      pvCamera.lookAt(povOverride.lookAt);
      pvCamera.updateProjectionMatrix();
      pvCamera.updateMatrixWorld(true);
      return {
        pos: povOverride.pos,
        lookAt: povOverride.lookAt,
        fov: povOverride.fov,
      };
    }

    function editorRenderHook({ renderer: r, scene: sc, camera: pvCam, age, pose, vw, vh }) {
      stepKeyboardNavigation();

      let displayPose = pose;
      if (viewMode === 'pov' && povOverride) {
        const p2 = applyPovOverrideToCamera();
        if (p2) displayPose = p2;
      }

      // Sync animated PV camera wireframe frustum
      liveCamGroup.position.copy(displayPose.pos);
      const lookM = new THREE.Matrix4().lookAt(displayPose.pos, displayPose.lookAt, WORLD_UP);
      liveCamGroup.quaternion.setFromRotationMatrix(lookM);
      updateFrustumVisual(displayPose.fov, vw / Math.max(1, vh));

      // Keep gizmo world-scale responsive to Director camera distance
      if (gizmoGroup.visible) {
        const dCam = Math.max(8, editorCamera.position.distanceTo(gizmoGroup.position));
        gizmoGroup.scale.setScalar(dCam * 0.14);
      }

      if (viewMode === 'pov') {
        editorGroup.visible = false;
        r.setScissorTest(false);
        r.setViewport(0, 0, vw, vh);
        pvCam.aspect = vw / Math.max(1, vh);
        pvCam.updateProjectionMatrix();
        r.render(sc, pvCam);
        if (pipFrameEl) pipFrameEl.style.display = 'none';
      } else {
        editorGroup.visible = true;
        syncEditorCamera();
        r.setScissorTest(false);
        r.setViewport(0, 0, vw, vh);
        r.render(sc, editorCamera);

        if (pipEnabled) {
          const pipW = Math.min(340, Math.max(200, Math.round(vw * 0.25)));
          const pipH = Math.round((pipW * 9) / 16);
          const left = 14;
          const bottom = 92; // Sits cleanly above bottom timeline bar

          editorGroup.visible = false;
          r.setScissorTest(true);
          r.setViewport(left, bottom, pipW, pipH);
          r.setScissor(left, bottom, pipW, pipH);
          pvCam.aspect = pipW / Math.max(1, pipH);
          pvCam.updateProjectionMatrix();
          r.clearDepth();
          r.render(sc, pvCam);
          r.setScissorTest(false);
          r.setViewport(0, 0, vw, vh);
          pvCam.aspect = vw / Math.max(1, vh);
          pvCam.updateProjectionMatrix();
          editorGroup.visible = true;

          if (pipFrameEl) {
            pipFrameEl.style.display = 'block';
            pipFrameEl.style.left = left + 'px';
            pipFrameEl.style.bottom = bottom + 'px';
            pipFrameEl.style.width = pipW + 'px';
            pipFrameEl.style.height = pipH + 'px';
          }
        } else if (pipFrameEl) {
          pipFrameEl.style.display = 'none';
        }
      }

      updateTimelinePlayhead(age);
    }

    // =========================================================================
    // 3. POINTER RAYCASTING, GIZMO DRAG, ORBIT & POV STEERING
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const dragPlane = new THREE.Plane();
    const hitPt = new THREE.Vector3();

    let dragState = null;

    function computeNdc(e) {
      const rect = canvas.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    }

    function ensurePovOverride(age) {
      if (!povOverride) {
        const p = sketch3d.evalCameraAt(age);
        povOverride = {
          pos: new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]),
          lookAt: new THREE.Vector3(p.lookAt[0], p.lookAt[1], p.lookAt[2]),
          fov: p.fov,
        };
      }
      return povOverride;
    }

    function onPointerDown(e) {
      if (!isOpen) return;
      computeNdc(e);

      if (viewMode === 'pov') {
        if (clockCtrl && clockCtrl.isPlaying()) clockCtrl.setPlaying(false);
        const st = ensurePovOverride(sketch3d.getCurrentAge());
        dragState = {
          mode: (e.button === 2 || e.shiftKey) ? 'pov-orbit' : 'pov-look',
          startX: e.clientX,
          startY: e.clientY,
          initPos: st.pos.clone(),
          initLook: st.lookAt.clone(),
        };
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        return;
      }

      // Director View: 1) Check Gizmo XYZ axis handles
      syncEditorCamera();
      raycaster.setFromCamera(pointerNdc, editorCamera);
      if (e.button === 0 && !e.shiftKey && gizmoGroup.visible) {
        const gHits = raycaster.intersectObjects(gizmoHitMeshes, false);
        if (gHits.length > 0) {
          const ud = gHits[0].object.userData;
          const axisVec = ud.axisVec.clone();
          const anchor0 = gizmoGroup.position.clone();
          const camDir = new THREE.Vector3().subVectors(editorCamera.position, anchor0).normalize();
          const perp = new THREE.Vector3().crossVectors(camDir, axisVec);
          if (perp.lengthSq() < 1e-5) perp.set(0, 1, 0).cross(axisVec);
          const planeNormal = new THREE.Vector3().crossVectors(axisVec, perp).normalize();
          dragPlane.setFromNormalAndCoplanarPoint(planeNormal, anchor0);
          const startIntersect = new THREE.Vector3();
          raycaster.ray.intersectPlane(dragPlane, startIntersect);
          dragState = {
            mode: 'gizmo-axis',
            axis: ud.axis,
            axisVec,
            anchor0,
            startIntersect,
            selSnap: { ...sel },
          };
          try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
          return;
        }
      }

      // Director View: 2) Pick keyframes or model handles
      if (e.button === 0 && !e.shiftKey) {
        const nHits = raycaster.intersectObjects(pickableNodes, false);
        if (nHits.length > 0) {
          const ud = nHits[0].object.userData;
          if (ud.pickType === 'kf') {
            selectKeyframe(ud.kfId, 'pos', true);
            return;
          }
          if (ud.pickType === 'kf_look') {
            selectKeyframe(sel.id, 'lookAt', false);
            return;
          }
          if (ud.pickType === 'model') {
            selectModel(ud.arenaId, false);
            return;
          }
        }
      }

      // Director View: 3) Pan or Orbit empty space
      dragState = {
        mode: (e.button === 2 || e.shiftKey || e.button === 1) ? 'dir-pan' : 'dir-orbit',
        startX: e.clientX,
        startY: e.clientY,
        initYaw: orbit.yaw,
        initPitch: orbit.pitch,
        initTarget: orbit.target.clone(),
      };
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    }

    function onPointerMove(e) {
      if (!isOpen || !dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      if (dragState.mode === 'gizmo-axis') {
        computeNdc(e);
        syncEditorCamera();
        raycaster.setFromCamera(pointerNdc, editorCamera);
        if (raycaster.ray.intersectPlane(dragPlane, hitPt)) {
          const deltaWorld = hitPt.clone().sub(dragState.startIntersect);
          const proj = deltaWorld.dot(dragState.axisVec);
          const nextPt = dragState.anchor0.clone().addScaledVector(dragState.axisVec, proj);
          if (dragState.selSnap.type === 'model') {
            sketch3d.setModelTransform(dragState.selSnap.id, { center: [nextPt.x, nextPt.y, nextPt.z] }, false);
          } else if (dragState.selSnap.type === 'kf') {
            const kfs = sketch3d.getKeyframes();
            const kf = kfs.find((k) => k.id === dragState.selSnap.id);
            if (kf) {
              if (dragState.selSnap.subTarget === 'lookAt') kf.lookAt = [nextPt.x, nextPt.y, nextPt.z];
              else kf.pos = [nextPt.x, nextPt.y, nextPt.z];
              sketch3d.setKeyframes(kfs, false);
            }
          }
          rebuildPathAndNodeVisuals();
          refreshHudValues();
          sketch3d.requestRender();
        }
        return;
      }

      if (dragState.mode === 'dir-orbit') {
        orbit.yaw = dragState.initYaw - dx * 0.0055;
        orbit.pitch = clamp(dragState.initPitch + dy * 0.0055, -1.48, 1.48);
        syncEditorCamera();
        sketch3d.requestRender();
        return;
      }

      if (dragState.mode === 'dir-pan') {
        syncEditorCamera();
        const right = new THREE.Vector3().setFromMatrixColumn(editorCamera.matrixWorld, 0).normalize();
        const up = new THREE.Vector3().setFromMatrixColumn(editorCamera.matrixWorld, 1).normalize();
        const panScale = orbit.dist * 0.0014;
        orbit.target
          .copy(dragState.initTarget)
          .addScaledVector(right, -dx * panScale)
          .addScaledVector(up, dy * panScale);
        syncEditorCamera();
        sketch3d.requestRender();
        return;
      }

      if (dragState.mode === 'pov-look' && povOverride) {
        const rel = dragState.initLook.clone().sub(dragState.initPos);
        const len = Math.max(1.0, rel.length());
        const yaw0 = Math.atan2(rel.x, rel.z);
        const pitch0 = Math.asin(clamp(rel.y / len, -0.99, 0.99));
        const yaw1 = yaw0 - dx * 0.0045;
        const pitch1 = clamp(pitch0 - dy * 0.0045, -1.45, 1.45);
        const cp = Math.cos(pitch1);
        povOverride.lookAt.set(
          povOverride.pos.x + Math.sin(yaw1) * cp * len,
          povOverride.pos.y + Math.sin(pitch1) * len,
          povOverride.pos.z + Math.cos(yaw1) * cp * len
        );
        sketch3d.requestRender();
        return;
      }

      if (dragState.mode === 'pov-orbit' && povOverride) {
        const rel = dragState.initPos.clone().sub(dragState.initLook);
        const len = Math.max(2.0, rel.length());
        const yaw0 = Math.atan2(rel.x, rel.z);
        const pitch0 = Math.asin(clamp(rel.y / len, -0.99, 0.99));
        const yaw1 = yaw0 - dx * 0.0052;
        const pitch1 = clamp(pitch0 + dy * 0.0052, -1.45, 1.45);
        const cp = Math.cos(pitch1);
        povOverride.pos.set(
          povOverride.lookAt.x + Math.sin(yaw1) * cp * len,
          povOverride.lookAt.y + Math.sin(pitch1) * len,
          povOverride.lookAt.z + Math.cos(yaw1) * cp * len
        );
        sketch3d.requestRender();
      }
    }

    function onPointerUp(e) {
      if (!dragState) return;
      const wasGizmo = dragState.mode === 'gizmo-axis';
      dragState = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      if (wasGizmo) {
        sketch3d.commitEdits();
        rebuildPathAndNodeVisuals();
        refreshHudValues();
      }
    }

    function onWheel(e) {
      if (!isOpen) return;
      e.preventDefault();
      if (viewMode === 'director') {
        orbit.dist = clamp(orbit.dist * Math.exp(e.deltaY * 0.0011), 6, 480);
        syncEditorCamera();
        sketch3d.requestRender();
      } else {
        if (clockCtrl && clockCtrl.isPlaying()) clockCtrl.setPlaying(false);
        const st = ensurePovOverride(sketch3d.getCurrentAge());
        const fwd = st.lookAt.clone().sub(st.pos);
        const d = fwd.length();
        if (d > 1e-4) {
          fwd.divideScalar(d);
          const step = clamp(-e.deltaY * 0.04, -12, 12);
          if (d - step >= 4.0) st.pos.addScaledVector(fwd, step);
        }
        sketch3d.requestRender();
      }
    }

    function onContextMenu(e) {
      if (isOpen) e.preventDefault();
    }

    const keysDown = new Set();
    let navTimer = null;

    function stepKeyboardNavigation() {
      if (!isOpen || keysDown.size === 0) return;
      const speed = 0.85;
      const cam = viewMode === 'pov' ? pvCamera : editorCamera;
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion).normalize();
      const delta = new THREE.Vector3();
      if (keysDown.has('KeyW')) delta.addScaledVector(fwd, speed);
      if (keysDown.has('KeyS')) delta.addScaledVector(fwd, -speed);
      if (keysDown.has('KeyD')) delta.addScaledVector(right, speed);
      if (keysDown.has('KeyA')) delta.addScaledVector(right, -speed);
      if (keysDown.has('KeyQ')) delta.y += speed * 0.8;
      if (keysDown.has('KeyZ')) delta.y -= speed * 0.8;
      if (delta.lengthSq() < 1e-8) return;

      if (viewMode === 'director') {
        orbit.target.add(delta);
        syncEditorCamera();
      } else {
        if (clockCtrl && clockCtrl.isPlaying()) clockCtrl.setPlaying(false);
        const st = ensurePovOverride(sketch3d.getCurrentAge());
        st.pos.add(delta);
        st.lookAt.add(delta);
      }
    }

    // =========================================================================
    // 4. KEYFRAME & MODEL EDIT ACTIONS
    // =========================================================================
    function selectModel(id, jumpTimeline) {
      sel = { type: 'model', id, subTarget: 'center' };
      inspectorTab = 'models';
      const ar = sketch3d.getArenas().find((a) => a.id === id);
      if (ar && jumpTimeline) {
        seekAge(ar.heroAge);
        focusDirectorOn(ar.center[0], ar.center[1], ar.center[2], Math.max(46, ar.orbitRadius * 1.45));
      }
      rebuildPathAndNodeVisuals();
      renderHudStructure();
      sketch3d.requestRender();
    }

    function selectKeyframe(kfId, subTarget, jumpTimeline) {
      sel = { type: 'kf', id: kfId, subTarget: subTarget || 'pos' };
      inspectorTab = 'camera';
      const kf = sketch3d.getKeyframes().find((k) => k.id === kfId);
      if (kf && jumpTimeline) seekAge(kf.t);
      rebuildPathAndNodeVisuals();
      renderHudStructure();
      sketch3d.requestRender();
    }

    function captureViewIntoKeyframe(createNew) {
      const age = sketch3d.getCurrentAge();
      let pPos, pLook, pFov;
      if (viewMode === 'pov' && povOverride) {
        pPos = [povOverride.pos.x, povOverride.pos.y, povOverride.pos.z];
        pLook = [povOverride.lookAt.x, povOverride.lookAt.y, povOverride.lookAt.z];
        pFov = povOverride.fov;
      } else {
        syncEditorCamera();
        const dirPos = editorCamera.position;
        pPos = [dirPos.x, dirPos.y, dirPos.z];
        pLook = [orbit.target.x, orbit.target.y, orbit.target.z];
        pFov = pvCamera.fov || 46;
      }

      const kfs = sketch3d.getKeyframes();
      if (!createNew && sel.type === 'kf') {
        const idx = kfs.findIndex((k) => k.id === sel.id);
        if (idx >= 0) {
          kfs[idx].pos = pPos.map((n) => Number(n.toFixed(3)));
          kfs[idx].lookAt = pLook.map((n) => Number(n.toFixed(3)));
          kfs[idx].fov = Number(pFov.toFixed(2));
          sketch3d.setKeyframes(kfs, true);
          povOverride = null;
          rebuildPathAndNodeVisuals();
          renderHudStructure();
          showToast('已更新选中关键帧视角');
          return;
        }
      }

      const near = kfs.find((k) => Math.abs(k.t - age) < 0.08);
      if (near) {
        near.pos = pPos.map((n) => Number(n.toFixed(3)));
        near.lookAt = pLook.map((n) => Number(n.toFixed(3)));
        near.fov = Number(pFov.toFixed(2));
        sel = { type: 'kf', id: near.id, subTarget: 'pos' };
      } else {
        const id = 'kf_user_' + Date.now().toString(36).slice(-5);
        kfs.push({
          id,
          t: Number(age.toFixed(3)),
          pos: pPos.map((n) => Number(n.toFixed(3))),
          lookAt: pLook.map((n) => Number(n.toFixed(3))),
          fov: Number(pFov.toFixed(2)),
          label: `自定义 ${age.toFixed(1)}s`,
        });
        sel = { type: 'kf', id, subTarget: 'pos' };
      }
      sketch3d.setKeyframes(kfs, true);
      povOverride = null;
      inspectorTab = 'camera';
      rebuildPathAndNodeVisuals();
      renderHudStructure();
      showToast(`已在 t=${age.toFixed(2)}s 插入关键帧`);
    }

    function insertKeyframeAtCurrentAge() {
      const age = sketch3d.getCurrentAge();
      if (viewMode === 'pov' && povOverride) {
        captureViewIntoKeyframe(true);
        return;
      }
      const kfs = sketch3d.getKeyframes();
      const pose = sketch3d.evalCameraAt(age);
      const near = kfs.find((k) => Math.abs(k.t - age) < 0.06);
      if (near) {
        selectKeyframe(near.id, 'pos', false);
        showToast('当前时间已有关键帧，已为你选中');
        return;
      }
      const id = 'kf_user_' + Date.now().toString(36).slice(-5);
      kfs.push({
        id,
        t: Number(age.toFixed(3)),
        pos: pose.pos.map((n) => Number(n.toFixed(3))),
        lookAt: pose.lookAt.map((n) => Number(n.toFixed(3))),
        fov: Number(pose.fov.toFixed(2)),
        label: `插帧 ${age.toFixed(1)}s`,
      });
      sketch3d.setKeyframes(kfs, true);
      sel = { type: 'kf', id, subTarget: 'pos' };
      inspectorTab = 'camera';
      rebuildPathAndNodeVisuals();
      renderHudStructure();
      showToast(`已插入关键帧 t=${age.toFixed(2)}s`);
    }

    function deleteSelectedKeyframe() {
      if (sel.type !== 'kf') return;
      const kfs = sketch3d.getKeyframes();
      if (kfs.length <= 2) {
        showToast('至少需保留 2 个关键帧');
        return;
      }
      const idx = kfs.findIndex((k) => k.id === sel.id);
      if (idx < 0) return;
      kfs.splice(idx, 1);
      const next = kfs[Math.min(idx, kfs.length - 1)];
      sel = { type: 'kf', id: next.id, subTarget: 'pos' };
      sketch3d.setKeyframes(kfs, true);
      rebuildPathAndNodeVisuals();
      renderHudStructure();
      showToast('已删除关键帧');
    }

    // =========================================================================
    // 5. STUDIO HUD DOM BUILDER
    // =========================================================================
    let rootEl = null;
    let inspectorBodyEl = null;
    let tabCamBtn = null;
    let tabModBtn = null;
    let topViewBtn = null;
    let topPipBtn = null;
    let topAllBtn = null;
    let playBtn = null;
    let muteBtn = null;
    let tlTimeEl = null;
    let tlPlayheadEl = null;
    let tlTrackEl = null;
    let tlStageBtns = [];
    let toastEl = null;
    let toastTimer = null;
    let fileInputEl = null;

    function showToast(msg) {
      if (!toastEl) return;
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        if (toastEl) toastEl.classList.remove('show');
      }, 2100);
    }

    function setViewMode(nextMode) {
      viewMode = nextMode;
      if (viewMode === 'pov') {
        povOverride = null;
        if (clockCtrl && clockCtrl.isPlaying()) clockCtrl.setPlaying(false);
      }
      if (topViewBtn) {
        topViewBtn.textContent = viewMode === 'director' ? '视角: 导演自由 [V]' : '视角: 摄像机POV [V]';
        topViewBtn.classList.toggle('active', viewMode === 'pov');
      }
      if (topPipBtn) topPipBtn.style.display = viewMode === 'director' ? '' : 'none';
      sketch3d.requestRender();
    }

    function makeFieldRow(labelText, cls, val, min, max, step, onLive, onCommit) {
      const row = document.createElement('div');
      row.className = 'mc-ed-field';
      const lbl = document.createElement('span');
      lbl.textContent = labelText;
      if (cls) lbl.className = cls;
      const range = document.createElement('input');
      range.type = 'range';
      range.className = 'mc-ed-range';
      range.min = String(min);
      range.max = String(max);
      range.step = String(step);
      range.value = String(clamp(val, min, max));
      const num = document.createElement('input');
      num.type = 'number';
      num.className = 'mc-ed-input';
      num.step = String(step);
      num.value = String(Number(val).toFixed(step >= 1 ? 0 : 2));

      range.addEventListener('input', () => {
        const v = parseFloat(range.value);
        if (!Number.isFinite(v)) return;
        num.value = String(v.toFixed(step >= 1 ? 0 : 2));
        onLive(v);
      });
      range.addEventListener('change', () => {
        const v = parseFloat(range.value);
        if (Number.isFinite(v) && onCommit) onCommit(v);
      });
      num.addEventListener('change', () => {
        const v = parseFloat(num.value);
        if (!Number.isFinite(v)) return;
        range.value = String(clamp(v, min, max));
        onLive(v);
        if (onCommit) onCommit(v);
      });

      row.append(lbl, range, num);
      row._update = (nv) => {
        if (document.activeElement !== range) range.value = String(clamp(nv, min, max));
        if (document.activeElement !== num) num.value = String(Number(nv).toFixed(step >= 1 ? 0 : 2));
      };
      return row;
    }

    let boundUpdaters = [];

    function renderInspector() {
      if (!inspectorBodyEl) return;
      boundUpdaters = [];
      inspectorBodyEl.textContent = '';

      if (tabCamBtn) tabCamBtn.classList.toggle('active', inspectorTab === 'camera');
      if (tabModBtn) tabModBtn.classList.toggle('active', inspectorTab === 'models');

      if (inspectorTab === 'camera') {
        const actions = document.createElement('div');
        actions.className = 'mc-ed-row';

        const bAdd = document.createElement('button');
        bAdd.className = 'mc-ed-btn active';
        bAdd.textContent = '+ 插帧 [K]';
        bAdd.onclick = () => insertKeyframeAtCurrentAge();

        const bCap = document.createElement('button');
        bCap.className = 'mc-ed-btn gold';
        bCap.textContent = '捕获视角';
        bCap.onclick = () => captureViewIntoKeyframe(false);

        const bDel = document.createElement('button');
        bDel.className = 'mc-ed-btn danger';
        bDel.textContent = '删除';
        bDel.onclick = () => deleteSelectedKeyframe();

        actions.append(bAdd, bCap, bDel);
        inspectorBodyEl.appendChild(actions);

        const gizToggle = document.createElement('div');
        gizToggle.className = 'mc-ed-row';
        const bPos = document.createElement('button');
        bPos.className = 'mc-ed-btn' + (sel.type === 'kf' && sel.subTarget !== 'lookAt' ? ' active' : '');
        bPos.textContent = 'Gizmo: 相机位置';
        bPos.onclick = () => {
          if (sel.type !== 'kf') {
            const k0 = sketch3d.getKeyframes()[0];
            if (k0) sel = { type: 'kf', id: k0.id, subTarget: 'pos' };
          } else sel.subTarget = 'pos';
          rebuildPathAndNodeVisuals();
          renderInspector();
          sketch3d.requestRender();
        };
        const bLook = document.createElement('button');
        bLook.className = 'mc-ed-btn' + (sel.type === 'kf' && sel.subTarget === 'lookAt' ? ' active' : '');
        bLook.textContent = 'Gizmo: 注视点';
        bLook.onclick = () => {
          if (sel.type !== 'kf') {
            const k0 = sketch3d.getKeyframes()[0];
            if (k0) sel = { type: 'kf', id: k0.id, subTarget: 'lookAt' };
          } else sel.subTarget = 'lookAt';
          rebuildPathAndNodeVisuals();
          renderInspector();
          sketch3d.requestRender();
        };
        gizToggle.append(bPos, bLook);
        inspectorBodyEl.appendChild(gizToggle);

        const kfs = sketch3d.getKeyframes();
        if (sel.type !== 'kf' && kfs.length > 0) {
          sel = { type: 'kf', id: kfs[0].id, subTarget: 'pos' };
        }

        const list = document.createElement('div');
        list.className = 'mc-ed-list';
        kfs.forEach((kf) => {
          const item = document.createElement('div');
          item.className = 'mc-ed-list-item' + (sel.type === 'kf' && sel.id === kf.id ? ' selected' : '');
          item.innerHTML = `<span>${kf.label}</span><span>${kf.t.toFixed(2)}s</span>`;
          item.onclick = () => selectKeyframe(kf.id, sel.subTarget || 'pos', true);
          list.appendChild(item);
        });
        inspectorBodyEl.appendChild(list);

        const activeKf = kfs.find((k) => k.id === sel.id) || kfs[0];
        if (activeKf) {
          const patchKf = (mutator, commit) => {
            const arr = sketch3d.getKeyframes();
            const target = arr.find((k) => k.id === activeKf.id);
            if (!target) return;
            mutator(target);
            sketch3d.setKeyframes(arr, commit);
            rebuildPathAndNodeVisuals();
            if (commit) renderTimelineDiamonds();
          };

          const secT = document.createElement('div');
          secT.className = 'mc-ed-section-label';
          secT.textContent = `时间 & FOV (${activeKf.label})`;
          inspectorBodyEl.appendChild(secT);

          const fT = makeFieldRow('t(s)', '', activeKf.t, 0, MAX_AGE, 0.05,
            (v) => patchKf((k) => { k.t = Number(v.toFixed(3)); }, false),
            (v) => { patchKf((k) => { k.t = Number(v.toFixed(3)); }, true); seekAge(v); }
          );
          const fFov = makeFieldRow('FOV', '', activeKf.fov, 24, 85, 0.5,
            (v) => patchKf((k) => { k.fov = Number(v.toFixed(2)); }, false),
            (v) => patchKf((k) => { k.fov = Number(v.toFixed(2)); }, true)
          );
          inspectorBodyEl.append(fT, fFov);

          const secPos = document.createElement('div');
          secPos.className = 'mc-ed-section-label';
          secPos.textContent = '相机位置 Position';
          inspectorBodyEl.appendChild(secPos);

          const axMeta = [
            { l: 'X', cls: 'mc-ed-axis-x', idx: 0 },
            { l: 'Y', cls: 'mc-ed-axis-y', idx: 1 },
            { l: 'Z', cls: 'mc-ed-axis-z', idx: 2 },
          ];
          const pRows = axMeta.map((m) => makeFieldRow(
            m.l, m.cls, activeKf.pos[m.idx], activeKf.pos[m.idx] - 80, activeKf.pos[m.idx] + 80, 0.25,
            (v) => patchKf((k) => { k.pos[m.idx] = Number(v.toFixed(3)); }, false),
            (v) => patchKf((k) => { k.pos[m.idx] = Number(v.toFixed(3)); }, true)
          ));
          pRows.forEach((r) => inspectorBodyEl.appendChild(r));

          const secLook = document.createElement('div');
          secLook.className = 'mc-ed-section-label';
          const btnAim = document.createElement('button');
          btnAim.className = 'mc-ed-btn';
          btnAim.textContent = '对准最近模型';
          btnAim.onclick = () => {
            const arenas = sketch3d.getArenas();
            let nearest = arenas[0];
            for (let i = 0; i < arenas.length; i++) {
              if (activeKf.t >= arenas[i].tEnter && activeKf.t <= arenas[i].tExit) { nearest = arenas[i]; break; }
            }
            if (nearest) {
              patchKf((k) => { k.lookAt = nearest.center.slice(); }, true);
              renderInspector();
            }
          };
          secLook.innerHTML = '<span>注视点 LookAt</span>';
          secLook.appendChild(btnAim);
          inspectorBodyEl.appendChild(secLook);

          const lRows = axMeta.map((m) => makeFieldRow(
            m.l, m.cls, activeKf.lookAt[m.idx], activeKf.lookAt[m.idx] - 80, activeKf.lookAt[m.idx] + 80, 0.25,
            (v) => patchKf((k) => { k.lookAt[m.idx] = Number(v.toFixed(3)); }, false),
            (v) => patchKf((k) => { k.lookAt[m.idx] = Number(v.toFixed(3)); }, true)
          ));
          lRows.forEach((r) => inspectorBodyEl.appendChild(r));

          boundUpdaters.push(() => {
            const fresh = sketch3d.getKeyframes().find((k) => k.id === activeKf.id);
            if (!fresh) return;
            fT._update(fresh.t);
            fFov._update(fresh.fov);
            pRows.forEach((r, i) => r._update(fresh.pos[i]));
            lRows.forEach((r, i) => r._update(fresh.lookAt[i]));
          });
        }
      } else {
        const arenas = sketch3d.getArenas();
        if (sel.type !== 'model') sel = { type: 'model', id: arenas[0].id, subTarget: 'center' };

        const list = document.createElement('div');
        list.className = 'mc-ed-list';
        arenas.forEach((ar) => {
          const item = document.createElement('div');
          item.className = 'mc-ed-list-item' + (sel.type === 'model' && sel.id === ar.id ? ' selected' : '');
          item.innerHTML = `<span>${ar.label}</span><span>${ar.heroAge.toFixed(1)}s</span>`;
          item.onclick = () => selectModel(ar.id, true);
          list.appendChild(item);
        });
        inspectorBodyEl.appendChild(list);

        const ar = arenas.find((a) => a.id === sel.id) || arenas[0];
        if (ar) {
          const hdr = document.createElement('div');
          hdr.className = 'mc-ed-section-label';
          const bReset = document.createElement('button');
          bReset.className = 'mc-ed-btn warn';
          bReset.textContent = '重置此模型';
          bReset.onclick = () => {
            sketch3d.resetModelTransform(ar.id);
            rebuildPathAndNodeVisuals();
            renderInspector();
            showToast(`已重置 ${ar.label}`);
          };
          hdr.innerHTML = `<span>最终位置 Center (${ar.label})</span>`;
          hdr.appendChild(bReset);
          inspectorBodyEl.appendChild(hdr);

          const axMeta = [
            { l: 'X', cls: 'mc-ed-axis-x', idx: 0 },
            { l: 'Y', cls: 'mc-ed-axis-y', idx: 1 },
            { l: 'Z', cls: 'mc-ed-axis-z', idx: 2 },
          ];
          const cRows = axMeta.map((m) => makeFieldRow(
            m.l, m.cls, ar.center[m.idx], ar.center[m.idx] - 90, ar.center[m.idx] + 90, 0.25,
            (v) => {
              const cur = sketch3d.getArenas().find((x) => x.id === ar.id).center.slice();
              cur[m.idx] = Number(v.toFixed(3));
              sketch3d.setModelTransform(ar.id, { center: cur }, false);
              rebuildPathAndNodeVisuals();
            },
            (v) => {
              const cur = sketch3d.getArenas().find((x) => x.id === ar.id).center.slice();
              cur[m.idx] = Number(v.toFixed(3));
              sketch3d.setModelTransform(ar.id, { center: cur }, true);
              rebuildPathAndNodeVisuals();
            }
          ));
          cRows.forEach((r) => inspectorBodyEl.appendChild(r));

          const rotHdr = document.createElement('div');
          rotHdr.className = 'mc-ed-section-label';
          rotHdr.textContent = '朝向 Rotation (°)';
          inspectorBodyEl.appendChild(rotHdr);

          const rotMeta = [
            { l: 'Pitch', cls: 'mc-ed-axis-x', idx: 0 },
            { l: 'Yaw', cls: 'mc-ed-axis-y', idx: 1 },
            { l: 'Roll', cls: 'mc-ed-axis-z', idx: 2 },
          ];
          const rRows = rotMeta.map((m) => {
            const row = makeFieldRow(
              m.l, m.cls, ar.rotDeg[m.idx], -180, 180, 1,
              (v) => {
                const cur = sketch3d.getArenas().find((x) => x.id === ar.id).rotDeg.slice();
                cur[m.idx] = Number(v.toFixed(2));
                sketch3d.setModelTransform(ar.id, { rotDeg: cur }, false);
                rebuildPathAndNodeVisuals();
              },
              (v) => {
                const cur = sketch3d.getArenas().find((x) => x.id === ar.id).rotDeg.slice();
                cur[m.idx] = Number(v.toFixed(2));
                sketch3d.setModelTransform(ar.id, { rotDeg: cur }, true);
                rebuildPathAndNodeVisuals();
              }
            );
            row.className = 'mc-ed-field-wide';
            return row;
          });
          rRows.forEach((r) => inspectorBodyEl.appendChild(r));

          boundUpdaters.push(() => {
            const fresh = sketch3d.getArenas().find((x) => x.id === ar.id);
            if (!fresh) return;
            cRows.forEach((r, i) => r._update(fresh.center[i]));
            rRows.forEach((r, i) => r._update(fresh.rotDeg[i]));
          });
        }
      }
    }

    function refreshHudValues() {
      for (let i = 0; i < boundUpdaters.length; i++) boundUpdaters[i]();
      updateTimelinePlayhead(sketch3d.getCurrentAge());
    }

    function renderTimelineDiamonds() {
      if (!tlTrackEl) return;
      tlTrackEl.querySelectorAll('.mc-ed-kf-diamond').forEach((n) => n.remove());
      const kfs = sketch3d.getKeyframes();
      kfs.forEach((kf) => {
        const d = document.createElement('div');
        d.className = 'mc-ed-kf-diamond' + (sel.type === 'kf' && sel.id === kf.id ? ' selected' : '');
        d.style.left = clamp((kf.t / MAX_AGE) * 100, 0, 100).toFixed(3) + '%';
        d.title = `${kf.label} (${kf.t.toFixed(2)}s)`;
        d.addEventListener('pointerdown', (ev) => {
          ev.stopPropagation();
          selectKeyframe(kf.id, 'pos', true);
          const rect = tlTrackEl.getBoundingClientRect();
          const onMove = (mv) => {
            const nt = clamp(((mv.clientX - rect.left) / Math.max(1, rect.width)) * MAX_AGE, 0, MAX_AGE);
            const arr = sketch3d.getKeyframes();
            const target = arr.find((k) => k.id === kf.id);
            if (target) {
              target.t = Number(nt.toFixed(3));
              sketch3d.setKeyframes(arr, false);
              d.style.left = clamp((nt / MAX_AGE) * 100, 0, 100).toFixed(3) + '%';
              seekAge(nt);
              rebuildPathAndNodeVisuals();
            }
          };
          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            sketch3d.commitEdits();
            renderTimelineDiamonds();
            renderInspector();
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        });
        tlTrackEl.appendChild(d);
      });
    }

    function renderHudStructure() {
      renderInspector();
      renderTimelineDiamonds();
    }

    function updateTimelinePlayhead(age) {
      if (tlTimeEl) {
        const barNum = (17 + age / BAR).toFixed(1);
        tlTimeEl.textContent = `${age.toFixed(2)}s / ${MAX_AGE.toFixed(1)}s · Bar ${barNum}`;
      }
      if (tlPlayheadEl) {
        tlPlayheadEl.style.left = clamp((age / MAX_AGE) * 100, 0, 100).toFixed(3) + '%';
      }
      const arenas = sketch3d.getArenas();
      for (let i = 0; i < tlStageBtns.length; i++) {
        const ar = arenas[i];
        if (!ar) continue;
        tlStageBtns[i].classList.toggle('active', age >= ar.tEnter && age <= ar.tExit);
      }
      if (playBtn && clockCtrl) {
        playBtn.textContent = clockCtrl.isPlaying() ? '暂停 [Space]' : '播放 [Space]';
      }
      if (muteBtn && clockCtrl && typeof clockCtrl.isMuted === 'function') {
        muteBtn.textContent = clockCtrl.isMuted() ? '静音' : '音频:开';
      }
    }

    function buildHudDom() {
      if (rootEl) return;
      rootEl = document.createElement('div');
      rootEl.className = 'mc-editor-root';

      // Top Bar
      const top = document.createElement('div');
      top.className = 'mc-ed-topbar';

      const brand = document.createElement('div');
      brand.className = 'mc-ed-brand';
      brand.textContent = 'DIRECTOR · 摄像机 & 模型编排';

      topViewBtn = document.createElement('button');
      topViewBtn.className = 'mc-ed-btn';
      topViewBtn.textContent = '视角: 导演自由 [V]';
      topViewBtn.onclick = () => setViewMode(viewMode === 'director' ? 'pov' : 'director');

      topPipBtn = document.createElement('button');
      topPipBtn.className = 'mc-ed-btn active';
      topPipBtn.textContent = 'PiP 预览';
      topPipBtn.onclick = () => {
        pipEnabled = !pipEnabled;
        topPipBtn.classList.toggle('active', pipEnabled);
        sketch3d.requestRender();
      };

      topAllBtn = document.createElement('button');
      topAllBtn.className = 'mc-ed-btn';
      topAllBtn.textContent = '显示全部模型';
      topAllBtn.onclick = () => {
        showAllModels = !showAllModels;
        topAllBtn.classList.toggle('active', showAllModels);
        sketch3d.setShowAllModels(showAllModels);
      };

      const spacer = document.createElement('div');
      spacer.className = 'mc-ed-spacer';

      const bSave = document.createElement('button');
      bSave.className = 'mc-ed-btn gold';
      bSave.textContent = '保存';
      bSave.onclick = () => {
        sketch3d.commitEdits();
        showToast('已保存到浏览器本地存储 (localStorage)');
      };

      const bExport = document.createElement('button');
      bExport.className = 'mc-ed-btn';
      bExport.textContent = '导出 JSON';
      bExport.onclick = () => {
        const json = sketch3d.exportChoreoJson();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(json).catch(() => {});
        }
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mic-check-part2-choreo.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('已导出 JSON 并尝试复制到剪贴板');
      };

      fileInputEl = document.createElement('input');
      fileInputEl.type = 'file';
      fileInputEl.accept = '.json,application/json';
      fileInputEl.style.display = 'none';
      fileInputEl.onchange = () => {
        const f = fileInputEl.files && fileInputEl.files[0];
        if (!f) return;
        f.text().then((txt) => {
          if (sketch3d.importChoreoJson(txt)) {
            rebuildPathAndNodeVisuals();
            renderHudStructure();
            showToast('导入配置成功');
          } else {
            showToast('JSON 格式无效');
          }
          fileInputEl.value = '';
        });
      };

      const bImport = document.createElement('button');
      bImport.className = 'mc-ed-btn';
      bImport.textContent = '导入 JSON';
      bImport.onclick = () => fileInputEl.click();

      const bReset = document.createElement('button');
      bReset.className = 'mc-ed-btn warn';
      bReset.textContent = '恢复默认';
      bReset.onclick = () => {
        sketch3d.resetChoreo();
        rebuildPathAndNodeVisuals();
        renderHudStructure();
        showToast('已恢复默认摄像机路径与模型位置');
      };

      const bClose = document.createElement('button');
      bClose.className = 'mc-ed-btn danger';
      bClose.textContent = '退出编辑 [E]';
      bClose.onclick = () => close();

      top.append(brand, topViewBtn, topPipBtn, topAllBtn, spacer, bSave, bExport, bImport, bReset, bClose, fileInputEl);
      rootEl.appendChild(top);

      // PiP Live Camera Frame Badge
      pipFrameEl = document.createElement('div');
      pipFrameEl.className = 'mc-ed-pip-frame';
      const pipBadge = document.createElement('div');
      pipBadge.className = 'mc-ed-pip-badge';
      pipBadge.textContent = 'CAMERA POV LIVE';
      pipFrameEl.appendChild(pipBadge);
      rootEl.appendChild(pipFrameEl);

      // Right Inspector
      const insp = document.createElement('div');
      insp.className = 'mc-ed-inspector';

      const tabs = document.createElement('div');
      tabs.className = 'mc-ed-tabs';
      tabCamBtn = document.createElement('button');
      tabCamBtn.className = 'mc-ed-tab active';
      tabCamBtn.textContent = '摄像机路径';
      tabCamBtn.onclick = () => {
        inspectorTab = 'camera';
        const kfs = sketch3d.getKeyframes();
        if (sel.type !== 'kf' && kfs.length > 0) sel = { type: 'kf', id: kfs[0].id, subTarget: 'pos' };
        rebuildPathAndNodeVisuals();
        renderInspector();
        sketch3d.requestRender();
      };

      tabModBtn = document.createElement('button');
      tabModBtn.className = 'mc-ed-tab';
      tabModBtn.textContent = '模型最终位置';
      tabModBtn.onclick = () => {
        inspectorTab = 'models';
        const arenas = sketch3d.getArenas();
        if (sel.type !== 'model' && arenas.length > 0) sel = { type: 'model', id: arenas[0].id, subTarget: 'center' };
        rebuildPathAndNodeVisuals();
        renderInspector();
        sketch3d.requestRender();
      };
      tabs.append(tabCamBtn, tabModBtn);

      inspectorBodyEl = document.createElement('div');
      inspectorBodyEl.className = 'mc-ed-panel';

      const help = document.createElement('div');
      help.className = 'mc-ed-help';
      help.textContent = '左键旋转 · 右键/Shift平移 · 滚轮缩放 · WASD/QZ漫游 · 拖RGB轴移动 · V切视角 · K插帧 · F聚焦 · Space播放';

      insp.append(tabs, inspectorBodyEl, help);
      rootEl.appendChild(insp);

      // Bottom Timeline Bar
      const tl = document.createElement('div');
      tl.className = 'mc-ed-timeline';

      const tlTop = document.createElement('div');
      tlTop.className = 'mc-ed-tl-top';

      playBtn = document.createElement('button');
      playBtn.className = 'mc-ed-btn active';
      playBtn.textContent = '播放 [Space]';
      playBtn.onclick = () => {
        if (clockCtrl && typeof clockCtrl.togglePlay === 'function') {
          clockCtrl.togglePlay();
          povOverride = null;
          updateTimelinePlayhead(sketch3d.getCurrentAge());
        }
      };

      muteBtn = document.createElement('button');
      muteBtn.className = 'mc-ed-btn';
      muteBtn.textContent = '音频:开';
      muteBtn.onclick = () => {
        if (clockCtrl && typeof clockCtrl.setMuted === 'function') {
          clockCtrl.setMuted(!clockCtrl.isMuted());
          updateTimelinePlayhead(sketch3d.getCurrentAge());
        }
      };

      tlTimeEl = document.createElement('div');
      tlTimeEl.className = 'mc-ed-tl-time';
      tlTimeEl.textContent = '0.00s / 84.5s';

      const stages = document.createElement('div');
      stages.className = 'mc-ed-stages';
      tlStageBtns = [];
      sketch3d.getArenas().forEach((ar) => {
        const b = document.createElement('button');
        b.className = 'mc-ed-stage-pill';
        b.textContent = ar.label.replace(/^M\d\s|^FIN\s/, '');
        b.onclick = () => selectModel(ar.id, true);
        stages.appendChild(b);
        tlStageBtns.push(b);
      });

      tlTop.append(playBtn, muteBtn, tlTimeEl, stages);

      tlTrackEl = document.createElement('div');
      tlTrackEl.className = 'mc-ed-track';
      tlPlayheadEl = document.createElement('div');
      tlPlayheadEl.className = 'mc-ed-playhead';
      tlTrackEl.appendChild(tlPlayheadEl);

      tlTrackEl.addEventListener('pointerdown', (ev) => {
        const scrubTo = (clientX) => {
          const rect = tlTrackEl.getBoundingClientRect();
          const age = clamp(((clientX - rect.left) / Math.max(1, rect.width)) * MAX_AGE, 0, MAX_AGE);
          seekAge(age);
        };
        scrubTo(ev.clientX);
        const onMove = (mv) => scrubTo(mv.clientX);
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });

      tl.append(tlTop, tlTrackEl);
      rootEl.appendChild(tl);

      toastEl = document.createElement('div');
      toastEl.className = 'mc-ed-toast';
      rootEl.appendChild(toastEl);

      document.body.appendChild(rootEl);
    }

    function onKeyDown(e) {
      if (!isOpen) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyZ'].includes(e.code)) {
        keysDown.add(e.code);
        if (!navTimer) {
          navTimer = setInterval(() => {
            if (!isOpen || keysDown.size === 0) {
              clearInterval(navTimer);
              navTimer = null;
              return;
            }
            sketch3d.requestRender();
          }, 16);
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (clockCtrl && typeof clockCtrl.togglePlay === 'function') {
          clockCtrl.togglePlay();
          povOverride = null;
          updateTimelinePlayhead(sketch3d.getCurrentAge());
        }
      } else if (e.code === 'KeyV') {
        e.preventDefault();
        setViewMode(viewMode === 'director' ? 'pov' : 'director');
      } else if (e.code === 'KeyK') {
        e.preventDefault();
        if (viewMode === 'pov' && povOverride) captureViewIntoKeyframe(true);
        else insertKeyframeAtCurrentAge();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        if (sel.type === 'model') {
          const ar = sketch3d.getArenas().find((a) => a.id === sel.id);
          if (ar) focusDirectorOn(ar.center[0], ar.center[1], ar.center[2], Math.max(46, ar.orbitRadius * 1.45));
        } else if (sel.type === 'kf') {
          const kf = sketch3d.getKeyframes().find((k) => k.id === sel.id);
          if (kf) {
            const p = sel.subTarget === 'lookAt' ? kf.lookAt : kf.pos;
            focusDirectorOn(p[0], p[1], p[2]);
          }
        }
        sketch3d.requestRender();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (sel.type === 'kf') {
          e.preventDefault();
          deleteSelectedKeyframe();
        }
      }
    }

    function onKeyUp(e) {
      keysDown.delete(e.code);
      if (keysDown.size === 0 && navTimer) {
        clearInterval(navTimer);
        navTimer = null;
      }
    }

    // =========================================================================
    // 6. OPEN / CLOSE / DESTROY LIFECYCLE
    // =========================================================================
    function bindCanvasListeners() {
      canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('contextmenu', onContextMenu);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }

    function unbindCanvasListeners() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    }

    function open() {
      if (destroyed || isOpen) return;
      isOpen = true;
      document.body.classList.add('mc-editor-active');
      if (clockCtrl && typeof clockCtrl.setPlaying === 'function') {
        clockCtrl.setPlaying(false);
      }

      // Focus Director Camera on current active arena from a clean 3/4 director overview angle
      const age = sketch3d.getCurrentAge();
      const arenas = sketch3d.getArenas();
      let curAr = arenas[0];
      for (let i = 0; i < arenas.length; i++) {
        if (age >= arenas[i].tEnter - 0.5 && age <= arenas[i].tExit) {
          curAr = arenas[i];
          break;
        }
      }
      if (curAr) {
        sel = { type: 'model', id: curAr.id, subTarget: 'center' };
        inspectorTab = 'models';
        const cp = sketch3d.evalCameraAt(age);
        const rel = new THREE.Vector3(cp.pos[0] - curAr.center[0], 0, cp.pos[2] - curAr.center[2]);
        orbit.yaw = Math.atan2(rel.x, rel.z) + 0.55;
        orbit.pitch = 0.36;
        focusDirectorOn(curAr.center[0], curAr.center[1], curAr.center[2], 62);
      }

      if (editorGroup.parent !== scene) scene.add(editorGroup);
      sketch3d.setEditMode(true);
      sketch3d.setShowAllModels(showAllModels);
      sketch3d.setEditorRenderHook(editorRenderHook);

      buildHudDom();
      rootEl.style.display = '';
      rebuildPathAndNodeVisuals();
      renderHudStructure();
      bindCanvasListeners();
      sketch3d.requestRender();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      dragState = null;
      keysDown.clear();
      if (navTimer) {
        clearInterval(navTimer);
        navTimer = null;
      }
      unbindCanvasListeners();
      document.body.classList.remove('mc-editor-active');
      if (editorGroup.parent === scene) scene.remove(editorGroup);
      sketch3d.setEditorRenderHook(null);
      sketch3d.setShowAllModels(false);
      sketch3d.setEditMode(false);
      if (rootEl) rootEl.style.display = 'none';
      sketch3d.refreshAudit();
      sketch3d.requestRender();
    }

    function destroy() {
      destroyed = true;
      close();
      if (rootEl && rootEl.parentNode) rootEl.remove();
      rootEl = null;
      if (window.__MIC_CHECK_EDITOR_API__ === api) {
        delete window.__MIC_CHECK_EDITOR_API__;
      }
    }

    const api = {
      open,
      close,
      toggle: () => (isOpen ? close() : open()),
      isOpen: () => isOpen,
      setViewMode,
      selectModel,
      selectKeyframe,
      insertKeyframeAtCurrentAge,
      captureViewIntoKeyframe,
      deleteSelectedKeyframe,
      rebuildVisuals: () => {
        rebuildPathAndNodeVisuals();
        renderHudStructure();
      },
      destroy,
    };

    window.__MIC_CHECK_EDITOR_API__ = api;
    if (opts.initialOpen) open();
    return api;
  }

  window.MicCheckEditor = { attach };
})();
