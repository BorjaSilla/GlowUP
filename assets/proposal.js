/* GlowUp · interacción de las propuestas (/para/<cliente>) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const num = (n, d = 0) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d, useGrouping: 'always' }).format(n);
  const onView = (el, fn, opts = { threshold: 0.35 }) => { const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); fn(); } }, opts); o.observe(el); };

  /* ---------- Toque de escritorio: foco que sigue al ratón y platos con paralaje ---------- */
  if (matchMedia('(hover: hover) and (min-width: 1000px)').matches) {
    const hero = $('.px-hero'); const fds = $$('.fd');
    setTimeout(() => hero && hero.classList.add('on'), 500);
    let mx = innerWidth / 2, my = innerHeight * 0.2, pend = false;
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY; if (pend) return; pend = true;
      requestAnimationFrame(() => {
        pend = false;
        document.body.style.setProperty('--mx', mx + 'px'); document.body.style.setProperty('--my', my + 'px');
        if (!reduce) {
          const dx = mx / innerWidth - 0.5, dy = my / innerHeight - 0.5;
          fds.forEach((f) => { const d = +f.dataset.depth; f.style.setProperty('--tx', (-dx * d) + 'px'); f.style.setProperty('--ty', (-dy * d) + 'px'); });
        }
      });
    }, { passive: true });
  }

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
    let sx = 0, sy = 0, pending = false;
    ba.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') { drag = true; ba.classList.add('touched'); ba.setPointerCapture(e.pointerId); set(e.clientX); return; }
      pending = true; sx = e.clientX; sy = e.clientY; // táctil: esperamos a saber si es horizontal o vertical
    });
    ba.addEventListener('pointermove', (e) => {
      if (pending) {
        const dx = Math.abs(e.clientX - sx), dy = Math.abs(e.clientY - sy);
        if (dx > 8 && dx > dy) { pending = false; drag = true; ba.classList.add('touched'); try { ba.setPointerCapture(e.pointerId); } catch (_) {} }
        else if (dy > 8) pending = false; // es scroll: lo dejamos al navegador
      }
      if (drag) set(e.clientX);
    });
    const end = () => { drag = false; pending = false; };
    ba.addEventListener('pointerup', end); ba.addEventListener('pointercancel', end);
    ba.addEventListener('click', (e) => { if (e.pointerType !== 'mouse' && !drag) { ba.classList.add('touched'); set(e.clientX); } });
    ba.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const cur = parseFloat(ba.style.getPropertyValue('--pos')) || 50;
      ba.classList.add('touched'); ba.style.setProperty('--pos', Math.min(100, Math.max(0, cur + (e.key === 'ArrowLeft' ? -5 : 5))) + '%'); e.preventDefault();
    });
    // Teaser: el corte se balancea cada pocos segundos mientras se ve, hasta que la persona lo toca
    if (!reduce) {
      let vis = false;
      new IntersectionObserver(([en]) => { vis = en.isIntersecting; }, { threshold: 0.15 }).observe(ba);
      const wiggle = () => {
        if (!vis || ba.classList.contains('touched')) return;
        const t0 = performance.now();
        const anim = (t) => { if (ba.classList.contains('touched')) return; const k = Math.min(1, (t - t0) / 1800); ba.style.setProperty('--pos', (50 + Math.sin(k * Math.PI * 2) * 20 * (1 - k)) + '%'); if (k < 1) requestAnimationFrame(anim); };
        requestAnimationFrame(anim);
      };
      setTimeout(wiggle, 900);
      const iv = setInterval(() => { if (ba.classList.contains('touched')) clearInterval(iv); else wiggle(); }, 4500);
    }
  });
  // El tirador acompaña al scroll y la tarjeta "crece" al entrar
  const grows = $$('[data-grow]');
  function tick() {
    const vh = innerHeight;
    tbas.forEach((ba) => {
      if (ba.closest('[data-ps-scroll]')) return; // dentro del teléfono se calcula con su propio scroll
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

  /* ---------- Simulador de teléfono ---------- */
  const show = $('[data-phone-show]');
  let psDemoDone = false;
  if (show) {
    const sc = $('[data-ps-scroll]', show), cap = $('[data-ps-cap]', show), hint = $('[data-ps-hint]', show);
    const active = () => $('.ps-tba:not([hidden])', sc);
    const place = () => { const ba = active(); if (!ba) return; const y = Math.min(ba.offsetHeight - 40, Math.max(40, sc.scrollTop + sc.clientHeight * 0.5)); ba.style.setProperty('--ky', y + 'px'); };
    sc.addEventListener('scroll', () => { place(); if (sc.scrollTop > 40) hint.classList.add('gone'); }, { passive: true });
    $('.ps-tabs', show).addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('.ps-tabs button', show).forEach((x) => x.classList.toggle('on', x === b));
      $$('.ps-tba', sc).forEach((t) => { t.hidden = t.dataset.screen !== b.dataset.screen; });
      cap.textContent = b.dataset.cap; sc.scrollTop = 0; requestAnimationFrame(place);
    });
    $$('img', sc).forEach((i) => i.addEventListener('load', place));
    // Al aparecer, el móvil se desplaza un poco solo para que se entienda que tiene scroll
    new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || psDemoDone || reduce || show.hidden) return; psDemoDone = true;
      setTimeout(() => { sc.scrollTo({ top: 320, behavior: 'smooth' }); setTimeout(() => sc.scrollTo({ top: 0, behavior: 'smooth' }), 1300); }, 900);
    }, { threshold: 0.6 }).observe(sc);
    place();
  }

  /* ---------- Otros móviles con scroll (p. ej. la landing): el tirador sigue al scroll interno ---------- */
  $$('[data-ps-scroll]').forEach((sc) => {
    if (sc.closest('[data-phone-show]')) return;
    const place = () => { const ba = $('.ps-tba', sc); if (!ba || !sc.clientHeight) return; ba.style.setProperty('--ky', Math.min(ba.offsetHeight - 40, Math.max(40, sc.scrollTop + sc.clientHeight * 0.5)) + 'px'); };
    sc.addEventListener('scroll', place, { passive: true });
    $$('img', sc).forEach((i) => i.addEventListener('load', place));
    if ('ResizeObserver' in window) new ResizeObserver(place).observe(sc);
    place();
  });

  /* ---------- Vista móvil / escritorio ---------- */
  $$('[data-view-switch]').forEach((seg) => {
    const list = $('[data-tba-list]');
    const set = (mode) => {
      $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
      list.hidden = mode === 'm';
      if (show) show.hidden = mode !== 'm';
      requestAnimationFrame(onScroll);
    };
    seg.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (b) set(b.dataset.mode); });
    set(innerWidth <= 700 ? 'm' : 'd');
  });

  /* ---------- Móviles de ejemplo: se pueden desplazar y, si nadie los toca, se desplazan solos ---------- */
  $$('.phones').forEach((ph) => {
    const scrs = $$('.scr', ph);
    let auto = !reduce, vis = false, t0 = 0, last = 0;
    const stop = () => { auto = false; ph.classList.add('manual'); };
    scrs.forEach((s) => ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((ev) => s.addEventListener(ev, stop, { passive: true })));
    new IntersectionObserver(([en]) => { vis = en.isIntersecting; }, { threshold: 0.3 }).observe(ph);
    // Vaivén suave: baja despacio y vuelve arriba, sincronizado en los dos móviles
    const loop = (now) => {
      if (auto && vis) {
        if (!t0) t0 = now;
        const T = 26000, k = ((now - t0) % (2 * T)) / T, p = k < 1 ? k : 2 - k;
        const ease = p < 0.06 ? 0 : p > 0.94 ? 1 : (p - 0.06) / 0.88;
        const sm = ease * ease * (3 - 2 * ease);
        scrs.forEach((s) => { s.scrollTop = sm * (s.scrollHeight - s.clientHeight); });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  /* ---------- Carrera de carga ---------- */
  $$('[data-race]').forEach((race) => {
    const data = JSON.parse(race.dataset.race); // { base, times:[...], before:[file|null], after:[file|null], doneBefore, doneAfter }
    const imgB = $('[data-side="before"] img', race), imgA = $('[data-side="after"] img', race);
    const stB = $('[data-side="before"] .state', race), stA = $('[data-side="after"] .state', race);
    const clock = $('.clock b', race), bar = $('.track i', race);
    const ver = data.v ? '?v=' + data.v : '';
    const frame = (arr, t) => { let f = null; data.times.forEach((s, i) => { if (s <= t) f = arr[i]; }); return f; };
    // Precarga
    [...data.before, ...data.after].filter(Boolean).forEach((f) => { const i = new Image(); i.src = data.base + f + ver; });
    const END = data.times[data.times.length - 1];
    const show = (img, f) => { const src = f ? data.base + f + ver : ''; if (img.dataset.src !== src) { img.dataset.src = src; if (f) { img.src = src; img.style.opacity = 1; } else img.style.opacity = 0; } };
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
