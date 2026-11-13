// Captura pares antes/después sección a sección a partir de un JSON de configuración.
// Uso: node tools/compare.js tools/compare.teikit.json
// Cada entrada: { id, mode: "d"|"m", before: Shot, after: Shot }
// Shot: { url, scrollTo?: selector | "text=…", offset?: px, dismiss?: [selectores a clicar], clicks?: [selectores], hide?: [selectores], wait?: ms }
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outDir = cfg.outDir;
fs.mkdirSync(outDir, { recursive: true });

async function shoot(browser, shot, mode, file) {
  const ctx = mode === 'm'
    ? await browser.newContext({ ...devices['iPhone 13'] })
    : await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const p = await ctx.newPage();
  await p.goto(shot.url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(1500);
  for (const sel of shot.dismiss || []) { await p.locator(sel).first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400); }
  if (shot.hide) await p.addStyleTag({ content: shot.hide.join(',') + '{display:none!important}' });
  if (shot.scrollTo) {
    const loc = p.locator(shot.scrollTo).first();
    await loc.waitFor({ timeout: 8000 }).catch(() => {});
    const y = await loc.evaluate((el) => el.getBoundingClientRect().top + window.scrollY).catch(() => 0);
    await p.evaluate((y) => window.scrollTo(0, y), Math.max(0, y - (shot.offset ?? 90)));
  }
  for (const sel of shot.clicks || []) { await p.locator(sel).first().click({ timeout: 4000 }).catch((e) => console.log('click fail', sel)); await p.waitForTimeout(350); }
  await p.waitForTimeout(shot.wait ?? 2200);
  await p.screenshot({ path: file });
  await ctx.close();
}

(async () => {
  const b = await chromium.launch();
  for (const c of cfg.pairs) {
    for (const side of ['before', 'after']) {
      const file = path.join(outDir, `${c.id}-${side}.png`);
      await shoot(b, c[side], c.mode, file);
      console.log('ok', file);
    }
  }
  await b.close();
})();
