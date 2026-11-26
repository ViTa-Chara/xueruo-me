(() => {
  'use strict';

  // =========================================================================
  // MIC CHECK — ZERO-DEPENDENCY NATIVE GLB 2.0 WHITE-MODEL LOADER
  // Loads all 15 items/lowpoly/**/*.glb meshes into normalized, merged,
  // UV-ready THREE.BufferGeometries (centered in XZ, base y=0, maxDim=1.0).
  // =========================================================================

  const geoCache = new Map();
  const pendingPromises = new Map();

  function safeUrl(raw) {
    try { return encodeURI(decodeURI(raw)); } catch (_) { return encodeURI(raw); }
  }

  function readAccessor(gltf, binView, accIdx) {
    const acc = gltf.accessors[accIdx];
    if (!acc) return null;
    const bv = gltf.bufferViews[acc.bufferView];
    if (!bv) return null;

    const compSizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
    const typeCounts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
    const numComp = typeCounts[acc.type] || 1;
    const compSize = compSizes[acc.componentType] || 4;
    const elemBytes = numComp * compSize;
    const stride = bv.byteStride && bv.byteStride >= elemBytes ? bv.byteStride : elemBytes;
    const baseOff = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const count = acc.count;

    const out = acc.componentType === 5126
      ? new Float32Array(count * numComp)
      : new Uint32Array(count * numComp);

    for (let i = 0; i < count; i++) {
      const rowOff = baseOff + i * stride;
      for (let c = 0; c < numComp; c++) {
        const off = rowOff + c * compSize;
        if (acc.componentType === 5126) out[i * numComp + c] = binView.getFloat32(off, true);
        else if (acc.componentType === 5123) out[i * numComp + c] = binView.getUint16(off, true);
        else if (acc.componentType === 5125) out[i * numComp + c] = binView.getUint32(off, true);
        else if (acc.componentType === 5121) out[i * numComp + c] = binView.getUint8(off);
        else if (acc.componentType === 5122) out[i * numComp + c] = binView.getInt16(off, true);
        else out[i * numComp + c] = binView.getInt8(off);
      }
    }
    return out;
  }

  function parseGlbBuffer(THREE, arrayBuffer) {
    const dv = new DataView(arrayBuffer);
    if (dv.getUint32(0, true) !== 0x46546c67) {
      throw new Error('Invalid GLB header');
    }
    let offset = 12;
    let gltf = null;
    let binStart = 0;
    let binLen = 0;
    while (offset + 8 <= arrayBuffer.byteLength) {
      const chunkLen = dv.getUint32(offset, true);
      const chunkType = dv.getUint32(offset + 4, true);
      const chunkDataOff = offset + 8;
      if (chunkType === 0x4e4f534a) {
        const txt = new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer, chunkDataOff, chunkLen));
        gltf = JSON.parse(txt);
      } else if (chunkType === 0x004e4942) {
        binStart = chunkDataOff;
        binLen = chunkLen;
      }
      offset = chunkDataOff + chunkLen;
    }
    if (!gltf || !binLen) throw new Error('Incomplete GLB chunks');
    const binView = new DataView(arrayBuffer, binStart, binLen);

    const nodes = gltf.nodes || [];
    const meshes = gltf.meshes || [];
    const sceneDef = (gltf.scenes && gltf.scenes[gltf.scene || 0]) || { nodes: nodes.length ? [0] : [] };

    const posList = [];
    const nrmList = [];
    const uvList = [];

    const vPos = new THREE.Vector3();
    const vNrm = new THREE.Vector3();
    const nrmMat = new THREE.Matrix3();

    function nodeLocalMatrix(nd) {
      const m = new THREE.Matrix4();
      if (nd.matrix && nd.matrix.length === 16) {
        m.fromArray(nd.matrix);
        return m;
      }
      const t = nd.translation ? new THREE.Vector3(nd.translation[0], nd.translation[1], nd.translation[2]) : new THREE.Vector3();
      const q = nd.rotation ? new THREE.Quaternion(nd.rotation[0], nd.rotation[1], nd.rotation[2], nd.rotation[3]) : new THREE.Quaternion();
      const s = nd.scale ? new THREE.Vector3(nd.scale[0], nd.scale[1], nd.scale[2]) : new THREE.Vector3(1, 1, 1);
      m.compose(t, q, s);
      return m;
    }

    function visitNode(nodeIdx, parentMat) {
      const nd = nodes[nodeIdx];
      if (!nd) return;
      const worldMat = parentMat.clone().multiply(nodeLocalMatrix(nd));
      if (typeof nd.mesh === 'number' && meshes[nd.mesh]) {
        const meshDef = meshes[nd.mesh];
        nrmMat.getNormalMatrix(worldMat);
        const prims = meshDef.primitives || [];
        for (let p = 0; p < prims.length; p++) {
          const pr = prims[p];
          if (pr.mode !== undefined && pr.mode !== 4) continue;
          const posAcc = pr.attributes && pr.attributes.POSITION;
          if (posAcc === undefined) continue;
          const rawPos = readAccessor(gltf, binView, posAcc);
          if (!rawPos) continue;
          const rawNrm = pr.attributes.NORMAL !== undefined ? readAccessor(gltf, binView, pr.attributes.NORMAL) : null;
          const rawUv = pr.attributes.TEXCOORD_0 !== undefined ? readAccessor(gltf, binView, pr.attributes.TEXCOORD_0) : null;
          const idxArr = pr.indices !== undefined ? readAccessor(gltf, binView, pr.indices) : null;

          const triCount = idxArr ? idxArr.length : (rawPos.length / 3);
          for (let k = 0; k < triCount; k++) {
            const vi = idxArr ? idxArr[k] : k;
            vPos.set(rawPos[vi * 3], rawPos[vi * 3 + 1], rawPos[vi * 3 + 2]).applyMatrix4(worldMat);
            posList.push(vPos.x, vPos.y, vPos.z);

            if (rawNrm) {
              vNrm.set(rawNrm[vi * 3], rawNrm[vi * 3 + 1], rawNrm[vi * 3 + 2]).applyMatrix3(nrmMat).normalize();
              nrmList.push(vNrm.x, vNrm.y, vNrm.z);
            } else {
              nrmList.push(0, 1, 0);
            }

            if (rawUv) {
              uvList.push(rawUv[vi * 2], rawUv[vi * 2 + 1]);
            } else {
              uvList.push(NaN, NaN);
            }
          }
        }
      }
      if (nd.children && nd.children.length) {
        for (let c = 0; c < nd.children.length; c++) visitNode(nd.children[c], worldMat);
      }
    }

    const identity = new THREE.Matrix4();
    const rootNodes = sceneDef.nodes || [];
    for (let i = 0; i < rootNodes.length; i++) visitNode(rootNodes[i], identity);

    const geo = new THREE.BufferGeometry();
    const posArr = new Float32Array(posList);
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));

    // Normalize geometry: center XZ at 0, place base at y = 0, scale largest dimension to 1.0
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (bb) {
      const sizeX = bb.max.x - bb.min.x;
      const sizeY = bb.max.y - bb.min.y;
      const sizeZ = bb.max.z - bb.min.z;
      const maxDim = Math.max(0.0001, sizeX, sizeY, sizeZ);
      const cx = (bb.min.x + bb.max.x) * 0.5;
      const minY = bb.min.y;
      const cz = (bb.min.z + bb.max.z) * 0.5;
      for (let i = 0; i < posArr.length; i += 3) {
        posArr[i] = (posArr[i] - cx) / maxDim;
        posArr[i + 1] = (posArr[i + 1] - minY) / maxDim;
        posArr[i + 2] = (posArr[i + 2] - cz) / maxDim;
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
    }

    geo.computeVertexNormals();

    // Generate seamless, full-bleed [0..1]x[0..1] per-triangle bounding-box tri-planar UVs
    // so EVERY photo texture stretches edge-to-edge tightly across the entire 3D model surface
    // with ZERO UV island gaps, ZERO blank margins, and ZERO bare model peeking through!
    const b2 = geo.boundingBox;
    const minX = b2 ? b2.min.x : -0.5;
    const minY2 = b2 ? b2.min.y : 0.0;
    const minZ = b2 ? b2.min.z : -0.5;
    const spanX = b2 ? Math.max(1e-4, b2.max.x - b2.min.x) : 1.0;
    const spanY = b2 ? Math.max(1e-4, b2.max.y - b2.min.y) : 1.0;
    const spanZ = b2 ? Math.max(1e-4, b2.max.z - b2.min.z) : 1.0;

    const vertCount = posArr.length / 3;
    const uvArr = new Float32Array(vertCount * 2);
    const e1 = new THREE.Vector3();
    const e2 = new THREE.Vector3();
    const fn = new THREE.Vector3();

    for (let v = 0; v + 2 < vertCount; v += 3) {
      const i0 = v * 3, i1 = (v + 1) * 3, i2 = (v + 2) * 3;
      e1.set(posArr[i1] - posArr[i0], posArr[i1 + 1] - posArr[i0 + 1], posArr[i1 + 2] - posArr[i0 + 2]);
      e2.set(posArr[i2] - posArr[i0], posArr[i2 + 1] - posArr[i0 + 1], posArr[i2 + 2] - posArr[i0 + 2]);
      fn.crossVectors(e1, e2);
      const ax = Math.abs(fn.x), ay = Math.abs(fn.y), az = Math.abs(fn.z);
      const plane = (ay >= ax && ay >= az) ? 1 : (ax >= ay && ax >= az ? 0 : 2);

      for (let k = 0; k < 3; k++) {
        const vi = v + k;
        const px = posArr[vi * 3];
        const py = posArr[vi * 3 + 1];
        const pz = posArr[vi * 3 + 2];
        if (plane === 1) {
          uvArr[vi * 2]     = (px - minX) / spanX;
          uvArr[vi * 2 + 1] = (pz - minZ) / spanZ;
        } else if (plane === 0) {
          uvArr[vi * 2]     = (pz - minZ) / spanZ;
          uvArr[vi * 2 + 1] = (py - minY2) / spanY;
        } else {
          uvArr[vi * 2]     = (px - minX) / spanX;
          uvArr[vi * 2 + 1] = (py - minY2) / spanY;
        }
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    return geo;
  }

  function loadGeometry(THREE, rawUrl) {
    const url = safeUrl(rawUrl);
    if (geoCache.has(url)) return Promise.resolve(geoCache.get(url));
    if (pendingPromises.has(url)) return pendingPromises.get(url);

    const p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
        return r.arrayBuffer();
      })
      .then((buf) => {
        const geo = parseGlbBuffer(THREE, buf);
        geoCache.set(url, geo);
        pendingPromises.delete(url);
        return geo;
      })
      .catch((err) => {
        console.warn('[mic-check-glb] Failed loading', rawUrl, err);
        pendingPromises.delete(url);
        return null;
      });
    pendingPromises.set(url, p);
    return p;
  }

  const ALL_LOWPOLY_URLS = [
    './items/lowpoly/安徽板面/ramen.glb',
    './items/lowpoly/金属锁链/chain.glb',
    './items/lowpoly/羽毛球/shuttlecock.glb',
    './items/lowpoly/羽毛球/racket.glb',
    './items/lowpoly/鲸鱼/whale.glb',
    './items/lowpoly/夜来香/night-jasmine.glb',
    './items/lowpoly/洋葱/onion.glb',
    './items/lowpoly/鲨鱼/shark.glb',
    './items/lowpoly/猫/cat.glb',
    './items/lowpoly/我的世界/stone.glb',
    './items/lowpoly/我的世界/tree.glb',
    './items/lowpoly/我的世界/dirt-grass.glb',
    './items/lowpoly/我的世界/wood.glb',
    './items/lowpoly/火烈鸟/flamingo.glb',
    './items/lowpoly/啤酒/beer-mug.glb',
  ];

  function preloadAll(THREE) {
    return Promise.all(ALL_LOWPOLY_URLS.map((u) => loadGeometry(THREE, u)));
  }

  window.MicCheckGLB = { loadGeometry, preloadAll, ALL_LOWPOLY_URLS };
})();
