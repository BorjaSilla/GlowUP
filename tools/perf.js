// Mide peso, nº de peticiones, LCP y tiempos en móvil (4G aprox) para la auditoría.
const { chromium, devices } = require('playwright');
const [,, url] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:150, downloadThroughput: 1.6e6/8*10, uploadThroughput: 750e3/8*10 });
  let bytes=0, reqs=0; const byType={};
  cdp.on('Network.loadingFinished', e=>{ bytes+=e.encodedDataLength; });
  p.on('response', r=>{ reqs++; const t=r.request().resourceType(); byType[t]=(byType[t]||0)+1; });
  await p.addInitScript(()=>{ window.__lcp=0; new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true}); window.__cls=0; new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) window.__cls+=e.value}).observe({type:'layout-shift',buffered:true}); });
  const t0=Date.now();
  await p.goto(url, { waitUntil:'load', timeout: 120000 });
  const load=Date.now()-t0;
  await p.waitForTimeout(4000);
  const m = await p.evaluate(()=>({ lcp: window.__lcp, cls: window.__cls, fcp: (performance.getEntriesByName('first-contentful-paint')[0]||{}).startTime, dcl: performance.timing.domContentLoadedEventEnd-performance.timing.navigationStart }));
  console.log(JSON.stringify({ url, loadMs: load, ...m, MB: +(bytes/1e6).toFixed(2), requests: reqs, byType }));
  await b.close();
})();
