// Capturas antes/después para la propuesta de Teikit (pipeline: paso "compare").
// Uso: node tools/capture-teikit.js <outDir> <demoUrl>
// Genera PNG crudos; tools/crop-shots.py los recorta y convierte a WebP.
const { chromium } = require('playwright');
const fs = require('fs');
const [,, OUT = 'out', DEMO = 'http://localhost:8080/demo/teikit/'] = process.argv;
fs.mkdirSync(OUT, { recursive: true });
const OLD = 'https://teikit.es/home/';
const COOKIE = 'text=RECHAZAR TODO';

async function page(b, mobile) {
  const ctx = await b.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  return ctx.newPage();
}
async function open(p, url, { cookie = true } = {}) {
  await p.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(1200);
  if (cookie) { await p.locator(COOKIE).first().click({ timeout: 2500 }).catch(() => {}); await p.waitForTimeout(1500); }
  // En la demo, enseñamos el póster del vídeo (el vídeo puede no haber cargado al capturar)
  else await p.addStyleTag({ content: '#heroVideo{display:none!important}' });
  // Recorre la página para disparar lazy-load y animaciones de entrada
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(90); }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(900);
}
const top = (p, sel) => p.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + scrollY);

(async () => {
  const b = await chromium.launch();
  const meta = {};

  // 1) Portada completa (escritorio)
  let p = await page(b); await open(p, OLD); await p.screenshot({ path: `${OUT}/home-before.png`, fullPage: true }); await p.context().close();
  p = await page(b); await open(p, DEMO, { cookie: false });
  await p.addStyleTag({ content: '.cart-bar,.toast{display:none!important}' });
  await p.screenshot({ path: `${OUT}/home-after.png`, fullPage: true });
  meta.cartaTop = await top(p, '#carta');
  meta.localesTop = await top(p, '#locales');
  await p.context().close();

  // 2) Carta (escritorio, página completa)
  p = await page(b); await open(p, OLD + '?controller=category&id_category=2'); await p.screenshot({ path: `${OUT}/carta-before.png`, fullPage: true }); await p.context().close();

  // 3) Pedido: hoy "Pide aquí" pide la dirección antes de nada; propuesta: pedido flotante
  p = await page(b); await open(p, OLD + '?controller=stores'); await p.screenshot({ path: `${OUT}/pedido-before.png` }); await p.context().close();
  p = await page(b); await open(p, DEMO, { cookie: false });
  await p.evaluate(() => { const el = document.querySelector('#favoritos'); scrollTo(0, el.getBoundingClientRect().top + scrollY - 80); });
  for (const id of ['salmon-crush', 'kioto', 'paris']) { await p.locator(`[data-add="${id}"]`).first().click(); await p.waitForTimeout(250); }
  await p.locator('#cartBtn').click(); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/pedido-after.png` }); await p.context().close();

  // 4) Locales
  p = await page(b); await open(p, OLD + '?controller=stores&map=true'); await p.screenshot({ path: `${OUT}/locales-before.png` }); await p.context().close();
  p = await page(b); await open(p, DEMO, { cookie: false });
  await p.evaluate(() => { const el = document.querySelector('#locales'); scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); }); await p.waitForTimeout(1600);
  await p.screenshot({ path: `${OUT}/locales-after.png` }); await p.context().close();

  // 5) Móvil, página completa
  p = await page(b, true); await open(p, OLD); await p.screenshot({ path: `${OUT}/m-home-before.png`, fullPage: true }); await p.context().close();
  p = await page(b, true); await open(p, DEMO, { cookie: false });
  await p.addStyleTag({ content: '.cart-bar,.toast{display:none!important}' });
  await p.screenshot({ path: `${OUT}/m-home-after.png`, fullPage: true });
  meta.mCartaTop = await top(p, '#carta');
  await p.context().close();

  // 6) Móvil: carta, pedido y locales
  p = await page(b, true); await open(p, OLD + '?controller=category&id_category=2'); await p.screenshot({ path: `${OUT}/m-carta-before.png`, fullPage: true }); await p.context().close();
  p = await page(b, true); await open(p, OLD + '?controller=stores'); await p.screenshot({ path: `${OUT}/m-pedido-before.png` }); await p.context().close();
  p = await page(b, true); await open(p, DEMO, { cookie: false });
  await p.evaluate(() => { const el = document.querySelector('#favoritos'); scrollTo(0, el.getBoundingClientRect().top + scrollY - 80); });
  for (const id of ['salmon-crush', 'kioto', 'paris']) { await p.locator(`[data-add="${id}"]`).first().click(); await p.waitForTimeout(250); }
  await p.locator('#cartBtn').click(); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/m-pedido-after.png` }); await p.context().close();
  p = await page(b, true); await open(p, OLD + '?controller=stores&map=true'); await p.screenshot({ path: `${OUT}/m-locales-before.png` }); await p.context().close();
  p = await page(b, true); await open(p, DEMO, { cookie: false });
  await p.addStyleTag({ content: '.cart-bar,.toast{display:none!important}' });
  await p.evaluate(() => { const el = document.querySelector('#locales'); scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); }); await p.waitForTimeout(1600);
  await p.screenshot({ path: `${OUT}/m-locales-after.png` }); await p.context().close();

  fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify(meta));
  console.log(meta);
  await b.close();
})();
