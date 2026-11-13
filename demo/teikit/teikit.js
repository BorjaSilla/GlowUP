/* Teikit · Glow Up preview — interacción (sin dependencias) */
(() => {
  const D = window.TEIKIT;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const eur = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const byId = Object.fromEntries(D.items.map((i) => [i.id, i]));
  const icon = (id) => `<svg><use href="#${id}"/></svg>`;
  const REGION_LABEL = { Guipuzcoa: 'San Sebastián', Vizcaya: 'Bilbao' };

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  const observe = (root = document) => $$('.rv:not(.in)', root).forEach((el) => io.observe(el));

  /* ---------- Hero video: solo si hay buena conexión y no se pide menos movimiento ---------- */
  const v = $('#heroVideo');
  const slow = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
  if (v && !slow && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const start = () => { v.preload = 'auto'; v.play().then(() => { v.style.opacity = 1; }).catch(() => {}); };
    v.style.opacity = 0; v.style.transition = 'opacity 1.2s';
    if (document.readyState === 'complete') setTimeout(start, 300); else addEventListener('load', () => setTimeout(start, 300));
  }

  /* ---------- Badges ---------- */
  const badges = (it) => [
    it.tags.includes('best') && '<span class="badge hot">Best seller</span>',
    it.tags.includes('new') && '<span class="badge new">Nuevo</span>',
    it.tags.includes('veggie') && '<span class="badge veg">Veggie</span>',
  ].filter(Boolean).join('');

  /* ---------- Best sellers rail ---------- */
  const railIds = ['salmon-crush', 'kioto', 'paris', 'nikkei-poke', 'vieira', 'tuna-tartufata', 'moulin-rouge', 'velvet'];
  $('#rail').innerHTML = railIds.map((id, i) => {
    const it = byId[id];
    return `<article class="hero-dish rv" style="--d:${i * 0.05}s">
      <img src="${it.img}" alt="${esc(it.name)}" loading="lazy" />
      <div class="badges">${badges(it)}</div>
      <div class="body">
        <div class="row"><h3>${esc(it.name)}</h3><span class="price">${eur(it.price)}</span></div>
        <p>${esc(it.desc)}</p>
        <div class="row"><span style="font-size:12.5px;color:var(--ink-3)">${it.pieces ? it.pieces + ' piezas' : ''}</span><button class="add" data-add="${id}">${icon('i-plus')} Añadir</button></div>
      </div>
    </article>`;
  }).join('');
  $$('[data-rail]').forEach((b) => b.addEventListener('click', () => {
    const r = $('#rail'); r.scrollBy({ left: (+b.dataset.rail) * (r.firstElementChild.offsetWidth + 14) * 2, behavior: 'smooth' });
  }));

  /* ---------- Carta ---------- */
  const cats = D.cats.filter((c) => D.items.some((i) => i.cat === c.key));
  let filter = 'all', query = '';
  $('#tabs').innerHTML = cats.map((c, i) => `<button role="tab" class="${i ? '' : 'on'}" data-cat="${c.key}">${c.short}</button>`).join('');

  const dish = (it) => `<article class="dish">
      <div class="ph"><img src="${it.img}" alt="${esc(it.name)}" loading="lazy" width="112" height="112" /><div class="tags">${badges(it)}</div></div>
      <div class="info">
        <h4>${esc(it.name)}</h4>
        ${it.pieces ? `<span class="pcs">${it.pieces} piezas</span>` : ''}
        <p>${esc(it.desc)}</p>
        <div class="foot"><span class="price">${eur(it.price)}</span><button class="add" data-add="${it.id}" aria-label="Añadir ${esc(it.name)}">${icon('i-plus')}</button></div>
      </div>
    </article>`;

  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function renderMenu() {
    const q = norm(query.trim());
    const html = cats.map((c) => {
      const list = D.items.filter((i) => i.cat === c.key && (filter === 'all' || i.tags.includes(filter)) && (!q || norm(i.name + ' ' + i.desc).includes(q)));
      if (!list.length) return '';
      const note = c.key === 'MENÚS MEDIODÍA' ? `<p class="cat-note">${esc(D.note)}</p>` : '';
      return `<div class="cat-block" id="cat-${c.key.replace(/\W+/g, '-')}" data-key="${c.key}"><h3>${c.title} <small>${list.length} ${list.length === 1 ? 'plato' : 'platos'}</small></h3>${note}<div class="grid">${list.map(dish).join('')}</div></div>`;
    }).join('');
    $('#menu').innerHTML = html || `<div class="empty">No encontramos nada con “${esc(query)}”. Prueba con salmón, atún o trufa.</div>`;
    syncAdded();
    spy();
  }
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const block = document.querySelector(`[data-key="${CSS.escape(b.dataset.cat)}"]`);
    if (block) window.scrollTo({ top: block.getBoundingClientRect().top + scrollY - 150, behavior: 'smooth' });
  });
  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    filter = b.dataset.f; $$('#filters .chip').forEach((c) => c.classList.toggle('on', c === b)); renderMenu();
  });
  $('#q').addEventListener('input', (e) => { query = e.target.value; renderMenu(); });

  // Pestaña activa según scroll
  let blocks = [];
  function spy() { blocks = $$('.cat-block'); onScroll(); }
  function onScroll() {
    let cur = blocks[0];
    for (const b of blocks) if (b.getBoundingClientRect().top < 200) cur = b;
    if (!cur) return;
    $$('#tabs button').forEach((t) => {
      const on = t.dataset.cat === cur.dataset.key;
      if (on && !t.classList.contains('on')) { t.classList.add('on'); t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }
      else if (!on) t.classList.remove('on');
    });
  }
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });

  /* ---------- Packs ---------- */
  const packIds = ['the-royal-box', 'trinity', 'swinger-mix'];
  $('#packList').innerHTML = packIds.map((id, i) => {
    const it = byId[id];
    const per = it.pieces ? `${(it.price / it.pieces).toLocaleString('es-ES', { maximumFractionDigits: 2 })} € / pieza` : 'Pack combinable';
    return `<article class="pack ${i === 0 ? 'big' : ''} rv" style="--d:${i * 0.08}s">
      <div class="ph"><img src="${it.img}" alt="${esc(it.name)}" loading="lazy" /></div>
      <div class="body">
        <h3>${esc(it.name)}</h3>
        <p>${esc(it.desc)}</p>
        <div class="foot"><div><div class="price">${eur(it.price)}</div><div class="per">${it.pieces ? it.pieces + ' piezas · ' : ''}${per}</div></div><button class="add" data-add="${id}">${icon('i-plus')} Añadir</button></div>
      </div>
    </article>`;
  }).join('');

  /* ---------- Reseñas (reales, de teikit.es/nosotros) ---------- */
  const reviews = [
    ['Eulalia I.', 'Teikit es fantástico, la comida insuperable y el trato y el servicio a domicilio de lo mejor. Tienen detalles con los clientes que hay que agradecer; hemos pedido varias veces y seguimos repitiendo.'],
    ['Iñaki A.', 'Brutal. El servicio un 10 en atención, rapidez e higiene. Dentro de toda su variedad recomiendan muy bien y está todo riquísimo. Cuando vuelva por la zona, repito.'],
    ['Emilse A.', 'Muy buena atención, buen servicio, buena calidad de productos y muy buen sushi. Lo recomiendo 100%.'],
    ['Héctor G.', 'Tuve una mala experiencia con un pedido. Me contactaron al día siguiente disculpándose y nos compensaron. Les dimos otra oportunidad: la atención, la rapidez y la comida, 5 estrellas.'],
  ];
  const rv = reviews.map(([n, t]) => `<figure class="review"><div class="stars">${icon('i-star').repeat(5)}</div><p>“${t}”</p><figcaption class="who"><span class="av">${n[0]}</span>${n} · Cliente de Teikit</figcaption></figure>`).join('');
  $('#reviews').innerHTML = rv + rv;

  /* ---------- Locales ---------- */
  const regions = [...new Set(D.stores.map((s) => s.region))].sort((a, b) => D.stores.filter((s) => s.region === b).length - D.stores.filter((s) => s.region === a).length);
  const tel = (p) => p.replace(/[^\d+]/g, '');
  const maps = (s) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`Teikit ${s.addr} ${s.city}`);
  // Horario publicado en teikit.es para los 26 locales: todos los días, 12:30–15:30 y 19:00–23:00 (hora de Madrid)
  const SLOTS = [[12.5, 15.5, '12:30'], [19, 23, '19:00']];
  function openNow() {
    const parts = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const h = +parts.find((p) => p.type === 'hour').value + +parts.find((p) => p.type === 'minute').value / 60;
    const cur = SLOTS.find(([a, b]) => h >= a && h < b);
    if (cur) return { open: true, text: 'Abierto ahora' };
    const next = SLOTS.find(([a]) => h < a);
    return { open: false, text: next ? `Abre a las ${next[2]}` : 'Abre mañana a las 12:30' };
  }
  const status = openNow();
  const chip = $('#openChip');
  if (chip) { chip.classList.toggle('closed', !status.open); chip.querySelector('span').textContent = `${status.text} · Todos los días, 12:30–15:30 y 19:00–23:00`; }

  function renderStores(region) {
    $$('#regions button').forEach((b) => b.classList.toggle('on', b.dataset.r === region));
    $('#storeList').innerHTML = D.stores.filter((s) => s.region === region).map((s, i) => `
      <div class="store" style="animation-delay:${i * 0.04}s">
        <span class="st ${status.open ? 'on' : ''}"><i></i>${status.text}</span>
        <h3>Teikit ${esc(s.name)}</h3>
        <div class="addr">${esc(s.addr)} · ${esc(s.city)}</div>
        <div class="row"><a href="tel:${tel(s.phone)}">${icon('i-phone')} ${esc(s.phone.replace('+34 ', ''))}</a><a class="pri" href="${maps(s)}" target="_blank" rel="noopener">${icon('i-pin')} Cómo llegar</a></div>
      </div>`).join('');
  }
  $('#regions').innerHTML = regions.map((r) => `<button data-r="${r}">${REGION_LABEL[r] || r}<span>${D.stores.filter((s) => s.region === r).length}</span></button>`).join('');
  $('#regions').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) renderStores(b.dataset.r); });
  renderStores(regions[0]);

  /* ---------- Localizador del hero ---------- */
  let mode = 'delivery';
  $$('#locator .seg button').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.mode; $$('#locator .seg button').forEach((x) => x.classList.toggle('on', x === b)); locate();
  }));
  function locate() {
    const q = norm($('#locQuery').value.trim());
    const box = $('#locResults');
    if (q.length < 2) { box.classList.remove('open'); return; }
    const hits = D.stores.filter((s) => norm(`${s.name} ${s.city} ${s.region} ${REGION_LABEL[s.region] || ''} ${s.addr}`).includes(q)).slice(0, 3);
    box.innerHTML = hits.length
      ? hits.map((s) => `<a href="${mode === 'delivery' ? '#carta' : maps(s)}" ${mode === 'delivery' ? '' : 'target="_blank" rel="noopener"'}><span><b>Teikit ${esc(s.name)}</b><small>${esc(s.addr)}</small></span>${icon('i-arrow').replace('<svg>', '<svg width="16" height="16">')}</a>`).join('')
      : `<a href="#locales"><span><b>Aún no estamos ahí</b><small>Mira todos nuestros locales</small></span></a>`;
    box.classList.add('open');
  }
  $('#locQuery').addEventListener('input', locate);

  /* ---------- Carrito (demo: el pago real sigue en el sistema actual de Teikit) ---------- */
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem('tk_cart') || '{}'); } catch (e) {}
  const save = () => { try { localStorage.setItem('tk_cart', JSON.stringify(cart)); } catch (e) {} };
  const count = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const total = () => Object.entries(cart).reduce((a, [id, q]) => a + (byId[id] ? byId[id].price * q : 0), 0);

  function syncAdded() {
    $$('[data-add]').forEach((b) => {
      const inCart = cart[b.dataset.add];
      b.classList.toggle('done', !!inCart);
      const wide = b.textContent.trim().length > 0 || b.dataset.wide;
      if (wide) { b.dataset.wide = 1; b.innerHTML = inCart ? `${icon('i-check')} ${inCart} en pedido` : `${icon('i-plus')} Añadir`; }
      else b.innerHTML = inCart ? icon('i-check') : icon('i-plus');
    });
  }

  // "Completa tu pedido": un entrante, un postre y una bebida que aún no estén en el pedido
  const SUGGEST = [['ENTRANTES', ['chicken-gyozas', 'edamame-trufado', 'veggie-gyozas']], ['POSTRES', ['mochi-mango', 'cheesecake-oreo', 'mochi-te-matcha']], ['BEBIDAS', ['kirin', 'coca-cola', 'sapporo']]];
  function suggestions() {
    const inCart = Object.keys(cart);
    const picks = SUGGEST.filter(([cat]) => !inCart.some((id) => byId[id].cat === cat)).map(([, ids]) => ids.find((id) => byId[id] && !cart[id])).filter(Boolean);
    if (!picks.length) return '';
    return `<div class="sugg"><div class="sugg-h"><b>Completa tu pedido</b><span>Lo que más se pide junto a tus rolls</span></div><div class="sugg-g">${picks.map((id) => {
      const it = byId[id];
      return `<div class="sg"><img src="${it.img}" alt="" /><b>${esc(it.name)}</b><div class="r"><span>${eur(it.price)}</span><button class="add" data-add="${id}" aria-label="Añadir ${esc(it.name)}">${icon('i-plus')}</button></div></div>`;
    }).join('')}</div></div>`;
  }

  function renderCart() {
    const n = count(), t = total();
    $('#cartCount').textContent = n;
    $('#cartBtn').classList.toggle('has', n > 0);
    $('#cartBar').classList.toggle('show', n > 0 && !document.body.classList.contains('cart-open'));
    $('#barTotal').textContent = eur(t);
    $('#barCount').textContent = `${n} ${n === 1 ? 'producto' : 'productos'}`;
    $('#sub').textContent = eur(t); $('#tot').textContent = eur(t);
    $('#lines').innerHTML = n ? Object.entries(cart).map(([id, q]) => {
      const it = byId[id];
      return `<div class="line"><img src="${it.img}" alt="" /><div><b>${esc(it.name)}</b><span>${eur(it.price * q)}</span></div>
        <div class="qty"><button data-dec="${id}" aria-label="Quitar uno">−</button><output>${q}</output><button data-inc="${id}" aria-label="Añadir uno">+</button></div></div>`;
    }).join('') + suggestions() : `<div class="empty-cart">Tu pedido está vacío.<br />Empieza por un <a href="#favoritos" style="text-decoration:underline">best seller</a>.</div>`;
    $('#drawerCount').textContent = n ? `${n} ${n === 1 ? 'producto' : 'productos'}` : '';
    syncAdded();
  }

  function toast(it) {
    const t = $('#toast'); t.querySelector('img').src = it.img; t.querySelector('span').textContent = `${it.name} añadido`;
    t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1600);
  }

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    if (add) {
      const id = add.dataset.add; cart[id] = (cart[id] || 0) + 1; save(); renderCart(); toast(byId[id]);
      const cb = $('#cartBtn'); cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump');
    } else if (inc) { cart[inc.dataset.inc]++; save(); renderCart(); }
    else if (dec) { const id = dec.dataset.dec; if (--cart[id] <= 0) delete cart[id]; save(); renderCart(); }
  });

  const open = (o) => { document.body.classList.toggle('cart-open', o); $('#drawer').setAttribute('aria-hidden', !o); renderCart(); };
  $('#cartBtn').addEventListener('click', () => open(true));
  $('#barOpen').addEventListener('click', () => open(true));
  $('#drawerX').addEventListener('click', () => open(false));
  $('#drawerBg').addEventListener('click', () => open(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });

  /* ---------- Init ---------- */
  renderMenu();
  renderCart();
  observe();
  // Los elementos del hero entran al cargar
  requestAnimationFrame(() => $$('.hero .rv').forEach((el) => el.classList.add('in')));
})();
