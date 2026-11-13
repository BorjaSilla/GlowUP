/* GlowUp · interacción de las propuestas (/para/<cliente>) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const num = (n, d = 0) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d, useGrouping: 'always' }).format(n);
  const onView = (el, fn, opts = { threshold: 0.35 }) => { const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); fn(); } }, opts); o.observe(el); };

  /* ---------- Elementos que se activan al entrar (.in) ---------- */
  $$('.px-visual, .docs').forEach((el) => onView(el, () => el.classList.add('in'), { threshold: 0.3 }));

  /* ---------- Matriz de puntos: se encienden al entrar ---------- */
  $$('[data-dots]').forEach((el) => {
    const total = +el.dataset.total || 200, lit = +el.dataset.dots;
    el.innerHTML = '<i></i>'.repeat(total);
    // Reparte los puntos encendidos de forma estable (no aleatoria) por la matriz
    const idx = Array.from({ length: lit }, (_, k) => Math.floor(((k + 0.5) * total) / lit + (k % 2 ? 7 : -5)) % total);
    onView(el, () => idx.forEach((n, k) => setTimeout(() => el.children[n].classList.add('on'), reduce ? 0 : 300 + k * 160)));
  });

  /* ---------- Comparativas de página completa ---------- */
  const tbas = $$('.tba');
  tbas.forEach((ba) => {
    let drag = false;
    const set = (x) => { const r = ba.getBoundingClientRect(); ba.style.setProperty('--pos', Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)) + '%'); };
    ba.addEventListener('pointerdown', (e) => { drag = true; ba.classList.add('touched'); ba.setPointerCapture(e.pointerId); set(e.clientX); });
    ba.addEventListener('pointermove', (e) => drag && set(e.clientX));
    ba.addEventListener('pointerup', () => { drag = false; });
    ba.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const cur = parseFloat(ba.style.getPropertyValue('--pos')) || 50;
      ba.classList.add('touched'); ba.style.setProperty('--pos', Math.min(100, Math.max(0, cur + (e.key === 'ArrowLeft' ? -5 : 5))) + '%'); e.preventDefault();
    });
    // Teaser: el corte se balancea solo al entrar, hasta que la persona lo toca
    if (!reduce) onView(ba, () => {
      const t0 = performance.now();
      const anim = (t) => { if (ba.classList.contains('touched')) return; const k = Math.min(1, (t - t0) / 2600); ba.style.setProperty('--pos', (50 + Math.sin(k * Math.PI * 2) * 24 * (1 - k)) + '%'); if (k < 1) requestAnimationFrame(anim); };
      setTimeout(() => requestAnimationFrame(anim), 300);
    }, { threshold: 0.2 });
  });
  // El tirador acompaña al scroll y la tarjeta "crece" al entrar
  const grows = $$('[data-grow]');
  function tick() {
    const vh = innerHeight;
    tbas.forEach((ba) => {
      const r = ba.getBoundingClientRect();
      const y = Math.min(r.height - 50, Math.max(50, vh * 0.55 - r.top));
      ba.style.setProperty('--ky', y + 'px');
    });
    if (!reduce) grows.forEach((g) => {
      const r = g.getBoundingClientRect();
      const k = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.7)));
      g.style.transform = `scale(${0.93 + 0.07 * k})`;
    });
  }
  let raf = 0; const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { tick(); raf = 0; }); };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); tick();

  /* ---------- Móviles que se desplazan solos ---------- */
  $$('.phones').forEach((ph) => {
    const fit = () => $$('.scr', ph).forEach((s) => { const img = $('img', s); if (img.naturalHeight) img.style.setProperty('--dy', -(img.getBoundingClientRect().height - s.clientHeight) + 'px'); });
    $$('img', ph).forEach((i) => i.complete ? fit() : i.addEventListener('load', fit));
    addEventListener('resize', fit);
    if (!reduce) new IntersectionObserver(([e]) => ph.classList.toggle('play', e.isIntersecting), { threshold: 0.3 }).observe(ph);
  });

  /* ---------- Carrera de carga ---------- */
  $$('[data-race]').forEach((race) => {
    const data = JSON.parse(race.dataset.race); // { base, times:[...], before:[file|null], after:[file|null], doneBefore, doneAfter }
    const imgB = $('[data-side="before"] img', race), imgA = $('[data-side="after"] img', race);
    const stB = $('[data-side="before"] .state', race), stA = $('[data-side="after"] .state', race);
    const clock = $('.clock b', race), bar = $('.track i', race);
    const frame = (arr, t) => { let f = null; data.times.forEach((s, i) => { if (s <= t) f = arr[i]; }); return f; };
    // Precarga
    [...data.before, ...data.after].filter(Boolean).forEach((f) => { const i = new Image(); i.src = data.base + f; });
    const END = data.times[data.times.length - 1];
    const show = (img, f) => { const src = f ? data.base + f : ''; if (img.dataset.src !== src) { img.dataset.src = src; if (f) { img.src = src; img.style.opacity = 1; } else img.style.opacity = 0; } };
    let t0 = 0, playing = false;
    const step = (now) => {
      if (!playing) return;
      const t = Math.min(END + 1.5, (now - t0) / 1000);
      const tt = Math.min(t, END);
      show(imgB, frame(data.before, tt)); show(imgA, frame(data.after, tt));
      clock.textContent = tt.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' s';
      bar.style.height = (tt / END) * 100 + '%';
      stA.innerHTML = tt >= data.doneAfter ? '<b>Lista para pedir</b>' : 'Cargando…';
      stB.innerHTML = tt >= data.doneBefore ? '<b>Lista</b>' : (frame(data.before, tt) ? 'Aún sin carta ni precios…' : 'Pantalla en blanco…');
      if (t >= END + 1.5) { t0 = now; }
      requestAnimationFrame(step);
    };
    if (reduce) { show(imgB, data.before[data.before.length - 1]); show(imgA, data.after[data.after.length - 1]); return; }
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !playing) { playing = true; t0 = performance.now(); requestAnimationFrame(step); } else if (!e.isIntersecting) playing = false; }, { threshold: 0.4 }).observe(race);
  });

  /* ---------- Calculadora v2 (dos conversiones) ---------- */
  $$('[data-calc2]').forEach((box) => {
    const ins = $$('input[type=range]', box);
    const out = (k, v) => $$(`[data-o="${k}"]`, box).forEach((o) => { o.textContent = v; });
    const run = () => {
      const v = Object.fromEntries(ins.map((i) => [i.name, +i.value]));
      ins.forEach((i) => i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min)) * 100 + '%'));
      out('visits', num(v.visits)); out('ticket', v.ticket + ' €');
      out('c1', num(v.c1, 1) + ' %'); out('c2', num(v.c2, 1) + ' %');
      const r1 = v.visits * v.c1 / 100 * v.ticket, r2 = v.visits * v.c2 / 100 * v.ticket;
      out('r1', num(r1) + ' €'); out('r2', num(r2) + ' €');
      out('l1', 'Al ' + num(v.c1, 1) + ' %'); out('l2', 'Al ' + num(v.c2, 1) + ' %');
      const max = Math.max(r1, r2) || 1;
      $('[data-bar="1"]', box).style.width = (r1 / max) * 100 + '%';
      $('[data-bar="2"]', box).style.width = (r2 / max) * 100 + '%';
      const diff = r2 - r1;
      out('diff', (diff >= 0 ? '+' : '−') + num(Math.abs(diff)) + ' € al mes');
      out('lift', (v.c2 >= v.c1 ? '+' : '−') + num(Math.abs((v.c2 / v.c1 - 1) * 100)) + ' %');
      out('cpa', (v.c2 >= v.c1 ? '−' : '+') + num(Math.abs((1 - v.c1 / v.c2) * 100)) + ' %');
    };
    ins.forEach((i) => i.addEventListener('input', run)); run();
  });
})();
