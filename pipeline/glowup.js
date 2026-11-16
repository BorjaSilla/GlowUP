#!/usr/bin/env node
// GlowUp · pipeline de propuestas para tiendas Shopify.
//
//   node pipeline/glowup.js new <url-tienda> [--slug nombre] [--no-lighthouse]
//   node pipeline/glowup.js batch <archivo.txt>        (una URL por línea)
//   node pipeline/glowup.js render <slug>              (tras editar clients/<slug>.json)
//
// Para cada tienda: extrae catálogo y marca → genera la demo (demo/<slug>) → la sirve en local →
// mide y captura antes/después (assets/shots/<slug>) → escribe la propuesta (para/<slug>) →
// deja el mensaje de contacto y el registro (pipeline/out). Después: revisar, publicar y enviar.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { extract } = require('./lib/extract');
const { buildDemo } = require('./lib/build-demo');
const { captureAll } = require('./lib/capture');
const { writeProposal, defaultPitch } = require('./lib/proposal');
const { writeOutreach } = require('./lib/outreach');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.GLOWUP_BASE_URL || 'https://glowup-studio-qryf.netlify.app';
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^www\./, '').replace(/\.(com|es|shop|store|co|net|eu|cat|org)(\.[a-z]+)?$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const log = (...a) => console.log(...a);

// Servidor estático mínimo para medir y capturar la demo en local
function serve() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function one(url, opts = {}) {
  const t0 = Date.now();
  log(`\n▶ ${url}`);
  log('1/5 Extrayendo catálogo y marca…');
  let store = await extract(url);
  // La lectura de marca a veces falla (popups de país/cookies que tardan): un reintento
  if (!store.brand.logo && !store.brand.logoSvg && !store.brand.heroImage) { log('   (marca sin leer, reintentando…)'); const s2 = await extract(url); if (s2.brand.logo || s2.brand.heroImage) store = s2; }
  const slug = opts.slug || slugify(store.domain);
  const cdir = path.join(ROOT, 'clients');
  fs.mkdirSync(cdir, { recursive: true });
  const cfile = path.join(cdir, `${slug}.json`);
  const prev = fs.existsSync(cfile) ? JSON.parse(fs.readFileSync(cfile, 'utf8')) : {};
  const name = (prev.name || store.brand.name || store.domain).trim();
  store.brand.name = name;
  log(`   ${name}: ${store.stats.products} productos, ${store.stats.collections} colecciones, botón ${store.brand.ctaBg || '¿?'}, fuente ${String(store.brand.headingFont).split(',')[0]}`);

  log('2/5 Generando la demo…');
  const demo = buildDemo(store, slug, (prev.copy && prev.copy.demo) || {}, { style: prev.styleOverride });
  log(`   Estilo: ${demo.style}${prev.styleOverride ? ' (forzado)' : ''}`);
  const pdpHandle = demo.selection.hero[0] || store.products[0].handle;
  const variant = store.products.find((p) => p.handle === pdpHandle).variants.find((v) => v.available);

  log('3/5 Midiendo y capturando antes/después…');
  const srv = await serve();
  const local = `http://127.0.0.1:${srv.address().port}`;
  const shotsDir = path.join(ROOT, 'assets/shots', slug);
  const res = await captureAll({ origin: store.origin, demoUrl: `${local}/demo/${slug}/`, outDir: shotsDir, pdpHandle, variantId: variant.id, withLighthouse: !opts.noLighthouse, log });
  srv.close();

  log('4/5 Escribiendo la propuesta…');
  const P = Object.fromEntries(store.products.map((p) => [p.handle, p]));
  const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  const floating = [...demo.selection.best].map((h) => P[h]).filter(Boolean).slice(0, 4).map((p) => ({ title: p.title, image: p.images[0], price: eur(p.price) }));
  const client = {
    slug, name, domain: store.domain, origin: store.origin, date: new Date().toISOString(),
    version: String(Date.now()).slice(-6),
    instagram: store.brand.instagram, email: store.brand.email, contactPage: store.brand.contactPage,
    stats: store.stats, collections: store.collections.slice(0, 6).map(({ handle, title }) => ({ handle, title })),
    style: demo.style, styleOverride: prev.styleOverride || null,
    tokens: demo.tokens, pdpHandle, floating, lh: res.lh, film: res.film,
    // Solo conservamos el pitch si lo editaste a mano (si es el automático, se regenera con datos frescos)
    copy: { pitch: (prev.copy && prev.copy.pitch && prev.copy.pitch !== prev.copy.pitchAuto) ? prev.copy.pitch : null, demo: (prev.copy && prev.copy.demo) || {} },
    review: prev.review || { status: 'pendiente', notes: '' },
  };
  client.copy.pitchAuto = defaultPitch(client);
  client.copy.pitch = client.copy.pitch || client.copy.pitchAuto;
  fs.writeFileSync(cfile, JSON.stringify(client, null, 2));
  writeProposal(client);

  log('5/5 Preparando el mensaje…');
  const o = writeOutreach(client, BASE);
  log(`✔ ${name} listo en ${Math.round((Date.now() - t0) / 1000)} s`);
  log(`   Propuesta: para/${slug}/   Demo: demo/${slug}/   Mensaje: ${path.relative(ROOT, o.file)}`);
  if (res.lh.before) log(`   Lighthouse móvil: ${res.lh.before.performance} → ${res.lh.after ? res.lh.after.performance : '?'} · LCP ${res.lh.before.lcp} s → ${res.lh.after ? res.lh.after.lcp : '?'} s`);
  return client;
}

(async () => {
  const [cmd, target] = args;
  const opts = { slug: flag('--slug'), noLighthouse: !!flag('--no-lighthouse') };
  if (cmd === 'new' && target) { await one(target, opts); return; }
  if (cmd === 'render' && target) {
    // Tras revisar/editar clients/<slug>.json: regenera propuesta y mensaje sin volver a capturar
    const cfile = path.join(ROOT, 'clients', target + '.json');
    const c = JSON.parse(fs.readFileSync(cfile, 'utf8'));
    c.copy = c.copy || {};
    if (!c.copy.pitch || c.copy.pitch === c.copy.pitchAuto) c.copy.pitch = c.copy.pitchAuto = defaultPitch(c);
    fs.writeFileSync(cfile, JSON.stringify(c, null, 2));
    writeProposal(c); const o = writeOutreach(c, BASE);
    log(`✔ ${c.name}: propuesta para/${c.slug}/ y mensaje ${path.relative(ROOT, o.file)} regenerados`);
    return;
  }
  if (cmd === 'batch' && target) {
    const urls = fs.readFileSync(target, 'utf8').split('\n').map((s) => s.split(' #')[0].trim()).filter((s) => s && !s.startsWith('#'));
    const ok = [], ko = [];
    for (const u of urls) { try { ok.push((await one(u, { noLighthouse: opts.noLighthouse })).slug); } catch (e) { ko.push(`${u}: ${e.message}`); log(`✖ ${u}: ${e.message}`); } }
    log(`\nHecho: ${ok.length} propuestas, ${ko.length} fallos.`); ko.forEach((k) => log('  ✖ ' + k));
    return;
  }
  log('Uso:\n  node pipeline/glowup.js new <url-tienda> [--slug nombre] [--no-lighthouse]\n  node pipeline/glowup.js batch <archivo.txt>\n  node pipeline/glowup.js render <slug>');
})().catch((e) => { console.error('✖', e.message); process.exit(1); });
