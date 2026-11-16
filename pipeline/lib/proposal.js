// Paso 4 · Propuesta personalizada /para/<slug>/ a partir de los datos de la tienda.
// Misma estructura que la de Teikit: hero Marca × GlowUp, comparativas, móvil, puntos,
// carrera de carga, por qué vende más, garantía con contrato, pasos, calculadora.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 1) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const img = (u, w) => { try { const x = new URL(u); x.searchParams.set('width', w); return x.href; } catch (e) { return u; } };

function defaultPitch(c) {
  return `Os hemos rediseñado la portada, la ficha de producto y el carrito de ${c.name}. Con ${c.stats.products} productos, lo importante es que cada visita encuentre el suyo a la primera y lo compre sin pensárselo dos veces.`;
}

function render(c) {
  const V = c.version || '1';
  const S = (n) => `../../assets/shots/${c.slug}/${n}?v=${V}`;
  const WA = '34683491655';
  const waMsg = encodeURIComponent(`Hola, he visto la propuesta de GlowUp para ${c.name}.`);
  const waHref = `https://wa.me/${WA}?text=${waMsg}`;
  const d = new Date(c.date || Date.now());
  const date = `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
  const lb = c.lh.before, la = c.lh.after;
  const race = { base: `../../assets/shots/${c.slug}/film/`, v: V, times: [0.5, 1, 1.5, 2, 3, 4, 6, 8], before: c.film.before, after: c.film.after,
    doneBefore: (() => { const i = c.film.before.findIndex(Boolean); return i < 0 ? 99 : [0.5, 1, 1.5, 2, 3, 4, 6, 8][Math.min(7, i + 2)]; })(),
    doneAfter: (() => { const i = c.film.after.findIndex(Boolean); return i < 0 ? 99 : [0.5, 1, 1.5, 2, 3, 4, 6, 8][i]; })() };
  const strip = (side) => race.times.map((t, i) => `<figure>${race[side][i] ? `<img src="${race.base}${race[side][i]}?v=${V}" alt="" loading="lazy" />` : '<div class="blank"></div>'}<figcaption>${num(t, t % 1 ? 1 : 0)} s</figcaption></figure>`).join('');
  const kpis = lb && la ? [
    ['Rendimiento en móvil', `${lb.performance} / 100`, `<span data-count="${la.performance}">0</span><span style="font-size:.5em;color:var(--ink-3)"> / 100</span>`, 'Puntuación Lighthouse de Google'],
    ['Carga de la portada (LCP)', `${num(lb.lcp)} s`, `<span data-count="${la.lcp}" data-dec="1">0</span> s`, 'Google pide menos de 2,5 s'],
    ['Peso de la portada', `${num(lb.weightMB)} MB`, `<span data-count="${la.weightMB}" data-dec="1">0</span> MB`, 'Menos datos, menos espera en 4G'],
    ['Accesibilidad', `${lb.accessibility} / 100`, `<span data-count="${la.accessibility}">0</span><span style="font-size:.5em;color:var(--ink-3)"> / 100</span>`, 'Contraste, estructura y etiquetas'],
  ] : [];
  const floating = c.floating.slice(0, 4);
  const ticket = Math.max(15, Math.min(250, Math.round(c.stats.priceMedian * 1.3)));
  const tba = (key, title, sub, first) => `
        <div class="tba-wrap" data-grow>
          <div class="tba-label"><b>${title}</b><span>${sub}</span></div>
          <div class="tba" tabindex="0" role="slider" aria-label="Comparar ${title.toLowerCase()}: hoy y propuesta" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
            <img src="${S(key + '-after.jpg')}" alt="${title} propuesta" ${first ? '' : 'loading="lazy"'} draggable="false" />
            <div class="bf"><img src="${S(key + '-before.jpg')}" alt="${title} hoy" ${first ? '' : 'loading="lazy"'} draggable="false" /></div>
            <span class="tag-l">Hoy</span><span class="tag-r"><i></i>Propuesta a medida</span>
            <div class="line"><span class="knob"><svg><use href="#drag"/></svg></span><span class="hint"><svg><use href="#drag"/></svg> Desliza para comparar</span></div>
          </div>
        </div>`;
  const screen = (key, first) => `
                <div class="tba ps-tba" data-screen="${key}"${first ? '' : ' hidden'} tabindex="0" role="slider" aria-label="Comparar en el móvil" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
                  <img src="${S('m-' + key + '-after.jpg')}" alt="Propuesta en el móvil" loading="lazy" draggable="false" />
                  <div class="bf"><img src="${S('m-' + key + '-before.jpg')}" alt="Web actual en el móvil" loading="lazy" draggable="false" /></div>
                  <div class="line"><span class="knob"><svg><use href="#drag"/></svg></span><span class="hint"><svg><use href="#drag"/></svg> Desliza</span></div>
                </div>`;
  const TGL = '<svg class="tgl" viewBox="-2 -2 58 34" width="50" height="29" aria-hidden="true"><defs><linearGradient id="tgG" x1="0" x2="1"><stop offset="0" stop-color="#ff9a4d"/><stop offset="1" stop-color="#ff4d12"/></linearGradient></defs><rect class="t-off" width="54" height="30" rx="15"/><rect class="t-on" width="54" height="30" rx="15" fill="url(#tgG)"/><rect x=".7" y=".7" width="52.6" height="28.6" rx="14.3" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.1"/><g class="kn"><circle cx="15" cy="15" r="11" fill="#fff"/><path class="sp" d="M15 8.6c.5 4 2.1 5.6 6.1 6.1-4 .5-5.6 2.1-6.1 6.1-.5-4-2.1-5.6-6.1-6.1 4-.5 5.6-2.1 6.1-6.1Z" fill="#ff5a1f"/></g></svg>';
  const WAI = '<svg><use href="#wa"/></svg>';
  const lg = '<img class="lg" src="../../assets/logo.svg" alt="" />';

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(c.name)} × GlowUp</title>
  <meta name="description" content="Os hemos rediseñado la tienda de ${esc(c.name)}. Antes y después, velocidad medida y garantía." />
  <meta name="robots" content="noindex, nofollow" />
  <meta property="og:title" content="${esc(c.name)} × GlowUp" />
  <meta property="og:image" content="${S('home-after.jpg')}" />
  <link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../assets/glow.css" />
  <link rel="stylesheet" href="../../assets/proposal.css" />
  <script>window.GLOW = { email: '', whatsapp: '${WA}' };</script>
  <!-- Generada por el pipeline de GlowUp el ${new Date().toISOString()} -->
</head>
<body class="px-page">
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="spark" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5c.7 5.6 2.9 7.8 8.5 8.5-5.6.7-7.8 2.9-8.5 8.5-.7-5.6-2.9-7.8-8.5-8.5 5.6-.7 7.8-2.9 8.5-8.5Z"/></symbol>
  <symbol id="ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></symbol>
  <symbol id="down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></symbol>
  <symbol id="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></symbol>
  <symbol id="drag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 7-5 5 5 5M15 7l5 5-5 5"/></symbol>
  <symbol id="wa" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5Zm0 17.3c-1.5 0-3-.4-4.2-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A7.8 7.8 0 1 1 12 19.8Zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.5-.5-.9-1-1.2-1.6-.1-.2 0-.4.1-.5l.4-.5.2-.4v-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.4-.3Z"/></symbol>
  <symbol id="chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18 3 21V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5Z"/></symbol>
  <symbol id="users" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7M21 20a6 6 0 0 0-4-5.6"/></symbol>
  <symbol id="doc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></symbol>
  <symbol id="rocket" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 15l-3-3a12 12 0 0 1 11-9 12 12 0 0 1-9 11l-3-3"/><circle cx="14.5" cy="9.5" r="1.5"/></symbol>
  <symbol id="star" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9L12 2.8Z"/></symbol>
  <symbol id="tap" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11l3.6.7a2 2 0 0 1 1.6 2.2l-.6 4.6a2 2 0 0 1-2 1.7H11a2 2 0 0 1-1.6-.8L6 14.8a1.5 1.5 0 0 1 2.2-2L9 13.5"/></symbol>
  <symbol id="bolt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></symbol>
  <symbol id="phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></symbol>
  <symbol id="desk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></symbol>
</svg>

<nav class="nav" aria-label="Principal">
  <a class="brand" href="../../" aria-label="GlowUp">${TGL}<span class="word">glow<i>up</i></span></a>
  <div class="links"><a href="#web">La web</a><a href="#porque">Por qué</a><a href="#velocidad">Velocidad</a><a href="#numeros">Números</a></div>
  <a class="btn wa sm" href="${waHref}" target="_blank" rel="noopener">${WAI} Hablemos</a>
</nav>

<main>
  <header class="px-hero" data-hero>
    <div class="wrap">
      <div class="px-float" aria-hidden="true">
${floating.map((p, i) => `        <figure class="fd f${i + 1}" data-depth="${[18, 30, 24, 14][i]}"><img src="${esc(img(p.image, 320))}" alt="" /><span>${esc(p.title.length > 22 ? p.title.slice(0, 21) + '…' : p.title)} · ${esc(p.price)}</span></figure>`).join('\n')}
      </div>
      <span class="pill rv"><span class="in">${lg} GlowUp</span><span class="out">Propuesta a medida · ${date}</span></span>
      <h1 class="rv" style="--d:.08s">${esc(c.name)}<span class="x">×</span>GlowUp</h1>
      <p class="lead rv" style="--d:.16s">${esc(c.copy.pitch)}</p>
      <div class="ctas rv" style="--d:.24s">
        <a class="btn glow lg" href="#web">Ver el antes y después <svg><use href="#down"/></svg></a>
        <a class="btn lg" href="../../demo/${c.slug}/" target="_blank" rel="noopener">Probar la tienda nueva <svg><use href="#ext"/></svg></a>
      </div>
      <div class="rv" style="--d:.3s"><span class="bubble-note"><img src="../../assets/logo.svg" alt="" /><span>No venimos a traeros más visitas. <b>Venimos a que compren más las que ya tenéis.</b></span></span></div>
    </div>
  </header>

  <section class="sec web-first" id="web">
    <div class="wrap">
      <div class="web-head rv">
        <div><span class="ey"><b>${lg} GlowUp</b><span>La tienda</span></span><h2 class="h2">Así quedaría la tienda de ${esc(c.name)}.</h2></div>
        <div class="seg view-seg" data-view-switch role="group" aria-label="Ver comparativas en"><button data-mode="m"><svg><use href="#phone"/></svg> Móvil</button><button data-mode="d"><svg><use href="#desk"/></svg> Escritorio</button></div>
      </div>
      <div class="tba-list" data-tba-list>
${tba('home', 'Portada', 'De arriba abajo, como la vería alguien que llega desde Instagram', true)}
${tba('pdp', 'Ficha de producto', 'Donde se decide la compra')}
        <div class="phones-blk">
          <div class="tba-label" style="max-width:900px;margin:0 auto 18px"><b>En el móvil</b><span>Así se recorre la portada con el pulgar</span></div>
          <div class="phones">
            <div class="one"><span class="lbl">Hoy</span><div class="phone-frame"><div class="scr"><img src="${S('m-home-before.jpg')}" alt="Portada actual en móvil" loading="lazy" /></div></div></div>
            <div class="one"><span class="lbl hot">Propuesta</span><div class="phone-frame"><div class="scr"><img src="${S('m-home-after.jpg')}" alt="Portada propuesta en móvil" loading="lazy" /></div></div></div>
          </div>
          <p class="phones-hint">Desliza dentro de cada móvil para recorrerlo</p>
        </div>
      </div>
      <div class="phone-show" data-phone-show hidden>
        <div class="seg ps-tabs" role="tablist" aria-label="Pantalla">
          <button class="on" data-screen="home" data-cap="De arriba abajo, como la vería alguien que llega desde Instagram">Portada</button>
          <button data-screen="pdp" data-cap="Donde se decide la compra">Ficha</button>
          <button data-screen="cart" data-cap="El último paso antes de pagar">Carrito</button>
        </div>
        <p class="ps-cap" data-ps-cap>De arriba abajo, como la vería alguien que llega desde Instagram</p>
        <div class="ps-legend"><span><i></i>Hoy</span><span class="hot">Propuesta<i></i></span></div>
        <div class="ps-device">
          <div class="phone-frame ps-frame"><div class="scr ps-scroll" data-ps-scroll>
${screen('home', true)}${screen('pdp')}${screen('cart')}
          </div></div>
          <div class="ps-hint" data-ps-hint><span class="sw"><i></i></span> Desplázate dentro del móvil</div>
        </div>
      </div>
      <p class="prelim rv"><svg width="16" height="16" style="flex:none;color:var(--ink-3)"><use href="#spark"/></svg><span><b>Versión preliminar.</b> Es un avance de la portada, la ficha y el carrito, no la tienda entera: la dirección que tomaríamos con vosotros. El pago sigue en vuestro Shopify.</span></p>
      <div class="reply rv"><p>¿Qué os parece?<span>Escribidnos por WhatsApp. Os respondemos nosotros, no un comercial.</span></p><div><a class="btn wa" href="${waHref}" target="_blank" rel="noopener">${WAI} Escribir por WhatsApp</a></div></div>
    </div>
  </section>

  <section class="sec" id="porque">
    <div class="wrap">
      <div class="sec-head">
        <span class="ey rv"><b>${lg} GlowUp</b><span>Antes de nada</span></span>
        <h2 class="h2 rv">Antes de meter un euro<br />más en anuncios.</h2>
        <p class="lead rv" style="--d:.08s">Cada euro en Meta o Google trae visitas, no ventas. Cuántas de esas visitas compran lo decide la tienda.</p>
      </div>
      <div class="dark-card rv">
        <div class="dots-wrap">
          <div><div class="dots-head"><div><small>Hoy</small><b>1,5 %</b></div><span>3 de cada 200 compran</span></div><div class="dots" data-dots="3"></div></div>
          <div><div class="dots-head hot"><div><small>Con la tienda nueva</small><b>2 %</b></div><span>4 de cada 200 compran</span></div><div class="dots hot" data-dots="4"></div></div>
        </div>
        <div class="dots-sum"><b>+33 % de ventas</b><span>Con las mismas visitas y el mismo gasto en anuncios. Ejemplo orientativo.</span></div>
      </div>
      <div class="pts3">
        <div class="pt rv"><i>01</i><b>Las visitas ya las pagáis.</b><p>Anuncios, Instagram, Google: cada visita os ha costado algo. Que compre o se vaya lo decide la tienda.</p></div>
        <div class="pt rv" style="--d:.06s"><i>02</i><b>Más presupuesto no arregla una tienda que no convierte.</b><p>Si de cada 100 visitas compran una o dos, subir la inversión solo trae más gente que se va.</p></div>
        <div class="pt rv" style="--d:.12s"><i>03</i><b>Convertir mejor abarata todo.</b><p>Del 1,5 % al 2 %, cada venta os cuesta un 25 % menos en anuncios.</p></div>
      </div>
    </div>
  </section>

  <section class="sec" id="velocidad">
    <div class="wrap">
      <div class="sec-head">
        <span class="ey rv"><b>${lg} GlowUp</b><span>Lo que no sale en una captura</span></span>
        <h2 class="h2 rv">Abrid las dos en un móvil.<br />A la vez.</h2>
        <p class="lead rv" style="--d:.08s">Misma conexión para las dos: 4G lento y un móvil normal, como mide Google.</p>
      </div>
      <div class="race rv" data-race='${JSON.stringify(race)}'>
        <div class="side" data-side="before"><span class="lbl">${esc(c.domain)} hoy</span><div class="phone-frame"><div class="scr"><img alt="Carga de la tienda actual" style="opacity:0" /></div></div><div class="state">Pantalla en blanco…</div></div>
        <div class="clock"><b>0,0 s</b><span>tiempo de carga</span><div class="track"><i></i></div></div>
        <div class="side" data-side="after"><span class="lbl hot">Con GlowUp</span><div class="phone-frame"><div class="scr"><img alt="Carga de la tienda nueva" style="opacity:0" /></div></div><div class="state">Cargando…</div></div>
      </div>
${kpis.length ? `      <div class="kpi-row" style="margin-top:40px">
${kpis.map(([l, f, t, n], i) => `        <div class="kpi-t rv" style="--d:${(i * 0.05).toFixed(2)}s"><div class="lbl">${l}</div><div class="from">${f}</div><div class="to">${t}</div><div class="nt">${n}</div></div>`).join('\n')}
      </div>
      <p class="src rv">Medido con Google Lighthouse (perfil móvil) sobre ${esc(c.domain)} y sobre la nueva tienda, el ${d.toLocaleDateString('es-ES')}.</p>` : ''}
    </div>
  </section>

  <section class="sec" style="padding-top:clamp(64px,8vw,96px)">
    <div class="wrap">
      <div class="sec-head" style="text-align:left;max-width:none;margin-bottom:22px;display:flex;justify-content:space-between;align-items:end;flex-wrap:wrap;gap:8px">
        <div><span class="ey rv"><b>${lg} GlowUp</b><span>La propuesta</span></span><h2 class="h2 rv" style="font-size:clamp(28px,3.2vw,40px)">¿Por qué esta tienda vende más?</h2></div>
        <span class="muted rv" style="font-size:14px">Lo que cambia para quien entra en ${esc(c.name)}.</span>
      </div>
      <div class="why">
        ${(c.style === 'editorial' ? [
          ['star', 'La campaña, primero', 'Vuestras fotos y vídeo a pantalla completa: la marca entra por los ojos antes que por el catálogo.'],
          ['tap', 'Talla en un toque', 'Al pasar por la foto aparecen las tallas disponibles: se añade a la cesta sin entrar en la ficha.'],
          ['bolt', 'Más rápida', 'Imágenes al tamaño justo y el vídeo carga después de la foto: la primera pantalla aparece antes.'],
          ['check', 'Ficha que vende', 'Fotos grandes, tallas claras, “Completa el look” y compra fija en el móvil, directa a vuestro checkout.'],
        ] : [
          ['star', 'Lo mejor, arriba', 'Los productos que más se venden, con precio, en la primera pantalla.'],
          ['tap', 'Elegir sin dudar', 'Variantes claras, fotos grandes y barra de compra fija en el móvil.'],
          ['bolt', 'Más rápida', 'Imágenes al tamaño justo y nada que bloquee la primera pantalla.'],
          ['check', 'Carrito sin fricción', 'Se abre al lado, sin salir de la página, y va directo a vuestro checkout.'],
        ]).map(([ic, t, d], i) => `<div class="rv"${i % 2 ? ' style="--d:.05s"' : ''}><i><svg><use href="#${ic}"/></svg></i><span><b>${t}</b>${d}</span></div>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section class="sec" style="padding-top:clamp(64px,8vw,96px)">
    <div class="wrap">
      <div class="guar-blk rv">
        <div>
          <span class="ey" style="background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)"><b style="background:#fff;color:#0a0a0b">${lg} GlowUp</b><span style="color:#c7c7cc">Garantía</span></span>
          <h2>Si la conversión no sube, seguimos trabajando gratis.</h2>
          <p>Antes de empezar dejamos por escrito qué indicador movemos y cómo se mide. Si no se mueve, seguimos sin cobrar hasta que lo haga.</p>
          <ul><li><svg><use href="#check"/></svg> Firmado antes de empezar</li><li><svg><use href="#check"/></svg> Medido con los datos de vuestra tienda</li><li><svg><use href="#check"/></svg> El riesgo lo asumimos nosotros</li></ul>
        </div>
        <div class="docs">
          <div class="doc b1"><div class="hd"><b>Propuesta</b></div><small>${esc(c.name)} · A medida</small><div class="k">PORTADA · FICHA · CARRITO</div></div>
          <div class="doc b2"><div class="hd"><b>Medición</b></div><small>Indicador acordado</small><div class="k">ANTES Y DESPUÉS</div></div>
          <div class="doc main">
            <div class="hd"><img src="../../assets/logo.svg" alt="" /><b>Contrato de garantía</b></div>
            <small>GlowUp × ${esc(c.name)}</small>
            <div class="k">LAS PARTES ACUERDAN</div>
            <ol><li>Acordamos el indicador y cómo se mide.</li><li>Si no sube, GlowUp sigue trabajando sin coste.</li><li>El riesgo lo asume GlowUp.</li></ol>
            <div class="sig"><div><svg viewBox="0 0 120 40"><path d="M4 28c10-18 16-20 18-8s4 10 10-2 8-14 12 0 6 8 14-6c6-10 8 4 12 6s10-6 16-4 10 2 30-2"/></svg><b>GlowUp</b><span>Por GlowUp</span></div><div style="opacity:.55"><svg viewBox="0 0 120 40"></svg><b>${esc(c.name)}</b><span>Por la marca</span></div></div>
            <div class="date">${date}</div><span class="stamp">FIRMADO POR GLOWUP</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="sec" style="padding-top:clamp(64px,8vw,96px)" id="hablemos">
    <div class="wrap">
      <div class="steps-card rv">
        <h2 class="h2" style="font-size:clamp(28px,3.2vw,40px)">Sabemos que esto es un poco raro.</h2>
        <p class="muted" style="max-width:600px;margin:12px auto 0">Alguien a quien no conocéis os ha rediseñado la tienda sin que se lo pidáis. Así que lo hacemos fácil: escribidnos por WhatsApp y nos conocemos.</p>
        <div class="steps">
          <div class="step-i"><div class="ic"><svg><use href="#chat"/></svg><sup>1</sup></div><b>Nos escribís</b><p>Por WhatsApp. Os contestamos nosotros, no un comercial.</p></div>
          <div class="step-i"><div class="ic"><svg><use href="#users"/></svg><sup>2</sup></div><b>Nos conocemos</b><p>Nos contáis cómo funciona ${esc(c.name)} y vemos si encaja.</p></div>
          <div class="step-i"><div class="ic"><svg><use href="#doc"/></svg><sup>3</sup></div><b>Contrato y precio</b><p>Precio cerrado y garantía por escrito. Sin permanencias.</p></div>
          <div class="step-i"><div class="ic"><svg><use href="#rocket"/></svg><sup>4</sup></div><b>Lanzamos</b><p>En unas semanas, en vuestro Shopify y sin cortes.</p></div>
        </div>
        <div class="ctas"><a class="btn wa lg" href="${waHref}" target="_blank" rel="noopener">${WAI} Escribir por WhatsApp</a></div>
      </div>
    </div>
  </section>

  <section class="sec" id="numeros">
    <div class="wrap">
      <div class="sec-head">
        <span class="ey rv"><b>${lg} GlowUp</b><span>Números</span></span>
        <h2 class="h2 rv">Ahora, con vuestros números.</h2>
        <p class="lead rv" style="--d:.08s">Moved las visitas, el ticket y la conversión. Es un ejemplo: cuando hablemos, lo hacemos con vuestros datos.</p>
      </div>
      <div class="calc2 rv" data-calc2>
        <div class="grid4">
          <label><span class="row"><span>Visitas al mes</span><b data-o="visits"></b></span><input type="range" name="visits" min="1000" max="150000" step="1000" value="10000" /></label>
          <label><span class="row"><span>Ticket medio</span><b data-o="ticket"></b></span><input type="range" name="ticket" min="10" max="300" step="1" value="${ticket}" /></label>
          <label><span class="row"><span>Conversión actual</span><b data-o="c1"></b></span><input type="range" name="c1" min="0.3" max="5" step="0.1" value="1.5" /></label>
          <label><span class="row"><span>Conversión con GlowUp</span><b data-o="c2"></b></span><input type="range" name="c2" min="0.3" max="6" step="0.1" value="2" /></label>
        </div>
        <div class="bars"><div class="r"><span data-o="l1"></span><div class="bar"><i data-bar="1"></i></div><b data-o="r1"></b></div><div class="r hot"><span data-o="l2"></span><div class="bar"><i data-bar="2"></i></div><b data-o="r2"></b></div></div>
        <div class="big-res"><small>Con las mismas visitas</small><b data-o="diff"></b></div>
        <div class="tiles2"><div><b data-o="lift"></b><span>de ventas</span></div><div><b data-o="cpa"></b><span>de coste por venta en anuncios</span></div></div>
        <p class="fine">Ejemplo orientativo con un ticket medio de ${ticket} € (calculado a partir de vuestros precios). Lo que firmamos por contrato es que sube.</p>
      </div>
    </div>
  </section>
</main>

<footer class="foot" id="lanzar">
  <div class="top"><span class="tag"><span class="dot"></span> Propuesta preparada para ${esc(c.name)}</span><button class="toggle" data-theme-toggle><span class="sw"></span> Modo oscuro</button></div>
  <div class="grid">
    <div><h2>¿Lo hablamos, ${esc(c.name)}?</h2><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn wa lg" href="${waHref}" target="_blank" rel="noopener">${WAI} Escribir por WhatsApp</a><a class="btn light lg" href="../../demo/${c.slug}/" target="_blank" rel="noopener">Probar la tienda nueva <svg><use href="#ext"/></svg></a></div></div>
    <div><h3>Esta propuesta</h3><ul><li><a href="#web">La tienda</a></li><li><a href="#porque">Por qué</a></li><li><a href="#velocidad">Velocidad</a></li><li><a href="#numeros">Números</a></li></ul></div>
    <div><h3>La tienda nueva</h3><ul><li><a href="../../demo/${c.slug}/">Portada</a></li><li><a href="../../demo/${c.slug}/#/tienda">Productos</a></li></ul></div>
    <div><h3>GlowUp</h3><ul><li><a href="../../">Quiénes somos</a></li><li><a href="../../#como">Cómo trabajamos</a></li></ul></div>
  </div>
  <div class="bottom"><span>© <span data-year></span> GlowUp · Imágenes y productos de ${esc(c.name)}, usados solo para esta propuesta.</span><span class="brand" style="color:#a1a1a6"><img src="../../assets/logo-toggle.svg" alt="" width="38" height="24" /> <span class="word" style="font-size:16px">glow<i>up</i></span></span></div>
</footer>

<script src="../../assets/glow.js"></script>
<script src="../../assets/proposal.js"></script>
</body>
</html>
`;
}

function writeProposal(c) {
  const dir = path.join(ROOT, 'para', c.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), render(c));
  return dir;
}

module.exports = { writeProposal, defaultPitch };
