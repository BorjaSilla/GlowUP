// Paso 5 · Mensaje listo para enviar (DM de Instagram o formulario de contacto) + registro de prospectos.
// El envío lo hace una persona: el sistema solo lo deja preparado.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');

function messages(c, url) {
  const dm = `Hola, equipo de ${c.name}. Os hemos preparado una propuesta de rediseño de ${c.domain}: vuestra tienda, con vuestros productos, funcionando, y el antes y el después. Os la dejo aquí, sin compromiso: ${url}\n\nSi os encaja, hablamos por WhatsApp.`;
  const form = `Hola, equipo de ${c.name}:\n\nSomos GlowUp. Hemos rediseñado la portada, la ficha de producto y el carrito de ${c.domain} con vuestro catálogo real, y lo hemos medido: ${c.lh.before && c.lh.after ? `la portada pasa de ${c.lh.before.lcp.toString().replace('.', ',')} s a ${c.lh.after.lcp.toString().replace('.', ',')} s en cargar en un móvil, ` : ''}y todo está pensado para que más visitas acaben comprando.\n\nPodéis verlo y probarlo aquí: ${url}\n\nSi la conversión no sube, seguimos trabajando gratis; lo dejamos por escrito. Si os interesa, respondednos o escribidnos por WhatsApp y lo vemos en un rato.\n\nUn saludo,\nGlowUp`;
  return { dm, form };
}

function writeOutreach(c, baseUrl) {
  const url = `${baseUrl.replace(/\/$/, '')}/para/${c.slug}/`;
  const m = messages(c, url);
  const dir = path.join(ROOT, 'pipeline/out/outreach');
  fs.mkdirSync(dir, { recursive: true });
  const md = `# ${c.name} · ${c.domain}

- Propuesta: ${url}
- Demo: ${baseUrl.replace(/\/$/, '')}/demo/${c.slug}/
- Instagram: ${c.instagram || '—'}
- Email: ${c.email || '—'}
- Contacto: ${c.contactPage || '—'}
- Velocidad (Lighthouse móvil): ${c.lh.before ? `${c.lh.before.performance} → ${c.lh.after ? c.lh.after.performance : '?'}` : 'sin medir'}

## Mensaje directo (Instagram)

${m.dm}

## Formulario de contacto

${m.form}
`;
  fs.writeFileSync(path.join(dir, `${c.slug}.md`), md);
  // Registro de prospectos (CSV): una fila por tienda; si ya existía, se sustituye
  const csv = path.join(ROOT, 'pipeline/out/prospects.csv');
  const head = 'fecha,slug,tienda,dominio,instagram,email,contacto,propuesta,productos,rendimiento_antes,rendimiento_despues,lcp_antes,lcp_despues,estado';
  const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const row = [new Date().toISOString().slice(0, 10), c.slug, c.name, c.domain, c.instagram, c.email, c.contactPage, url, c.stats.products,
    c.lh.before && c.lh.before.performance, c.lh.after && c.lh.after.performance, c.lh.before && c.lh.before.lcp, c.lh.after && c.lh.after.lcp, 'pendiente de revisar'].map(q).join(',');
  const rows = fs.existsSync(csv) ? fs.readFileSync(csv, 'utf8').trim().split('\n').slice(1).filter((r) => r && r.split(',')[1] !== q(c.slug)) : [];
  fs.writeFileSync(csv, [head, ...rows, row].join('\n') + '\n');
  return { url, file: path.join(dir, `${c.slug}.md`) };
}

module.exports = { writeOutreach, messages };
