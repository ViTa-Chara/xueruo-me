(() => {
  const params = new URLSearchParams(location.search);
  const bookId = params.get('book') || 'sato-heart';
  const chaptersEl = document.getElementById('chapters');
  const sentinel = document.getElementById('sentinel');
  const progressEl = document.getElementById('progress');
  const titleEl = document.getElementById('bookTitle');
  const metaEl = document.getElementById('bookMeta');

  let meta = null;
  let seed = null;
  let nextChapter = 1;
  let writtenCount = 0;
  let charsRead = 0;
  let loading = false;
  let proceduralStarted = false;
  let procIndex = 0;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pad(n) { return String(n).padStart(4, '0'); }

  function updateProgress() {
    progressEl.textContent = `第 ${Math.max(0, nextChapter - 1)} 章 · 已读约 ${charsRead.toLocaleString()} 字`;
  }

  function renderChapter(ch, { procedural = false } = {}) {
    const art = document.createElement('article');
    art.className = 'chapter';
    art.dataset.n = ch.n;
    art.innerHTML = `
      <div class="chapter-kicker">${procedural ? '续写 · PROCEDURAL' : 'CHAPTER'} ${String(ch.n).padStart(2, '0')}</div>
      <h2 class="chapter-title">${escapeHtml(ch.title)}</h2>
      <div class="chapter-body">${ch.html}</div>
    `;
    chaptersEl.appendChild(art);
    charsRead += ch.chars || estimateChars(ch.html);
    updateProgress();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function estimateChars(html) {
    const t = html.replace(/<[^>]+>/g, '');
    return [...t].filter(c => /[\u4e00-\u9fff]/.test(c)).length;
  }

  async function loadWritten(n) {
    const res = await fetch(`./data/books/${bookId}/chapters/${pad(n)}.json`);
    if (!res.ok) return null;
    return res.json();
  }

  function pick(arr, i) {
    return arr[i % arr.length];
  }

  function wrapParas(paras) {
    return paras.map(p => `<p>${p}</p>`).join('');
  }

  /** Synthesize next chapter from seed after prewritten chapters end. */
  function proceduralContinue(n) {
    if (!seed) {
      return {
        n,
        title: `第${n}章 · 未命名续页`,
        html: wrapParas(['纸页翻到这里，种子尚未加载。']),
        chars: 20,
      };
    }
    const beats = seed.arcBeats || [];
    const beat = pick(beats, n - writtenCount - 1);
    const styles = seed.styleNotes || [];
    const chars = seed.characters || [];
    const motifs = seed.motifs || [];
    const syn = seed.synopsis || '';
    const i = procIndex++;

    const c1 = pick(chars, i);
    const c2 = pick(chars, i + 3);
    const motif = pick(motifs, i + 1);
    const style = pick(styles, i);

    const title = beat?.title
      ? `第${n}章 · ${beat.title}`
      : `第${n}章 · ${motif || '续写'}（${n}）`;

    const paras = [];
    paras.push(`${beat?.hook || '故事没有停在上一页。'} 空气里还留着上一章的余温，像未关闭的进程。`);
    paras.push(`按照${style || '本书一贯的语气'}，${c1?.name || '主角'}先停了一拍。${c1?.note || syn.slice(0, 40) || '有些事必须亲手确认。'}`);
    if (c2) {
      paras.push(`${c2.name}出现时并不突兀：「${c2.voice || '……你又在想什么。'}」`);
      paras.push(`${c1?.name || 'TA'}没有立刻回答。${motif ? `脑海里闪过一个词：${motif}。` : ''} 像是提示，又像是警告。`);
    }
    paras.push(beat?.detail || `这一段的推进围绕「${motif || '日常裂缝'}」。细节堆叠，温度缓慢上升，直到有人不得不做出选择。`);
    paras.push(`对话很短，但分量够。`);
    paras.push(`「如果你继续自动下去，」有人说，「你就会忘记手动是什么手感。」`);
    paras.push(`「那就不自动。」`);
    paras.push(`「说得轻巧。」`);
    // Expand to literary length with seeded variations
    const expanders = seed.expanders || [
      '窗外的光线移动了一格，像时间轴上被拖动的关键帧。',
      '名单、优先级、旧约定——它们彼此争抢注意力。',
      '沉默也是一种输出。有时比长篇大论更诚实。',
      '错误堆栈很长，真正致命的往往只有最上面那一行。',
      '记忆会褪色，但褪色本身也是一种记录。',
    ];
    for (let k = 0; k < 8; k++) {
      paras.push(pick(expanders, i * 7 + k));
      if (k % 2 === 0) {
        paras.push(`${c1?.name || '主角'}把这件事写进心里，像写进 changelog：${beat?.changelog || `+ 第${n}章：推进；~ 调整节奏；! 保留疑问。`}`);
      }
    }
    paras.push(beat?.ending || `章末落下时，提示音轻轻响了一下——不是结束，是下一次调度的预告。`);

    // pad toward 1800–3500 chars
    let html = wrapParas(paras);
    let count = estimateChars(html);
    let guard = 0;
    while (count < 1900 && guard < 40) {
      const extra = pick([
        `${c1?.name || 'TA'}站在原地，把呼吸放慢到可以听见自己心跳的程度。有些决定不能靠重试堆出来，只能靠一次正确的按下。`,
        `关于${motif || '这件事'}，说明书从未写清楚。写清楚的东西往往已经死了；活着的规则总是带着例外。`,
        `${c2?.name || '另一人'}笑了一下，很轻：「你以为关掉开关就够了？有些脚本会在你睡着以后自己醒来。」`,
        `夜色把城市切成网格。每一格都像一间房间，每一间房间都像一段未提交的改动。`,
        `薛若米这个名字忽然闪过——不一定现身，却像水印，提醒世界仍有手绘的线条。`,
      ], i + guard);
      html += `<p>${extra}</p>`;
      count = estimateChars(html);
      guard++;
    }

    return { n, title, html, chars: count, procedural: true };
  }

  async function loadNext() {
    if (loading) return;
    loading = true;
    sentinel.setAttribute('aria-busy', 'true');
    try {
      if (nextChapter <= writtenCount) {
        const ch = await loadWritten(nextChapter);
        if (ch) {
          renderChapter(ch);
          nextChapter += 1;
        } else {
          // missing file — fall through to procedural
          writtenCount = nextChapter - 1;
        }
      }
      if (nextChapter > writtenCount) {
        if (!proceduralStarted) {
          proceduralStarted = true;
          const note = document.createElement('div');
          note.className = 'procedural-note';
          note.innerHTML = `<strong>预写章节到此为止。</strong> 之后将依据本书 seed 继续生成连贯续章（可无限下翻）。`;
          chaptersEl.appendChild(note);
        }
        const ch = proceduralContinue(nextChapter);
        renderChapter(ch, { procedural: true });
        nextChapter += 1;
      }
    } finally {
      loading = false;
      sentinel.setAttribute('aria-busy', 'false');
      // keep a buffer of chapters loaded
      if (chaptersEl.querySelectorAll('.chapter').length < 3) {
        queueMicrotask(() => loadNext());
      }
    }
  }

  async function init() {
    meta = await (await fetch(`./data/books/${bookId}/meta.json`)).json();
    try {
      seed = await (await fetch(`./data/books/${bookId}/seed.json`)).json();
    } catch (_) { seed = null; }

    writtenCount = meta.chapterCount || 0;
    titleEl.textContent = meta.title;
    metaEl.textContent = `${meta.genre} · 预写 ${writtenCount} 章 · ${meta.id}`;
    document.title = `${meta.title} / 薛若米 · xueruo.me`;
    updateProgress();

    // preload first two
    await loadNext();
    await loadNext();

    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) loadNext();
    }, { rootMargin: reduced ? '200px' : '600px' });
    io.observe(sentinel);
  }

  init().catch(err => {
    titleEl.textContent = '无法打开这本书';
    metaEl.textContent = String(err);
  });
})();
