// Renders the prototype's line icons and Meera avatar to transparent PNGs for the PowerPoint deck.
// Usage: node render-icons.cjs app.js ../assets/icons
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const [appjs, outDir] = process.argv.slice(2);
const src = fs.readFileSync(appjs, 'utf8');
const iBlock = src.slice(src.indexOf('const I = {') + 10, src.indexOf('};', src.indexOf('const I = {')) + 1);
const I = eval('(' + iBlock + ')');
const meera = src.match(/const MEERA = `([\s\S]*?)`;/)[1];
const items = {};
for (const [k, v] of Object.entries(I)) items[k] = typeof v === 'function' ? v('#00bbc2') : v;
items.lockGrey = I.lock('#747881');
for (const k of ['sys', 'search', 'idea', 'balance', 'draft', 'agent']) items[k + 'Teal'] = I[k].replace(/#497edc/g, '#00bbc2');   // section-opener icons on navy
items.lockTeal = I.lock('#00bbc2');
items.meera = meera;
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 1 });
  for (const [k, svg] of Object.entries(items)) {
    const s = k === 'meera' ? 320 : /Teal$/.test(k) ? 384 : 192;
    await p.setContent(`<html><body style="margin:0;background:transparent"><div id="x" style="width:${s}px;height:${s}px">${svg.replace(/<svg /, '<svg width="100%" height="100%" ')}</div></body></html>`);
    await p.locator('#x').screenshot({ path: `${outDir}/${k}.png`, omitBackground: true });
  }
  await b.close(); console.log(Object.keys(items).join(' '));
})();
