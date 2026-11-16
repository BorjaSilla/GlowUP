// Paso 1 · Extraer una tienda Shopify: catálogo (API pública) + marca (leída del navegador).
// Devuelve un objeto "store" que alimenta la demo y la propuesta.
const { chromium } = require('playwright');

const MARKET_COOKIE = 'localization=ES; cart_currency=EUR';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function getJSON(url) {
  // Forzamos el mercado España: si no, Shopify Markets puede devolver precios de otro país según la IP
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', cookie: MARKET_COOKIE, 'accept-language': 'es-ES,es;q=0.9' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

const strip = (html = '') => html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim();

// Un producto Shopify → lo que necesita la demo
function mapProduct(p) {
  const variants = (p.variants || []).map((v) => ({ id: v.id, title: v.title, price: +v.price, compare: v.compare_at_price ? +v.compare_at_price : null, available: v.available !== false, options: [v.option1, v.option2, v.option3].filter(Boolean) }));
  const prices = variants.map((v) => v.price);
  const compare = variants.map((v) => v.compare).filter(Boolean);
  return {
    id: p.id, handle: p.handle, title: p.title, type: p.product_type || '', vendor: p.vendor || '', tags: p.tags || [],
    desc: strip(p.body_html).slice(0, 1500),
    images: (p.images || []).map((i) => i.src).slice(0, 8),
    options: (p.options || []).filter((o) => !(o.values.length === 1 && /default/i.test(o.values[0]))).map((o) => ({ name: o.name, values: o.values })),
    variants,
    price: Math.min(...prices), maxPrice: Math.max(...prices),
    compare: compare.length ? Math.max(...compare) : null,
    available: variants.some((v) => v.available),
    created: p.created_at, updated: p.updated_at,
  };
}

async function extract(inputUrl, { maxProducts = 250 } = {}) {
  const origin = new URL(/^https?:/.test(inputUrl) ? inputUrl : 'https://' + inputUrl).origin;

  // --- Catálogo (endpoints públicos de cualquier tienda Shopify) ---
  let products = [];
  for (let page = 1; page <= 4 && products.length < maxProducts; page++) {
    const j = await getJSON(`${origin}/products.json?limit=250&page=${page}`);
    if (!j.products || !j.products.length) break;
    products.push(...j.products);
    if (j.products.length < 250) break;
  }
  if (!products.length) throw new Error('No parece una tienda Shopify (products.json vacío)');
  let collections = [];
  try { collections = (await getJSON(`${origin}/collections.json?limit=250`)).collections || []; } catch (e) {}

  // --- Marca, leída de la web real con el navegador ---
  const b = await chromium.launch();
  const ctx0 = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'es-ES' });
  await esMarket(ctx0, origin);
  const page = await ctx0.newPage();
  await page.goto(origin, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // Cierra banners de cookies / popups típicos para leer bien la página
  for (const t of ['Aceptar', 'Aceptar todo', 'Accept', 'Rechazar', 'Cerrar', 'Close']) await page.getByRole('button', { name: t }).first().click({ timeout: 800 }).catch(() => {});
  const brand = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.1; };
    const meta = (n) => (document.querySelector(`meta[property="${n}"],meta[name="${n}"]`) || {}).content || '';
    const abs = (u) => { try { return new URL(u, location.href).href; } catch (e) { return ''; } };
    // Logo: imagen de la cabecera cuyo alt/clase/src sugiera logo, o el primer img del header
    const header = document.querySelector('header, .header, #shopify-section-header, [class*="header"]') || document.body;
    const top = (el) => el.getBoundingClientRect().top + scrollY;
    const cls = (el) => (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || '';
    // Logo: enlace a la portada o elemento con "logo" en la parte alta de la página
    const cands = [...document.querySelectorAll('a[href="/"] img, a[href="/"] svg, a[href$=".com/"] img, a[href$=".com/"] svg, [class*="logo" i] img, [class*="logo" i] svg, img[alt*="logo" i], img[src*="logo" i], svg[class*="logo" i]')]
      .filter((el) => vis(el) && top(el) < 220 && el.getBoundingClientRect().width > 30 && el.getBoundingClientRect().width < 420);
    const imgs = [...header.querySelectorAll('img, svg')].filter(vis);
    const logoEl = cands[0] || imgs.find((i) => /logo/i.test((i.getAttribute('alt') || '') + cls(i) + (i.getAttribute('src') || ''))) || null;
    let logo = null, logoSvg = null;
    if (logoEl) { if (logoEl.tagName === 'IMG') logo = abs(logoEl.currentSrc || logoEl.src); else logoSvg = logoEl.outerHTML.slice(0, 20000); }
    // Color de acción: el botón visible más "de compra"
    const btns = [...document.querySelectorAll('a.button, button, .btn, .button, [type=submit], a[class*="btn"]')].filter(vis);
    const color = (el, p) => getComputedStyle(el)[p];
    const isTransparent = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);
    const cta = btns.find((x) => !isTransparent(color(x, 'backgroundColor')) && !/^rgb\(255, 255, 255\)$/.test(color(x, 'backgroundColor')));
    const bodyFont = color(document.body, 'fontFamily');
    const h = document.querySelector('h1, h2, .h1, .h2');
    const announce = document.querySelector('.announcement-bar, [class*="announcement"], [id*="announcement"]');
    const links = [...document.querySelectorAll('a[href]')].map((a) => a.href);
    const social = (re) => links.find((l) => re.test(l)) || null;
    // Colecciones del menú principal, en su orden: son las que la marca considera importantes
    const navCollections = [...new Set([...header.querySelectorAll('a[href*="/collections/"]'), ...document.querySelectorAll('nav a[href*="/collections/"]')]
      .map((a) => (a.getAttribute('href').match(/\/collections\/([^/?#]+)/) || [])[1]).filter((h) => h && !/^(all|vendors|types)$/.test(h)))].slice(0, 24);
    const mail = links.find((l) => l.startsWith('mailto:'));
    const tel = links.find((l) => l.startsWith('tel:'));
    // Fotos de campaña: las imágenes grandes de la portada (la primera, la principal)
    const big = [...document.querySelectorAll('img')].map((i) => ({ i, r: i.getBoundingClientRect() }))
      .filter(({ i, r }) => r.width * r.height > 160000 && (i.currentSrc || i.src) && !/logo/i.test(i.src))
      .sort((a, b) => (a.r.top + scrollY) - (b.r.top + scrollY));
    const heroImg = big.find(({ r }) => r.top + scrollY < 900);
    const campaign = [...new Set(big.map(({ i }) => abs(i.currentSrc || i.src)))].slice(0, 8);
    return {
      heroImage: heroImg ? abs(heroImg.i.currentSrc || heroImg.i.src) : null, campaign,
      name: meta('og:site_name') || document.title.split(/[|–-]/)[0].trim(),
      title: document.title, description: meta('description') || meta('og:description'),
      ogImage: abs(meta('og:image')), logo, logoSvg,
      ctaBg: cta ? color(cta, 'backgroundColor') : null, ctaFg: cta ? color(cta, 'color') : null,
      headerBg: color(header, 'backgroundColor'), bodyBg: color(document.body, 'backgroundColor'), ink: color(document.body, 'color'),
      bodyFont, headingFont: h ? color(h, 'fontFamily') : bodyFont,
      announcement: announce ? announce.innerText.trim().split('\n')[0].slice(0, 120) : null,
      instagram: social(/instagram\.com\/[^/?#]+/), tiktok: social(/tiktok\.com\/@/), facebook: social(/facebook\.com\/[^/?#]+/),
      email: mail ? mail.replace('mailto:', '').split('?')[0] : null, phone: tel ? tel.replace('tel:', '') : null,
      contactPage: links.find((l) => /\/pages\/contact|\/contact/i.test(l)) || null,
      navCollections,
      lang: document.documentElement.lang || 'es',
    };
  }).catch((e) => ({ error: e.message }));
  // ¿El logo es claro (pensado para ir sobre una foto)? Lo medimos pintándolo en un canvas
  if (brand && brand.logo) {
    brand.logoLum = await page.evaluate(async (src) => {
      try {
        const im = new Image(); im.crossOrigin = 'anonymous'; im.src = src; await im.decode();
        const c = document.createElement('canvas'); c.width = 120; c.height = Math.max(1, Math.round(120 * (im.naturalHeight || 40) / (im.naturalWidth || 120)));
        const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height);
        const d = x.getImageData(0, 0, c.width, c.height).data; let sum = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; }
        return n ? sum / n / 255 : null;
      } catch (e) { return null; }
    }, brand.logo).catch(() => null);
    if (brand.logoLum == null && /blanc|white|negativ|light/i.test(brand.logo)) brand.logoLum = 0.95;
  }
  await b.close();

  let mapped = products.map(mapProduct).filter((p) => p.images.length);
  // Algunas tiendas publican la disponibilidad mal en products.json (todo "agotado"):
  // si más del 90 % sale agotado, no nos fiamos del dato y lo tratamos como disponible.
  const availShare = mapped.filter((p) => p.available).length / (mapped.length || 1);
  if (availShare < 0.1) mapped.forEach((p) => { p.available = true; p.variants.forEach((v) => { v.available = true; }); });
  else mapped = mapped.filter((p) => p.available);
  const known = new Set(mapped.map((p) => p.handle));
  const navOrder = (brand && brand.navCollections) || [];
  const rank = (c) => { const i = navOrder.indexOf(c.handle); return i >= 0 ? i : 1000 + (/sale|outlet|rebaja|regalo|gift|test|hidden|oculta|\d{4}/i.test(c.handle) ? 500 : 0); };
  collections.sort((a, b) => rank(a) - rank(b));
  const cols = collections.filter((c) => c.products_count !== 0 && !/^(all|todos|frontpage|home-page|inicio)$/i.test(c.handle))
    .map((c) => ({ handle: c.handle, title: c.title, image: c.image && c.image.src, count: c.products_count || null, desc: strip(c.body_html).slice(0, 300), products: [] }));
  // Qué productos hay en cada colección (las 10 primeras bastan para la demo)
  for (const c of cols.slice(0, 10)) {
    try {
      const j = await getJSON(`${origin}/collections/${c.handle}/products.json?limit=60`);
      c.products = (j.products || []).map((p) => p.handle).filter((h) => known.has(h));
      if (!c.image && c.products[0]) c.image = (mapped.find((p) => p.handle === c.products[0]) || {}).images[0];
      c.count = c.count || c.products.length;
    } catch (e) {}
  }

  return {
    origin, domain: new URL(origin).hostname.replace(/^www\./, ''),
    extractedAt: new Date().toISOString(),
    brand, products: mapped, collections: cols.filter((c) => c.image && (c.products.length || c.count)),
    stats: {
      products: mapped.length,
      collections: cols.length,
      priceMin: Math.min(...mapped.map((p) => p.price)),
      priceMax: Math.max(...mapped.map((p) => p.maxPrice)),
      priceMedian: (() => { const s = mapped.map((p) => p.price).sort((a, b) => a - b); return s[Math.floor(s.length / 2)] || 0; })(),
      onSale: mapped.filter((p) => p.compare && p.compare > p.price).length,
      types: [...new Set(mapped.map((p) => p.type).filter(Boolean))].slice(0, 12),
    },
  };
}

async function esMarket(ctx, url) {
  const domain = new URL(/^https?:/.test(url) ? url : 'https://' + url).hostname;
  await ctx.addCookies([{ name: 'localization', value: 'ES', domain, path: '/' }, { name: 'cart_currency', value: 'EUR', domain, path: '/' }]);
}

module.exports = { esMarket, extract, mapProduct };
