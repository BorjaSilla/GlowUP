// Carrera de carga: fotogramas de cómo aparece una web en un móvil con 4G lento.
// Uso: node tools/filmstrip.js <url> <outPrefix> [--cookie]
// Usa la misma limitación para cualquier web (RTT 150 ms, 1,6 Mbps, CPU x4), como Lighthouse.
const { chromium } = require('playwright');
const fs = require('fs');
const [,, url, out] = process.argv;
const TIMES = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: Date.now(), data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 390, maxHeight: 844, everyNthFrame: 1 });
  const t0 = Date.now();
  p.goto(url, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout((TIMES[TIMES.length - 1] + 0.6) * 1000);
  await cdp.send('Page.stopScreencast');
  // Para cada instante, el último fotograma pintado antes de ese momento (o blanco si aún no hay nada)
  const picked = TIMES.map((s) => { const f = frames.filter((x) => x.t - t0 <= s * 1000).pop(); return { s, data: f ? f.data : null }; });
  picked.forEach(({ s, data }, i) => { if (data) fs.writeFileSync(`${out}-${i}.jpg`, Buffer.from(data, 'base64')); });
  fs.writeFileSync(`${out}.json`, JSON.stringify(picked.map(({ s, data }, i) => ({ s, file: data ? `${out.split('/').pop()}-${i}.jpg` : null }))));
  console.log(out, picked.map((x) => x.s + ':' + (x.data ? 'img' : 'blank')).join(' '));
  await b.close();
})();
