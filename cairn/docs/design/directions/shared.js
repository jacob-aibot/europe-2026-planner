/* =============================================================================
   Cairn visual directions — shared engine.

   Everything drawn by the three directions comes through here, so that the only thing that
   differs between them is COMPOSITION AND INTERACTION, never the data or its correctness.

   Contains: data loading, two map projections, great-circle interpolation, and SVG path
   builders. Contains NO clustering, NO framing heuristic and NO country-attribution logic —
   `ARCHITECTURE.md` A-40…A-54 owns those and this pass is fenced out of them. Where a view needs
   a frame it states its own explicit bounding window as a literal; nothing here measures a
   container or derives a frame from content.
   ========================================================================== */

export async function loadData() {
  const [world, cairn, region] = await Promise.all([
    fetch('../data/world.json').then((r) => r.json()),
    fetch('../data/cairn.json').then((r) => r.json()),
    fetch('../data/region50.json').then((r) => r.json()),
  ]);
  return { world, cairn, region };
}

/* ---------------------------------------------------------------- projections */

const RAD = Math.PI / 180;

/**
 * Orthographic — the view from space. `lam0`/`phi0` in degrees are the point facing the viewer.
 * Returns `{ project, visible }`; `project` gives pixel coordinates in a box of side `2r`
 * centred on `(cx, cy)`.
 */
export function ortho({ lam0 = 12, phi0 = 30, r = 300, cx = 0, cy = 0 }) {
  const l0 = lam0 * RAD, p0 = phi0 * RAD;
  const sinP0 = Math.sin(p0), cosP0 = Math.cos(p0);
  const visible = (lng, lat) => {
    const l = lng * RAD, p = lat * RAD;
    return sinP0 * Math.sin(p) + cosP0 * Math.cos(p) * Math.cos(l - l0) >= 0;
  };
  const project = (lng, lat) => {
    const l = lng * RAD, p = lat * RAD;
    return [cx + r * Math.cos(p) * Math.sin(l - l0),
      cy - r * (cosP0 * Math.sin(p) - sinP0 * Math.cos(p) * Math.cos(l - l0))];
  };
  return { project, visible, r, cx, cy, kind: 'ortho' };
}

/**
 * Equidistant cylindrical with a standard parallel — the honest regional projection. Latitude is
 * linear; longitude is scaled by `cos(lat0)` so a degree of longitude is the right width in the
 * middle of the window. No Mercator pole stretch, no false claim of conformality.
 *
 * `win` is `[W, S, E, N]` in degrees and is always a LITERAL supplied by the view. `w`/`h` are the
 * pixel box. The window is fitted with `contain`, so the whole window is always visible.
 */
export function plate({ win, w, h }) {
  const [W, S, E, N] = win;
  const lat0 = ((S + N) / 2) * RAD;
  const kx = Math.cos(lat0);
  const spanX = (E - W) * kx, spanY = N - S;
  const s = Math.min(w / spanX, h / spanY);
  const ox = (w - spanX * s) / 2, oy = (h - spanY * s) / 2;
  const project = (lng, lat) => [ox + (lng - W) * kx * s, oy + (N - lat) * s];
  return { project, visible: () => true, kind: 'plate', win, scale: s, w, h };
}

/**
 * Expands a `[W,S,E,N]` window so its aspect matches a `w×h` box. Without this, `plate()`'s
 * contain-fit leaves slack inside the viewBox and the surrounding geography drifts into view —
 * on the first render of Direction B the Dubrovnik plate showed the whole of Italy. Expanding
 * (never cropping) keeps every point that was asked for inside the frame.
 */
export function fitWindow(win, w, h) {
  const [W, S, E, N] = win;
  const lat0 = ((S + N) / 2) * Math.PI / 180;
  const kx = Math.cos(lat0);
  const spanX = (E - W) * kx, spanY = N - S;
  const want = w / h;
  if (spanX / spanY > want) {
    const need = spanX / want, add = (need - spanY) / 2;
    return [W, S - add, E, N + add];
  }
  const need = spanY * want / kx, add = (need - (E - W)) / 2;
  return [W - add, S, E + add, N];
}

/* ------------------------------------------------------------------- geometry */

/** Ring (flat `[lng,lat,…]`) → SVG `d`, split wherever the orthographic horizon cuts it. */
export function ringPath(ring, proj) {
  let d = '', open = false;
  for (let i = 0; i < ring.length; i += 2) {
    const lng = ring[i], lat = ring[i + 1];
    if (proj.visible(lng, lat)) {
      const [x, y] = proj.project(lng, lat);
      d += (open ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      open = true;
    } else if (open) { d += 'Z'; open = false; }
  }
  if (open) d += 'Z';
  return d;
}

/** Great-circle interpolation — the only honest way to draw a long-haul leg. */
export function greatCircle(a, b, n = 48) {
  const p1 = a.lat * RAD, l1 = a.lng * RAD, p2 = b.lat * RAD, l2 = b.lng * RAD;
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  if (!d) return [a, b];
  const out = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    out.push({ lat: Math.atan2(z, Math.hypot(x, y)) / RAD, lng: Math.atan2(y, x) / RAD });
  }
  return out;
}

/** Great-circle distance in km. Real measurement, used only where it is labelled as one. */
export function distanceKm(a, b) {
  const p1 = a.lat * RAD, p2 = b.lat * RAD;
  const dp = p2 - p1, dl = (b.lng - a.lng) * RAD;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)));
}

/** A polyline of lat/lngs → SVG `d`, respecting the projection's horizon. */
export function linePath(points, proj) {
  let d = '', open = false;
  for (const p of points) {
    if (!proj.visible(p.lng, p.lat)) { open = false; continue; }
    const [x, y] = proj.project(p.lng, p.lat);
    d += (open ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    open = true;
  }
  return d;
}

/** A graticule, for atmosphere on the globe. Every 30°, clipped by the horizon like everything else. */
export function graticule(proj, step = 30) {
  const out = [];
  for (let lng = -180; lng <= 180; lng += step) {
    const pts = []; for (let lat = -80; lat <= 80; lat += 2) pts.push({ lat, lng });
    out.push(linePath(pts, proj));
  }
  for (let lat = -60; lat <= 60; lat += step) {
    const pts = []; for (let lng = -180; lng <= 180; lng += 2) pts.push({ lat, lng });
    out.push(linePath(pts, proj));
  }
  return out.filter(Boolean);
}

/* ------------------------------------------------------------------ formatting */

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH[m - 1]} ${y}`;
};
export const fmtSpan = (a, b) => {
  const [ya, ma, da] = a.split('-').map(Number), [yb, mb, db] = b.split('-').map(Number);
  if (ya === yb && ma === mb) return `${da}–${db} ${MONTH[ma - 1]} ${ya}`;
  if (ya === yb) return `${da} ${MONTH[ma - 1]} – ${db} ${MONTH[mb - 1]} ${ya}`;
  return `${fmtDate(a)} – ${fmtDate(b)}`;
};
export const nights = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

/** planned | active | completed — the shipped three-state lifecycle, against a fixed `today`. */
export const lifecycleOf = (start, end, today) =>
  (end < today ? 'completed' : start > today ? 'planned' : 'active');

/* ------------------------------------------------------------------- shortcuts */

export const el = (tag, attrs = {}, kids = []) => {
  const ns = /^(svg|g|path|circle|line|text|defs|radialGradient|linearGradient|stop|clipPath|rect|ellipse|filter|feGaussianBlur|feColorMatrix|feComposite|feBlend|use|mask|polyline)$/.test(tag)
    ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml';
  const n = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const k of [].concat(kids)) if (k) n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  return n;
};
