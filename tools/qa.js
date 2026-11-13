// Captura una página local: viewport + página completa, errores de consola.
const { chromium, devices } = require('playwright');
const [,, url, out, mode='desktop', full='1'] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = mode === 'mobile' ? await b.newContext({ ...devices['iPhone 13'] }) : await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('requestfailed', r => errs.push('FAILED ' + r.url()));
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + '_fold.png' });
  if (full === '1') {
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 500) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(120); }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
    await p.screenshot({ path: out + '_full.png', fullPage: true });
  }
  const ow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth ? 'HORIZONTAL OVERFLOW ' + document.documentElement.scrollWidth : 'no overflow');
  console.log(ow, JSON.stringify(errs.slice(0, 15)));
  await b.close();
})();
