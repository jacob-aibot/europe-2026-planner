import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:4180/cairn/docs/design/');

/* Scan a RECTANGLE and report its extremes, so no single guessed pixel is load-bearing. */
const REGIONS = {
  'board header band  ': [120, 120, 2000, 300],
  'PRIMARY pill       ': [3230, 1500, 180, 70],
  'polarsteps globe A ': [560, 600, 760, 850],
  'polarsteps globe B ': [1400, 580, 800, 800],
  'polarsteps route   ': [2280, 580, 820, 900],
  'polar white sheet  ': [600, 1300, 700, 260],
  'cosmos hero        ': [220, 1830, 1500, 700],
  'alltrails map      ': [800, 2830, 700, 700],
  'alltrails darkcard ': [820, 3480, 900, 320],
  'journal photos     ': [2280, 3260, 700, 400],
  'dune photograph    ': [560, 3900, 2400, 700],
};

const out = await page.evaluate(async ([src, regions]) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const hex = (r, gg, b) => '#' + [r, gg, b].map((n) => n.toString(16).padStart(2, '0')).join('');
  const res = {};
  for (const [name, [x, y, w, h]] of Object.entries(regions)) {
    const d = g.getImageData(x, y, w, h).data;
    let sat = null, satS = -1, dark = null, darkL = 999, light = null, lightL = -1;
    const ls = [];
    for (let i = 0; i < d.length; i += 4 * 7) {          // stride: sample ~1/7 of pixels
      const r = d[i], gr = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, gr, b), mn = Math.min(r, gr, b);
      const l = (mx + mn) / 2;
      const s = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));
      ls.push(l);
      if (s > satS && l > 40 && l < 225) { satS = s; sat = hex(r, gr, b); }
      if (l < darkL) { darkL = l; dark = hex(r, gr, b); }
      if (l > lightL) { lightL = l; light = hex(r, gr, b); }
    }
    ls.sort((p, q) => p - q);
    res[name] = { mostSaturated: sat, darkest: dark, lightest: light,
      medianLuma: Math.round(ls[ls.length >> 1]) };
  }
  return res;
}, ['/cairn/docs/design/references/cairn-visual-reference-board.png', REGIONS]);

for (const [k, v] of Object.entries(out)) {
  console.log(k, '| sat', v.mostSaturated, '| dark', v.darkest, '| light', v.lightest, '| medL', v.medianLuma);
}
await browser.close();
