// Paso 2 · Generar la demo de la tienda: demo/<slug>/index.html + data.js a partir de la plantilla.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');

/* ---------- Colores ---------- */
const parseRGB = (c) => { const m = String(c || '').match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] } : null; };
const hex = ({ r, g, b }) => '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const WHITE = { r: 255, g: 255, b: 255 }, BLACK = { r: 17, g: 17, b: 17 };

function tokens(brand) {
  const bg0 = parseRGB(brand.bodyBg); const bg = bg0 && bg0.a > 0.5 ? bg0 : WHITE;
  const ink0 = parseRGB(brand.ink); const ink = ink0 && contrast(ink0, bg) > 4.5 ? ink0 : (lum(bg) > 0.5 ? BLACK : WHITE);
  let cta = parseRGB(brand.ctaBg);
  // Si el botón es casi del color del fondo o no se detectó, usamos el color del texto
  if (!cta || cta.a < 0.5 || contrast(cta, bg) < 1.4) cta = ink;
  const fg0 = parseRGB(brand.ctaFg);
  const ctaFg = fg0 && contrast(fg0, cta) >= 3 ? fg0 : (contrast(WHITE, cta) >= contrast(BLACK, cta) ? WHITE : BLACK);
  // Fondo suave para tarjetas: el fondo un poco hacia la tinta
  const mix = (a, b, t) => ({ r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) });
  const soft = mix(bg, ink, lum(bg) > 0.5 ? 0.045 : 0.09);
  const line = lum(bg) > 0.5 ? 'rgba(0,0,0,.09)' : 'rgba(255,255,255,.12)';
  return { brand: hex(cta), brandFg: hex(ctaFg), bg: hex(bg), ink: hex(ink), soft: hex(soft), line };
}

/* ---------- Tipografías ---------- */
const firstFamily = (ff) => String(ff || '').split(',')[0].replace(/["']/g, '').trim();
const GENERIC = /^(system-ui|-apple-system|sans-serif|serif|helvetica|arial|inherit|initial|times new roman|blinkmacsystemfont|segoe ui)$/i;
function fonts(brand) {
  const head = firstFamily(brand.headingFont), body = firstFamily(brand.bodyFont);
  const fams = [...new Set([head, body].filter((f) => f && !GENERIC.test(f)))];
  // Intentamos cargarlas de Google Fonts (la mayoría de temas Shopify usan fuentes de Google);
  // si no existen, el navegador cae a Inter Tight.
  const q = ['Inter Tight:wght@400;500;600;700', ...fams.map((f) => `${f}:wght@400;500;600;700`)].map((f) => 'family=' + encodeURIComponent(f).replace(/%20/g, '+').replace(/%3A/g, ':').replace(/%40/g, '@').replace(/%3B/g, ';')).join('&');
  const link = `<link href="https://fonts.googleapis.com/css2?${q}&display=swap" rel="stylesheet" />`;
  const stack = (f) => (f && !GENERIC.test(f) ? `"${f}", ` : '') + '"Inter Tight", system-ui, sans-serif';
  return { link, head: stack(head), body: stack(body) };
}

/* ---------- Qué enseñar ---------- */
function pick(store) {
  const P = store.products;
  const byH = Object.fromEntries(P.map((p) => [p.handle, p]));
  const bestCol = store.collections.find((c) => /best|mas-?vend|más vend|top|favorit|destacad|popular|bestseller/i.test(c.handle + ' ' + c.title) && c.products.length >= 4);
  const best = (bestCol ? bestCol.products : P.map((p) => p.handle)).filter((h) => byH[h]).slice(0, 12);
  const newest = [...P].sort((a, b) => new Date(b.created) - new Date(a.created)).map((p) => p.handle).slice(0, 12);
  const multi = best.filter((h) => byH[h].images.length >= 2);
  const hero = [...new Set([...multi, ...best])].slice(0, 3);
  const storyImages = P.filter((p) => !hero.includes(p.handle) && p.images.length >= 2).slice(0, 2).map((p) => p.handle);
  return { best, newest, hero, storyImages, bestFromCollection: bestCol ? bestCol.title : null };
}

/* ---------- Textos por defecto (se pueden sobrescribir en clients/<slug>.json → copy) ---------- */
function defaultCopy(store) {
  const name = store.brand.name || store.domain;
  const d = (store.brand.description || '').replace(/\s+/g, ' ').trim();
  const firstSentence = d.split(/(?<=[.!?])\s/)[0] || '';
  // Si la descripción está en inglés (o es SEO de "compra online"), usamos textos propios en español
  const english = (d.match(/\b(the|and|with|our|your|is|are|for|born|made|we|it|by|to|of|yet|an|brand|designed|since)\b/gi) || []).length >= 3;
  const usable = d && !english && !/compra(r)? online|envío gratis|tienda online/i.test(d);
  const heroTitle = usable && firstSentence && firstSentence.length <= 70 ? firstSentence.replace(/[.!]$/, '') : `Lo nuevo de ${name}`;
  return {
    heroTitle,
    heroText: usable && d.length > 40 ? d.slice(0, 180).replace(/\s\S*$/, '') + (d.length > 180 ? '…' : '') : `Descubre la colección de ${name}: ${store.stats.products} productos, fotos grandes y compra en dos toques.`,
    collectionsTitle: 'Compra por colección',
    bestTitle: 'Los más queridos',
    bestText: 'Lo que más se lleva ahora mismo.',
    newTitle: 'Novedades',
    storyTitle: `Así es ${name}`,
    storyText: usable ? d : `Cada pieza de ${name}, con fotos grandes, precio claro y compra en dos toques.`,
    relatedTitle: 'También te puede gustar',
    footer: usable ? d.slice(0, 160) : '',
  };
}

function buildDemo(store, slug, copyOverrides = {}) {
  const t = tokens(store.brand), f = fonts(store.brand), sel = pick(store);
  const copy = { ...defaultCopy(store), ...copyOverrides };
  const dir = path.join(ROOT, 'demo', slug);
  fs.mkdirSync(dir, { recursive: true });
  const data = {
    slug, name: store.brand.name || store.domain, domain: store.domain, origin: store.origin, currency: 'EUR',
    logoLight: store.brand.logoLum != null && store.brand.logoLum > 0.8,
    logo: store.brand.logo, logoSvg: store.brand.logoSvg && !store.brand.logo ? store.brand.logoSvg : null,
    announcement: store.brand.announcement, description: store.brand.description,
    instagram: store.brand.instagram, email: store.brand.email, contactPage: store.brand.contactPage,
    heroImage: store.brand.heroImage, campaign: (store.brand.campaign || []).filter((u) => u !== store.brand.heroImage).slice(0, 4),
    copy, ...sel,
    collections: store.collections.slice(0, 12).map(({ handle, title, image, count, desc, products }) => ({ handle, title, image, count, desc, products })),
    products: (() => {
      const shown = new Set([...sel.best, ...sel.newest, ...sel.hero, ...sel.storyImages, ...store.collections.slice(0, 12).flatMap((c) => c.products)]);
      const ordered = [...store.products.filter((p) => shown.has(p.handle)), ...store.products.filter((p) => !shown.has(p.handle))].slice(0, 160);
      return ordered.map(({ handle, title, type, tags, desc, images, options, variants, price, maxPrice, compare, created }) => ({ handle, title, type, tags: tags.slice(0, 6), desc: desc.slice(0, 600), images: images.slice(0, 6), options, variants: variants.map(({ id, title, price, compare, available, options }) => ({ id, title, price, compare, available, options })), price, maxPrice, compare, created }));
    })(),
  };
  fs.writeFileSync(path.join(dir, 'data.js'), `/* Generado por GlowUp el ${new Date().toISOString()} a partir de ${store.origin} */\nwindow.SHOP = ${JSON.stringify(data)};\n`);
  const tpl = fs.readFileSync(path.join(ROOT, 'pipeline/templates/shop/index.html'), 'utf8');
  const css = `--brand:${t.brand};--brand-fg:${t.brandFg};--bg:${t.bg};--ink:${t.ink};--soft:${t.soft};--line:${t.line};--head:${f.head};--body:${f.body};`;
  // Precarga de la imagen principal (lo primero que se ve) para que la portada aparezca antes
  const heroSrc = data.heroImage || (store.products.find((p) => p.handle === sel.hero[0]) || {}).images[0];
  const sized = (u, w) => { try { const x = new URL(u); if (/shopify/.test(x.hostname)) x.searchParams.set('width', w); return x.href; } catch (e) { return u; } };
  const preload = heroSrc ? `<link rel="preload" as="image" href="${esc(sized(heroSrc, 1400))}" fetchpriority="high" />` : '';
  const html = tpl.replace('{{PRELOAD}}', preload).replace(/{{NAME}}/g, esc(data.name)).replace(/{{DOMAIN}}/g, esc(store.domain)).replace(/{{SLUG}}/g, slug).replace('{{FONTS}}', f.link).replace('{{TOKENS}}', css);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  return { dir, tokens: t, fonts: f, selection: sel, copy };
}
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = { buildDemo, tokens, fonts, pick, defaultCopy };
