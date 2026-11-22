(() => {
  'use strict';

  const CHAIN_PROBABILITY = 0.35;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;

  let audioCtx = null;
  const bufferCache = new Map();
  const pendingLoads = new Map();
  let currentVoice = null;
  let finaleStarted = false;
  let finalePreloaded = false;

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

  // =========================================================================
  // DRUM DROP PHYSICS: all objects gain gravity + real 2D rigid-body collisions,
  // tumble straight off the bottom edge of the viewport, leaving pure #000000 black
  // =========================================================================
  function triggerDrumDrop() {
    if (finaleStarted) return;
    finaleStarted = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const layer = document.createElement('div');
    layer.className = 'physics-layer';

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

    // Closest above-viewport items fall first so the whole exhibition rains through and collides
    aboveList.sort((a, b) => b.cy - a.cy);

    const bodies = [];

    function spawnBody(info, x, y, vx, vy, omega) {
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

      const radius = Math.max(36, 0.43 * Math.sqrt(boxW * boxH));
      const mass = Math.max(0.65, (boxW * boxH) / (155 * 155));

      const body = {
        el: wrap,
        x,
        y,
        vx,
        vy,
        theta: 0,
        omega,
        r: radius,
        m: mass,
        invM: 1 / mass,
        halfW: boxW * 0.5,
        halfH: boxH * 0.5,
      };
      wrap.style.transform = `translate3d(${(x - body.halfW).toFixed(1)}px, ${(y - body.halfH).toFixed(1)}px, 0)`;
      bodies.push(body);
    }

    // Spawn on-screen items at their EXACT pixel coordinates (zero jump!)
    // Bottom-most item gets a crisp drum-impact pop so upper falling items collide right on screen
    visibleList.sort((a, b) => b.cy - a.cy);
    visibleList.forEach((info, idx) => {
      const isLowest = idx === 0;
      const vx = (vw * 0.5 - info.cx) * 0.22 + (Math.random() - 0.5) * 90;
      const vy = isLowest ? -240 - Math.random() * 80 : 60 + idx * 95;
      const omega = (Math.random() - 0.5) * 2.2;
      spawnBody(info, info.cx, info.cy, vx, vy, omega);
    });

    // Cascade all items from above straight into the viewport so they clash & tumble together
    let dropCursorY = -95;
    aboveList.forEach((info) => {
      const startX = clamp(info.cx + (Math.random() - 0.5) * 70, info.boxW * 0.5 + 16, vw - info.boxW * 0.5 - 16);
      const startY = dropCursorY;
      dropCursorY -= 72 + Math.random() * 44;
      const vx = (Math.random() - 0.5) * 160;
      const vy = 220 + Math.random() * 240;
      const omega = (Math.random() - 0.5) * 2.8;
      spawnBody(info, startX, startY, vx, vy, omega);
    });

    document.body.appendChild(layer);
    document.documentElement.classList.add('blackout');
    document.body.classList.add('blackout');

    const GRAVITY = 2350;
    const RESTITUTION = 0.54;
    const FRICTION = 0.26;
    const SUBSTEPS = 4;

    let lastTs = performance.now();

    function simulate(now) {
      const rawDt = Math.min(0.033, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const dt = rawDt / SUBSTEPS;

      for (let s = 0; s < SUBSTEPS; s++) {
        // 1. Integrate gravity & velocity
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i];
          b.vy += GRAVITY * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.theta += b.omega * dt;

          // Keep collisions inside left/right walls; NO bottom floor!
          if (b.x - b.r < 0) {
            b.x = b.r;
            if (b.vx < 0) {
              b.vx = -b.vx * 0.48;
              b.omega += b.vy * 0.0012;
            }
          } else if (b.x + b.r > vw) {
            b.x = vw - b.r;
            if (b.vx > 0) {
              b.vx = -b.vx * 0.48;
              b.omega -= b.vy * 0.0012;
            }
          }
        }

        // 2. Pairwise 2D rigid-body collisions with impulse & spin transfer
        for (let i = 0; i < bodies.length; i++) {
          const a = bodies[i];
          for (let j = i + 1; j < bodies.length; j++) {
            const b = bodies[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const minDist = a.r + b.r;
            const distSq = dx * dx + dy * dy;
            if (distSq >= minDist * minDist || distSq < 0.0001) continue;

            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;

            // Positional correction
            const invSum = a.invM + b.invM;
            const sep = overlap / invSum;
            a.x -= nx * sep * a.invM;
            a.y -= ny * sep * a.invM;
            b.x += nx * sep * b.invM;
            b.y += ny * sep * b.invM;

            // Relative velocity along normal
            const rvx = b.vx - a.vx;
            const rvy = b.vy - a.vy;
            const velNormal = rvx * nx + rvy * ny;
            if (velNormal > 0) continue;

            const jImp = (-(1 + RESTITUTION) * velNormal) / invSum;
            const ix = jImp * nx;
            const iy = jImp * ny;
            a.vx -= ix * a.invM;
            a.vy -= iy * a.invM;
            b.vx += ix * b.invM;
            b.vy += iy * b.invM;

            // Tangential impulse -> natural tumbling rotation
            const tx = -ny;
            const ty = nx;
            const velTan = rvx * tx + rvy * ty;
            const jt = clamp(-velTan / invSum, -jImp * FRICTION, jImp * FRICTION);
            a.vx -= jt * tx * a.invM;
            a.vy -= jt * ty * a.invM;
            b.vx += jt * tx * b.invM;
            b.vy += jt * ty * b.invM;

            const spin = (jt / Math.max(40, minDist)) * 0.07;
            a.omega -= spin * a.invM * 12;
            b.omega += spin * b.invM * 12;
          }
        }
      }

      // Render & check if every single object has dropped past bottom edge
      let anyStillVisible = false;
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        b.el.style.transform = `translate3d(${(b.x - b.halfW).toFixed(1)}px, ${(b.y - b.halfH).toFixed(1)}px, 0) rotate(${b.theta.toFixed(3)}rad)`;
        if (b.y - b.r < vh + 180) {
          anyStillVisible = true;
        }
      }

      if (anyStillVisible) {
        requestAnimationFrame(simulate);
      } else {
        layer.remove();
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
