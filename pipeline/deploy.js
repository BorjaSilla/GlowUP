#!/usr/bin/env node
// GlowUp · Publica la web (landing, propuestas y demos) en Netlify subiendo un zip.
//   node pipeline/deploy.js
// Token: NETLIFY_AUTH_TOKEN, o inyectado por el proxy en la nube de Claude. Sitio: NETLIFY_SITE_ID.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = process.env.NETLIFY_SITE_ID || '20b79184-8680-4316-875b-12afec39349e';
const API = 'https://api.netlify.com/api/v1';
const headers = process.env.NETLIFY_AUTH_TOKEN ? { authorization: `Bearer ${process.env.NETLIFY_AUTH_TOKEN}` } : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const zip = path.join(os.tmpdir(), `glowup-site-${Date.now()}.zip`);
  // Solo lo público: nada de pipeline, clientes, herramientas ni dependencias
  execFileSync('zip', ['-qr', zip, '.', '-x', '.git/*', 'node_modules/*', '*/node_modules/*', 'dist/*', 'pipeline/*', 'clients/*', 'tools/*', '.netlify/*', '.vercel/*', '*.md'], { cwd: ROOT });
  console.log(`Subiendo ${(fs.statSync(zip).size / 1e6).toFixed(1)} MB…`);
  const r = await fetch(`${API}/sites/${SITE}/deploys`, { method: 'POST', headers: { ...headers, 'content-type': 'application/zip' }, body: fs.readFileSync(zip) });
  const d = await r.json().catch(() => ({}));
  fs.unlinkSync(zip);
  if (!d.id) throw new Error(`Netlify respondió ${r.status}: ${JSON.stringify(d).slice(0, 200)}`);
  let state = d.state;
  for (let i = 0; i < 40 && !['ready', 'error'].includes(state); i++) { await sleep(3000); state = (await (await fetch(`${API}/deploys/${d.id}`, { headers })).json()).state; }
  if (state !== 'ready') throw new Error(`Deploy ${d.id}: ${state}`);
  console.log(`✔ Publicado: ${d.ssl_url || d.url}`);
})().catch((e) => { console.error('✖', e.message); process.exit(1); });
