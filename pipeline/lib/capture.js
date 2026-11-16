// Paso 3 · Medir y capturar antes/después (escritorio y móvil) + carrera de carga + Lighthouse.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { chromium } = require('playwright');
const { esMarket } = require('./extract');

const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const MOB = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };

// Cierra cookies, popups de newsletter y overlays para comparar en igualdad
async function clean(page) {
  await page.waitForTimeout(1200);
  const words = /^(aceptar( todo| todas)?|accept( all)?|allow( all)?|de acuerdo|entendido|ok|rechazar( todo)?|reject( all)?|cerrar|close|no,? gracias|no thanks)$/i;
  for (let k = 0; k < 2; k++) {
    for (const b of await page.locator('button, a[role=button], [aria-label*="lose" i], [aria-label*="errar" i]').all().catch(() => [])) {
      const t = ((await b.innerText().catch(() => '')) || (await b.getAttribute('aria-label').catch(() => '')) || '').trim();
      if ((words.test(t) || /close|cerrar/i.test(t)) && await b.isVisible().catch(() => false)) await b.click({ timeout: 800 }).catch(() => {});
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
  }
  // Lo que quede tapando la pantalla (popups, chats flotantes) se oculta
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el);
      if ((s.position === 'fixed' || s.position === 'sticky') && +s.zIndex > 999) {
        const r = el.getBoundingClientRect();
        if (r.width * r.height > innerWidth * innerHeight * 0.25 || /chat|intercom|tidio|whatsapp|klaviyo|popup|newsletter/i.test(el.id + ' ' + el.className)) el.style.setProperty('display', 'none', 'important');
      }
    }
    document.documentElement.style.overflow = ''; document.body.style.overflow = '';
  }).catch(() => {});
}

async function scrollThrough(page) {
  const H = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 3000);
  for (let y = 0; y < Math.min(H, 9000); y += 600) { await page.evaluate((y) => scrollTo(0, y), y).catch(() => {}); await page.waitForTimeout(110); }
  await page.evaluate(() => scrollTo(0, 0)).catch(() => {}); await page.waitForTimeout(700);
}

async function shot(browser, ctxOpts, url, file, { full = 0, before = true, prep } = {}) {
  const ctx = await browser.newContext(ctxOpts);
  if (!/localhost|127\.0\.0\.1/.test(url)) await esMarket(ctx, url);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  if (before) await clean(page);
  await scrollThrough(page);
  if (prep) await prep(page);
  const w = ctxOpts.viewport.width;
  if (full) {
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: file, type: 'jpeg', quality: 78, fullPage: true, clip: { x: 0, y: 0, width: w, height: Math.min(full, H) } });
  } else await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
  await ctx.close();
}

// Carrera de carga: fotogramas con la misma red y CPU limitadas para las dos webs
async function filmstrip(browser, url, prefix, times = [0.5, 1, 1.5, 2, 3, 4, 6, 8]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  if (!/localhost|127\.0\.0\.1/.test(url)) await esMarket(ctx, url);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const frames = [];
  cdp.on('Page.screencastFrame', (f) => { frames.push({ t: Date.now(), data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 390, maxHeight: 844 });
  const t0 = Date.now();
  page.goto(url, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout((times[times.length - 1] + 0.6) * 1000);
  await cdp.send('Page.stopScreencast').catch(() => {});
  // Un fotograma es "en blanco" si casi no pesa (pantalla vacía)
  const out = times.map((s, i) => {
    const f = frames.filter((x) => x.t - t0 <= s * 1000).pop();
    if (!f || f.data.length < 6000) return null;
    const name = `${path.basename(prefix)}-${i}.jpg`;
    fs.writeFileSync(path.join(path.dirname(prefix), name), Buffer.from(f.data, 'base64'));
    return name;
  });
  await ctx.close();
  return out;
}

// Lighthouse (móvil) — requiere `npm i` en pipeline/
function lighthouse(url, chromePath) {
  return new Promise((resolve) => {
    const bin = process.env.LIGHTHOUSE_BIN || path.resolve(__dirname, '../node_modules/.bin/lighthouse');
    if (!fs.existsSync(bin)) return resolve(null);
    const out = path.join(require('os').tmpdir(), `lh-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    execFile(bin, [url, '--quiet', '--output=json', `--output-path=${out}`, '--only-categories=performance,accessibility,best-practices,seo', '--chrome-flags=--headless=new --no-sandbox'],
      { env: { ...process.env, CHROME_PATH: chromePath }, timeout: 180000 }, () => {
        try {
          const r = JSON.parse(fs.readFileSync(out, 'utf8')); fs.unlinkSync(out);
          const c = r.categories, a = r.audits;
          resolve({
            performance: Math.round(c.performance.score * 100), accessibility: Math.round(c.accessibility.score * 100),
            bestPractices: Math.round(c['best-practices'].score * 100), seo: c.seo ? Math.round(c.seo.score * 100) : null,
            lcp: +(a['largest-contentful-paint'].numericValue / 1000).toFixed(1), fcp: +(a['first-contentful-paint'].numericValue / 1000).toFixed(1),
            weightMB: +(a['total-byte-weight'].numericValue / 1e6).toFixed(1),
          });
        } catch (e) { resolve(null); }
      });
  });
}

async function captureAll({ origin, demoUrl, outDir, pdpHandle, variantId, withLighthouse = true, afterOnly = false, log = console.log }) {
  fs.mkdirSync(path.join(outDir, 'film'), { recursive: true });
  const b = await chromium.launch();
  const before = { home: origin, pdp: `${origin}/products/${pdpHandle}`, cart: `${origin}/cart/add?id=${variantId}&quantity=1` };
  const after = { home: `${demoUrl}#/`, pdp: `${demoUrl}#/p/${pdpHandle}` };
  const openCart = async (p) => { await p.locator('#add').click().catch(() => {}); await p.waitForTimeout(400); await p.locator('#cartBtn').click().catch(() => {}); await p.waitForTimeout(1000); };
  const jobs = [
    // Escritorio, página completa (portada 3000 px, ficha 1800 px)
    [DESK, before.home, 'home-before.jpg', { full: 3000 }], [DESK, after.home, 'home-after.jpg', { full: 3000, before: false }],
    [DESK, before.pdp, 'pdp-before.jpg', { full: 1800 }], [DESK, after.pdp, 'pdp-after.jpg', { full: 1800, before: false }],
    // Móvil, página completa
    [MOB, before.home, 'm-home-before.jpg', { full: 3200 }], [MOB, after.home, 'm-home-after.jpg', { full: 3200, before: false }],
    [MOB, before.pdp, 'm-pdp-before.jpg', { full: 2400 }], [MOB, after.pdp, 'm-pdp-after.jpg', { full: 2400, before: false }],
    // Carrito en móvil: antes, su /cart tras añadir el producto; después, el carrito de la demo
    [MOB, before.cart, 'm-cart-before.jpg', {}], [MOB, after.pdp, 'm-cart-after.jpg', { before: false, prep: openCart }],
  ];
  for (const [ctx, url, name, opt] of jobs.filter((j) => !afterOnly || /after/.test(j[2]))) { log(`  · ${name}`); await shot(b, ctx, url, path.join(outDir, name), opt).catch((e) => log(`    ! ${name}: ${e.message}`)); }
  log('  · carrera de carga');
  const film = { before: afterOnly ? null : await filmstrip(b, origin, path.join(outDir, 'film/before')), after: await filmstrip(b, after.home, path.join(outDir, 'film/after')) };
  const chromePath = chromium.executablePath();
  await b.close();
  let lh = { before: null, after: null };
  if (withLighthouse) { if (!afterOnly) { log('  · Lighthouse antes'); lh.before = await lighthouse(origin, chromePath); } log('  · Lighthouse después'); lh.after = await lighthouse(demoUrl, chromePath); }
  return { film, lh };
}

module.exports = { captureAll, shot, filmstrip, lighthouse, clean, DESK, MOB };
