(() => {
  'use strict';

  let pvDataCache = null;
  let pvDataPromise = null;
  const preloadedUrls = new Set();

  function preloadImg(url) {
    if (!url || preloadedUrls.has(url)) return;
    preloadedUrls.add(url);
    const im = new Image();
    im.decoding = 'async';
    im.src = url;
  }

  function loadPvData() {
    if (pvDataCache) return Promise.resolve(pvDataCache);
    if (pvDataPromise) return pvDataPromise;
    pvDataPromise = fetch('./data/mic_check_pv.json')
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((d) => {
        pvDataCache = d;
        return d;
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

  function preload() {
    PORTFOLIO_ASSETS.forEach(preloadImg);
    preloadImg('./items/screens/016_cutout.png');
    return loadPvData()
      .then((d) => {
        Object.values(d.monitors || {}).forEach((m) => preloadImg(m.src));
        const a = d.assets || {};
        (a.buildings || []).forEach((x) => preloadImg(x.src));
        (a.streets || []).slice(0, 24).forEach((x) => preloadImg(x.src));
        (a.signs || []).forEach((x) => preloadImg(x.src));
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
    const freezeAt = typeof opts.freezeAt === 'number' ? opts.freezeAt : null;

    let stageEl = null;
    let pendingPortal = null;
    let alive = true;

    function applyPortal(el, p) {
      if (!el) return;
      if (!p || p.open) {
        el.style.clipPath = 'none';
        el.style.webkitClipPath = 'none';
        el.style.transform = '';
        el.style.transformOrigin = '50% 50%';
        return;
      }
      if (p.hidden) {
        el.style.clipPath = 'inset(100% 0px 0px 0px)';
        el.style.webkitClipPath = 'inset(100% 0px 0px 0px)';
        return;
      }
      // Scale & center the entire live 3D vertical street corridor right inside 016_cutout.png's
      // transparent window hole, expanding seamlessly 1:1 as the camera pushes through!
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const winW = Math.max(1, p.x1 - p.x0);
      const winH = Math.max(1, p.y1 - p.y0);
      const winCx = (p.x0 + p.x1) * 0.5;
      const winCy = (p.y0 + p.y1) * 0.5;
      const scale = clamp(Math.max(winW / vw, winH / vh), 0.1, 1.0);
      const dx = winCx - vw * 0.5;
      const dy = winCy - vh * 0.5;

      // Express the exact window rectangle in pre-transform element coordinates for clip-path
      const localX0 = vw * 0.5 + (p.x0 - winCx) / scale;
      const localX1 = vw * 0.5 + (p.x1 - winCx) / scale;
      const localY0 = vh * 0.5 + (p.y0 - winCy) / scale;
      const localY1 = vh * 0.5 + (p.y1 - winCy) / scale;
      const topIn = clamp(localY0, 0, vh);
      const rightIn = clamp(vw - localX1, 0, vw);
      const botIn = clamp(vh - localY1, 0, vh);
      const leftIn = clamp(localX0, 0, vw);

      el.style.transformOrigin = '50% 50%';
      el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      const clipStr = `inset(${topIn.toFixed(1)}px ${rightIn.toFixed(1)}px ${botIn.toFixed(1)}px ${leftIn.toFixed(1)}px)`;
      el.style.clipPath = clipStr;
      el.style.webkitClipPath = clipStr;
    }

    const controller = {
      setPortalWindow(p) {
        pendingPortal = p;
        applyPortal(stageEl, p);
      },
      destroy() {
        alive = false;
        if (stageEl && stageEl.parentNode) stageEl.remove();
      },
    };

    loadPvData().then((data) => {
      if (!data || !alive) return;
      stageEl = mountScene(data, getElapsedSec, fallenItems, freezeAt, () => alive);
      if (pendingPortal !== null) {
        applyPortal(stageEl, pendingPortal);
      }
    });

    return controller;
  }

  function mountScene(data, getElapsedSec, fallenItems, freezeAt, isAlive) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const BEAT = data.beatSec || (60 / 100.45);
    const BAR = data.barSec || (BEAT * 4);
    const TWO_BARS = BAR * 2; // 4.7785s

    document.documentElement.classList.add('blackout');
    document.body.classList.add('blackout');

    const root = document.createElement('div');
    root.className = 'pv-stage';

    const corridorLayer = document.createElement('div');
    corridorLayer.className = 'pv-corridor-layer';
    const monitorLayer = document.createElement('div');
    monitorLayer.className = 'pv-monitor-layer';
    const tossLayer = document.createElement('div');
    tossLayer.className = 'pv-toss-layer';

    root.appendChild(corridorLayer);
    root.appendChild(monitorLayer);
    root.appendChild(tossLayer);
    document.body.appendChild(root);

    // ---------------------------------------------------------------------
    // 1. 4 COMPLETELY DISTINCT MONITORS LOCKED TO THE 4 "MIC CHECK" BEATS
    //    (Every 2 bars, shifted earlier right after seamless 016 push-through!)
    //    Bar 4.1  (+7.168s, "Mic Check" @ +7.12s):  AKPlugins   (015.png)
    //    Bar 6.1 (+11.946s, "Mic Check" @ +11.88s): SatoInput   (001.png)
    //    Bar 8.1 (+16.725s, "Mic Check" @ +16.63s): SatoBot     (003.png)
    //    Bar 10.1(+21.503s, "Mic Check" @ +21.39s): HiFiShifter (006_cutout.png)
    // ---------------------------------------------------------------------
    const HERO1_START = BAR * 3; // +7.1677s = EXACT Bar 4.1 (1st "Mic Check" in street!)
    const showcaseDefs = [
      { id: 'akplugins',   spec: data.monitors.akplugins,   screenBuilder: createAkPluginsScreen,   tHeroStart: HERO1_START },
      { id: 'satoinput',   spec: data.monitors.satoinput,   screenBuilder: createSatoInputScreen,   tHeroStart: HERO1_START + TWO_BARS },
      { id: 'satobot',     spec: data.monitors.satobot,     screenBuilder: createSatoBotScreen,     tHeroStart: HERO1_START + TWO_BARS * 2 },
      { id: 'hifishifter', spec: data.monitors.hifishifter, screenBuilder: createHiFiShifterScreen, tHeroStart: HERO1_START + TWO_BARS * 3 },
    ];

    const monitors = showcaseDefs.map((def) => {
      const m = def.spec;
      const sg = m.screen;
      const swFrac = sg.x1 - sg.x0;
      const shFrac = sg.y1 - sg.y0;
      const scxFrac = (sg.x0 + sg.x1) * 0.5;
      const scyFrac = (sg.y0 + sg.y1) * 0.5;

      const targetScreenW = vw * (vw <= 640 ? 0.90 : 0.80);
      const targetScreenH = vh * (vw <= 640 ? 0.76 : 0.80);
      const monWByW = targetScreenW / swFrac;
      const monWByH = (targetScreenH / shFrac) * m.aspect;
      const baseW = Math.min(monWByW, monWByH);
      const baseH = baseW / m.aspect;

      const unitEl = document.createElement('div');
      unitEl.className = 'pv-monitor-unit';
      unitEl.style.width = baseW.toFixed(1) + 'px';
      unitEl.style.height = baseH.toFixed(1) + 'px';

      const frameEl = document.createElement('div');
      frameEl.className = 'pv-monitor-frame' + (m.behindBezel ? ' behind-bezel' : '');

      const photoImg = document.createElement('img');
      photoImg.className = 'pv-monitor-photo';
      photoImg.src = m.src;
      photoImg.alt = '';
      photoImg.decoding = 'sync';

      const screenCtrl = def.screenBuilder();
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

      // Continuous forward camera push-in:
      //   Approach:  1.65s (rushing forward down the vertical 3D street corridor)
      //   Hero:      2.98s = 5 beats (full-bleed ultra-thin Songti mosaic, steady forward push)
      //   Pass-thru: 0.98s (camera rushes straight past the monitor bezel!)
      const tAppear = def.tHeroStart - 1.65;
      const tHeroEnd = def.tHeroStart + BEAT * 5.0;
      const tPassEnd = tHeroEnd + 0.98;

      return {
        id: def.id,
        unitEl,
        scxLocal: baseW * scxFrac,
        scyLocal: baseH * scyFrac,
        tAppear,
        tHeroStart: def.tHeroStart,
        tHeroEnd,
        tPassEnd,
      };
    });

    // ---------------------------------------------------------------------
    // 2. SURGICAL SIDE-AVOIDANCE WINDOWS FOR "啊 啊" TOSSED OBJECTS
    //    Only blocks the EXACT airborne window on that specific side so the
    //    background city streetscapes NEVER stop appearing across monitors!
    // ---------------------------------------------------------------------
    const allTosses = (data.ahTosses || []).filter((e) => e.t >= 5.20 && e.t <= 38.0);
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

    const CAMERA_Z_SPEED = 185;
    const MAX_ACTIVE_PIECES = 44;
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
      img.src = meta.src;
      img.alt = '';
      img.decoding = 'async';

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

        const stagger = k * 0.09;
        const birthT = ev.t + stagger;
        const dur = (ev.decay || 2.1) * (1.08 + rng() * 0.25);

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
      img.src = meta.src;
      img.alt = '';
      img.decoding = 'async';
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
    // 5. EVENT CURSORS & SILKY 60FPS RENDER LOOP
    // ---------------------------------------------------------------------
    const plucks = (data.organPlucks || []).filter((e) => e.t >= 2.0 && e.t <= 38.0);
    let nextPluckIdx = 0;
    let nextTossIdx = 0;

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

    const SCENE_END = BAR * 16.2;

    function renderAt(t) {
      while (nextPluckIdx < plucks.length && plucks[nextPluckIdx].t <= t) {
        spawnOrganPatch(plucks[nextPluckIdx++]);
      }
      while (nextTossIdx < allTosses.length && allTosses[nextTossIdx].t <= t) {
        spawnAhToss(allTosses[nextTossIdx++]);
      }

      // 1. Render 4 Portfolio Monitors (continuous forward push-in -> pass-through, ZERO text jitter!)
      for (let i = 0; i < monitors.length; i++) {
        const mon = monitors[i];
        if (t < mon.tAppear || t > mon.tPassEnd) {
          mon.unitEl.style.display = 'none';
          continue;
        }
        mon.unitEl.style.display = 'block';

        let camScale = 1;
        let alpha = 1;
        let yShift = 0;

        if (t < mon.tHeroStart) {
          const u = clamp((t - mon.tAppear) / (mon.tHeroStart - mon.tAppear), 0, 1);
          const eased = easeOutCubic(u);
          camScale = 0.08 * Math.pow(0.92 / 0.08, eased);
          alpha = clamp(u / 0.22, 0, 1);
          yShift = (1 - eased) * vh * 0.03;
        } else if (t <= mon.tHeroEnd) {
          const u = clamp((t - mon.tHeroStart) / (mon.tHeroEnd - mon.tHeroStart), 0, 1);
          camScale = 0.92 + u * 0.14;
          alpha = 1;
        } else {
          const u = clamp((t - mon.tHeroEnd) / (mon.tPassEnd - mon.tHeroEnd), 0, 1);
          camScale = 1.06 * Math.pow(3.55 / 1.06, easeInCubic(u));
          alpha = clamp(1 - Math.pow(Math.max(0, (u - 0.18) / 0.82), 1.35), 0, 1);
        }

        const tx = vw * 0.5 - mon.scxLocal * camScale;
        const ty = vh * 0.5 - mon.scyLocal * camScale + yShift;
        mon.unitEl.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${camScale.toFixed(4)})`;
        mon.unitEl.style.opacity = alpha.toFixed(3);
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

        // If an "啊" toss becomes active on this side, smoothly accelerate vertical exit off-screen!
        const dt = Math.max(0, Math.min(0.05, t - p.lastT));
        p.lastT = t;
        if (isSideBusyNow(p.side, t)) {
          p.extraU += dt * 1.45;
        }

        const u = clamp(age / p.dur + p.extraU, 0, 1);
        const z = p.z0 + age * CAMERA_Z_SPEED;
        if (u >= 1 || z >= 460) {
          p.el.remove();
          streetPieces.splice(i, 1);
          continue;
        }

        // Smooth C-infinity vertical pass-through curve:
        // Enters briskly from outside TOP (or BOTTOM), lingers gracefully around middle,
        // and accelerates straight out the OPPOSITE vertical edge! ZERO mid-air fade!
        const s = 2 * u - 1; // [-1 .. +1]
        const curve = 0.28 * s + 0.72 * s * s * s; // [-1 .. +1], strictly monotonic!
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
    }

    if (freezeAt !== null) {
      renderAt(freezeAt);
      return root;
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
    return root;
  }

  window.MicCheckPV = { preload, start };
})();
