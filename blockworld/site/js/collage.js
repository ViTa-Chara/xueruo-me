(() => {
  const area = document.getElementById("artArea");
  const fit = document.getElementById("stageFit");
  const scene = document.getElementById("scene");
  const button = document.getElementById("explodeButton");
  const label = document.getElementById("explodeLabel");

  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const pointerQuery = matchMedia("(pointer: fine)");

  document.getElementById("year").textContent = new Date().getFullYear();

  let reducedMotion = motionQuery.matches;
  let inView = true;
  let expanded = false;
  let frame = 0;
  let previousTime = 0;
  let time = 0;

  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };

  // 固定构图按容器等比缩放，小屏上也不改变纸层相对位置。
  function resize() {
    const width = area.clientWidth;
    const height = area.clientHeight;
    const scale = Math.min(width / 650, (height - 48) / 690, 1.12);
    fit.style.setProperty("--scale", scale.toFixed(4));
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(area);
  } else {
    window.addEventListener("resize", resize);
  }
  resize();

  function resetPointer() {
    target.x = 0;
    target.y = 0;
  }

  area.addEventListener("pointermove", event => {
    if (reducedMotion || !pointerQuery.matches || event.pointerType === "touch") {
      return;
    }

    const rect = area.getBoundingClientRect();
    target.x = Math.max(-1, Math.min(
      1, (event.clientX - rect.left) / rect.width * 2 - 1
    ));
    target.y = Math.max(-1, Math.min(
      1, (event.clientY - rect.top) / rect.height * 2 - 1
    ));
  });

  area.addEventListener("pointerleave", resetPointer);
  area.addEventListener("pointercancel", resetPointer);

  function tick(now) {
    frame = 0;
    if (reducedMotion || !inView || document.hidden) return;

    // 基于时间的插值，避免高刷新率屏幕动画速度翻倍。
    const dt = previousTime ? Math.min((now - previousTime) / 1000, .05) : 1 / 60;
    previousTime = now;
    time += dt;

    const smoothing = 1 - Math.exp(-5 * dt);
    current.x += (target.x - current.x) * smoothing;
    current.y += (target.y - current.y) * smoothing;

    const float = Math.sin(time * .85) * 4;
    const idleYaw = Math.sin(time * .45) * 1.2;

    scene.style.transform = `
      translateY(${float.toFixed(2)}px)
      rotateX(${(7 - current.y * 9).toFixed(2)}deg)
      rotateY(${(-17 + current.x * 15 + idleYaw).toFixed(2)}deg)
      rotateZ(${(6 + current.x * 1.5).toFixed(2)}deg)
    `;

    frame = requestAnimationFrame(tick);
  }

  function start() {
    if (!frame && !reducedMotion && inView && !document.hidden) {
      previousTime = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }

  button.addEventListener("click", () => {
    expanded = !expanded;
    scene.classList.toggle("expanded", expanded);
    button.setAttribute("aria-pressed", String(expanded));
    label.textContent = expanded ? "收拢纸层" : "展开纸层";
  });

  // 舞台离开屏幕后停止渲染，不在后台消耗动画帧。
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) start();
      else stop();
    }, { rootMargin: "100px" });
    observer.observe(area);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  motionQuery.addEventListener("change", event => {
    reducedMotion = event.matches;
    stop();
    resetPointer();

    if (reducedMotion) {
      current.x = current.y = 0;
      scene.style.transform = "";
    } else {
      start();
    }
  });

  start();
})();
