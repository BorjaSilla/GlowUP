// Genera capturas antes/después para la comparativa (pipeline: paso "capture").
const { chromium, devices } = require('playwright');
const [,, url, out, mode] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = mode === 'm' ? await b.newContext({ ...devices['iPhone 13'] }) : await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(4500);
  await p.screenshot({ path: out, clip: mode === 'm' ? { x: 0, y: 0, width: 390, height: 760 } : undefined });
  await b.close();
})();
