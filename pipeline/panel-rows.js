#!/usr/bin/env node
// GlowUp · Prepara las filas del panel de leads (Artifact "GlowUp Leads") a partir de clients/<slug>.json.
//   node pipeline/panel-rows.js <slug> [<slug>…]
// Escribe pipeline/out/panel/<slug>.json (un documento por tienda, colección "leads") para subirlos con
// ArtifactData → batch (op "set" solo si la tienda es NUEVA en el panel: así no se pisa lo que marcaste).
const fs = require('fs');
const path = require('path');
const { messages } = require('./lib/outreach');

const ROOT = path.resolve(__dirname, '..');
const BASE = (process.env.GLOWUP_BASE_URL || 'https://glowup-studio-qryf.netlify.app').replace(/\/$/, '');
const OUT = path.join(ROOT, 'pipeline/out/panel');

// Puntuación, motivos y anuncios del buscador (pipeline/out/leads.csv), si la tienda vino de ahí
function leadsByDomain() {
  const f = path.join(ROOT, 'pipeline/out/leads.csv');
  if (!fs.existsSync(f)) return {};
  const parse = (line) => { const out = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
  const [head, ...rows] = fs.readFileSync(f, 'utf8').trim().split('\n');
  const cols = parse(head);
  return Object.fromEntries(rows.map((r) => { const v = parse(r); const o = Object.fromEntries(cols.map((c, i) => [c, v[i]])); return [o.dominio, o]; }));
}

const slugs = process.argv.slice(2);
if (!slugs.length) { console.log('Uso: node pipeline/panel-rows.js <slug> [<slug>…]'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
const L = leadsByDomain();
for (const slug of slugs) {
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'clients', slug + '.json'), 'utf8'));
  const url = `${BASE}/para/${slug}/`;
  const m = messages(c, url);
  const lead = L[c.domain] || L[c.domain.replace(/^www\./, '')] || {};
  const ok = c.quality ? c.quality.ok : true;
  const rejected = c.review && /descart/i.test(c.review.status || '');
  const row = {
    slug, name: c.name, domain: c.domain, style: c.style || null,
    score: lead.score ? +lead.score : null, why: lead.por_que || null, ads: lead.biblioteca_anuncios || null, ticket: lead.ticket_mediano ? +lead.ticket_mediano : null,
    products: c.stats ? c.stats.products : null,
    perfBefore: c.lh && c.lh.before ? c.lh.before.performance : null, perfAfter: c.lh && c.lh.after ? c.lh.after.performance : null,
    lcpBefore: c.lh && c.lh.before ? c.lh.before.lcp : null, lcpAfter: c.lh && c.lh.after ? c.lh.after.lcp : null,
    proposal: url, demo: `${BASE}/demo/${slug}/`, instagram: c.instagram || null, email: c.email || null, contactPage: c.contactPage || null,
    dm: m.dm, form: m.form, followup1: m.followup1, followup2: m.followup2,
    estado: rejected ? 'descartada' : (!ok || (c.review && c.review.status === 'revisar')) ? 'revisar' : 'lista',
    review: [c.review && c.review.notes, c.quality && !c.quality.ok ? 'Filtro automático: ' + c.quality.reasons.join(' · ') : ''].filter(Boolean).join(' — ') || null,
    created: new Date().toISOString(), notes: '',
  };
  fs.writeFileSync(path.join(OUT, slug + '.json'), JSON.stringify(row, null, 2));
  console.log(`${row.estado.padEnd(10)} ${slug} → pipeline/out/panel/${slug}.json`);
}
