/* GlowUp · Plantilla de tienda. Lee window.SHOP (lo genera el pipeline) y pinta
   portada, colecciones, ficha de producto, buscador y carrito. El botón de pagar
   lleva al checkout real de Shopify con un enlace de carrito (/cart/ID:CANT,...). */
(() => {
  const S = window.SHOP;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: S.currency || 'EUR' }).format(n);
  const icon = (id) => `<svg><use href="#${id}"/></svg>`;
  // Imágenes de Shopify al tamaño justo
  const img = (u, w = 800) => { if (!u) return ''; try { const x = new URL(u, location.href); if (/shopify/.test(x.hostname)) x.searchParams.set('width', w); return x.href; } catch (e) { return u; } };
  const P = Object.fromEntries(S.products.map((p) => [p.handle, p]));
  const app = $('#app');

  /* ---------- Marca: anuncio, logo, menú, pie ---------- */
  if (S.announcement) { $('#announce').textContent = S.announcement; $('#announce').hidden = false; }
  if (S.logoLight) document.documentElement.classList.add('logo-light');
  $('#logo').innerHTML = S.logo ? `<img src="${esc(S.logo)}" alt="${esc(S.name)}" />` : S.logoSvg || `<span>${esc(S.name)}</span>`;
  const navCols = S.collections.slice(0, 5);
  $('#nav').innerHTML = `<a href="#/tienda">Todo</a>` + navCols.map((c) => `<a href="#/c/${c.handle}">${esc(c.title)}</a>`).join('');
  $('#ft').innerHTML = `<div class="in">
      <div>${S.logo ? `<img class="lg" src="${esc(S.logo)}" alt="${esc(S.name)}" />` : `<h4>${esc(S.name)}</h4>`}<p>${esc(S.copy.footer || S.description || '')}</p></div>
      <div><h4>Tienda</h4><ul><li><a href="#/tienda">Todos los productos</a></li>${navCols.slice(0, 4).map((c) => `<li><a href="#/c/${c.handle}">${esc(c.title)}</a></li>`).join('')}</ul></div>
      <div><h4>Ayuda</h4><ul>
        <li><a href="${S.origin}/policies/shipping-policy" target="_blank" rel="noopener">Envíos</a></li>
        <li><a href="${S.origin}/policies/refund-policy" target="_blank" rel="noopener">Devoluciones</a></li>
        ${S.contactPage ? `<li><a href="${esc(S.contactPage)}" target="_blank" rel="noopener">Contacto</a></li>` : ''}
        ${S.instagram ? `<li><a href="${esc(S.instagram)}" target="_blank" rel="noopener">Instagram</a></li>` : ''}
      </ul></div></div>
    <div class="legal"><span>© ${new Date().getFullYear()} ${esc(S.name)}</span><span>Vista previa de rediseño por <a href="../../" style="text-decoration:underline">GlowUp</a></span></div>`;

  /* ---------- Piezas ---------- */
  const priceHTML = (p) => `${p.price !== p.maxPrice ? 'Desde ' : ''}${eur(p.price)}${p.compare && p.compare > p.price ? ` <s>${eur(p.compare)}</s>` : ''}`;
  const card = (p) => `<a class="pc" href="#/p/${p.handle}">
      <div class="im"><img src="${img(p.images[0], 600)}" alt="${esc(p.title)}" loading="lazy" />${p.images[1] ? `<img src="${img(p.images[1], 600)}" alt="" loading="lazy" />` : ''}
        ${p.compare && p.compare > p.price ? `<span class="sale">−${Math.round((1 - p.price / p.compare) * 100)} %</span>` : ''}
        <button class="qa" data-quick="${p.handle}" aria-label="Añadir ${esc(p.title)}">${icon('i-plus')}</button></div>
      <h3>${esc(p.title)}</h3>
      <div class="pr">${priceHTML(p)}</div>
      ${p.options[0] && p.options[0].values.length > 1 ? `<div class="sw">${p.options[0].values.length} ${esc(p.options[0].name.toLowerCase())}</div>` : ''}
    </a>`;
  const listOf = (handles) => handles.map((h) => P[h]).filter(Boolean);
  const bestList = () => listOf(S.best).slice(0, 10);

  /* ---------- Vistas ---------- */
  function home() {
    const heroP = listOf(S.hero).slice(0, 3);
    const story = listOf(S.storyImages || []).slice(0, 2);
    const heroHTML = S.heroImage ? `
      <section class="hero-full"><img src="${img(S.heroImage, 1400)}" alt="" fetchpriority="high" />
        <div class="wrap"><div class="hf-tx rv"><span class="eyebrow">${esc(S.name)}</span><h1>${esc(S.copy.heroTitle)}</h1><p>${esc(S.copy.heroText)}</p>
          <div class="ctas"><a class="btn light" href="#/tienda">Comprar ahora ${icon('i-arrow')}</a>${S.collections[0] ? `<a class="btn ghost" href="#/c/${S.collections[0].handle}">${esc(S.collections[0].title)}</a>` : ''}</div></div></div></section>
      <section class="hero hero-after"><div class="wrap"><div class="rail">${heroP.concat(bestList().filter((p) => !heroP.includes(p))).slice(0, 8).map(card).join('')}</div>` : '';
    app.innerHTML = S.heroImage ? heroHTML + `
        <div class="trust rv">${trustHTML()}</div></div></section>` + rest() : `
      <section class="hero"><div class="wrap">
        <div class="hero-in">
          <div class="rv"><span class="eyebrow">${esc(S.name)}</span><h1>${esc(S.copy.heroTitle)}</h1><p>${esc(S.copy.heroText)}</p>
            <div class="ctas"><a class="btn" href="#/tienda">Comprar ahora ${icon('i-arrow')}</a>${S.collections[0] ? `<a class="btn ghost" href="#/c/${S.collections[0].handle}">${esc(S.collections[0].title)}</a>` : ''}</div></div>
          <div class="collage rv">${heroP.map((p, i) => `<a href="#/p/${p.handle}"><img src="${img(p.images[0], i ? 600 : 1100)}" alt="${esc(p.title)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} /><span class="tag">${esc(p.title)} · ${eur(p.price)}</span></a>`).join('')}</div>
        </div>
        <div class="trust rv">${trustHTML()}</div>
      </div></section>` + rest();
  }
  function trustHTML() {
    return `
          <div>${icon('i-lock')}<p style="margin:0"><b>Pago seguro</b><span>Checkout de Shopify</span></p></div>
          <div>${icon('i-truck')}<p style="margin:0"><b>Envíos y cambios</b><span><a href="${S.origin}/policies/shipping-policy" target="_blank" rel="noopener" style="text-decoration:underline">Ver condiciones</a></span></p></div>
          <div>${icon('i-grid')}<p style="margin:0"><b>${S.products.length} productos</b><span>${S.collections.length ? S.collections.length + ' colecciones' : 'Catálogo completo'}</span></p></div>
          <div>${icon('i-chat')}<p style="margin:0"><b>Te ayudamos</b><span>${S.email ? esc(S.email) : 'Atención personalizada'}</span></p></div>`;
  }
  function rest() {
    const story = listOf(S.storyImages || []).slice(0, 2);
    const storyImgs = (S.campaign && S.campaign.length >= 2) ? S.campaign.slice(0, 2).map((u) => img(u, 800)) : story.map((p) => img(p.images[1] || p.images[0], 700));
    return `
      ${S.collections.length ? `<section class="sec"><div class="wrap"><div class="sh rv"><div><h2>${esc(S.copy.collectionsTitle)}</h2></div></div>
        <div class="cols">${S.collections.slice(0, 8).map((c) => `<a class="col rv" href="#/c/${c.handle}"><img src="${img(c.image, 700)}" alt="" loading="lazy" /><div><b>${esc(c.title)}</b>${c.count ? `<span>${c.count} productos</span>` : ''}</div></a>`).join('')}</div></div></section>` : ''}
      <section class="sec"><div class="wrap"><div class="sh rv"><div><h2>${esc(S.copy.bestTitle)}</h2><p>${esc(S.copy.bestText)}</p></div><a href="#/tienda">Ver todo ${icon('i-arrow')}</a></div>
        <div class="rail">${bestList().map(card).join('')}</div></div></section>
      ${storyImgs.length === 2 ? `<section class="sec"><div class="wrap"><div class="story rv"><div class="tx"><h2>${esc(S.copy.storyTitle)}</h2><p>${esc(S.copy.storyText)}</p><div><a class="btn" href="#/tienda">Descubrir la tienda ${icon('i-arrow')}</a></div></div>
        <div class="ims">${storyImgs.map((u) => `<img src="${u}" alt="" loading="lazy" />`).join('')}</div></div></div></section>` : ''}
      <section class="sec"><div class="wrap"><div class="sh rv"><div><h2>${esc(S.copy.newTitle)}</h2></div><a href="#/tienda">Ver todo ${icon('i-arrow')}</a></div>
        <div class="grid">${listOf(S.newest).slice(0, 8).map(card).join('')}</div></div></section>`;
  }

  function listing(title, items, sub = '') {
    const types = [...new Set(items.map((p) => p.type).filter(Boolean))].slice(0, 10);
    app.innerHTML = `<section class="sec" style="padding-top:clamp(28px,4vw,48px)"><div class="wrap">
        <div class="crumbs"><a href="#/">Inicio</a><span>/</span><span>${esc(title)}</span></div>
        <div class="sh"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : `<p>${items.length} productos</p>`}</div></div>
        ${types.length > 1 ? `<div class="chips" id="chips"><button class="on" data-t="">Todo</button>${types.map((t) => `<button data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
        <div class="grid" id="lgrid">${items.map(card).join('')}</div></div></section>`;
    const chips = $('#chips');
    if (chips) chips.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('button', chips).forEach((x) => x.classList.toggle('on', x === b)); $('#lgrid').innerHTML = items.filter((p) => !b.dataset.t || p.type === b.dataset.t).map(card).join(''); });
  }

  let sel = {};
  function pdp(handle) {
    const p = P[handle]; if (!p) return home();
    sel = {}; p.options.forEach((o, k) => { const v = p.variants.find((x) => x.available) || p.variants[0]; sel[k] = v.options[k]; });
    const col = S.collections.find((c) => c.products.includes(handle));
    const related = (col ? listOf(col.products) : S.products.filter((x) => x.type === p.type)).filter((x) => x.handle !== handle).slice(0, 8);
    app.innerHTML = `<section class="pdp"><div class="wrap">
      <div class="crumbs"><a href="#/">Inicio</a><span>/</span>${col ? `<a href="#/c/${col.handle}">${esc(col.title)}</a><span>/</span>` : ''}<span>${esc(p.title)}</span></div>
      <div class="pdp-in">
        <div class="gal">
          <div class="th">${p.images.map((u, i) => `<button class="${i ? '' : 'on'}" data-i="${i}" aria-label="Imagen ${i + 1}"><img src="${img(u, 160)}" alt="" /></button>`).join('')}</div>
          <div class="main"><div class="slides" id="slides">${p.images.map((u, i) => `<img src="${img(u, 1100)}" alt="${esc(p.title)}" ${i ? 'loading="lazy"' : ''} />`).join('')}</div>
            <div class="dots">${p.images.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div></div>
        </div>
        <div class="info">
          <div class="vendor">${esc(p.type || S.name)}</div>
          <h1>${esc(p.title)}</h1>
          <div class="pr" id="price"></div>
          ${p.options.map((o, k) => `<div class="opt"><b>${esc(o.name)}: <span id="ov${k}">${esc(sel[k])}</span></b><div class="vals" data-k="${k}">${o.values.map((v) => `<button data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div></div>`).join('')}
          <div class="buy"><div class="qty"><button id="qm" aria-label="Uno menos">−</button><output id="qn">1</output><button id="qp" aria-label="Uno más">+</button></div><button class="btn" id="add">Añadir al carrito</button></div>
          <div class="perks"><div>${icon('i-lock')} Pago seguro con el checkout de Shopify</div><div>${icon('i-truck')} <a href="${S.origin}/policies/shipping-policy" target="_blank" rel="noopener" style="text-decoration:underline">Envíos</a> y <a href="${S.origin}/policies/refund-policy" target="_blank" rel="noopener" style="text-decoration:underline">devoluciones</a></div></div>
          <div class="acc">
            ${p.desc ? `<details open><summary>Descripción ${icon('i-plus')}</summary><div class="c">${esc(p.desc)}</div></details>` : ''}
            <details><summary>Envíos y devoluciones ${icon('i-plus')}</summary><div class="c">Consulta plazos y condiciones en la <a href="${S.origin}/policies/shipping-policy" target="_blank" rel="noopener" style="text-decoration:underline">política de envíos</a> y la de <a href="${S.origin}/policies/refund-policy" target="_blank" rel="noopener" style="text-decoration:underline">devoluciones</a> de ${esc(S.name)}.</div></details>
          </div>
        </div>
      </div>
      ${related.length ? `<div class="sec"><div class="sh"><div><h2>${esc(S.copy.relatedTitle)}</h2></div></div><div class="rail">${related.map(card).join('')}</div></div>` : ''}
    </div></section>
    <div class="sticky-buy" id="sb"><div style="flex:1;min-width:0"><b>${esc(p.title)}</b><span id="sbp"></span></div><button class="btn" id="sbAdd">Añadir</button></div>`;
    let qty = 1;
    const variant = () => p.variants.find((v) => v.options.every((o, k) => o === sel[k])) || p.variants[0];
    const upd = () => {
      const v = variant();
      $('#price').innerHTML = `${eur(v.price)}${v.compare && v.compare > v.price ? ` <s>${eur(v.compare)}</s> <span class="off">−${Math.round((1 - v.price / v.compare) * 100)} %</span>` : ''}`;
      $('#sbp').textContent = eur(v.price);
      $$('.vals').forEach((g) => { const k = +g.dataset.k; $$('button', g).forEach((b) => {
        b.classList.toggle('on', b.dataset.v === sel[k]);
        const ok = p.variants.some((x) => x.available && x.options[k] === b.dataset.v && x.options.every((o, j) => j === k || o === sel[j]));
        b.classList.toggle('na', !ok);
      }); const ov = $('#ov' + k); if (ov) ov.textContent = sel[k]; });
      $('#add').disabled = !v.available; $('#add').textContent = v.available ? 'Añadir al carrito' : 'Agotado';
      $('#qn').textContent = qty;
    };
    $$('.vals').forEach((g) => g.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; sel[+g.dataset.k] = b.dataset.v; upd(); }));
    $('#qm').addEventListener('click', () => { qty = Math.max(1, qty - 1); upd(); });
    $('#qp').addEventListener('click', () => { qty = Math.min(20, qty + 1); upd(); });
    const doAdd = () => { const v = variant(); if (!v.available) return; addToCart(p, v, qty); };
    $('#add').addEventListener('click', doAdd); $('#sbAdd').addEventListener('click', doAdd);
    // Galería: miniaturas en escritorio, deslizar en móvil
    const slides = $('#slides');
    $$('.th button').forEach((b) => b.addEventListener('click', () => { slides.scrollTo({ left: slides.clientWidth * +b.dataset.i, behavior: 'smooth' }); }));
    slides.addEventListener('scroll', () => { const i = Math.round(slides.scrollLeft / slides.clientWidth); $$('.th button').forEach((b, k) => b.classList.toggle('on', k === i)); $$('.gal .dots i').forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
    // Barra de compra fija en móvil cuando el botón principal sale de la vista
    new IntersectionObserver(([e]) => $('#sb') && $('#sb').classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0)).observe($('#add'));
    upd();
  }

  /* ---------- Router ---------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [kind, arg] = h.split('/');
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#/' + h));
    if (kind === 'p') pdp(arg);
    else if (kind === 'c') { const c = S.collections.find((x) => x.handle === arg); c ? listing(c.title, listOf(c.products).length ? listOf(c.products) : S.products, c.desc) : home(); }
    else if (kind === 'tienda') listing('Todos los productos', S.products);
    else home();
    window.scrollTo(0, 0);
    reveal();
  }
  addEventListener('hashchange', route);

  /* ---------- Carrito ---------- */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('gu_cart_' + S.slug) || '[]'); } catch (e) {}
  const save = () => { try { localStorage.setItem('gu_cart_' + S.slug, JSON.stringify(cart)); } catch (e) {} };
  function addToCart(p, v, q = 1) {
    const ex = cart.find((l) => l.v === v.id);
    if (ex) ex.q += q; else cart.push({ v: v.id, h: p.handle, q });
    save(); renderCart(); toast(`${p.title} añadido`);
    const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  }
  function renderCart() {
    const lines = cart.map((l) => { const p = P[l.h]; const v = p && p.variants.find((x) => x.id === l.v); return p && v ? { ...l, p, v } : null; }).filter(Boolean);
    const n = lines.reduce((a, l) => a + l.q, 0), t = lines.reduce((a, l) => a + l.q * l.v.price, 0);
    $('#cartN').textContent = n; $('#cartBtn').classList.toggle('has', n > 0);
    $('#lines').innerHTML = lines.length ? lines.map((l) => `<div class="line"><a href="#/p/${l.p.handle}"><img src="${img(l.p.images[0], 200)}" alt="" /></a><div><b>${esc(l.p.title)}</b><span>${l.v.title !== 'Default Title' ? esc(l.v.title) + ' · ' : ''}${eur(l.v.price)}</span></div>
        <div class="qty"><button data-d="${l.v.id}" aria-label="Uno menos">−</button><output>${l.q}</output><button data-i="${l.v.id}" aria-label="Uno más">+</button></div></div>`).join('')
      : `<div class="empty">Tu carrito está vacío.</div>`;
    $('#sub').textContent = eur(t);
    // Checkout real: enlace de carrito de Shopify con las variantes y cantidades
    $('#checkout').href = lines.length ? `${S.origin}/cart/${lines.map((l) => `${l.v.id}:${l.q}`).join(',')}` : S.origin;
    $('#checkout').toggleAttribute('aria-disabled', !lines.length);
  }
  $('#lines').addEventListener('click', (e) => {
    const i = e.target.closest('[data-i]'), d = e.target.closest('[data-d]');
    if (i) { cart.find((l) => l.v === +i.dataset.i).q++; }
    if (d) { const l = cart.find((x) => x.v === +d.dataset.d); if (--l.q <= 0) cart = cart.filter((x) => x !== l); }
    if (i || d) { save(); renderCart(); }
  });
  const openCart = (o) => { document.body.classList.toggle('cart-open', o); $('#drawer').setAttribute('aria-hidden', !o); };
  $('#cartBtn').addEventListener('click', () => openCart(true));
  $('#drawerX').addEventListener('click', () => openCart(false));
  $('#dbg').addEventListener('click', () => openCart(false));
  // Añadir rápido desde una tarjeta: si hay variantes, abre la ficha
  document.addEventListener('click', (e) => {
    const q = e.target.closest('[data-quick]'); if (!q) return;
    e.preventDefault(); e.stopPropagation();
    const p = P[q.dataset.quick]; const avail = p.variants.filter((v) => v.available);
    if (avail.length === 1) addToCart(p, avail[0]); else location.hash = '#/p/' + p.handle;
  }, true);

  /* ---------- Buscador ---------- */
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const openS = (o) => { $('#srch').classList.toggle('open', o); $('#srch').setAttribute('aria-hidden', !o); if (o) setTimeout(() => $('#q').focus(), 50); };
  $('#searchBtn').addEventListener('click', () => openS(true));
  $('#srchX').addEventListener('click', () => openS(false));
  $('#q').addEventListener('input', (e) => {
    const q = norm(e.target.value.trim());
    const res = q.length < 2 ? [] : S.products.filter((p) => norm(`${p.title} ${p.type} ${p.tags.join(' ')}`).includes(q)).slice(0, 12);
    $('#srchRes').innerHTML = q.length < 2 ? '' : res.length ? `<div class="grid">${res.map(card).join('')}</div>` : `<p class="center" style="color:var(--ink-2)">Sin resultados para “${esc(e.target.value)}”.</p>`;
  });
  $('#srchRes').addEventListener('click', (e) => { if (e.target.closest('a.pc')) openS(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { openS(false); openCart(false); } });

  /* ---------- Aviso y entrada ---------- */
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 1700); }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -6% 0px' }) : null;
  function reveal() { $$('.rv:not(.in)').forEach((el) => (io ? io.observe(el) : el.classList.add('in'))); }

  renderCart();
  route();
})();
