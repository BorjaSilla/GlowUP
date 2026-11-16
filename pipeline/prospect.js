#!/usr/bin/env node
// GlowUp · Buscador de tiendas: marcas que pagan anuncios en Meta y venden con Shopify.
//
//   node pipeline/prospect.js meta --nicho moda[,joyeria] [--max 400] [--speed]
//   node pipeline/prospect.js meta "zapatillas" "bolsos de piel" [--max 400] [--speed]
//   node pipeline/prospect.js check dominios.txt [--speed]        (sin token: lista hecha a mano)
//
// 1. Meta: busca anuncios ACTIVOS que se ven en España en la Biblioteca de Anuncios (API oficial)
//    y agrupa por página → dominio de destino, nº de anuncios, desde cuándo, alcance en la UE.
// 2. Comprobación: ¿es Shopify? catálogo, ticket mediano, estilo, tema, idioma, Instagram, velocidad.
// 3. Puntuación 0–100 y salida: pipeline/out/leads.csv (todo) y pipeline/out/leads-top.txt
//    (las mejores, una URL por línea, lista para `node pipeline/glowup.js batch pipeline/out/leads-top.txt`).
//
// Token: META_TOKEN (token de usuario de developers.facebook.com con la identidad verificada para la
// Biblioteca de Anuncios). Nunca se guarda en el repositorio.
const fs = require('fs');
const path = require('path');
const { styleOf } = require('./lib/build-demo');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'pipeline/out');
const API = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v23.0'}/ads_archive`;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--speed'].includes(args[i - 1])));
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Palabras que usan los anuncios de cada nicho (en español, para que salgan tiendas de aquí)
const NICHOS = {
  moda: ['nueva colección', 'envío gratis ropa', 'zapatillas', 'sudadera', 'vestidos', 'streetwear', 'moda sostenible'],
  joyeria: ['joyas', 'pendientes', 'collar de plata', 'anillos oro', 'bisutería'],
  cosmetica: ['cosmética natural', 'sérum', 'crema facial', 'rutina skincare', 'champú sólido'],
  cafe: ['café de especialidad', 'café en grano', 'tostadores de café', 'cápsulas compostables'],
  gourmet: ['aceite de oliva virgen extra', 'jamón ibérico', 'conservas gourmet', 'vino online'],
  hogar: ['decoración hogar', 'velas aromáticas', 'textil hogar', 'cerámica artesanal'],
  mascotas: ['pienso natural', 'accesorios para perros', 'comida para gatos'],
  deporte: ['ropa de running', 'ropa de yoga', 'material de pádel', 'suplementos deportivos'],
};

// Temas de Shopify antiguos (sección "vintage" del Theme Store): señal clara de que toca rediseño
const VINTAGE = /^(debut|brooklyn|narrative|simple|supply|venture|boundless|minimal|express|jumpstart|pop|vantage|launch|startup|kagami|editions|district|parallax)$/i;

/* ---------- 1 · Biblioteca de Anuncios de Meta ---------- */
const DOMAIN_RE = /\b((?:[a-z0-9-]+\.)+(?:es|com|shop|store|eu|net|co|cat|org|io|club|online|bio))\b/gi;
const SKIP_DOMAINS = /(facebook|instagram|fb\.me|wa\.me|whatsapp|linktr\.ee|bit\.ly|amazon|google|youtube|tiktok|shopify\.com|myshopify|apple\.com|play\.google|zalando|aliexpress|temu|shein|miravia|elcorteingles)/i;

async function metaSearch(terms, max) {
  const token = process.env.META_TOKEN;
  if (!token) throw new Error('Falta META_TOKEN (token de la Biblioteca de Anuncios de Meta). Mira el README, sección "Buscador de tiendas".');
  const fields = ['id', 'page_id', 'page_name', 'ad_creative_link_captions', 'ad_creative_link_titles', 'ad_creative_bodies', 'ad_delivery_start_time', 'publisher_platforms', 'eu_total_reach', 'ad_snapshot_url'].join(',');
  const pages = new Map();
  for (const term of terms) {
    let url = `${API}?${new URLSearchParams({ search_terms: term, ad_reached_countries: "['ES']", ad_active_status: 'ACTIVE', ad_type: 'ALL', search_type: 'KEYWORD_UNORDERED', fields, limit: '100' })}`;
    let n = 0;
    while (url && n < max) {
      const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
      const j = await r.json().catch(() => ({}));
      if (j.error) { log(`   ✖ "${term}": ${j.error.message}`); if (j.error.code === 613 || j.error.code === 4) { await sleep(60000); continue; } break; }
      for (const ad of j.data || []) {
        n++;
        const p = pages.get(ad.page_id) || { page_id: ad.page_id, page_name: ad.page_name, ads: 0, since: null, reach: 0, domains: {}, terms: new Set(), platforms: new Set(), snapshot: ad.ad_snapshot_url };
        p.ads++; p.terms.add(term); p.reach += +ad.eu_total_reach || 0;
        (ad.publisher_platforms || []).forEach((x) => p.platforms.add(x));
        if (!p.since || ad.ad_delivery_start_time < p.since) p.since = ad.ad_delivery_start_time;
        const text = [...(ad.ad_creative_link_captions || []), ...(ad.ad_creative_link_titles || []), ...(ad.ad_creative_bodies || [])].join(' ');
        for (const m of text.matchAll(DOMAIN_RE)) { const d = m[1].toLowerCase().replace(/^www\./, ''); if (!SKIP_DOMAINS.test(d)) p.domains[d] = (p.domains[d] || 0) + 1; }
        pages.set(ad.page_id, p);
      }
      url = j.paging && j.paging.next; await sleep(400);
    }
    log(`   "${term}": ${n} anuncios`);
  }
  return [...pages.values()].map((p) => {
    const domain = Object.entries(p.domains).sort((a, b) => b[1] - a[1])[0];
    return { ...p, terms: [...p.terms].join(' / '), platforms: [...p.platforms].join(' '), domain: domain ? domain[0] : null };
  });
}

/* ---------- 2 · Comprobar cada tienda ---------- */
async function getText(url, ms = 15000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { headers: { 'user-agent': UA, cookie: 'localization=ES; cart_currency=EUR', 'accept-language': 'es-ES,es;q=0.9' }, signal: ac.signal, redirect: 'follow' }); return { ok: r.ok, status: r.status, url: r.url, text: await r.text() }; }
  catch (e) { return { ok: false, status: 0, text: '', error: e.name === 'AbortError' ? 'timeout' : e.message }; }
  finally { clearTimeout(t); }
}
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

async function check(domain, { speed } = {}) {
  const origin = 'https://' + domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const res = { domain: new URL(origin).hostname.replace(/^www\./, ''), origin };
  const home = await getText(origin);
  if (!home.ok) return { ...res, shopify: false, motivo: `no responde (${home.status || home.error})` };
  const h = home.text;
  res.origin = new URL(home.url).origin;
  res.shopify = /cdn\.shopify\.com|Shopify\.theme|shopify-section|\/cdn\/shop\//.test(h);
  if (!res.shopify) return { ...res, motivo: 'no es Shopify' };
  res.lang = ((h.match(/<html[^>]*\blang="([a-z]{2})/i) || [])[1] || '').toLowerCase();
  const th = h.match(/Shopify\.theme\s*=\s*(\{[^;]*?\})\s*;/);
  try { const t = JSON.parse(th[1]); res.theme = t.schema_name || t.name || ''; } catch (e) { res.theme = ((h.match(/"schema_name":"([^"]+)"/) || [])[1]) || ''; }
  res.instagram = ((h.match(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.]+/) || [])[0]) || '';
  res.email = ((h.match(/mailto:([^"'?\s]+@[^"'?\s]+)/) || [])[1]) || '';
  const pj = await getText(`${res.origin}/products.json?limit=250`);
  let products = [];
  try { products = JSON.parse(pj.text).products || []; } catch (e) {}
  if (!products.length) return { ...res, motivo: 'catálogo cerrado (products.json)' };
  res.products = products.length >= 250 ? '250+' : products.length;
  const prices = products.map((p) => +((p.variants || [])[0] || {}).price).filter((x) => x > 0);
  res.ticket = Math.round(median(prices));
  const last = products.map((p) => p.updated_at || p.published_at).filter(Boolean).sort().pop();
  res.updated = last ? last.slice(0, 10) : '';
  res.style = styleOf({ products: products.map((p) => ({ title: p.title, type: p.product_type, tags: [].concat(p.tags || []) })) });
  if (speed) {
    const { lighthouse } = require('./lib/capture');
    const { chromium } = require('playwright');
    const lh = await lighthouse(res.origin, chromium.executablePath());
    if (lh) { res.perf = lh.performance; res.lcp = lh.lcp; }
  }
  return res;
}

/* ---------- 3 · Puntuar ---------- */
function score(r) {
  if (!r.shopify || !r.products) return 0;
  let s = 0; const why = [];
  const n = r.products === '250+' ? 250 : r.products;
  // Gasto en anuncios: cuántos, desde cuándo, a cuánta gente llegan
  if (r.ads != null) {
    s += Math.min(r.ads, 20) / 20 * 22;
    const days = r.since ? (Date.now() - new Date(r.since)) / 864e5 : 0;
    if (days > 30) { s += 8; why.push(`anuncia desde hace ${Math.round(days)} días`); }
    if (r.reach > 0) s += Math.min(10, Math.log10(r.reach) * 2);
    why.push(`${r.ads} anuncios activos`);
  }
  // Catálogo con ventas reales, sin ser un gigante con agencia
  if (n >= 15 && n <= 1500) { s += 15; } else if (n < 15) { s += 4; why.push('catálogo pequeño'); }
  if (r.ticket >= 60) { s += 15; why.push(`ticket ~${r.ticket} €`); } else if (r.ticket >= 30) { s += 10; why.push(`ticket ~${r.ticket} €`); } else s += 3;
  // Señales de que la web pide un cambio
  if (VINTAGE.test(r.theme || '')) { s += 12; why.push(`tema antiguo (${r.theme})`); }
  else if (/^dawn$/i.test(r.theme || '')) { s += 6; why.push('tema por defecto (Dawn)'); }
  if (r.perf != null) { if (r.perf < 50) { s += 18; why.push(`web lenta (${r.perf}/100)`); } else if (r.perf < 70) { s += 10; why.push(`web mejorable (${r.perf}/100)`); } else if (r.perf < 85) s += 4; }
  // Tienda española y activa
  if (r.lang && r.lang !== 'es' && r.lang !== 'ca') { s -= 15; why.push(`idioma ${r.lang}`); }
  if (r.updated && (Date.now() - new Date(r.updated)) / 864e5 > 180) { s -= 10; why.push('catálogo sin tocar en 6 meses'); }
  if (r.instagram) s += 3;
  return { score: Math.max(0, Math.min(100, Math.round(s))), why: why.join(' · ') };
}

/* ---------- Salida ---------- */
const csvCell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
function contacted() {
  const f = path.join(OUT, 'prospects.csv');
  if (!fs.existsSync(f)) return new Set();
  return new Set(fs.readFileSync(f, 'utf8').split('\n').slice(1).map((l) => (l.split(',')[3] || '').replace(/"/g, '').replace(/^www\./, '')).filter(Boolean));
}
function write(rows, top) {
  fs.mkdirSync(OUT, { recursive: true });
  const cols = ['score', 'dominio', 'pagina_meta', 'anuncios_activos', 'anuncia_desde', 'alcance_ue', 'busquedas', 'productos', 'ticket_mediano', 'estilo', 'tema', 'rendimiento', 'lcp', 'idioma', 'instagram', 'email', 'por_que', 'biblioteca_anuncios'];
  const lines = rows.map((r) => [r.score, r.domain, r.page_name, r.ads, (r.since || '').slice(0, 10), r.reach || '', r.terms, r.products, r.ticket, r.style, r.theme, r.perf, r.lcp, r.lang, r.instagram, r.email, r.why || r.motivo, r.page_id ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ES&view_all_page_id=${r.page_id}` : ''].map(csvCell).join(','));
  fs.writeFileSync(path.join(OUT, 'leads.csv'), [cols.join(','), ...lines].join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, 'leads-top.txt'), `# Mejores tiendas (${new Date().toISOString().slice(0, 10)}). Siguiente paso:\n#   node pipeline/glowup.js batch pipeline/out/leads-top.txt\n` + top.map((r) => `${r.origin}   # ${r.score} · ${r.why}`).join('\n') + '\n');
}

(async () => {
  const [cmd, ...rest] = positional;
  const speed = !!flag('--speed');
  const minScore = +(flag('--min') || (cmd === 'meta' ? 45 : 30)), topN = +(flag('--top') || 50), max = +(flag('--max') || 300);
  let cands = [];
  if (cmd === 'meta') {
    const nicho = flag('--nicho');
    // Uno o varios nichos separados por comas: --nicho moda,joyeria
    const terms = nicho ? String(nicho).split(',').flatMap((n) => NICHOS[n.trim()] || (() => { throw new Error(`Nicho desconocido: ${n}. Opciones: ${Object.keys(NICHOS).join(', ')}`); })()) : rest;
    if (!terms.length) throw new Error('Dime qué buscar: --nicho moda, o palabras entre comillas.');
    log(`1/3 Buscando anuncios activos en España (${terms.length} búsquedas)…`);
    const pages = await metaSearch(terms, max);
    const byDomain = new Map();
    for (const p of pages.filter((x) => x.domain)) { const e = byDomain.get(p.domain); if (!e || p.ads > e.ads) byDomain.set(p.domain, p); }
    cands = [...byDomain.values()];
    log(`   ${pages.length} anunciantes, ${cands.length} con web propia`);
  } else if (cmd === 'check' && rest[0]) {
    cands = fs.readFileSync(rest[0], 'utf8').split('\n').map((s) => s.trim().split(/\s+/)[0]).filter((s) => s && !s.startsWith('#')).map((d) => d.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '').toLowerCase());
    cands = [...new Set(cands)].map((domain) => ({ domain }));
  } else {
    log('Uso:\n  node pipeline/prospect.js meta --nicho moda|joyeria|cosmetica|cafe|gourmet|hogar|mascotas|deporte [--max 300] [--speed] [--top 50] [--min 45]\n  node pipeline/prospect.js meta "palabra" "otra palabra" [...]\n  node pipeline/prospect.js check dominios.txt [--speed]');
    return;
  }
  const done = contacted();
  const before = cands.length; cands = cands.filter((c) => !done.has(c.domain));
  if (before !== cands.length) log(`   ${before - cands.length} ya contactadas, fuera`);
  log(`2/3 Comprobando ${cands.length} tiendas${speed ? ' (con velocidad: ~30 s cada una)' : ''}…`);
  const rows = []; let i = 0;
  const worker = async () => { while (i < cands.length) { const c = cands[i++]; const r = { ...c, ...(await check(c.domain, { speed })) }; Object.assign(r, score(r)); rows.push(r); log(`   ${r.shopify ? (r.products ? '✔' : '·') : '✖'} ${r.domain.padEnd(32)} ${r.score ? String(r.score).padStart(3) : '  -'}  ${r.why || r.motivo || ''}`); } };
  await Promise.all(Array.from({ length: speed ? 1 : 6 }, worker));
  rows.sort((a, b) => (b.score || 0) - (a.score || 0));
  const top = rows.filter((r) => r.score >= minScore).slice(0, topN);
  write(rows, top);
  log(`3/3 ${rows.filter((r) => r.products).length} tiendas Shopify válidas · ${top.length} con puntuación ≥ ${minScore}`);
  log(`   Todo: pipeline/out/leads.csv   Mejores: pipeline/out/leads-top.txt`);
  if (top.length) log(`   Siguiente: node pipeline/glowup.js batch pipeline/out/leads-top.txt`);
})().catch((e) => { console.error('✖', e.message); process.exit(1); });
