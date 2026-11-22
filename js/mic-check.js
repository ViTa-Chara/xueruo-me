(() => {
  'use strict';

  const CHAIN_PROBABILITY = 0.35;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;

  let audioCtx = null;
  const bufferCache = new Map();
  const pendingLoads = new Map();
  let currentVoice = null;

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
    cropEl.style.width = Math.round(imgMeta.bw * scale) + 'px';
    cropEl.style.height = Math.round(imgMeta.bh * scale) + 'px';
    imgEl.style.width = Math.round(imgMeta.w * scale) + 'px';
    imgEl.style.height = Math.round(imgMeta.h * scale) + 'px';
    imgEl.style.left = -Math.round(imgMeta.x0 * scale) + 'px';
    imgEl.style.top = -Math.round(imgMeta.y0 * scale) + 'px';
  }

  function stopCurrent() {
    if (!currentVoice) return;
    const v = currentVoice;
    currentVoice = null;
    if (v.raf) cancelAnimationFrame(v.raf);
    if (v.handoverTimer) clearTimeout(v.handoverTimer);
    if (v.scheduledNext && v.scheduledNext.src) {
      try { v.scheduledNext.src.stop(); } catch {}
    }
    if (audioCtx && v.gain && v.src) {
      const now = audioCtx.currentTime;
      try {
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setValueAtTime(v.gain.value, now);
        v.gain.gain.linearRampToValueAtTime(0.0001, now + 0.025);
        v.src.stop(now + 0.03);
      } catch {}
    }
  }

  function ensureInViewQuietly(entry) {
    const rect = entry.slot.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.bottom < 0 || rect.top > vh) {
      entry.slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function startVoice(entry, src, gain, startAt, dur, isChained, linearGain) {
    const ac = ensureAudio();
    const waypoints = buildWaypoints(entry);

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
      scheduledNext: null,
      handedOver: false,
    };
    currentVoice = voice;

    // Preload next phrase immediately so either manual click or 35% chain has 0ms gap
    const nextEntry = entries[entry.order + 1];
    if (nextEntry) {
      const willChain = Math.random() < CHAIN_PROBABILITY;
      const bufPromise = loadBuffer(nextEntry.phrase.audio);

      if (willChain) {
        bufPromise
          .then((nextBuf) => {
            if (currentVoice !== voice || voice.handedOver) return;

            const origGap = nextEntry.phrase.startSec - entry.phrase.endSec;
            const isContiguous = origGap <= 0.05;
            const overlap = isContiguous ? 0.036 : 0.008;
            const targetStart = Math.max(ac.currentTime + 0.005, startAt + dur - overlap);

            const nextSrc = ac.createBufferSource();
            nextSrc.buffer = nextBuf;
            const nextGain = ac.createGain();
            const nextLinear = Math.pow(10, (nextEntry.phrase.gainDb || 0) / 20);
            if (isContiguous && Math.abs(nextLinear - linearGain) > 0.05) {
              // Ramp smoothly from previous phrase's gain so contiguous splices have zero loudness step
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
          .catch(() => {});
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

      if (voice.scheduledNext && now >= voice.scheduledNext.startAt) {
        handoverToNext(voice);
        return;
      }

      const progress = clamp((now - startAt) / dur, 0, 1);
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

      if (progress < 1 || voice.scheduledNext) {
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
      currentVoice = null;
    };
  }

  async function playEntry(entry) {
    stopCurrent();
    const ac = ensureAudio();

    let buf;
    try {
      buf = await loadBuffer(entry.phrase.audio);
    } catch {
      return;
    }

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
          }
        });
      },
      { rootMargin: '80px 0px -40px 0px', threshold: 0.06 }
    );
    entries.forEach((e) => obs.observe(e.slot));
  }

  window.addEventListener('resize', () => {
    entries.forEach((e) => layoutCrop(e.imgMeta, e.crop, e.img));
  });

  fetch('./data/mic_check_stage.json')
    .then((r) => r.json())
    .then(build);
})();
