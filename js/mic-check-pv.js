(() => {
  'use strict';

  let pvDataCache = null;
  let pvDataPromise = null;
  const loadedImgUrls = new Set();
  const queuedImgUrls = new Set();
  const decodedImgCache = new Map();

  function fetchJsonWithRetry(url, retries) {
    const maxRetries = typeof retries === 'number' ? retries : 3;
    let attempt = 0;
    function run() {
      return fetch(url).then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).catch((err) => {
        if (attempt < maxRetries) {
          attempt++;
          return new Promise((res) => setTimeout(res, 180 * attempt)).then(run);
        }
        throw err;
      });
    }
    return run();
  }

  function loadPvData() {
    if (pvDataCache) return Promise.resolve(pvDataCache);
    if (pvDataPromise) return pvDataPromise;
    pvDataPromise = fetchJsonWithRetry('./data/mic_check_pv.json', 3)
      .then((d) => {
        pvDataCache = d;
        return d;
      })
      .catch((err) => {
        pvDataPromise = null;
        throw err;
      });
    return pvDataPromise;
  }

  // All 100%-opaque real project screenshots & visual plates used across the 4 monitors
  const PORTFOLIO_ASSETS = [
    './assets/portfolio/akplugins/effect-akvibeglow-bars.jpg',
    './assets/portfolio/akplugins/effect-akprogblur.jpg',
    './assets/portfolio/akplugins/effect-akglass.jpg',
    './assets/portfolio/akplugins/sketch-after-effects.jpg',
    './assets/portfolio/satoinput/satoinput-macro-shift.jpg',
    './assets/portfolio/satoinput/satoinput-skin-obsidian.jpg',
    './assets/portfolio/satoinput/satoinput-drawer-caustics.jpg',
    './assets/portfolio/satoinput/satoinput-skin-glass.jpg',
    './assets/portfolio/hifishifter/preview.png',
  ];

  // Attach automatic retry on any live <img> element so transient connection limits never leave blank images!
  function attachImgWithRetry(img, url, retries) {
    const maxRetries = typeof retries === 'number' ? retries : 3;
    let attempts = 0;
    img.onerror = () => {
      if (attempts < maxRetries) {
        attempts++;
        const sep = url.indexOf('?') >= 0 ? '&' : '?';
        setTimeout(() => {
          img.src = url + sep + '_r=' + attempts;
        }, 200 * attempts);
      }
    };
    img.src = url;
    return img;
  }

  let preloadQueueRunning = false;
  const highPriorityQueue = [];
  const normalPriorityQueue = [];

  function safeEncodeUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
      return encodeURI(decodeURI(rawUrl));
    } catch (_) {
      return encodeURI(rawUrl);
    }
  }

  function enqueueImg(rawUrl, highPriority) {
    if (!rawUrl) return;
    const url = safeEncodeUrl(rawUrl);
    if (loadedImgUrls.has(url) || queuedImgUrls.has(url)) return;
    queuedImgUrls.add(url);
    if (highPriority) highPriorityQueue.push({ url, tries: 0 });
    else normalPriorityQueue.push({ url, tries: 0 });
    pumpPreloadQueue();
  }

  // Priority-tiered resilient preloader (max 5 concurrent sockets, automatic 3x retry + decode()!)
  function pumpPreloadQueue() {
    if (preloadQueueRunning) return;
    preloadQueueRunning = true;
    let inFlight = 0;
    const MAX_CONCURRENT = 5;

    function popNext() {
      if (highPriorityQueue.length > 0) return highPriorityQueue.shift();
      if (normalPriorityQueue.length > 0) return normalPriorityQueue.shift();
      return null;
    }

    function next() {
      while (inFlight < MAX_CONCURRENT) {
        const job = popNext();
        if (!job) break;
        inFlight++;
        const im = new Image();
        im.decoding = 'async';
        const finish = (ok) => {
          inFlight--;
          if (ok) {
            loadedImgUrls.add(job.url);
            decodedImgCache.set(job.url, im);
            if (typeof im.decode === 'function') im.decode().catch(() => {});
          } else if (job.tries < 3) {
            job.tries++;
            setTimeout(() => {
              normalPriorityQueue.push(job);
              pumpPreloadQueue();
            }, 260 * job.tries);
          } else {
            queuedImgUrls.delete(job.url);
          }
          next();
        };
        im.onload = () => finish(true);
        im.onerror = () => finish(false);
        const sep = job.url.indexOf('?') >= 0 ? '&' : '?';
        im.src = job.tries > 0 ? (job.url + sep + '_r=' + job.tries) : job.url;
      }
      if (inFlight === 0 && highPriorityQueue.length === 0 && normalPriorityQueue.length === 0) {
        preloadQueueRunning = false;
      }
    }
    next();
  }

  function preload() {
    // Tier 0 (critical): portal bezel + portfolio showcase plates
    enqueueImg('./items/screens/016_cutout.png', true);
    PORTFOLIO_ASSETS.forEach((u) => enqueueImg(u, true));
    return loadPvData()
      .then((d) => {
        // Tier 0 (critical): all 4 hero monitor frames
        Object.values(d.monitors || {}).forEach((m) => enqueueImg(m.src, true));
        // Tier 1 (background): real-photo road textures, non-human signals/signs/houses & street props
        const a = d.assets || {};
        (a.roadTextures || []).forEach((x) => enqueueImg(x.src, false));
        (a.signalsClean || a.signals || []).forEach((x) => enqueueImg(x.src, false));
        (a.cars || []).forEach((x) => enqueueImg(x.src, false));
        (a.poles || []).forEach((x) => enqueueImg(x.src, false));
        (a.housesLow || []).forEach((x) => enqueueImg(x.src, false));
        (a.signsClean || a.signs || []).forEach((x) => enqueueImg(x.src, false));
        (a.concreteTextures || []).forEach((x) => enqueueImg(x.src, false));
        (a.brickTextures || []).forEach((x) => enqueueImg(x.src, false));
        (a.archTextures || []).forEach((x) => enqueueImg(x.src, false));
        (a.towerThemes || []).forEach((th) => (th.items || []).forEach((x) => enqueueImg(x.src, false)));
        (a.buildings || []).forEach((x) => enqueueImg(x.src, false));
        (a.streets || []).forEach((x) => enqueueImg(x.src, false));
        (a.screens || []).slice(0, 24).forEach((x) => enqueueImg(x.src, false));
        return d;
      })
      .catch(() => null);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInCubic(t) {
    return t * t * t;
  }

  function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // =========================================================================
  // EXACT 4-CORNER CSS MATRIX3D HOMOGRAPHY (for perspective monitor 006_cutout)
  // Maps rectangle (0,0)-(w,0)-(w,h)-(0,h) -> 4 destination pixel corners
  // =========================================================================
  function solveLinear8(A, b) {
    const n = 8;
    const M = A.map((row, i) => row.slice().concat(b[i]));
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) maxRow = r;
      }
      [M[col], M[maxRow]] = [M[maxRow], M[col]];
      const piv = M[col][col] || 1e-12;
      for (let c = col; c <= n; c++) M[col][c] /= piv;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const f = M[r][col];
        for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
      }
    }
    return M.map((row) => row[n]);
  }

  function computeQuadMatrix3d(srcW, srcH, dstQuad) {
    const src = [[0, 0], [srcW, 0], [srcW, srcH], [0, srcH]];
    const A = [];
    const b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i];
      const [u, v] = dstQuad[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
      b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
      b.push(v);
    }
    const [h11, h12, h13, h21, h22, h23, h31, h32] = solveLinear8(A, b);
    // Column-major 4x4 CSS matrix3d
    const m = [
      h11, h21, 0, h31,
      h12, h22, 0, h32,
      0,   0,   1, 0,
      h13, h23, 0, 1,
    ];
    return `matrix3d(${m.map((v) => v.toFixed(7)).join(',')})`;
  }

  // =========================================================================
  // SVG EDGE-TO-EDGE ULTRA-THIN SONGTI ANCHOR CELL GENERATOR
  // Fills 100% of its rectangular cell with pure #ffffff thin Songti, ZERO gaps
  // =========================================================================
  function fitCell(text, vbW, vbH, fontSize, baselineY) {
    const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fs = fontSize || Math.round(vbH * 0.96);
    const by = baselineY || Math.round(vbH * 0.84);
    return `<div class="m-fit"><svg viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="none" aria-hidden="true"><text x="0" y="${by}" font-size="${fs}" textLength="${vbW}" lengthAdjust="spacingAndGlyphs">${safe}</text></svg></div>`;
  }

  function imgCell(src, cls) {
    return `<div class="m-img ${cls || ''}"><img src="${src}" alt="" decoding="async"></div>`;
  }

  // =========================================================================
  // 4 ZERO-GAP, ZERO-OVERLAP PURE-WHITE ULTRA-THIN SONGTI MOSAIC SCREENS
  // ZERO overlaid text on images · ZERO transparency scrims · ZERO BPM jitter
  // =========================================================================

  function createAkPluginsScreen() {
    const el = document.createElement('div');
    el.className = 'm-screen m-screen-16x9';
    el.style.gridTemplateRows = '118px 264px 136px';
    el.innerHTML = `
      <div class="m-row" style="grid-template-columns: 1.46fr 1fr;">
        ${fitCell('AKPLUGINS', 560, 118, 128, 104)}
        ${fitCell('光学与纸痕', 380, 118, 108, 98)}
      </div>

      <div class="m-row" style="grid-template-columns: 1.02fr 1.02fr 1.18fr;">
        <div class="m-col" style="grid-template-rows: 156px 52px 46px;">
          ${imgCell('./assets/portfolio/akplugins/effect-akvibeglow-bars.jpg')}
          ${fitCell('ONE PLUGIN', 300, 52, 54, 44)}
          ${fitCell('AFTER EFFECTS GPU', 300, 46, 44, 38)}
        </div>

        <div class="m-col" style="grid-template-rows: 1fr 1fr;">
          ${imgCell('./assets/portfolio/akplugins/effect-akprogblur.jpg')}
          ${imgCell('./assets/portfolio/akplugins/effect-akglass.jpg')}
        </div>

        <div class="m-col" style="grid-template-rows: 42px 42px 42px 1fr;">
          ${fitCell('液态折射 AKGLASS', 340, 42, 38, 35)}
          ${fitCell('渐进散景 AKPROGBLUR', 340, 42, 38, 35)}
          ${fitCell('物理辉光 AKVIBEGLOW', 340, 42, 38, 35)}
          <div class="m-prose">原生 GPU 光学着色器套件，把手绘纸痕与真实镜头物理光学装进同一个 After Effects 插件。液态玻璃表面折射、可调焦平面渐进散景模糊、物理能量衰减辉光与色散，支持实时交互预览与高精度浮点管线，让数字影像回到真实的光学现场。ANGLER KIKAI PLUGINS.</div>
        </div>
      </div>

      <div class="m-row" style="grid-template-columns: 205px 1fr;">
        ${imgCell('./assets/portfolio/akplugins/sketch-after-effects.jpg')}
        <div class="m-col" style="grid-template-rows: 48px 1fr;">
          ${fitCell('ANGLER KIKAI VISUAL SUITE · OPTICAL SHADERS', 735, 48, 44, 40)}
          <div class="m-prose md">基于原生着色器实时渲染，以克制凌厉的影像语法替代廉价预设滤镜；从铅笔草稿、手绘标志结构到最终合成输出，贯穿液态玻璃折射、渐进光学散景与物理色散辉光全链路。LIQUID GLASS REFRACTION · PROGRESSIVE BOKEH · PHYSICAL VIBEGLOW · REAL-TIME NATIVE AFTER EFFECTS GPU PIPELINE · ONE PLUGIN ARCHITECTURE FOR MOTION DESIGNERS AND EXPERIMENTAL ANIMATION.</div>
        </div>
      </div>
    `;
    return { el, w: 960, h: 540 };
  }

  function createSatoInputScreen() {
    const el = document.createElement('div');
    el.className = 'm-screen m-screen-16x9';
    el.style.gridTemplateRows = '118px 264px 136px';
    el.innerHTML = `
      <div class="m-row" style="grid-template-columns: 1.50fr 1fr;">
        ${fitCell('SATOINPUT', 566, 118, 128, 104)}
        ${fitCell('小撒输入法', 376, 118, 108, 98)}
      </div>

      <div class="m-row" style="grid-template-columns: 1.08fr 1.02fr 1.02fr;">
        <div class="m-col" style="grid-template-rows: 74px 40px 1fr;">
          ${fitCell('键落即译', 325, 74, 76, 65)}
          ${fitCell('RUST 共享核心 SATO-CORE', 325, 40, 34, 33)}
          <div class="m-prose sm">跨平台实时翻译输入法。核心输入缓冲、罗马音与 2-Beolsik 韩文转写、俄语语音转写、内嵌词库 Viterbi 拼音转简体中文、专有名词保护与 DeepSeek SSE 流式解析全部下沉至纯 Rust 核心，macOS 原生 Liquid Glass 与 Windows Direct2D 双端 1:1 对齐，停键即休眠至零额外唤醒。</div>
        </div>

        <div class="m-col" style="grid-template-rows: 1fr 1fr;">
          ${imgCell('./assets/portfolio/satoinput/satoinput-macro-shift.jpg')}
          ${imgCell('./assets/portfolio/satoinput/satoinput-skin-obsidian.jpg')}
        </div>

        <div class="m-col" style="grid-template-rows: 134px 38px 42px 35px;">
          ${imgCell('./assets/portfolio/satoinput/satoinput-drawer-caustics.jpg')}
          ${fitCell('OHAYOU → おはよう → 早上好', 308, 38, 30, 31)}
          ${fitCell('SHIFT 瞬时双档切换', 308, 42, 36, 35)}
          ${fitCell('OFFLINE & DEEPSEEK SSE', 308, 35, 32, 29)}
        </div>
      </div>

      <div class="m-row" style="grid-template-columns: 1.30fr 1fr;">
        <div class="m-col" style="grid-template-rows: 46px 1fr;">
          ${fitCell('REAL-TIME TRANSLATION INPUT METHOD', 532, 46, 42, 38)}
          <div class="m-prose">支持英译中、日译中、中译英及韩法德西俄意葡多语种独立离线包按需下载与 SHA-256 校验；轻按 Shift 始终在当前翻译转换与英文直出间瞬时切换，Windows TSF 15ms fail-open 永不阻塞宿主，内置学习、认真、自定义三种风格、八套配色、六款候选窗皮肤与低占用极简模式。RUST FFI · LIQUID GLASS · DIRECT2D.</div>
        </div>
        ${imgCell('./assets/portfolio/satoinput/satoinput-skin-glass.jpg')}
      </div>
    `;
    return { el, w: 960, h: 540 };
  }

  function createSatoBotScreen() {
    const el = document.createElement('div');
    el.className = 'm-screen m-screen-4x3';
    el.style.gridTemplateRows = '126px 302px 150px';
    el.innerHTML = `
      <div class="m-row" style="grid-template-columns: 1.48fr 1fr;">
        ${fitCell('SATOBOT', 456, 126, 134, 111)}
        ${fitCell('AGENT HARNESS', 328, 126, 108, 106)}
      </div>

      <div class="m-row" style="grid-template-columns: 0.96fr 1.16fr;">
        <div class="m-col" style="grid-template-rows: 58px 40px 1fr;">
          ${fitCell('确定性对话编排引擎', 354, 58, 54, 49)}
          ${fitCell('THINK · ACT · OBSERVE LOOP', 354, 40, 34, 33)}
          <div class="m-prose sm">与模型供应商及协议层完全解耦的多步 Agent 运行时与 LLM Harness。将社会意图打分、有界上下文装配、重要度衰减记忆召回、工具调用约束与严格动作链解析下沉为可单测的确定性内核。支持最多六步工具循环、显式沉默门控（&lt;NO_REPLY&gt;）与逐层故障降级，确保复杂群聊环境下的低幻觉与稳定输出。</div>
        </div>

        <div class="m-col" style="grid-template-rows: 162px 135px;">
          <pre class="m-code"># sato_runtime/memory_store.py
RETENTION_DAYS = {1: 3.0, 2: 14.0, 3: 60.0, 4: 180.0, 5: 720.0}
CLEAR_MIN_SCORE, FADED_MIN_SCORE = 0.42, 0.24

def memory_clarity(item: dict, *, score: float, now: float) -&gt; str:
    lifespan = max(1.0, expire - created)
    life_frac = max(0.0, expire - now) / lifespan
    if score &gt;= CLEAR_MIN_SCORE and life_frac &gt;= 0.30:
        return "clear"
    if score &gt;= FADED_MIN_SCORE and life_frac &gt;= 0.08:
        return "faded"
    return "gone"  # local decay eviction</pre>
          <pre class="m-code"># sato_runtime/agent_core.py · llm_harness.py
@dataclass
class AgentRunResult:
    actions: List[Dict[str, Any]]
    declined: bool = False  # explicit &lt;NO_REPLY&gt; gate
    steps_used: int = 0
    tool_trace: List[str]
    obliged_missed: List[str]

# layered_context: summary + bigram recall + thread + verbatim</pre>
        </div>
      </div>

      <div class="m-col" style="grid-template-rows: 42px 1fr;">
        ${fitCell('LAYERED CONTEXT · MEMORY DECAY · OUTPUT GUARD · TRACE', 788, 42, 36, 35)}
        <div class="m-prose md">四层上下文编排（滚动摘要 + CJK 双字召回 + 回复链线程锚定 + 实时原文窗口）替代朴素长历史堆叠；纯本地词面重叠×重要度×新近度三级衰减存储与原子持久化；Output Guard 确定性清洗思维链泄漏、DSML 残留与非法动作链。PROVIDER-AGNOSTIC DETERMINISTIC AGENT HARNESS WITH BOUNDED RECALL, OBLIGATION ENFORCEMENT, REASON-CODE TRACING AND FAIL-SAFE DEGRADATION.</div>
      </div>
    `;
    return { el, w: 800, h: 600 };
  }

  function createHiFiShifterScreen() {
    const el = document.createElement('div');
    el.className = 'm-screen m-screen-16x9';
    el.style.gridTemplateRows = '118px 266px 134px';
    el.innerHTML = `
      <div class="m-row" style="grid-template-columns: 1.62fr 1fr;">
        ${fitCell('HIFISHIFTER', 584, 118, 126, 104)}
        ${fitCell('声线雕塑', 358, 118, 108, 98)}
      </div>

      <div class="m-row" style="grid-template-columns: 1.32fr 1fr;">
        ${imgCell('./assets/portfolio/hifishifter/preview.png', 'pos-daw')}

        <div class="m-col" style="grid-template-rows: 44px 36px 38px 1fr;">
          ${fitCell('人力 VOCALOID 拼调一体', 406, 44, 40, 37)}
          ${fitCell('PC-NSF-HIFIGAN · WORLD · VSLIB', 406, 36, 32, 30)}
          ${fitCell('VST3 · ARA · CLAP 插件', 406, 38, 34, 32)}
          <div class="m-prose sm">图形化人声编辑与合成工作站。类 DAW 多轨时间轴支持音频块裁剪、拉伸、Slip、淡入淡出与交叉淡化、编组、Take 管理、静音检测、波纹编辑、速度映射与录音；以轨道组为单位通过钢琴卷帘精细编辑音高、共振峰偏移、气声音量、张力、动态与声像参数线，支持绘制、直线、颤音预设与多选区联动编辑。</div>
        </div>
      </div>

      <div class="m-row" style="grid-template-columns: 1.36fr 1fr;">
        <div class="m-prose">集成 OpenVPI 歌声特化 PC-NSF-HiFiGAN、WORLD 与 VsLib 三种声码器算法及 hnsep 谐波噪声气声分离；原生支持导入 REAPER（.rpp）与 VocalShifter（.vshp / .vsp）工程并双向读写剪贴板，音视频直接提取音轨、MIDI 与音高线自由互转并导出 WAV / MP3 / FLAC；子轨道可叠加音分差、度数差与共振峰差快速生成和声，独立应用与 REAPER ARA2 插件共享同一套编辑界面，支持多语言与跨平台 GPU 加速推理。</div>

        <div class="m-col" style="grid-template-rows: 1fr 1fr 1fr;">
          ${fitCell('MULTI-TRACK VOCAL TIMELINE', 396, 41, 36, 34)}
          ${fitCell('PIANO-ROLL F0 & FORMANT', 396, 41, 36, 34)}
          ${fitCell('REAPER .RPP & .VSHP INTEROP', 396, 41, 36, 34)}
        </div>
      </div>
    `;
    return { el, w: 960, h: 540 };
  }

  // =========================================================================
  // MAIN PV ENGINE:
  // - Live seamless cut-out portal behind 016_cutout.png (ZERO black curtain!)
  // - 100% VERTICAL one-point 3D street corridor (top->mid->bottom / bottom->mid->top)
  // - Strict side avoidance with Left/Right "啊 啊" tossed fallen objects
  // - 4 Distinct Non-Repeating Monitors locked to exact "Mic Check" downbeats
  //   (Bars 4.1, 6.1, 8.1, 10.1 = every 2 bars, shifted earlier!)
  // =========================================================================

  function start(opts) {
    const getElapsedSec = opts.getElapsedSec;
    const fallenItems = (opts.fallenItems && opts.fallenItems.length) ? opts.fallenItems : [];
    const allItems = (opts.allItems && opts.allItems.length) ? opts.allItems : fallenItems;
    const freezeAt = typeof opts.freezeAt === 'number' ? opts.freezeAt : null;

    let maskEl = null;
    let stageEl = null;
    let pendingPortal = null;
    let alive = true;

    function applyPortal(mEl, sEl, p) {
      if (!mEl || !sEl) return;
      if (!p || p.open) {
        mEl.style.visibility = 'visible';
        mEl.style.clipPath = 'none';
        mEl.style.webkitClipPath = 'none';
        sEl.style.transform = 'translate3d(0px, 0px, 0px) scale(1)';
        return;
      }
      if (p.hidden) {
        mEl.style.visibility = 'hidden';
        mEl.style.clipPath = 'inset(100% 0px 0px 0px)';
        mEl.style.webkitClipPath = 'inset(100% 0px 0px 0px)';
        sEl.style.transform = 'translate3d(0px, 0px, 0px) scale(0.5)';
        return;
      }
      // Clip in exact viewport pixel coordinates on the NON-transformed outer maskEl,
      // while scaling inner stageEl cleanly to match 016_cutout.png's transparent hole!
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const winW = Math.max(1, p.x1 - p.x0);
      const winH = Math.max(1, p.y1 - p.y0);
      const winCx = (p.x0 + p.x1) * 0.5;
      const winCy = (p.y0 + p.y1) * 0.5;
      const scale = clamp(Math.max(winW / vw, winH / vh), 0.1, 1.0);
      const dx = winCx - vw * 0.5;
      const dy = winCy - vh * 0.5;

      const topIn = clamp(p.y0, 0, vh);
      const rightIn = clamp(vw - p.x1, 0, vw);
      const botIn = clamp(vh - p.y1, 0, vh);
      const leftIn = clamp(p.x0, 0, vw);

      const clipStr = `inset(${topIn.toFixed(1)}px ${rightIn.toFixed(1)}px ${botIn.toFixed(1)}px ${leftIn.toFixed(1)}px)`;
      mEl.style.visibility = 'visible';
      mEl.style.clipPath = clipStr;
      mEl.style.webkitClipPath = clipStr;
      sEl.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0px) scale(${scale.toFixed(4)})`;
    }

    const controller = {
      setPortalWindow(p) {
        pendingPortal = p;
        applyPortal(maskEl, stageEl, p);
      },
      destroy() {
        alive = false;
        if (maskEl && maskEl.parentNode) maskEl.remove();
      },
    };

    loadPvData().then((data) => {
      if (!data || !alive) return;
      const mounted = mountScene(data, getElapsedSec, fallenItems, allItems, freezeAt, () => alive, pendingPortal);
      maskEl = mounted.mask;
      stageEl = mounted.stage;
      if (pendingPortal !== null) {
        applyPortal(maskEl, stageEl, pendingPortal);
      }
    });

    return controller;
  }

  function mountScene(data, getElapsedSec, fallenItems, allItems, freezeAt, isAlive, initialPortal) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Exact measured tempo of Cornelius - Mic Check.wav: 101.00 BPM (+-3ms across 16 bars!)
    const BEAT = data.beatSec || (60 / 101.0);
    const BAR = data.barSec || (BEAT * 4);
    const TWO_BARS = BAR * 2; // 4.7525s

    document.documentElement.classList.add('blackout');
    document.body.classList.add('blackout');

    const mask = document.createElement('div');
    mask.className = 'pv-portal-mask';
    if (initialPortal && initialPortal.hidden) {
      mask.style.visibility = 'hidden';
      mask.style.clipPath = 'inset(100% 0px 0px 0px)';
      mask.style.webkitClipPath = 'inset(100% 0px 0px 0px)';
    }

    const root = document.createElement('div');
    root.className = 'pv-stage';
    root.style.transform = 'translate3d(0px, 0px, 0px) scale(1)';

    const corridorLayer = document.createElement('div');
    corridorLayer.className = 'pv-corridor-layer';
    const floorTextLayer = document.createElement('div');
    floorTextLayer.className = 'pv-floor-text-layer';
    const monitorLayer = document.createElement('div');
    monitorLayer.className = 'pv-monitor-layer';
    const tossLayer = document.createElement('div');
    tossLayer.className = 'pv-toss-layer';
    const floodCanvas = document.createElement('canvas');
    floodCanvas.className = 'pv-flood-canvas';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    floodCanvas.width = Math.round(vw * dpr);
    floodCanvas.height = Math.round(vh * dpr);
    const floodCtx = floodCanvas.getContext('2d');
    if (floodCtx) floodCtx.scale(dpr, dpr);

    // Strict stacking: Street (10) -> Floor Text Z=0 homography UNDER monitor (15) -> Monitors (20) -> Tossed (30) -> Flood Climax (40)
    root.appendChild(corridorLayer);
    root.appendChild(floorTextLayer);
    root.appendChild(monitorLayer);
    root.appendChild(tossLayer);
    root.appendChild(floodCanvas);
    mask.appendChild(root);
    document.body.appendChild(mask);

    // ---------------------------------------------------------------------
    // 1. 4 COMPLETELY DISTINCT MONITORS PACED ACROSS ALL 14 BARS (Bar 4 -> Bar 16.4)
    //    Supporting the full street arc right up to Bar 17.1 (+38.02s) "ONE! TWO! THREE! FOUR!"
    //    Spaced every 3 full bars (7.13s) with ~4.8s calm, ultra-readable hero dwell each!
    //    - AKPlugins   (015.png):        Hero center Bar  5.1 (+9.50s), pass +4.94s -> +14.07s
    //    - SatoInput   (001.png):        Hero center Bar  8.1 (+16.63s), pass +12.07s -> +21.20s
    //    - SatoBot     (003.png):        Hero center Bar 11.1 (+23.76s), pass +19.20s -> +28.32s
    //    - HiFiShifter (006_cutout.png): Hero center Bar 14.1 (+30.89s), pass +26.33s -> +35.45s
    // ---------------------------------------------------------------------
    const THREE_BARS = BAR * 3; // 7.1287s
    const MON1_CENTER = BAR * 4; // +9.505s = Bar 5.1
    const showcaseDefs = [
      { id: 'akplugins',   spec: data.monitors.akplugins,   screenBuilder: createAkPluginsScreen,   tCenter: MON1_CENTER },
      { id: 'satoinput',   spec: data.monitors.satoinput,   screenBuilder: createSatoInputScreen,   tCenter: MON1_CENTER + THREE_BARS },
      { id: 'satobot',     spec: data.monitors.satobot,     screenBuilder: createSatoBotScreen,     tCenter: MON1_CENTER + THREE_BARS * 2 },
      { id: 'hifishifter', spec: data.monitors.hifishifter, screenBuilder: createHiFiShifterScreen, tCenter: MON1_CENTER + THREE_BARS * 3 },
    ];

    const monitors = showcaseDefs.map((def) => {
      const m = def.spec;
      const sg = m.screen;
      const swFrac = sg.x1 - sg.x0;
      const shFrac = sg.y1 - sg.y0;
      const scxFrac = (sg.x0 + sg.x1) * 0.5;
      const scyFrac = (sg.y0 + sg.y1) * 0.5;

      const targetScreenW = vw * (vw <= 640 ? 0.84 : 0.72);
      const targetScreenH = vh * (vw <= 640 ? 0.65 : 0.65);
      const monWByW = targetScreenW / swFrac;
      const monWByH = (targetScreenH / shFrac) * m.aspect;
      const baseW = Math.min(monWByW, monWByH);
      const baseH = baseW / m.aspect;

      const scxLocal = baseW * scxFrac;
      const scyLocal = baseH * scyFrac;

      const unitEl = document.createElement('div');
      unitEl.className = 'pv-monitor-unit';
      unitEl.style.width = baseW.toFixed(2) + 'px';
      unitEl.style.height = baseH.toFixed(2) + 'px';
      // Anchor screen center dead-on viewport center (50%, 50%) for pure GPU sub-pixel optical zoom!
      unitEl.style.marginLeft = (-scxLocal).toFixed(2) + 'px';
      unitEl.style.marginTop = (-scyLocal).toFixed(2) + 'px';
      unitEl.style.transformOrigin = `${scxLocal.toFixed(2)}px ${scyLocal.toFixed(2)}px`;

      const frameEl = document.createElement('div');
      frameEl.className = 'pv-monitor-frame' + (m.behindBezel ? ' behind-bezel' : '');

      const photoImg = document.createElement('img');
      photoImg.className = 'pv-monitor-photo';
      photoImg.alt = '';
      photoImg.decoding = 'sync';
      attachImgWithRetry(photoImg, m.src, 3);

      const screenCtrl = def.screenBuilder();
      screenCtrl.el.querySelectorAll('img').forEach((im) => {
        const origSrc = im.getAttribute('src');
        if (origSrc) attachImgWithRetry(im, origSrc, 3);
      });
      const slotEl = document.createElement('div');
      slotEl.className = 'pv-screen-slot';

      if (m.quad && m.behindBezel) {
        // Exact 4-corner perspective warp cleanly behind the cut-out walnut bezel of 006_cutout.png
        const pad = 0.0;
        const dst = [
          [m.quad[0][0] * baseW - pad, m.quad[0][1] * baseH - pad],
          [m.quad[1][0] * baseW + pad, m.quad[1][1] * baseH - pad],
          [m.quad[2][0] * baseW + pad, m.quad[2][1] * baseH + pad],
          [m.quad[3][0] * baseW - pad, m.quad[3][1] * baseH + pad],
        ];
        slotEl.style.left = '0px';
        slotEl.style.top = '0px';
        slotEl.style.width = screenCtrl.w + 'px';
        slotEl.style.height = screenCtrl.h + 'px';
        slotEl.style.transform = computeQuadMatrix3d(screenCtrl.w, screenCtrl.h, dst);
        slotEl.appendChild(screenCtrl.el);
        // Append slot FIRST and cut-out bezel photo SECOND so the walnut frame masks all 4 edges cleanly!
        frameEl.appendChild(slotEl);
        frameEl.appendChild(photoImg);
      } else {
        const slotW = baseW * swFrac;
        const slotH = baseH * shFrac;
        slotEl.style.left = (sg.x0 * 100).toFixed(3) + '%';
        slotEl.style.top = (sg.y0 * 100).toFixed(3) + '%';
        slotEl.style.width = (swFrac * 100).toFixed(3) + '%';
        slotEl.style.height = (shFrac * 100).toFixed(3) + '%';
        if (m.rotDeg) {
          slotEl.style.transform = `rotate(${m.rotDeg}deg)`;
        }
        const canvasWrap = document.createElement('div');
        canvasWrap.className = 'pv-screen-canvas';
        canvasWrap.style.width = screenCtrl.w + 'px';
        canvasWrap.style.height = screenCtrl.h + 'px';
        canvasWrap.style.transform = `scale(${(slotW / screenCtrl.w).toFixed(5)}, ${(slotH / screenCtrl.h).toFixed(5)})`;
        canvasWrap.appendChild(screenCtrl.el);
        slotEl.appendChild(canvasWrap);
        frameEl.appendChild(photoImg);
        frameEl.appendChild(slotEl);
      }
      unitEl.appendChild(frameEl);
      monitorLayer.appendChild(unitEl);

      // Single C-infinity smooth quintic optical dolly timeline (~9.12s total, ~4.8s calm hero dwell!):
      // Glides gently from far horizon -> unhurried readable hero creep -> fluid pass-through!
      const tCenter = def.tCenter;
      const halfSpan = BAR * 1.92; // 4.56s each side (9.12s unbroken silky pass)
      const tAppear = tCenter - halfSpan;
      const tPassEnd = tCenter + halfSpan;

      return {
        id: def.id,
        unitEl,
        tAppear,
        tCenter,
        tPassEnd,
      };
    });

    // ---------------------------------------------------------------------
    // 2. SURGICAL SIDE-AVOIDANCE WINDOWS FOR "啊 啊" TOSSED OBJECTS
    //    Only blocks the EXACT airborne window on that specific side so the
    //    background city streetscapes NEVER stop appearing across monitors!
    // ---------------------------------------------------------------------
    const allTosses = (data.ahTosses || []).filter((e) => e.t >= 5.20 && e.t <= 40.4);
    const tossBusyL = [];
    const tossBusyR = [];
    allTosses.forEach((ev) => {
      const win = [ev.t - 0.10, ev.t + 0.92];
      if (ev.side === 'L') tossBusyL.push(win);
      else tossBusyR.push(win);
    });

    function isSideBusyWindow(side, t0, t1) {
      const list = side === 'L' ? tossBusyL : tossBusyR;
      for (let i = 0; i < list.length; i++) {
        if (t0 <= list[i][1] && t1 >= list[i][0]) return true;
      }
      return false;
    }

    function isSideBusyNow(side, tNow) {
      const list = side === 'L' ? tossBusyL : tossBusyR;
      for (let i = 0; i < list.length; i++) {
        if (tNow >= list[i][0] && tNow <= list[i][1]) return true;
      }
      return false;
    }

    // ---------------------------------------------------------------------
    // 3. DENSE VERTICAL ONE-POINT 3D STREET CORRIDOR (上→中→下 / 下→中→上)
    //    - Dense 3-4 layered buildings/streets/signs per organ/melody pluck
    //    - Strictly vertical entry & exit (top->mid->bottom / bottom->mid->top)
    //    - Continuous throughout ALL 4 monitors while dodging active toss side!
    // ---------------------------------------------------------------------
    const assets = data.assets || { buildings: [], streets: [], signs: [] };
    const buildingsPool = assets.buildings || [];
    const streetsPool = assets.streets || [];
    const signsPool = assets.signs || [];
    const rng = makeRng(20261123);

    const CAMERA_Z_SPEED = 115;
    const MAX_ACTIVE_PIECES = 88;
    const streetPieces = [];

    let bCursor = 0;
    let stCursor = 0;
    let sgCursor = 0;
    let dirAlternator = 0;

    function buildPieceElement(meta, targetMaxPx) {
      const wrap = document.createElement('div');
      wrap.className = 'pv-street-item';
      const crop = document.createElement('div');
      crop.className = 'pv-crop';
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      attachImgWithRetry(img, meta.src, 3);

      const sc = targetMaxPx / Math.max(meta.bw, meta.bh);
      const boxW = Math.round(meta.bw * sc);
      const boxH = Math.round(meta.bh * sc);
      crop.style.width = boxW + 'px';
      crop.style.height = boxH + 'px';
      img.style.width = Math.round(meta.w * sc) + 'px';
      img.style.height = Math.round(meta.h * sc) + 'px';
      img.style.left = -Math.round(meta.x0 * sc) + 'px';
      img.style.top = -Math.round(meta.y0 * sc) + 'px';

      crop.appendChild(img);
      wrap.appendChild(crop);
      return { wrap, boxW, boxH };
    }

    function spawnOrganPatch(ev) {
      // Surgical avoidance: only check immediate launch moment on targetSide
      let targetSide = ev.side === 'L' ? 'L' : (ev.side === 'R' ? 'R' : (dirAlternator % 2 === 0 ? 'L' : 'R'));
      if (isSideBusyWindow(targetSide, ev.t, ev.t + 0.35)) {
        const otherSide = targetSide === 'L' ? 'R' : 'L';
        if (!isSideBusyWindow(otherSide, ev.t, ev.t + 0.35)) {
          targetSide = otherSide;
        } else {
          return;
        }
      }

      const sideSign = targetSide === 'L' ? -1 : 1;
      const isArp = ev.kind === 'arp';
      const count = isArp ? 4 : 3;

      const dirY = (dirAlternator++ % 2 === 0) ? 1 : -1;
      const baseZ = -(480 + rng() * 360);

      for (let k = 0; k < count; k++) {
        let meta = null;
        let targetPx = 340;
        let kind = 'building';
        if (k === 0 && streetsPool.length) {
          meta = streetsPool[stCursor++ % streetsPool.length];
          targetPx = vw <= 640 ? 320 : 460 + rng() * 140;
          kind = 'street';
        } else if (k === count - 1 && signsPool.length && rng() < 0.52) {
          meta = signsPool[sgCursor++ % signsPool.length];
          targetPx = vw <= 640 ? 135 : 185 + rng() * 65;
          kind = 'sign';
        } else if (buildingsPool.length) {
          meta = buildingsPool[bCursor++ % buildingsPool.length];
          targetPx = vw <= 640 ? 260 : 370 + rng() * 135;
          kind = 'building';
        } else if (streetsPool.length) {
          meta = streetsPool[stCursor++ % streetsPool.length];
          targetPx = 420;
          kind = 'street';
        }
        if (!meta) continue;

        // Place dense corridor walls wide enough in 3D space so their perspective projection
        // frames the outer left/right screen flanks visibly even when a monitor is zoomed in!
        const laneDist = vw * (vw <= 640 ? 0.58 : (0.58 + (k / Math.max(1, count - 1)) * 0.24 + rng() * 0.08));
        const laneX = sideSign * laneDist;
        const z0 = baseZ - k * 115 + (rng() - 0.5) * 45;

        const wallYaw = -sideSign * (kind === 'sign' ? (24 + rng() * 10) : (30 + rng() * 12));

        const stagger = k * 0.11;
        const birthT = ev.t + stagger;
        // Longer architectural dwell (~3.8s - 6.2s) so city blocks linger with weight before gliding out
        const dur = (ev.decay || 2.2) * (1.85 + rng() * 0.35);

        const { wrap, boxW, boxH } = buildPieceElement(meta, targetPx);
        corridorLayer.appendChild(wrap);

        const halfTravelY = vh * 0.96 + boxH * 0.72;

        streetPieces.push({
          el: wrap,
          boxW,
          boxH,
          side: targetSide,
          laneX,
          z0,
          wallYaw,
          dirY,
          halfTravelY,
          midOffsetY: (rng() - 0.5) * vh * 0.18,
          birthT,
          dur,
          extraU: 0,
          lastT: birthT,
        });
      }

      while (streetPieces.length > MAX_ACTIVE_PIECES) {
        const old = streetPieces.shift();
        if (old && old.el && old.el.parentNode) old.el.remove();
      }
    }

    // ---------------------------------------------------------------------
    // 4. BEAT-MATCHED LEFT/RIGHT "啊 啊" PARABOLIC FALLEN-OBJECT TOSSER
    // ---------------------------------------------------------------------
    const tossPool = fallenItems.length ? fallenItems : [];
    const activeTosses = [];
    let lastTossIdx = -1;
    const TOSS_GRAVITY = 2780;

    function spawnAhToss(ev) {
      if (!tossPool.length) return;
      let idx = Math.floor(rng() * tossPool.length);
      if (idx === lastTossIdx && tossPool.length > 1) {
        idx = (idx + 1) % tossPool.length;
      }
      lastTossIdx = idx;
      const meta = tossPool[idx];

      const target = vw <= 640 ? 114 : Math.min(168, Math.max(124, vw * 0.118));
      const sc = target / Math.max(meta.bw, meta.bh);
      const boxW = Math.round(meta.bw * sc);
      const boxH = Math.round(meta.bh * sc);

      const wrap = document.createElement('div');
      wrap.className = 'pv-toss-body';
      wrap.style.width = boxW + 'px';
      wrap.style.height = boxH + 'px';

      const crop = document.createElement('div');
      crop.className = 'pv-crop';
      crop.style.width = boxW + 'px';
      crop.style.height = boxH + 'px';

      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      attachImgWithRetry(img, meta.src, 3);
      img.style.width = Math.round(meta.w * sc) + 'px';
      img.style.height = Math.round(meta.h * sc) + 'px';
      img.style.left = -Math.round(meta.x0 * sc) + 'px';
      img.style.top = -Math.round(meta.y0 * sc) + 'px';

      crop.appendChild(img);
      wrap.appendChild(crop);
      tossLayer.appendChild(wrap);

      const isLeft = ev.side === 'L';
      const x0 = isLeft
        ? vw * (0.06 + rng() * 0.14)
        : vw * (0.80 + rng() * 0.14);
      const y0 = vh + boxH * 0.55;
      const targetPeakH = vh * (0.56 + (ev.energy || 0.75) * 0.22 + rng() * 0.08);
      const vy0 = -Math.sqrt(2 * TOSS_GRAVITY * targetPeakH);
      const vx0 = (isLeft ? 1 : -1) * (80 + rng() * 150);
      const omega = (isLeft ? 1 : -1) * (0.95 + rng() * 1.45);
      const theta0 = (rng() - 0.5) * 0.5;

      activeTosses.push({
        el: wrap,
        halfW: boxW * 0.5,
        halfH: boxH * 0.5,
        x0,
        y0,
        vx0,
        vy0,
        theta0,
        omega,
        birthT: ev.t,
      });
    }

    // ---------------------------------------------------------------------
    // 4.5 DRUM-LOCKED GROUND-PLANE VANISHING-POINT LAUNCHER
    //     Source Han Sans Heavy (Noto Sans SC 900) · Pure #ffffff · Minimalist
    //     - Starts AFTER Monitor 1 (AKPlugins) is already visible on screen (Bar 4.2, +7.72s)
    //     - Interval DOUBLED: strict 2-beat snare groove (1.19s) for Chinese chars, zero 1-beat bursts
    //     - Flight speed 30% SLOWER: GLYPH_DUR = 6 beats (3.564s)
    //     - "Business Analytics" launches ONE LETTER AT A TIME (B, u, s, i, n, e, s, s, A, n, a, l, y, t, i, c, s)
    //     - Cleanly completes right before Bar 17.1 (+38.02s) "ONE! TWO! THREE! FOUR!" flood!
    // ---------------------------------------------------------------------
    const floorSequence = [
      // Bar 4.2 -> Bar 5.2 (+7.72s .. +10.10s, after AKPlugins enters): 薛若米｜
      { beat: 13,   ch: '薛' },
      { beat: 15,   ch: '若' },
      { beat: 17,   ch: '米' },

      // Bar 5.4 -> Bar 8.4 (+11.29s .. +18.42s): 莫纳什大学大一， (strict 2-beat snare spacing!)
      { beat: 19,   ch: '莫' },
      { beat: 21,   ch: '纳' },
      { beat: 23,   ch: '什' },
      { beat: 25,   ch: '大' },
      { beat: 27,   ch: '学' },
      { beat: 29,   ch: '大' },
      { beat: 31,   ch: '一' },

      // Bar 9.2 -> Bar 10.4 (+19.60s .. +23.17s): 商业分析
      { beat: 33,   ch: '商' },
      { beat: 35,   ch: '业' },
      { beat: 37,   ch: '分' },
      { beat: 39,   ch: '析' },

      // Bar 11.2 -> Bar 16.4 (+24.36s .. +37.66s): B u s i n e s s  A n a l y t i c s (letter-by-letter!)
      { beat: 41.0, ch: 'B' },
      { beat: 42.3, ch: 'u' },
      { beat: 43.6, ch: 's' },
      { beat: 44.9, ch: 'i' },
      { beat: 46.2, ch: 'n' },
      { beat: 47.5, ch: 'e' },
      { beat: 48.8, ch: 's' },
      { beat: 50.1, ch: 's' },

      { beat: 52.0, ch: 'A' },
      { beat: 53.4, ch: 'n' },
      { beat: 54.8, ch: 'a' },
      { beat: 56.2, ch: 'l' },
      { beat: 57.6, ch: 'y' },
      { beat: 59.0, ch: 't' },
      { beat: 60.4, ch: 'i' },
      { beat: 61.8, ch: 'c' },
      { beat: 63.2, ch: 's' },
    ];
    const floorScript = floorSequence.map((item) => ({
      t: item.beat * BEAT,
      ch: item.ch,
    }));

    const activeGlyphs = [];
    // 30% slower than 4.25 beats -> 6.0 beats (3.564s = 1.5 bars) serene, monumental glide!
    // Exact 2D-plane Z=0 projective homography (computeQuadMatrix3d) of a 60deg downward-tilted floor:
    // - ZERO CSS perspective / preserve-3d / contain:paint culling bugs!
    // - 100% guaranteed strictly UNDERNEATH all monitors (z-index 15 < 20, Z=0)!
    // - dBot stays strictly > 29px all the way to yTop = 105% (zero behind-camera singularity)!
    const GLYPH_DUR = BEAT * 6.0;
    const FLOOR_P = vh * 0.36;
    const FLOOR_CX = vw * 0.50;
    const FLOOR_VP_Y = vh * 0.50;
    const FLOOR_Y_DROP = vh * 0.50;
    const FLOOR_RAD = (60 * Math.PI) / 180;
    const FLOOR_H = vh * 0.34;
    const FLOOR_H_SIN = FLOOR_H * Math.sin(FLOOR_RAD);
    const FLOOR_H_COS = FLOOR_H * Math.cos(FLOOR_RAD);
    const FLOOR_HALF_W = vw * 0.48; // 96% vw full width at bottom edge
    const FLOOR_D_START = FLOOR_P * 26.0;
    const FLOOR_D_EXIT = (FLOOR_P * FLOOR_Y_DROP) / (1.05 * vh - FLOOR_VP_Y);
    const FLOOR_D_RATIO = FLOOR_D_EXIT / FLOOR_D_START;

    function buildFloorTransform(u) {
      const dTop = FLOOR_D_START * Math.pow(FLOOR_D_RATIO, u);
      const dBot = Math.max(12, dTop - FLOOR_H_SIN);
      const yTop = FLOOR_VP_Y + (FLOOR_Y_DROP * FLOOR_P) / dTop;
      const hwTop = (FLOOR_HALF_W * FLOOR_P) / dTop;
      const yBot = FLOOR_VP_Y + ((FLOOR_Y_DROP + FLOOR_H_COS) * FLOOR_P) / dBot;
      const hwBot = (FLOOR_HALF_W * FLOOR_P) / dBot;
      return computeQuadMatrix3d(500, 500, [
        [FLOOR_CX - hwTop, yTop],
        [FLOOR_CX + hwTop, yTop],
        [FLOOR_CX + hwBot, yBot],
        [FLOOR_CX - hwBot, yBot],
      ]);
    }

    function spawnFloorGlyph(ev) {
      const el = document.createElement('div');
      el.className = 'pv-floor-glyph';
      if (ev.ch.length > 1) {
        const safe = ev.ch.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        el.innerHTML = `<svg viewBox="0 0 500 500" preserveAspectRatio="none" aria-hidden="true"><text x="250" y="425" text-anchor="middle" font-size="420" textLength="492" lengthAdjust="spacingAndGlyphs">${safe}</text></svg>`;
      } else {
        el.textContent = ev.ch;
      }
      // Position at deep vanishing point immediately so element NEVER flashes unpositioned!
      el.style.transform = buildFloorTransform(0);
      floorTextLayer.appendChild(el);
      activeGlyphs.push({ el, ev });
    }

    // ---------------------------------------------------------------------
    // 4.8 BAR 17 "ONE! TWO! THREE! FOUR!" BEAT-ANTICIPATED WALL-TO-WALL FLOOD
    //     -> SEAMLESS HANDOFF INTO 60FPS+ 3D SURREAL OBJECT-COLLAGE T-JUNCTION (BAR 18.1+)!
    // ---------------------------------------------------------------------
    const T_FLOOD_BEAT1 = BAR * 16;         // +38.020s = EXACT Bar 17.1 ("ONE!")
    const T_FLOOD_LEAD = 0.12;              // 120ms anticipation so tiles slam ON the vocal beat (not late!)
    const T_FLOOD_START = T_FLOOD_BEAT1 - T_FLOOD_LEAD;
    const T_SKETCH_START = BAR * 17;        // +40.396s = EXACT Bar 18.1 (top-down road -> 60fps rotating pull-up!)

    function getFloodImage(rawUrl) {
      const url = safeEncodeUrl(rawUrl);
      if (decodedImgCache.has(url)) return decodedImgCache.get(url);
      const im = new Image();
      im.decoding = 'async';
      attachImgWithRetry(im, url, 3);
      decodedImgCache.set(url, im);
      return im;
    }

    // Lazy-init WebGL 3D stage AFTER Beat-1 drum-drop physics & portal zoom finish
    // so creating 200+ 3D CanvasTextures NEVER stalls the instant Beat-1 object drop!
    let sketch3d = null;
    function ensureSketch3D(deferTextures) {
      if (sketch3d || !window.MicCheckSketch3D) return sketch3d;
      sketch3d = window.MicCheckSketch3D.create({
        parentEl: root,
        vw,
        vh,
        beatSec: BEAT,
        barSec: BAR,
        startSec: T_SKETCH_START,
        assets: data.assets,
        monitors: data.monitors,
        fallenItems: allItems,
        portfolioAssets: PORTFOLIO_ASSETS,
        kicks3d: data.kicks3d || [],
        cues3d: data.cues3d || {},
        getImage: getFloodImage,
        deferTextures: Boolean(deferTextures),
      });
      return sketch3d;
    }

    function makeCodeCardSprite(title, lines) {
      const c = document.createElement('canvas');
      c.width = 460;
      c.height = 300;
      const g = c.getContext('2d');
      if (!g) return c;
      g.fillStyle = '#000000';
      g.fillRect(0, 0, c.width, c.height);
      g.strokeStyle = 'rgba(255,255,255,0.68)';
      g.lineWidth = 3;
      g.strokeRect(2, 2, c.width - 4, c.height - 4);
      g.fillStyle = '#ffffff';
      g.font = '300 26px "Cormorant Garamond", "STFangsong", serif';
      g.fillText(title, 18, 38);
      g.strokeStyle = 'rgba(255,255,255,0.32)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(16, 52);
      g.lineTo(c.width - 16, 52);
      g.stroke();
      g.font = '300 15px ui-monospace, "SF Mono", Menlo, monospace';
      lines.forEach((ln, idx) => {
        g.fillText(ln, 18, 80 + idx * 24);
      });
      return c;
    }

    const satoCodeSprites = [
      makeCodeCardSprite('SATOBOT · AGENT HARNESS', [
        '# sato_runtime/memory_store.py',
        'RETENTION_DAYS = {1: 3, 2: 14, 3: 60, 5: 720}',
        'def memory_clarity(item, *, score, now):',
        '    life_frac = max(0.0, expire - now) / span',
        '    if score >= 0.42 and life_frac >= 0.30:',
        '        return "clear"',
        '    if score >= 0.24 and life_frac >= 0.08:',
        '        return "faded"',
        '    return "gone"  # local decay eviction',
      ]),
      makeCodeCardSprite('SATOBOT · THINK · ACT · OBSERVE', [
        '# sato_runtime/agent_core.py · llm_harness.py',
        '@dataclass',
        'class AgentRunResult:',
        '    actions: List[Dict[str, Any]]',
        '    declined: bool = False  # <NO_REPLY> gate',
        '    steps_used: int = 0',
        '    tool_trace: List[str]',
        '    obliged_missed: List[str]',
        '# layered_context: summary+bigram+thread+raw',
      ]),
    ];

    // Build balanced sprite sources for solid gap-sealing base + dense collage mid/top layers
    const solidSources = [];
    PORTFOLIO_ASSETS.forEach((url) => {
      solidSources.push({ kind: 'plate', url, img: getFloodImage(url) });
    });
    satoCodeSprites.forEach((cnv) => {
      solidSources.push({ kind: 'canvas', img: cnv, sw: cnv.width, sh: cnv.height });
    });
    streetsPool.forEach((m) => {
      solidSources.push({ kind: 'meta', meta: m, img: getFloodImage(m.src) });
    });
    buildingsPool.forEach((m) => {
      solidSources.push({ kind: 'meta', meta: m, img: getFloodImage(m.src) });
    });

    const accentSources = [];
    Object.values(data.monitors || {}).forEach((m) => {
      accentSources.push({ kind: 'plate', url: m.src, img: getFloodImage(m.src) });
    });
    accentSources.push({ kind: 'plate', url: './items/screens/016_cutout.png', img: getFloodImage('./items/screens/016_cutout.png') });
    tossPool.forEach((m) => {
      accentSources.push({ kind: 'meta', meta: m, img: getFloodImage(m.src) });
    });
    signsPool.forEach((m) => {
      accentSources.push({ kind: 'meta', meta: m, img: getFloodImage(m.src) });
    });
    ((data.assets && data.assets.cars) || []).slice(0, 8).forEach((m) => {
      accentSources.push({ kind: 'meta', meta: m, img: getFloodImage(m.src) });
    });
    ((data.assets && data.assets.signals) || []).slice(0, 8).forEach((m) => {
      accentSources.push({ kind: 'meta', meta: m, img: getFloodImage(m.src) });
    });
    ((data.assets && data.assets.poles) || []).slice(0, 6).forEach((m) => {
      accentSources.push({ kind: 'meta', meta: m, img: getFloodImage(m.src) });
    });
    PORTFOLIO_ASSETS.forEach((url) => {
      accentSources.push({ kind: 'plate', url, img: getFloodImage(url) });
    });
    satoCodeSprites.forEach((cnv) => {
      accentSources.push({ kind: 'canvas', img: cnv, sw: cnv.width, sh: cnv.height });
    });

    // Generate 3 overlapping jittered coverage grids (~204 tiles!) sorted strictly outer-perimeter -> dead-center
    // so "ONE! TWO! THREE! FOUR!" packs the viewport from ALL 4 EDGES inward to 99.9%+ ZERO-GAP fullness!
    const floodRng = makeRng(12342026);
    const floodTiles = [];

    function addCoveragePass(cols, rows, scaleMult, sourcePool, passLayer) {
      if (!sourcePool.length) return;
      const cellW = vw / cols;
      const cellH = vh / rows;
      let cursor = Math.floor(floodRng() * sourcePool.length);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tx = (c + 0.5 + (floodRng() - 0.5) * 0.62) * cellW;
          const ty = (r + 0.5 + (floodRng() - 0.5) * 0.62) * cellH;
          const nx = (tx / vw - 0.5) * 2; // [-1..+1]
          const ny = (ty / vh - 0.5) * 2; // [-1..+1]
          const edgeDist = Math.max(Math.abs(nx), Math.abs(ny)); // 1.0 = screen edges, 0.0 = dead center

          // Determine nearest screen edge to fly inward from!
          let sx = tx;
          let sy = ty;
          const targetMax = Math.max(cellW, cellH) * scaleMult * (0.88 + floodRng() * 0.34);
          if (Math.abs(nx) >= Math.abs(ny)) {
            sx = nx < 0 ? -targetMax * 0.72 : vw + targetMax * 0.72;
            sy = ty + (floodRng() - 0.5) * cellH * 0.6;
          } else {
            sy = ny < 0 ? -targetMax * 0.72 : vh + targetMax * 0.72;
            sx = tx + (floodRng() - 0.5) * cellW * 0.6;
          }

          const src = sourcePool[cursor % sourcePool.length];
          cursor += 1 + Math.floor(floodRng() * 2);

          floodTiles.push({
            src,
            passLayer,
            edgeDist,
            tx,
            ty,
            sx,
            sy,
            targetMax,
            rot: (floodRng() - 0.5) * (passLayer === 0 ? 0.16 : 0.36),
            tIn: 0,
            inDur: 0.12 + floodRng() * 0.04,
          });
        }
      }
    }

    // Pass 0: Oversized solid base grid (9x6 = 54) -> seals 100% of background gaps wall-to-wall!
    addCoveragePass(9, 6, 1.95, solidSources, 0);
    // Pass 1: Dense mid collage grid (9x6 = 54) -> overlapping buildings, streets, & project plates
    addCoveragePass(9, 6, 1.55, solidSources.concat(accentSources), 1);
    // Pass 2: Rich foreground collage layer (10x6 = 60) -> intro items, monitors, signs, code cards, screenshots!
    addCoveragePass(10, 6, 1.28, accentSources, 2);
    // Pass 3: Extra perimeter frame sealers (36) -> ensures zero slivers along top/bottom/left/right screen rims!
    for (let i = 0; i < 36; i++) {
      const side = i % 4;
      const frac = ((i >> 2) + 0.5) / 9;
      const tx = side === 0 || side === 2 ? frac * vw : (side === 1 ? vw * 0.96 : vw * 0.04);
      const ty = side === 1 || side === 3 ? frac * vh : (side === 0 ? vh * 0.04 : vh * 0.96);
      const targetMax = Math.max(vw, vh) * (0.20 + floodRng() * 0.08);
      const sx = side === 1 ? vw + targetMax * 0.7 : (side === 3 ? -targetMax * 0.7 : tx);
      const sy = side === 2 ? vh + targetMax * 0.7 : (side === 0 ? -targetMax * 0.7 : ty);
      const src = solidSources[(i * 3) % solidSources.length];
      floodTiles.push({
        src,
        passLayer: 0,
        edgeDist: 1.04 + floodRng() * 0.06,
        tx,
        ty,
        sx,
        sy,
        targetMax,
        rot: (floodRng() - 0.5) * 0.14,
        tIn: 0,
        inDur: 0.12,
      });
    }

    // Assign strict outer-to-inner beat-anticipated entry timestamps across the 4 shouts:
    // Every wave starts ~120ms early with tight 140ms burst + 120ms snap so tiles IMPACT DEAD-ON
    // "ONE!" (+38.02s), "TWO!" (+38.61s), "THREE!" (+39.21s), and "FOUR!" (+39.80s)!
    floodTiles.sort((a, b) => b.edgeDist - a.edgeDist);
    const totalFloodCount = floodTiles.length;
    for (let i = 0; i < totalFloodCount; i++) {
      const tile = floodTiles[i];
      const rank = i / Math.max(1, totalFloodCount - 1); // 0 = outermost edge, 1 = dead center
      const waveIdx = Math.min(3, Math.floor(rank * 4));  // 0="ONE", 1="TWO", 2="THREE", 3="FOUR"
      const waveLocal = rank * 4 - waveIdx;               // [0..1) inside each shout beat
      const waveSpan = BEAT * 0.24; // Tight 142ms surge right onto the beat!
      tile.tIn = (T_FLOOD_BEAT1 - T_FLOOD_LEAD) + waveIdx * BEAT + waveLocal * waveSpan;
    }

    // Draw order: Pass 0 solid sealers first, then Pass 1 mid, then Pass 2 foreground cutouts (stable outer->inner)
    const floodDrawList = floodTiles.slice().sort((a, b) => (a.passLayer - b.passLayer) || (a.tIn - b.tIn));
    let behindFloodCleared = false;
    let floodPackedFinal = false;

    function drawFloodTile(tile, cx, cy, rot, sc) {
      const s = tile.src;
      const im = s.img;
      let sx = 0, sy = 0, sw = 0, sh = 0;
      if (s.kind === 'canvas') {
        sw = s.sw; sh = s.sh;
      } else {
        if (!im || !im.complete || !im.naturalWidth) return;
        if (s.kind === 'meta' && s.meta) {
          sx = s.meta.x0; sy = s.meta.y0; sw = s.meta.bw; sh = s.meta.bh;
        } else {
          sw = im.naturalWidth; sh = im.naturalHeight;
        }
      }
      if (sw <= 0 || sh <= 0) return;
      // Pass 0 uses geometric-mean sizing so even tall/wide assets seal 100% of cell width & height with ZERO gaps!
      const refDim = tile.passLayer === 0 ? Math.sqrt(sw * sh) : Math.max(sw, sh);
      const fit = tile.targetMax / refDim;
      const dw = sw * fit * sc;
      const dh = sh * fit * sc;
      floodCtx.save();
      floodCtx.translate(cx, cy);
      if (rot) floodCtx.rotate(rot);
      floodCtx.drawImage(im, sx, sy, sw, sh, -dw * 0.5, -dh * 0.5, dw, dh);
      floodCtx.restore();
    }

    function paintFullPackedFlood() {
      if (!floodCtx) return;
      floodCtx.fillStyle = '#000000';
      floodCtx.fillRect(0, 0, vw, vh);
      for (let i = 0; i < floodDrawList.length; i++) {
        const tile = floodDrawList[i];
        drawFloodTile(tile, tile.tx, tile.ty, tile.rot, 1.0);
      }
      floodPackedFinal = true;
    }

    // ---------------------------------------------------------------------
    // 5. EVENT CURSORS & SILKY 60FPS RENDER LOOP
    // ---------------------------------------------------------------------
    const plucks = (data.organPlucks || []).filter((e) => e.t >= 2.0 && e.t < T_FLOOD_BEAT1);
    let nextPluckIdx = 0;
    let nextTossIdx = 0;
    let nextGlyphIdx = 0;

    const initialT = freezeAt !== null ? freezeAt : getElapsedSec();
    while (nextPluckIdx < plucks.length && plucks[nextPluckIdx].t <= initialT) {
      const ev = plucks[nextPluckIdx++];
      if (initialT - ev.t <= (ev.decay || 2.3) * 1.35 + 0.35) {
        spawnOrganPatch(ev);
      }
    }
    while (nextTossIdx < allTosses.length && allTosses[nextTossIdx].t <= initialT) {
      const ev = allTosses[nextTossIdx++];
      if (initialT - ev.t <= 1.45) {
        spawnAhToss(ev);
      }
    }
    while (nextGlyphIdx < floorScript.length && floorScript[nextGlyphIdx].t <= initialT) {
      const ev = floorScript[nextGlyphIdx++];
      if (initialT - ev.t <= GLYPH_DUR) {
        spawnFloorGlyph(ev);
      }
    }

    const SCENE_END = BAR * 55.0; // Runs all the way through next '1 2 3 4' (Bar 41) & full START Sun/Moon finale (~130.7s)!
    let glbPreloadStarted = false;

    function renderAt(t) {
      while (nextPluckIdx < plucks.length && plucks[nextPluckIdx].t <= t) {
        spawnOrganPatch(plucks[nextPluckIdx++]);
      }
      while (nextTossIdx < allTosses.length && allTosses[nextTossIdx].t <= t) {
        spawnAhToss(allTosses[nextTossIdx++]);
      }
      while (nextGlyphIdx < floorScript.length && floorScript[nextGlyphIdx].t <= t) {
        spawnFloorGlyph(floorScript[nextGlyphIdx++]);
      }

      // 1. Render 4 Portfolio Monitors with C-infinity smooth quintic optical dolly (ZERO kinks!)
      for (let i = 0; i < monitors.length; i++) {
        const mon = monitors[i];
        if (t < mon.tAppear || t > mon.tPassEnd) {
          mon.unitEl.style.visibility = 'hidden';
          mon.unitEl.style.opacity = '0';
          continue;
        }
        mon.unitEl.style.visibility = 'visible';

        const u = clamp((t - mon.tAppear) / (mon.tPassEnd - mon.tAppear), 0, 1);
        const p = 2 * u - 1; // [-1 .. +1], centered at hero midpoint
        const p2 = p * p;
        // Infinitely smooth C-infinity S-dolly: brisk horizon approach -> long, calm, ultra-readable hero glide -> fluid pass-through!
        const dolly = 0.14 * p + 0.86 * p * p2 * p2;
        const camScale = 0.96 * Math.exp(2.05 * dolly);

        // Smooth sine-eased appearance from deep distance & fade-out only after flying past bezel
        let alpha = 1;
        if (u < 0.14) {
          alpha = 0.5 - 0.5 * Math.cos((u / 0.14) * Math.PI);
        } else if (u > 0.76) {
          const outU = clamp((u - 0.76) / 0.24, 0, 1);
          alpha = 0.5 + 0.5 * Math.cos(outU * Math.PI);
        }

        // Pure GPU sub-pixel centered optical scaling (zero translate jitter!)
        mon.unitEl.style.transform = `scale3d(${camScale.toFixed(5)}, ${camScale.toFixed(5)}, 1)`;
        mon.unitEl.style.opacity = alpha.toFixed(4);
      }

      // 2. Render Strictly Vertical 3D Street Corridor (top->mid->bottom OR bottom->mid->top)
      for (let i = streetPieces.length - 1; i >= 0; i--) {
        const p = streetPieces[i];
        const age = t - p.birthT;
        if (age < 0) {
          p.el.style.visibility = 'hidden';
          continue;
        }
        p.el.style.visibility = 'visible';

        // If an "啊" toss becomes active on this side, only gently nudge pieces already past initial dwell
        const dt = Math.max(0, Math.min(0.05, t - p.lastT));
        p.lastT = t;
        if (isSideBusyNow(p.side, t) && age / p.dur > 0.35) {
          p.extraU += dt * 0.38;
        }

        const u = clamp(age / p.dur + p.extraU, 0, 1);
        const z = p.z0 + age * CAMERA_Z_SPEED;
        if (u >= 1 || z >= 520) {
          p.el.remove();
          streetPieces.splice(i, 1);
          continue;
        }

        // Smooth C-infinity quintic vertical pass-through curve:
        // Enters cleanly from outside TOP (or BOTTOM), lingers generously across the middle (~60% of stay),
        // and exits smoothly out the OPPOSITE vertical edge! ZERO mid-air fade!
        const s = 2 * u - 1; // [-1 .. +1]
        const s2 = s * s;
        const curve = 0.14 * s + 0.86 * s * s2 * s2; // [-1 .. +1], long serene dwell!
        const y = p.midOffsetY + p.dirY * curve * p.halfTravelY;

        p.el.style.transform =
          `translate3d(${(p.laneX - p.boxW * 0.5).toFixed(1)}px, ${(y - p.boxH * 0.5).toFixed(1)}px, ${z.toFixed(1)}px) ` +
          `rotateY(${p.wallYaw.toFixed(2)}deg)`;
      }

      // 3. Render Left/Right "啊 啊" parabolic tossed fallen objects
      for (let i = activeTosses.length - 1; i >= 0; i--) {
        const b = activeTosses[i];
        const age = t - b.birthT;
        if (age < 0) continue;

        const x = b.x0 + b.vx0 * age;
        const y = b.y0 + b.vy0 * age + 0.5 * TOSS_GRAVITY * age * age;
        const theta = b.theta0 + b.omega * age;

        if (age > 0.25 && y - b.halfH > vh + 90) {
          b.el.remove();
          activeTosses.splice(i, 1);
          continue;
        }

        b.el.style.transform = `translate3d(${(x - b.halfW).toFixed(1)}px, ${(y - b.halfH).toFixed(1)}px, 0) rotate(${theta.toFixed(3)}rad)`;
      }

      // 4. Render Ground-Plane Vanishing-Point Heavy Sans Characters via exact Z=0 matrix3d homography!
      //    Strictly BELOW monitors (z-index 15 < 20, Z=0), ZERO swaps, ZERO mid-air fade-in!
      for (let i = activeGlyphs.length - 1; i >= 0; i--) {
        const g = activeGlyphs[i];
        const age = t - g.ev.t;
        if (age < 0) continue;
        const u = age / GLYPH_DUR;
        if (u >= 1) {
          g.el.remove();
          activeGlyphs.splice(i, 1);
          continue;
        }
        g.el.style.transform = buildFloorTransform(u);
      }

      // 5. Render Bar 17 "ONE! TWO! THREE! FOUR!" Wall-to-Wall Flood -> Seamless 3D Hand-Drawn Road Handoff (Bar 18.1+)!
      if (floodCtx) {
        if (t < T_FLOOD_START) {
          if (floodCanvas.style.visibility !== 'hidden') {
            floodCanvas.style.visibility = 'hidden';
          }
          // Preload all 15 low-poly white-model GLBs lazily after Beat-1 physics (t >= 10s)!
          if (!glbPreloadStarted && t >= 10.0 && window.MicCheckGLB && window.THREE) {
            glbPreloadStarted = true;
            window.MicCheckGLB.preloadAll(window.THREE);
          }
          // Warm up 3D WebGL stage quietly starting at t >= 18s (well after Beat-1 physics & Monitor 1!)
          if (t >= 18.0) ensureSketch3D(true);
          if (sketch3d) sketch3d.render(t, floodCanvas);
        } else if (t < T_SKETCH_START) {
          ensureSketch3D(true);
          if (sketch3d) sketch3d.render(t, floodCanvas);
          if (floodCanvas.style.visibility !== 'visible') {
            floodCanvas.style.visibility = 'visible';
          }
          if (!behindFloodCleared && t >= T_SKETCH_START - 0.16) {
            behindFloodCleared = true;
            corridorLayer.style.visibility = 'hidden';
            floorTextLayer.style.visibility = 'hidden';
            monitorLayer.style.visibility = 'hidden';
            tossLayer.style.visibility = 'hidden';
          }

          floodCtx.clearRect(0, 0, vw, vh);
          for (let i = 0; i < floodDrawList.length; i++) {
            const tile = floodDrawList[i];
            if (t < tile.tIn) continue;
            const u = clamp((t - tile.tIn) / tile.inDur, 0, 1);
            const ease = u >= 1 ? 1 : 1 - Math.pow(2, -10 * u);
            const cx = tile.sx + (tile.tx - tile.sx) * ease;
            const cy = tile.sy + (tile.ty - tile.sy) * ease;
            const sc = 1.12 - 0.12 * ease;
            drawFloodTile(tile, cx, cy, tile.rot, sc);
          }
        } else {
          // Ensure floodCanvas has the 100%-packed final collage painted even if jumping directly via ?scene=pv&t=44!
          if (!floodPackedFinal) {
            paintFullPackedFlood();
          }
          if (!behindFloodCleared) {
            behindFloodCleared = true;
            corridorLayer.style.visibility = 'hidden';
            floorTextLayer.style.visibility = 'hidden';
            monitorLayer.style.visibility = 'hidden';
            tossLayer.style.visibility = 'hidden';
          }
          ensureSketch3D(false);
          if (sketch3d) {
            sketch3d.render(t, floodCanvas);
            if (floodCanvas.style.visibility !== 'hidden') {
              floodCanvas.style.visibility = 'hidden';
            }
          }
        }
      }
    }

    renderAt(initialT);
    if (freezeAt !== null) {
      return { mask, stage: root };
    }

    function loop() {
      if (!isAlive()) return;
      const t = getElapsedSec();
      renderAt(t);
      if (t <= SCENE_END + 0.35) {
        requestAnimationFrame(loop);
      }
    }

    requestAnimationFrame(loop);
    return { mask, stage: root };
  }

  window.MicCheckPV = { preload, start };
})();
