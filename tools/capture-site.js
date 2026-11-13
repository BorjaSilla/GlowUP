const { chromium } = require('playwright');
const fs = require('fs');
const [,, url, out, w='1440', h='900'] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  const errs=[]; p.on('requestfailed', r=>errs.push(r.url()));
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(e=>console.log('goto',e.message));
  await p.waitForTimeout(2000);
  // scroll to trigger reveals
  const H = await p.evaluate(()=>document.documentElement.scrollHeight);
  for (let y=0; y<H; y+=400) { await p.evaluate(y=>window.scrollTo(0,y), y); await p.waitForTimeout(150); }
  await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(800);
  await p.screenshot({ path: out + '.png', fullPage: true });
  fs.writeFileSync(out + '.txt', await p.evaluate(()=>document.body.innerText));
  fs.writeFileSync(out + '.dom.html', await p.content());
  console.log('height', H, 'failed', errs.slice(0,10));
  await b.close();
})();
