/* GlowUp · comportamiento compartido (vanilla, sin dependencias) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const CFG = Object.assign({ email: '', whatsapp: '' }, window.GLOW || {});
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const num = (n, d = 0) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d, useGrouping: 'always' }).format(n);
  const eur = (n, d = 0) => num(n, d) + ' €';

  /* ---------- Tema ---------- */
  const setTheme = (t) => { document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('glow_theme', t); } catch (e) {} };
  $$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')));

  /* ---------- Logo: el interruptor se enciende al cargar ---------- */
  $$('.brand:not([data-off]) .tgl').forEach((t) => { const b = t.closest('.brand'); setTimeout(() => b.classList.add('on'), reduce ? 0 : 550); });

  /* ---------- Revelado ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach((el) => io.observe(el));
  requestAnimationFrame(() => $$('[data-hero] .rv').forEach((el) => el.classList.add('in')));

  /* ---------- Nav: se esconde al bajar, vuelve al subir ---------- */
  const nav = $('.nav'); let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (nav) nav.classList.toggle('hide', y > 300 && y > lastY + 4 && !document.body.classList.contains('lock-nav'));
    if (y < lastY - 4 || y < 300) nav && nav.classList.remove('hide');
    lastY = y;
  }, { passive: true });

  /* ---------- Texto que se revela palabra a palabra ---------- */
  $$('[data-words]').forEach((el) => {
    const out = [];
    el.childNodes.forEach((n) => {
      const hl = n.nodeType === 1 && n.tagName === 'EM';
      (n.textContent || '').split(/(\s+)/).forEach((t) => out.push(/^\s+$/.test(t) || !t ? t : `<span class="w${hl ? ' hl' : ''}">${t}</span>`));
    });
    el.innerHTML = out.join('');
  });
  const words = $$('[data-words]');
  function wordsTick() {
    words.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
      const ws = el.querySelectorAll('.w'); const n = Math.round(p * ws.length);
      ws.forEach((w, i) => w.classList.toggle('on', reduce || i < n));
    });
  }

  /* ---------- Zona oscura: el fondo vira a negro ---------- */
  const darks = $$('[data-dark]');
  function darkTick() {
    const mid = innerHeight * 0.5;
    const on = darks.some((d) => { const r = d.getBoundingClientRect(); return r.top < mid && r.bottom > innerHeight * 0.3; });
    document.body.classList.toggle('dark-zone', on);
  }

  /* ---------- Tarjetas apiladas ---------- */
  const stack = $$('.stack-card');
  function stackTick() {
    stack.forEach((c, i) => {
      const next = stack[i + 1]; if (!next) return;
      const r = c.getBoundingClientRect(), nr = next.getBoundingClientRect();
      const overlap = Math.min(1, Math.max(0, (r.bottom - nr.top) / r.height));
      c.style.transform = `scale(${1 - overlap * 0.06})`;
      c.style.filter = `brightness(${1 - overlap * 0.25})`;
    });
  }

  let ticking = false;
  const tick = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { wordsTick(); darkTick(); stackTick(); ticking = false; }); };
  addEventListener('scroll', tick, { passive: true }); addEventListener('resize', tick); tick();

  /* ---------- Pestañas ---------- */
  $$('[data-tabs]').forEach((tabs) => {
    const group = tabs.dataset.tabs;
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tab]'); if (!b) return;
      $$('button', tabs).forEach((x) => x.classList.toggle('on', x === b));
      $$(`[data-pane-group="${group}"]`).forEach((p) => { const on = p.dataset.pane === b.dataset.tab; p.hidden = !on; if (on) { p.classList.remove('tab-pane'); void p.offsetWidth; p.classList.add('tab-pane'); } });
    });
  });

  /* ---------- Antes / después ---------- */
  $$('.ba').forEach((ba) => {
    let drag = false;
    const set = (x) => { const r = ba.getBoundingClientRect(); ba.style.setProperty('--pos', Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)) + '%'); };
    ba.addEventListener('pointerdown', (e) => { drag = true; ba.classList.add('touched'); ba.setPointerCapture(e.pointerId); set(e.clientX); });
    ba.addEventListener('pointermove', (e) => drag && set(e.clientX));
    ba.addEventListener('pointerup', () => { drag = false; });
    ba.addEventListener('keydown', (e) => {
      const cur = parseFloat(getComputedStyle(ba).getPropertyValue('--pos')) || 50;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { ba.classList.add('touched'); ba.style.setProperty('--pos', Math.min(100, Math.max(0, cur + (e.key === 'ArrowLeft' ? -5 : 5))) + '%'); e.preventDefault(); }
    });
    // Pequeño "teaser" cuando entra en pantalla para que se entienda que se arrastra
    if (!reduce) {
      const o = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return; o.disconnect();
        const t0 = performance.now();
        const anim = (t) => {
          if (ba.classList.contains('touched')) return;
          const k = Math.min(1, (t - t0) / 2200);
          ba.style.setProperty('--pos', (50 + Math.sin(k * Math.PI * 2) * 22 * (1 - k)) + '%');
          if (k < 1) requestAnimationFrame(anim);
        };
        setTimeout(() => requestAnimationFrame(anim), 400);
      }, { threshold: 0.5 });
      o.observe(ba);
    }
  });
  $$('[data-ba-switch]').forEach((seg) => {
    const pick = (b) => {
      $$('button', seg).forEach((x) => x.classList.toggle('on', x === b));
      $$('[data-ba-view]').forEach((v) => { v.hidden = v.dataset.baView !== b.dataset.view; });
    };
    let auto = null;
    const stop = () => { clearInterval(auto); auto = null; };
    seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { stop(); pick(b); } });
    // En móvil enseñamos primero la comparativa móvil
    if (innerWidth < 700) { const m = $('button[data-view="m"]', seg); if (m) pick(m); }
    // Pase automático entre comparativas hasta que alguien toque algo
    const ms = +seg.dataset.auto;
    if (ms && !reduce && innerWidth >= 700) {
      const frame = seg.closest('.ba-frame') || seg.parentElement;
      frame.addEventListener('pointerdown', stop);
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && auto === null && !frame.dataset.stopped) {
          auto = setInterval(() => {
            const bs = $$('button', seg); const i = bs.findIndex((x) => x.classList.contains('on'));
            const next = bs[(i + 1) % bs.length]; if (next.dataset.view === 'm') { pick(bs[0]); } else pick(next);
          }, ms);
        } else if (!e.isIntersecting) stop();
      }, { threshold: 0.5 }).observe(frame);
      frame.addEventListener('pointerdown', () => { frame.dataset.stopped = 1; }, { once: true });
    }
  });

  /* ---------- Contadores y anillos ---------- */
  const countIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; countIO.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.count), from = parseFloat(el.dataset.from || 0), dec = +(el.dataset.dec || 0);
    const pre = el.dataset.pre || '', suf = el.dataset.suf || '';
    const t0 = performance.now(), dur = reduce ? 1 : 1600;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), v = from + (to - from) * (1 - Math.pow(1 - k, 4)); el.textContent = pre + v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));
  const ringIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; ringIO.unobserve(e.target);
    const c = e.target.querySelector('.fg'); const s = +e.target.dataset.score;
    requestAnimationFrame(() => { c.style.strokeDashoffset = 289 - (289 * s) / 100; });
  }), { threshold: 0.5 });
  $$('.ring[data-score]').forEach((r) => ringIO.observe(r));

  /* ---------- Feed de pedidos ---------- */
  $$('[data-feed]').forEach((feed) => {
    const items = JSON.parse(feed.dataset.feed);
    let i = 0; const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';
    const push = () => {
      const [t, s] = items[i % items.length]; i++;
      const n = document.createElement('div'); n.className = 'note';
      n.innerHTML = `<span class="ic">${icon}</span><div><b>${t}</b><span>${s}</span></div><time>ahora</time>`;
      feed.prepend(n); $$('.note time', feed).forEach((tm, k) => { if (k) tm.textContent = `hace ${k * 2} min`; });
      while (feed.children.length > 5) feed.lastElementChild.remove();
    };
    for (let k = 0; k < 4; k++) push();
    const o = new IntersectionObserver(([e]) => { clearInterval(feed._t); if (e.isIntersecting && !reduce) feed._t = setInterval(push, 2600); });
    o.observe(feed);
  });

  /* ---------- Calculadora ---------- */
  $$('[data-calc]').forEach((box) => {
    const ins = $$('input[type=range]', box);
    // Escribe en [data-out] dentro de la calculadora y en cualquier [data-out-mirror] de la página
    const set = (k, t) => { $$(`[data-out="${k}"]`, box).concat($$(`[data-out-mirror="${k}"]`)).forEach((o) => { o.textContent = t; }); };
    const fmt = { visits: (v) => num(+v), conv: (v) => (+v).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' %', ticket: (v) => v + ' €', lift: (v) => '+' + v + ' %' };
    const run = () => {
      const v = Object.fromEntries(ins.map((i) => [i.name, +i.value]));
      ins.forEach((i) => { i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min)) * 100 + '%'); set(i.name, fmt[i.name] ? fmt[i.name](i.value) : i.value); });
      const orders = v.visits * v.conv / 100;
      const newConv = v.conv * (1 + v.lift / 100);
      const extra = v.visits * (newConv - v.conv) / 100 * v.ticket;
      set('orders', num(Math.round(orders)));
      set('newconv', newConv.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' %');
      set('extra', '+' + eur(extra));
      set('extraYear', '+' + eur(extra * 12));
      set('extraOrders', '+' + num(Math.round(orders * v.lift / 100)));
    };
    ins.forEach((i) => i.addEventListener('input', run)); run();
  });

  /* ---------- Quiz de contacto ---------- */
  $$('[data-quiz]').forEach((q) => {
    const steps = $$('.step', q); const prog = $('.prog i', q); const data = {};
    let cur = 0;
    const show = (n) => { cur = n; steps.forEach((s, i) => { s.hidden = i !== n; }); if (prog) prog.style.width = ((n + 1) / steps.length) * 100 + '%'; const f = $('input', steps[n]); if (f && n) setTimeout(() => f.focus({ preventScroll: true }), 300); };
    q.addEventListener('click', (e) => {
      const opt = e.target.closest('.opt');
      if (opt) { const s = opt.closest('.step'); $$('.opt', s).forEach((o) => o.classList.toggle('on', o === opt)); data[s.dataset.key] = opt.textContent.trim(); setTimeout(() => show(cur + 1), 260); }
      if (e.target.closest('[data-back]')) show(Math.max(0, cur - 1));
    });
    $$('form', q).forEach((f) => f.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = $('input', f); if (!inp.checkValidity()) { inp.reportValidity(); return; }
      data[f.closest('.step').dataset.key] = inp.value.trim();
      if (cur + 1 < steps.length - 1) return show(cur + 1);
      // Último paso: resumen + envío
      const labels = { web: 'Web', plataforma: 'Plataforma', freno: 'Lo que más me frena', email: 'Email' };
      const body = 'Hola, quiero mi glow up.\n' + Object.entries(data).map(([k, v]) => `${labels[k] || k}: ${v}`).join('\n');
      try { localStorage.setItem('glow_lead', JSON.stringify(data)); } catch (err) {}
      const send = $('[data-send]', q);
      if (send) {
        if (CFG.whatsapp) {
          send.href = `https://wa.me/${CFG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(body)}`; send.target = '_blank'; send.rel = 'noopener';
          send.textContent = 'Enviar por WhatsApp';
        } else if (CFG.email) send.href = `mailto:${CFG.email}?subject=${encodeURIComponent('Quiero mi glow up')}&body=${encodeURIComponent(body)}`;
        else send.hidden = true;
      }
      show(steps.length - 1);
    }));
    show(0);
    // Prefill desde el widget
    addEventListener('glow:url', (e) => { const u = $('input[name=web]', q); if (u) { u.value = e.detail; } });
  });

  /* ---------- Widget flotante ---------- */
  const w = $('.widget');
  if (w) {
    let dismissed = false, typed = false;
    try { dismissed = sessionStorage.getItem('glow_w') === '1'; } catch (e) {}
    const bubble = $('.bubble', w); const msg = bubble.dataset.msg;
    const typeIt = () => { if (typed) return; typed = true; let i = 0; const t = setInterval(() => { bubble.textContent = msg.slice(0, ++i); if (i >= msg.length) clearInterval(t); }, reduce ? 0 : 18); };
    addEventListener('scroll', () => {
      if (dismissed) return;
      const p = scrollY / (document.documentElement.scrollHeight - innerHeight);
      const show = p > 0.22 && p < 0.9;
      w.classList.toggle('show', show); if (show) typeIt();
    }, { passive: true });
    $('.x', w).addEventListener('click', () => { dismissed = true; w.classList.remove('show'); try { sessionStorage.setItem('glow_w', '1'); } catch (e) {} });
    $('form', w).addEventListener('submit', (e) => {
      e.preventDefault(); const v = $('input', w).value.trim();
      if (CFG.whatsapp) window.open(`https://wa.me/${CFG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero ver cómo quedaría mi web: ' + v)}`, '_blank', 'noopener');
      dispatchEvent(new CustomEvent('glow:url', { detail: v }));
      const target = $('#empieza'); if (target) target.scrollIntoView({ behavior: 'smooth' });
      dismissed = true; w.classList.remove('show');
    });
  }

  /* ---------- Botones de contacto (email / WhatsApp según configuración) ---------- */
  $$('[data-contact]').forEach((a) => {
    const subject = a.dataset.contact || 'Quiero mi glow up';
    if (CFG.whatsapp) { a.href = `https://wa.me/${CFG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(subject)}`; a.target = '_blank'; a.rel = 'noopener'; }
    else if (CFG.email) a.href = `mailto:${CFG.email}?subject=${encodeURIComponent(subject)}`;
  });

  /* ---------- Año ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
