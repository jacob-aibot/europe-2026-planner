/**
 * QA round 38 — the independent breaker pass over I-8h (ARCHITECTURE §4.4 **A-49** + **A-50**).
 *
 *   Run: node qa/r38-a49.mjs           (bare Node, no browser, no server)
 *
 * Written from A-49/A-50 and the shipped source, NOT from BUILD-NOTES and NOT by re-pointing
 * the builder's own `i8h-*` probes. This is the third adversarial round on the world-map
 * atlas-frame area, so **every number is re-derived from a second implementation** living in
 * this file: my own spherical ring area, my own haversine, my own connected components, my own
 * bounds + padding, and my own reimplementation of C1…C9 straight off the ruling. The shipped
 * `worldMapFrame` is then compared against it rather than believed.
 *
 * Sections:
 *   A  the index census — KD-73's ring-count claim, checked against the committed artefact.
 *   B  KD-71 — is the "rank by summed area" fault really vacuous? Swept far wider than the
 *      five thresholds the builder's test pins, with my own area formula.
 *   C  I12 — the principal part's key IS countryKeyPoint, re-derived from the raw index.
 *   D  the headline extents — FR+GR, FR, US, CA+MX+US, AT CZ DE ES FR IT, R33-1 — each
 *      recomputed by my own C1…C8″ and compared to the shipped frame string for string.
 *   E  Alaska — the generalisation claim, with the part-graph edge lengths printed, plus a
 *      RELABELLED index (every ISO code permuted) to prove nothing reads a code.
 *   F  KD-72 — components per pane, counted directly; and the in-frame set re-derived as
 *      "the union of components containing a principal part" and compared.
 *   G  I11 / I1 / I2 / I3 / I5 / I13 / I14 / I15 over a wide random library sweep.
 *   H  I6 — the frame is byte-identical under row permutation, WITH a detached pane present.
 *   I  KD-73 reachability — a fixture with a degenerate ring, to see what is actually lost.
 *   J  the residual R37-1 shape: land coverage of a pane C5 refuses to split.
 *   K  cost — countryParts and the whole frame at the 239-code ceiling.
 *   L  the constraint greps: zero-dep core/client, no DOM in packages/client, determinism.
 *
 * A `FAIL` line is a claim of A-49's, A-50's, BUILD-NOTES' or the code's own comments that does
 * not hold when re-derived. A `NOTE` line is a measurement recorded for the writeup.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame, WORLD_CLUSTER_THRESHOLD_KM } from '../packages/client/src/selectors/worldMap.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

let fails = 0;
const ok = (c, l, x) => { if (c) console.log(`  ok     ${l}`); else { fails++; console.log(`  FAIL   ${l}${x === undefined ? '' : `  -> ${JSON.stringify(x)}`}`); } };
const note = (s) => console.log(`  NOTE   ${s}`);
/**
 * **[I-8i] A superseded assertion, named rather than deleted.** ARCHITECTURE §4.4 **A-51**
 * withdraws C5, C6's tie-break, C7/C7′ and A-49's C8″ and `role`; **A-52** takes out
 * `countryParts`' `ring.length >= 6` filter. An assertion written against a withdrawn clause is
 * no longer an oracle: FAILing it would say the product is broken, and deleting it would lose
 * the record. It is printed with the clause that withdrew it and what the fixture measures now.
 */
let sups = 0;
const sup = (l, why, now) => {
  sups++;
  console.log(`  SUPER  ${l}\n           withdrawn by ${why}; the same fixture now measures ${JSON.stringify(now)}`);
};
const head = (s) => console.log(`\n== ${s} ==`);

const IDX = core.COUNTRY_INDEX;
const CODES = [...new Set(IDX.countries.map((c) => c.code))].sort();
const T = WORLD_CLUSTER_THRESHOLD_KM;

// ---------------------------------------------------------------------------
// My own primitives. Written from the formulas, not from core's source.
// ---------------------------------------------------------------------------
const D2R = Math.PI / 180;
const R_KM = 6371;

/** Great-circle km, my own haversine. */
const km = (a, b) => {
  const s1 = Math.sin(((b.lat - a.lat) * D2R) / 2);
  const s2 = Math.sin(((b.lng - a.lng) * D2R) / 2);
  const h = s1 * s1 + Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * s2 * s2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

/**
 * Absolute spherical ring area, km², by a DIFFERENT route from `ringAreaKm2`: the planar
 * shoelace of the Lambert cylindrical **equal-area** projection (x = λR, y = R sin φ), which is
 * exactly area-preserving on the sphere. Independent of the L'Huilier/Chamberlain sum core uses.
 */
const myRingArea = (ring) => {
  const n = ring.length;
  if (n < 6) return 0;
  const pts = [];
  for (let i = 0; i + 1 < n; i += 2) pts.push([ring[i] * D2R * R_KM, R_KM * Math.sin(ring[i + 1] * D2R)]);
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    s += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return Math.abs(s / 2);
};

/** Connected components by BFS over the O(n²) edge set. Returns arrays of ascending indices. */
const myComponents = (pts, t) => {
  const n = pts.length;
  const label = new Array(n).fill(-1);
  const groups = [];
  for (let i = 0; i < n; i++) {
    if (label[i] >= 0) continue;
    const g = groups.length;
    label[i] = g;
    const stack = [i];
    const members = [i];
    while (stack.length) {
      const u = stack.pop();
      for (let v = 0; v < n; v++) if (label[v] < 0 && km(pts[u], pts[v]) < t) { label[v] = g; stack.push(v); members.push(v); }
    }
    groups.push(members.sort((a, b) => a - b));
  }
  return groups.sort((a, b) => a[0] - b[0]);
};

const myRingBox = (ring) => {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (let i = 0; i + 1 < ring.length; i += 2) {
    if (ring[i] < w) w = ring[i];
    if (ring[i] > e) e = ring[i];
    if (ring[i + 1] < s) s = ring[i + 1];
    if (ring[i + 1] > n) n = ring[i + 1];
  }
  return [w, s, e, n];
};

/**
 * Every ring of every entry of `code`, in index order. **[I-8i] A-52 (R38-5) removed the
 * `ring.length >= 6` filter**: a ring the index carries is a ring the frame draws. The
 * superseded filter is kept beside it as the injected fault's oracle — `ringsOfA49` is what §I
 * measures the loss against.
 */
const ringsOf = (code, index = IDX) => {
  const out = [];
  for (const e of index.countries) if (e.code === code) for (const r of e.rings) out.push(r);
  return out;
};
/** A-49's superseded rule: skip any ring of fewer than three points. Kept as §I's oracle. */
const ringsOfA49 = (code, index = IDX) => ringsOf(code, index).filter((r) => r.length >= 6);

/** My own countryParts, from A-49 Part 2's words. */
const myParts = (code, t, index = IDX) => {
  const rings = ringsOf(code, index);
  if (rings.length === 0) return [];
  const boxes = rings.map(myRingBox);
  const pts = boxes.map((b) => ({ lat: (b[1] + b[3]) / 2, lng: (b[0] + b[2]) / 2 }));
  const areas = rings.map(myRingArea);
  let pr = 0;
  for (let i = 1; i < rings.length; i++) if (areas[i] > areas[pr]) pr = i;
  return myComponents(pts, t).map((g) => {
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity, key = g[0];
    for (const i of g) {
      const b = boxes[i];
      if (b[0] < w) w = b[0]; if (b[1] < s) s = b[1];
      if (b[2] > e) e = b[2]; if (b[3] > n) n = b[3];
      if (areas[i] > areas[key]) key = i;
    }
    return { box: [w, s, e, n], key: pts[key], ringIdx: g, principal: g.includes(pr), rings: g.map((i) => rings[i]) };
  });
};

/**
 * My own countryKeyPoint: the box centre of the code's greatest-area ring. **Unchanged by
 * A-52** — `countryKeyPoint` keeps its own `>= 3 points` rule, which is why it is `ringsOfA49`
 * here and `ringsOf` in `myParts`.
 */
const myKey = (code, index = IDX) => {
  const rings = ringsOfA49(code, index);
  if (rings.length === 0) return null;
  let pr = 0;
  const areas = rings.map(myRingArea);
  for (let i = 1; i < rings.length; i++) if (areas[i] > areas[pr]) pr = i;
  const b = myRingBox(rings[pr]);
  return { lat: (b[1] + b[3]) / 2, lng: (b[0] + b[2]) / 2 };
};

const num4 = (n) => { const r = Math.round(n * 1e4) / 1e4; return Object.is(r, -0) ? '0' : String(r); };
/** My own paneFrame: A-41 Part 4's padding term over a box. */
const myViewBox = (b) => {
  const w = b.east - b.west, h = b.north - b.south;
  const pad = 0.02 * Math.max(w, h);
  return `${num4(b.west - pad)} ${num4(-(b.north + pad))} ${num4(w + 2 * pad)} ${num4(h + 2 * pad)}`;
};
/** My own mapBounds over part boxes (the MIN_SPAN clamp reproduced). */
const myBounds = (boxes) => {
  const pts = boxes.flatMap(([w, s, e, n]) => [{ lat: s, lng: w }, { lat: s, lng: e }, { lat: n, lng: e }, { lat: n, lng: w }]);
  if (pts.length === 0) return null;
  let raw = 0;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) raw = Math.max(raw, km(pts[i], pts[j]));
  const north = Math.max(...pts.map((p) => p.lat)), south = Math.min(...pts.map((p) => p.lat));
  const east = Math.max(...pts.map((p) => p.lng)), west = Math.min(...pts.map((p) => p.lng));
  if (raw >= 1.2) return { north, south, east, west, clamped: false };
  const centre = { lat: pts.reduce((a, p) => a + p.lat, 0) / pts.length, lng: pts.reduce((a, p) => a + p.lng, 0) / pts.length };
  const hLat = 1.2 / 2 / 110.574, hLng = 1.2 / 2 / (111.32 * Math.max(0.01, Math.cos(centre.lat * D2R)));
  return { north: centre.lat + hLat, south: centre.lat - hLat, east: centre.lng + hLng, west: centre.lng - hLng, clamped: true };
};

/**
 * **The SUPERSEDED model, kept as the oracle** — my own worldMapFrame straight off A-41
 * C1/C5/C6/C7, A-48 C2′/C3′/C9 and A-49 P/C8′/C8″. §J's census is measured against it, which is
 * what makes R38-2's own number flip rather than merely disappear.
 */
const myFrameA49 = (rows, index = IDX) => {
  const drawn = [], missing = [];
  for (const r of rows) {
    const parts = myParts(r.code, T, index);
    const key = myKey(r.code, index);
    if (key === null || parts.length === 0) { missing.push(r.code); continue; }
    drawn.push({ ...r, parts, key });
  }
  const clusters = myComponents(drawn.map((d) => d.key), T);
  const wOf = (g) => g.reduce((n, i) => n + drawn[i].tripIds.length, 0);
  const total = wOf(drawn.map((_, i) => i));
  const lowest = (g) => g.map((i) => drawn[i].code).reduce((a, b) => (b < a ? b : a), g.length ? drawn[g[0]].code : '');
  const ranked = clusters.slice().sort((a, b) => {
    const wa = wOf(a), wb = wOf(b);
    if (wa !== wb) return wb - wa;
    if (a.length !== b.length) return b.length - a.length;
    const la = lowest(a), lb = lowest(b);
    return la < lb ? -1 : la > lb ? 1 : 0;
  });
  const split = ranked.length >= 2 && 2 * wOf(ranked[0]) > total;
  let groups;
  if (!split) groups = [drawn.map((_, i) => i)];
  else if (ranked.length === 2) groups = [ranked[0], ranked[1]];
  else groups = [ranked[0], ranked[1], ranked.slice(2).flat().sort((a, b) => a - b)];

  const detached = [];
  const panes = groups.map((g, i) => {
    const flat = [];
    for (const k of g) for (const p of drawn[k].parts) flat.push({ owner: k, part: p });
    const inFrame = [];
    if (flat.length) {
      for (const comp of myComponents(flat.map((f) => f.part.key), T)) {
        if (comp.some((j) => flat[j].part.principal)) for (const j of comp) inFrame.push(flat[j]);
        else for (const j of comp) detached.push(flat[j]);
      }
    }
    const b = myBounds(inFrame.map((a) => a.part.box));
    return {
      id: i === 0 ? 'main' : `inset-${i}`, role: i === 0 ? 'main' : 'inset',
      codes: g.map((k) => drawn[k].code), weight: wOf(g),
      viewBox: b === null ? '-180 -90 360 180' : myViewBox(b), bounds: b, inFrame,
    };
  });
  if (detached.length) {
    const b = myBounds(detached.map((a) => a.part.box));
    const owners = [...new Set(detached.slice().sort((x, y) => x.owner - y.owner).map((a) => a.owner))];
    panes.push({
      id: 'detached', role: 'detached', codes: owners.map((k) => drawn[k].code),
      weight: owners.reduce((n, k) => n + drawn[k].tripIds.length, 0),
      viewBox: myViewBox(b), bounds: b, inFrame: detached,
    });
  }
  return { panes, codes: drawn.map((d) => d.code), missing, drawn };
};

/**
 * **[I-8i] My own worldMapFrame under A-51, written from G1…G6 and nothing else.** One
 * `clusterPoints` call over the canonical PART list; every component is a pane; `home` is the
 * codes whose principal part is in it; `weight` is Σ tripIds.length over `home`; the order is
 * weight desc, `home.length` desc, lowest canonical position asc. No split test, no cap, no
 * union pane, no role. Built on the SAME independent primitives (`myParts`, `myComponents`,
 * `myBounds`, `myViewBox`) as the A-49 reference above, so §D still compares two implementations
 * rather than one implementation to itself.
 */
const myFrame = (rows, index = IDX) => {
  const drawn = [], missing = [];
  for (const r of rows) {
    const parts = myParts(r.code, T, index);
    if (parts.length === 0) { missing.push(r.code); continue; }   // A-52: one answer, not two
    drawn.push({ ...r, parts });
  }
  const atoms = [];
  for (let k = 0; k < drawn.length; k++) for (const part of drawn[k].parts) atoms.push({ owner: k, part });
  const built = myComponents(atoms.map((a) => a.part.key), T).map((members) => {
    const owners = [...new Set(members.map((i) => atoms[i].owner))].sort((a, b) => a - b);
    const home = owners.filter((k) => members.some((i) => atoms[i].owner === k && atoms[i].part.principal));
    return {
      members,
      codes: owners.map((k) => drawn[k].code),
      home: home.map((k) => drawn[k].code),
      weight: home.reduce((n, k) => n + drawn[k].tripIds.length, 0),
      inFrame: members.map((i) => atoms[i]),
    };
  });
  built.sort((a, b) =>
    (a.weight !== b.weight ? b.weight - a.weight
      : a.home.length !== b.home.length ? b.home.length - a.home.length
        : a.members[0] - b.members[0]));
  const panes = built.map((g, i) => {
    const b = myBounds(g.inFrame.map((a) => a.part.box));
    return {
      id: `p${i}`, codes: g.codes, home: g.home, weight: g.weight,
      viewBox: b === null ? '-180 -90 360 180' : myViewBox(b), bounds: b, inFrame: g.inFrame,
    };
  });
  if (panes.length === 0) {
    panes.push({ id: 'p0', codes: [], home: [], weight: 0, viewBox: '-180 -90 360 180', bounds: null, inFrame: [] });
  }
  return { panes, codes: drawn.map((d) => d.code), missing, drawn };
};

// ---------------------------------------------------------------------------
const statsFor = (rows) => ({
  countries: rows, cities: [], trips: { planned: 0, active: 0, completed: 1 },
  daysTravelled: 10, located: { cities: 0, places: 0, stops: 0 },
  unattributed: { cities: 0, places: 0, stops: 0 }, unnamedCities: 0,
});
const statRow = (code, n = 1, provisional = false) => ({
  code, firstVisit: '2020-01-01', lastVisit: '2020-01-10',
  tripIds: Array.from({ length: n }, (_, i) => `${code}-t${i}`), provisional,
});
const frameOf = (spec, index = IDX) => worldMapFrame(statsFor(spec.map(([c, n]) => statRow(c, n))), index);
const rowsOf = (spec) => spec.map(([c, n]) => statRow(c, n));

// ===========================================================================
head('A  the index census — KD-73\'s ring-count claim against the committed artefact');
{
  let rings = 0, minPts = Infinity, degenerate = 0, odd = 0;
  const perCode = new Map();
  for (const e of IDX.countries) for (const r of e.rings) {
    rings++;
    if (r.length % 2) odd++;
    const pts = Math.floor(r.length / 2);
    if (pts < minPts) minPts = pts;
    if (pts < 3) degenerate++;
    perCode.set(e.code, (perCode.get(e.code) ?? 0) + 1);
  }
  note(`entries ${IDX.countries.length} · codes ${CODES.length} · rings ${rings} · smallest ring ${minPts} points · ring with an odd length: ${odd}`);
  ok(rings === 1033, 'KD-73: the shipped index carries 1,033 rings, as BUILD-NOTES states', rings);
  ok(degenerate === 0, 'KD-73: no shipped ring has fewer than three points', degenerate);
  ok(minPts >= 3, `and the smallest is ${minPts} points, so the >=3 filter drops nothing`, minPts);
  const most = [...perCode.entries()].sort((a, b) => b[1] - a[1])[0];
  note(`most rings on one code: ${most[0]} at ${most[1]}`);
  ok(most[0] === 'MV' && most[1] === 177, 'the ring ceiling is MV at 177, as Part 6 states', most);
}

// ===========================================================================
head('B  KD-71 — is A-49\'s named injected fault really vacuous?');
{
  // The builder pins five thresholds. A-49's fault is about a RANKING, so the honest sweep is
  // over every threshold at which the partition can differ, not five points of it.
  const THRESH = [1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 700, 900, 1000, 1250,
    1500, 1750, 2000, 2500, 3000, 3500, 3999, 4000, 4001, 4500, 5000, 6000, 8000, 10000, 15000, 20000];
  const differ = [];
  let multiSeen = 0;
  const perT = [];
  for (const t of THRESH) {
    let multi = 0, diffHere = 0;
    for (const code of CODES) {
      const parts = core.countryParts(code, IDX, t);
      if (parts.length < 2) continue;
      multi++; multiSeen++;
      // MY area formula, not the source's and not the builder's copy of the source's.
      const summed = parts.map((p) => p.rings.reduce((n, r) => n + myRingArea(r), 0));
      let best = 0;
      for (let i = 1; i < parts.length; i++) if (summed[i] > summed[best]) best = i;
      if (!parts[best].principal) { differ.push(`${code}@${t}`); diffHere++; }
    }
    perT.push(`${t}:${multi}${diffHere ? `(${diffHere} differ)` : ''}`);
  }
  note(`multi-part codes per threshold — ${perT.join(' ')}`);
  note(`${multiSeen} (code, threshold) multi-part cases swept across ${THRESH.length} thresholds`);
  // [I-8i] R38-1 is FIXED, so this assertion FLIPS: the finding was that the fault is reachable,
  // and the builder's test now samples `900` and names `ID`. Asserting `differ.length === 0`
  // would re-assert the false claim the round filed.
  ok(differ.length === 7 && differ.includes('ID@900'),
    'R38-1 (FIXED): the summed-area fault IS reachable — 7 (code, threshold) pairs, `ID`@900 among them',
    differ);

  // The spot check the round was asked for: codes whose parts are of COMPARABLE magnitude.
  const close = [];
  for (const t of THRESH) for (const code of CODES) {
    const parts = core.countryParts(code, IDX, t);
    if (parts.length < 2) continue;
    const summed = parts.map((p) => p.rings.reduce((n, r) => n + myRingArea(r), 0));
    const pi = parts.findIndex((p) => p.principal);
    const other = summed.filter((_, i) => i !== pi);
    const ratio = Math.max(...other) / summed[pi];
    if (ratio > 0.5) close.push([`${code}@${t}`, ratio.toFixed(4)]);
  }
  note(`(code, threshold) pairs where a NON-principal part's summed area is > 50% of the principal part's: ${close.length}`
    + (close.length ? ` — ${close.slice(0, 12).map((c) => c.join('=')).join(' ')}` : ''));
  // The tightest case there is, whatever it is, is the honest headline for the vacuity claim.
  let worst = null;
  for (const t of THRESH) for (const code of CODES) {
    const parts = core.countryParts(code, IDX, t);
    if (parts.length < 2) continue;
    const summed = parts.map((p) => p.rings.reduce((n, r) => n + myRingArea(r), 0));
    const pi = parts.findIndex((p) => p.principal);
    const ratio = Math.max(...summed.filter((_, i) => i !== pi)) / summed[pi];
    if (worst === null || ratio > worst[1]) worst = [`${code}@${t}km`, ratio];
  }
  note(`the closest the fault ever comes to being red: ${worst[0]} at ${(worst[1] * 100).toFixed(2)}% of the principal part's summed area`);
  ok(worst[1] > 1, 'R38-1 (FIXED): a non-principal part DOES out-sum the principal one, so the fault can be red', worst);

  // R38-1, the detail. The same sweep with the SOURCE's own area formula, so the finding cannot
  // be blamed on my second implementation.
  const srcArea = (ring) => {
    const n = ring.length; if (n < 6) return 0;
    let s = 0;
    for (let i = 0; i + 1 < n; i += 2) {
      const j = (i + 2) % n;
      s += (ring[j] - ring[i]) * D2R * (2 + Math.sin(ring[i + 1] * D2R) + Math.sin(ring[j + 1] * D2R));
    }
    return Math.abs((s * R_KM * R_KM) / 2);
  };
  const differSrc = [];
  for (const t of THRESH) for (const code of CODES) {
    const parts = core.countryParts(code, IDX, t);
    if (parts.length < 2) continue;
    const summed = parts.map((p) => p.rings.reduce((n, r) => n + srcArea(r), 0));
    let best = 0;
    for (let i = 1; i < parts.length; i++) if (summed[i] > summed[best]) best = i;
    if (!parts[best].principal) differSrc.push(`${code}@${t}`);
  }
  note(`same sweep with the SOURCE's own ringAreaKm2 formula (= the builder's test copy): ${differSrc.length} differing cases — ${differSrc.join(' ')}`);
  for (const [code, t] of [['ID', 900], ['PH', 300], ['SB', 200], ['CV', 50]]) {
    const parts = core.countryParts(code, IDX, t);
    const summed = parts.map((p) => p.rings.reduce((n, r) => n + srcArea(r), 0));
    const pi = parts.findIndex((p) => p.principal);
    const si = summed.indexOf(Math.max(...summed));
    note(`${code}@${t}km — greatest-ring rule picks part ${pi} (${Math.round(summed[pi])} km² summed, key ${parts[pi].key.lat.toFixed(3)},${parts[pi].key.lng.toFixed(3)}); summed-area rule picks part ${si} (${Math.round(summed[si])} km², key ${parts[si].key.lat.toFixed(3)},${parts[si].key.lng.toFixed(3)}) — ${km(parts[pi].key, parts[si].key).toFixed(0)} km apart`);
  }
  ok(differSrc.length === 7 && differSrc.includes('ID@900'),
    'R38-1 (FIXED): with the SOURCE\'s own area formula the same 7 pairs differ — KD-71\'s claim is corrected, not re-asserted',
    differSrc);
  // The five thresholds the builder's own test samples, in isolation: THIS is what is true.
  const five = [];
  for (const t of [1, 100, 1000, 4000, 20000]) for (const code of CODES) {
    const parts = core.countryParts(code, IDX, t);
    if (parts.length < 2) continue;
    const summed = parts.map((p) => p.rings.reduce((n, r) => n + srcArea(r), 0));
    let best = 0;
    for (let i = 1; i < parts.length; i++) if (summed[i] > summed[best]) best = i;
    if (!parts[best].principal) five.push(`${code}@${t}`);
  }
  ok(five.length === 0, 'at the FIVE thresholds A-49 I12 named, the fault really is vacuous — the narrower claim is true', five);
  // …and at the EIGHT the builder's test now samples, it is not. That is R38-1's one-line fix.
  const eight = [];
  for (const t of [1, 100, 500, 900, 1000, 4000, 12000, 20000]) for (const code of CODES) {
    const parts = core.countryParts(code, IDX, t);
    if (parts.length < 2) continue;
    const summed = parts.map((p) => p.rings.reduce((n, r) => n + srcArea(r), 0));
    let best = 0;
    for (let i = 1; i < parts.length; i++) if (summed[i] > summed[best]) best = i;
    if (!parts[best].principal) eight.push(`${code}@${t}`);
  }
  ok(eight.length === 1 && eight[0] === 'ID@900',
    'R38-1 (FIXED): at the EIGHT thresholds the shipped test now samples, `ID`@900 is red — the tripwire can fire',
    eight);
}

// ===========================================================================
head('C  I12 — the principal part\'s key IS countryKeyPoint, re-derived from the raw index');
{
  const THRESH = [1, 100, 1000, 4000, 20000, 37, 2500, 9000];
  let n = 0, bad = [];
  for (const t of THRESH) for (const code of CODES) {
    const parts = core.countryParts(code, IDX, t);
    const p = parts.find((x) => x.principal);
    const k = core.countryKeyPoint(code, IDX);
    n++;
    if (!p) { bad.push(`${code}@${t}:no principal`); continue; }
    if (!Object.is(p.key.lat, k.lat) || !Object.is(p.key.lng, k.lng)) bad.push(`${code}@${t}`);
    // and against MY OWN derivation of the key point
    const mine = myKey(code);
    if (Math.abs(mine.lat - k.lat) > 1e-9 || Math.abs(mine.lng - k.lng) > 1e-9) bad.push(`${code}@${t}:mine`);
    if (parts.filter((x) => x.principal).length !== 1) bad.push(`${code}@${t}:not-exactly-one-principal`);
  }
  note(`${n} (code, threshold) comparisons over ${THRESH.length} thresholds`);
  ok(bad.length === 0, 'I12 holds Object.is-exactly, and my own greatest-ring derivation agrees', bad.slice(0, 10));
}

// ===========================================================================
head('D  the headline extents, recomputed by my own C1…C8″ and compared string for string');
{
  const CASES = [
    ['FR + GR — the ship gate', [['FR', 2], ['GR', 1]]],
    ['FR alone', [['FR', 1]]],
    ['US alone', [['US', 1]]],
    ['CA MX US', [['CA', 1], ['MX', 1], ['US', 1]]],
    ['CA US', [['CA', 1], ['US', 1]]],
    ['AT CZ DE ES FR IT', [['AT', 1], ['CZ', 1], ['DE', 1], ['ES', 1], ['FR', 1], ['IT', 1]]],
    ['R33-1 reference', [['AT', 1], ['CZ', 1], ['DE', 1], ['GB', 1], ['HR', 1], ['HU', 1], ['US', 1]]],
    ['FR US UM (residue 2)', [['FR', 1], ['US', 1], ['UM', 1]]],
    ['FR:5 US JP UM (four panes)', [['FR', 5], ['JP', 1], ['UM', 1], ['US', 1]]],
    ['UM alone', [['UM', 1]]],
    ['VA alone (the MIN_SPAN code)', [['VA', 1]]],
  ];
  for (const [label, spec] of CASES) {
    const got = frameOf(spec);
    const mine = myFrame(rowsOf(spec));
    const shipped = got.panes.map((p) => `${p.id}/${p.role}/[${p.codes.join(',')}]/${p.viewBox}/w${p.weight}`);
    const ref = mine.panes.map((p) => `${p.id}/${p.role}/[${p.codes.join(',')}]/${p.viewBox}/w${p.weight}`);
    ok(JSON.stringify(shipped) === JSON.stringify(ref), `${label}: my independent frame reproduces the shipped one exactly`, { shipped, ref });
    for (const p of got.panes) {
      const w = p.bounds.east - p.bounds.west, h = p.bounds.north - p.bounds.south;
      note(`${label} · ${p.id} [${p.role}] ${p.codes.join(',')} — unpadded ${w.toFixed(4)}° x ${h.toFixed(4)}°, viewBox "${p.viewBox}", aspect ${p.aspect.toFixed(4)}`);
    }
  }

  // The pinned numbers, each re-derived rather than read.
  const frgr = frameOf([['FR', 2], ['GR', 1]]);
  const m = frgr.panes[0];
  ok(Math.abs((m.bounds.east - m.bounds.west) - 31.1965) < 5e-4 && Math.abs((m.bounds.north - m.bounds.south) - 16.2285) < 5e-4,
    'BUILD-NOTES: FR+GR main pane is 31.20° x 16.23°', [m.bounds.east - m.bounds.west, m.bounds.north - m.bounds.south]);
  ok(m.viewBox === '-5.2162 -51.7724 32.4444 17.4764', 'and its viewBox width/height are 32.4444 x 17.4764', m.viewBox);
  const d = frgr.panes[1];
  ok(Math.abs((d.bounds.east - d.bounds.west) - 2.867) < 5e-4 && Math.abs((d.bounds.north - d.bounds.south) - 3.7031) < 5e-4,
    'French Guiana\'s detached pane is 2.867° x 3.7031°', [d.bounds.east - d.bounds.west, d.bounds.north - d.bounds.south]);

  const r331 = frameOf([['AT', 1], ['CZ', 1], ['DE', 1], ['GB', 1], ['HR', 1], ['HU', 1], ['US', 1]]);
  ok(r331.panes[0].viewBox === '-8.1779 -59.2407 31.494 17.3663', 'R33-1: the reference main pane viewBox is byte-identical', r331.panes[0].viewBox);
  ok(r331.viewBox === r331.panes[0].viewBox && r331.bounds === r331.panes[0].bounds, 'frame.viewBox/bounds are panes[0]\'s');
  ok(r331.panes.length === 3 && r331.panes[1].viewBox === '-125.8416 -50.5435 60.0314 26.618'
     && r331.panes[2].viewBox === '-172.8399 -72.4066 43.9088 54.5393',
    'and the two pinned inset/detached strings', r331.panes.map((p) => p.viewBox));
  ok(!JSON.stringify(r331.panes).includes('-125.8416 -50.5435 106.9251 54.5393'),
    'A-48\'s superseded 104.83° US inset string is absent');

  // Land coverage, sampled with MY point-in-polygon, on the ship-gate library.
  const inside = (code, at) => {
    for (const e of IDX.countries) {
      if (e.code !== code) continue;
      let hit = false;
      for (const r of e.rings) {
        let c = false;
        for (let i = 0, j = r.length - 2; i + 1 < r.length; j = i, i += 2) {
          const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
          if ((yi > at.lat) !== (yj > at.lat) && at.lng < ((xj - xi) * (at.lat - yi)) / (yj - yi) + xi) c = !c;
        }
        if (c) hit = !hit;
      }
      if (hit) return true;
    }
    return false;
  };
  const coverage = (pane, codes, N = 260) => {
    const [x, y, w, h] = pane.viewBox.split(' ').map(Number);
    let land = 0, tot = 0;
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      const lng = x + (w * (a + 0.5)) / N, lat = -(y + (h * (b + 0.5)) / N);
      tot++;
      if (codes.some((c) => inside(c, { lat, lng }))) land++;
    }
    return (100 * land) / tot;
  };
  const cov = coverage(frgr.panes[0], ['FR', 'GR']);
  note(`FR+GR main pane land coverage, my own even-odd sampler on a 260x260 grid: ${cov.toFixed(2)}%`);
  ok(Math.abs(cov - 14.02) < 0.6, 'BUILD-NOTES\' 14.02% land (bare geometry) reproduces', cov);
  const covD = coverage(frgr.panes[1], ['FR']);
  note(`and the detached pane (French Guiana): ${covD.toFixed(2)}% land — BUILD-NOTES says 59.8%`);
  ok(Math.abs(covD - 59.8) < 1.5, 'the detached pane\'s 59.8% reproduces', covD);
  // The regression baseline: what round 37 measured.
  {
    const corners = [];
    for (const e of IDX.countries) {
      if (e.code !== 'FR' && e.code !== 'GR') continue;
      const [w0, s0, e0, n0] = e.box;
      corners.push({ lat: s0, lng: w0 }, { lat: s0, lng: e0 }, { lat: n0, lng: e0 }, { lat: n0, lng: w0 });
    }
    const b = core.mapBounds(corners);
    note(`round 37's baseline (A-48 C8, mapBounds over entry boxes): ${(b.east - b.west).toFixed(2)}° x ${(b.north - b.south).toFixed(2)}°`);
    ok(Math.abs((b.east - b.west) - 81.13) < 0.02, 'the 81.13° oracle still measures 81.13°', b.east - b.west);
  }
}

// ===========================================================================
head('E  Alaska — the generalisation, with the edge lengths, and with every ISO code relabelled');
{
  const us = core.countryParts('US', IDX, T);
  const ca = core.countryParts('CA', IDX, T);
  const conus = us.find((p) => p.principal), alaska = us.find((p) => !p.principal);
  note(`US parts: CONUS key ${conus.key.lat.toFixed(3)},${conus.key.lng.toFixed(3)} (${conus.rings.length} ring) · Alaska/HI/Aleutians key ${alaska.key.lat.toFixed(3)},${alaska.key.lng.toFixed(3)} (${alaska.rings.length} rings)`);
  const dConus = km(conus.key, alaska.key), dCa = km(ca.find((p) => p.principal).key, alaska.key);
  note(`CONUS <-> Alaska part = ${dConus.toFixed(1)} km (threshold ${T}) · CA principal <-> Alaska part = ${dCa.toFixed(1)} km`);
  ok(dConus > T, 'Alaska is NOT within the threshold of CONUS, so a US-only pane detaches it — geometry, not a list', dConus);
  ok(dCa < T, 'Alaska IS within the threshold of Canada, so a CA+US pane frames it', dCa);

  const usAlone = frameOf([['US', 1]]);
  // [I-8i] `role` is withdrawn (A-51 G4); a pane's standing is `home` (A-53 Part 4). Same claim.
  ok(usAlone.panes.length === 2 && usAlone.panes[1].home.length === 0,
    'US alone: one HOME pane (CONUS) + one EXTENT pane (Alaska)', usAlone.panes.map((p) => p.home));
  ok(Math.abs((usAlone.panes[0].bounds.east - usAlone.panes[0].bounds.west) - 57.7225) < 5e-4
     && Math.abs((usAlone.panes[1].bounds.east - usAlone.panes[1].bounds.west) - 41.8111) < 5e-4,
    'US alone: 57.72° main + 41.81° detached', [usAlone.panes[0].bounds.east - usAlone.panes[0].bounds.west, usAlone.panes[1].bounds.east - usAlone.panes[1].bounds.west]);
  for (const spec of [[['CA', 1], ['US', 1]], [['CA', 1], ['MX', 1], ['US', 1]]]) {
    const f = frameOf(spec);
    ok(f.panes.every((p) => p.home.length > 0),
      `${spec.map((s) => s[0]).join('+')}: NO extent pane — Alaska is chained to the pane's subject`,
      f.panes.map((p) => [p.home, p.codes]));
  }
  {
    const f = frameOf([['CA', 1], ['MX', 1], ['US', 1]]);
    ok(f.panes.length === 1 && Math.abs((f.panes[0].bounds.east - f.panes[0].bounds.west) - 119.143) < 5e-4
       && Math.abs((f.panes[0].bounds.north - f.panes[0].bounds.south) - 68.6944) < 5e-4,
      'CA MX US: one pane, 119.14° x 68.69°', [f.panes.length, f.panes[0].bounds.east - f.panes[0].bounds.west, f.panes[0].bounds.north - f.panes[0].bounds.south]);
  }
  // The discriminating case: a companion is not enough — it has to be a companion Alaska is
  // actually chained to. MX is 5,573 km from the Alaska part, so MX+US must STILL detach it.
  {
    const f = frameOf([['MX', 1], ['US', 1]]);
    const mxAlaska = km(core.countryKeyPoint('MX', IDX), alaska.key);
    note(`MX principal <-> Alaska part = ${mxAlaska.toFixed(1)} km`);
    ok(mxAlaska > T, 'MX is beyond the threshold of Alaska', mxAlaska);
    ok(f.panes.some((p) => p.home.length === 0),
      'so MX+US STILL frames Alaska separately — the rule is not "does the pane have a companion", it is connectivity',
      f.panes.map((p) => [p.home, p.codes]));
  }

  // Nothing reads a code: permute every ISO code in the index and re-run.
  const perm = new Map(CODES.map((c, i) => [c, `Q${String(i).padStart(3, '0')}`]));
  const relabelled = { ...IDX, countries: IDX.countries.map((e) => ({ ...e, code: perm.get(e.code) })) };
  for (const spec of [[['US', 1]], [['CA', 1], ['US', 1]], [['FR', 2], ['GR', 1]], [['CA', 1], ['MX', 1], ['US', 1]]]) {
    const a = frameOf(spec);
    const b = frameOf(spec.map(([c, n]) => [perm.get(c), n]), relabelled);
    const shape = (f) => JSON.stringify(f.panes.map((p) => [p.role, p.viewBox, p.weight, p.aspect]));
    ok(shape(a) === shape(b),
      `relabelled index: ${spec.map((s) => s[0]).join('+')} produces the identical geometry under permuted ISO codes`,
      [shape(a), shape(b)]);
  }
}

// ===========================================================================
head('F  KD-72 — components per pane, counted directly');
{
  const CASES = [
    ['US + JP', [['US', 1], ['JP', 1]]],
    ['FR + GR', [['FR', 2], ['GR', 1]]],
    ['US alone', [['US', 1]]],
    ['CA MX US', [['CA', 1], ['MX', 1], ['US', 1]]],
    ['R33-1 reference', [['AT', 1], ['CZ', 1], ['DE', 1], ['GB', 1], ['HR', 1], ['HU', 1], ['US', 1]]],
    ['FR:5 US JP UM', [['FR', 5], ['JP', 1], ['UM', 1], ['US', 1]]],
  ];
  for (const [label, spec] of CASES) {
    const mine = myFrame(rowsOf(spec));
    for (const p of mine.panes) {
      if (p.home.length === 0) continue;
      const nComp = myComponents(p.inFrame.map((a) => a.part.key), T).length;
      const nClusters = myComponents(p.codes.map((c) => myKey(c)), T).length;
      note(`${label} · ${p.id}: ${p.codes.length} codes, ${nClusters} country-clusters, in-frame parts ${p.inFrame.length} in ${nComp} component(s)`);
      ok(nClusters === 1 ? nComp === 1 : true,
        `${label} · ${p.id}: A-49 Part 2's proof holds when the pane IS one cluster`, [nClusters, nComp]);
    }
  }
  // [I-8i] **KD-72 is CLOSED by A-51 G3, and the superseded measurement is the oracle.** Under
  // C5/C7 the US+JP frame was ONE pane holding two clusters, so A-49 Part 2's "exactly one
  // component" was false as written; that is R38-2 one level out. Under A-51 a pane IS one
  // component by definition, so the old measurement is printed and the new one is asserted.
  const usjpA49 = myFrameA49(rowsOf([['US', 1], ['JP', 1]]));
  sup('KD-72 confirmed: the US+JP pane\'s in-frame set is TWO components, so A-49 Part 2\'s "exactly one component" is false as written',
    'A-51 G3 (a pane is one component by definition)',
    myComponents(usjpA49.panes[0].inFrame.map((a) => a.part.key), T).length);
  const usjp = myFrame(rowsOf([['US', 1], ['JP', 1]]));
  ok(usjp.panes.every((p) => myComponents(p.inFrame.map((a) => a.part.key), T).length === 1),
    'A-51 G3/I16: every pane of the US+JP frame is EXACTLY one component — the premise is now a definition',
    usjp.panes.map((p) => myComponents(p.inFrame.map((a) => a.part.key), T).length));
  // and the shipped code implements exactly A-51's rule (two implementations, compared)
  const shipped = frameOf([['US', 1], ['JP', 1]]);
  ok(JSON.stringify(shipped.panes.map((p) => [p.home, p.viewBox])) === JSON.stringify(usjp.panes.map((p) => [p.home, p.viewBox])),
    'and the shipped code implements exactly that rule (my independent A-51 frame agrees byte for byte)',
    [shipped.panes.map((p) => p.viewBox), usjp.panes.map((p) => p.viewBox)]);
}

// ===========================================================================
head('G  I1 / I2 / I3 / I5 / I11 / I13 / I14 / I15 over a wide sweep');
{
  // A deterministic pseudo-random library generator — no ambient randomness in a QA probe either.
  let seed = 20260901;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const libs = [];
  for (const c of CODES) libs.push([[c, 1]]);                    // all 239 single-country
  for (let i = 0; i < 400; i++) {                                 // 400 random multi-country
    const n = 2 + Math.floor(rnd() * 7);
    const picked = new Set();
    while (picked.size < n) picked.add(CODES[Math.floor(rnd() * CODES.length)]);
    libs.push([...picked].sort().map((c) => [c, 1 + Math.floor(rnd() * 4)]));
  }
  // and the ones that exercise the detached pane hard
  for (const s of [[['FR', 5], ['JP', 1], ['UM', 1], ['US', 1]], [['FR', 1], ['UM', 1], ['US', 1]],
    [['FR', 9], ['US', 1]], [['UM', 3], ['US', 1], ['FR', 1], ['GR', 1], ['AU', 1]]]) libs.push(s);

  const ringId = new Map();
  IDX.countries.forEach((e, ei) => e.rings.forEach((r, ri) => ringId.set(r, `${ei}:${ri}`)));

  let bad = { i1: 0, i2: 0, i3: 0, i5: 0, i11: 0, i13: 0, i14: 0, i15: 0, dpane: 0 };
  const firstBad = {};
  let detachedLibs = 0, maxPanes = 0, worstPad = Infinity;
  for (const spec of libs) {
    const f = frameOf(spec);
    const label = spec.map((s) => s[0]).join('+');
    const paneIds = new Set(f.panes.map((p) => p.id));
    maxPanes = Math.max(maxPanes, f.panes.length);
    if (f.panes.some((p) => p.home.length === 0)) detachedLibs++;

    // I1: every stats code appears at least once in `countries` or exactly once in `missing`.
    for (const [c] of spec) {
      const inC = f.countries.filter((x) => x.code === c).length;
      const inM = f.missing.filter((x) => x === c).length;
      if (!((inC >= 1 && inM === 0) || (inC === 0 && inM === 1))) { bad.i1++; firstBad.i1 ??= [label, c, inC, inM]; }
    }
    // I2: paneId names a pane; pane.codes === the codes carrying that paneId; unique within a pane.
    for (const c of f.countries) if (!paneIds.has(c.paneId)) { bad.i2++; firstBad.i2 ??= [label, c.code, c.paneId]; }
    for (const p of f.panes) {
      const here = f.countries.filter((c) => c.paneId === p.id).map((c) => c.code);
      if (new Set(here).size !== here.length) { bad.i2++; firstBad.i2 ??= [label, p.id, 'dup in pane', here]; }
      if (JSON.stringify([...here].sort()) !== JSON.stringify([...p.codes].sort())) { bad.i2++; firstBad.i2 ??= [label, p.id, here, p.codes]; }
      // pane.codes in canonical row order
      const canon = f.codes.filter((c) => p.codes.includes(c));
      if (JSON.stringify(canon) !== JSON.stringify(p.codes)) { bad.i2++; firstBad.i2 ??= [label, p.id, 'order', p.codes, canon]; }
    }
    // I3 / I5 / I18, re-pointed at I-8i. A-51 G6 withdraws C7′'s cap, so I3 is now "the pane
    // count IS the component count", re-derived here from my own primitives. I5 is "every drawn
    // code is home in exactly one pane and Σ weight === W", and I18 is "every home pane precedes
    // every extent pane, strictly" — A-53's addition, and the one that stops an FR-only library
    // opening on French Guiana.
    const geo = f.panes.filter((p) => p.home.length > 0);
    const det = f.panes.filter((p) => p.home.length === 0);
    const myComps = myFrame(rowsOf(spec)).panes.length;
    if (f.panes.length !== myComps) { bad.i3++; firstBad.i3 ??= [label, f.panes.length, myComps]; }
    if (det.length > 3) { bad.i3++; firstBad.i3 ??= [label, 'more than 3 extent panes', det.length]; }
    if (det.length > 0 && !spec.some(([c]) => c === 'FR' || c === 'UM' || c === 'US')) {
      bad.i3++; firstBad.i3 ??= [label, 'an extent pane without FR/UM/US', det.map((p) => p.codes)];
    }
    {
      const flags = f.panes.map((p) => p.home.length > 0);
      const firstExtent = flags.indexOf(false);
      const totalW = spec.filter(([c]) => !f.missing.includes(c)).reduce((n, sp) => n + sp[1], 0);
      const homedOnce = f.codes.every((c) => f.panes.filter((pp) => pp.home.includes(c)).length === 1);
      const additive = f.panes.reduce((n, pp) => n + pp.weight, 0) === totalW;
      const ordered = firstExtent < 0 || !flags.slice(firstExtent).includes(true);
      const opensHome = f.codes.length === 0 || flags[0] === true;
      if (!(homedOnce && additive && ordered && opensHome)) {
        bad.i5++;
        firstBad.i5 ??= [label, { homedOnce, additive, ordered, opensHome },
          f.panes.map((pp) => `${pp.codes.join(',')}/home=${pp.home.join(',')}/w${pp.weight}`)];
      }
    }

    // I11: the multiset of rings drawn across a code's rows is exactly its full ring set, once.
    for (const c of f.codes) {
      const want = ringsOf(c).map((r) => ringId.get(r)).sort();
      const rows = f.countries.filter((x) => x.code === c);
      // recover the rings from the parts, via the same public function the selector used
      const parts = core.countryParts(c, IDX, T);
      const all = parts.flatMap((p) => p.rings.map((r) => ringId.get(r))).sort();
      if (JSON.stringify(all) !== JSON.stringify(want)) { bad.i11++; firstBad.i11 ??= [label, c, 'parts lose a ring']; }
      // and via the emitted `d` strings: total subpath count must equal the ring count
      const subpaths = rows.reduce((n, r) => n + (r.d.match(/Z/g) ?? []).length, 0);
      if (subpaths !== want.length) { bad.i11++; firstBad.i11 ??= [label, c, subpaths, want.length]; }
    }
    // I13: codes exactly once, canonical row order, disjoint from missing.
    const wantCodes = spec.map((s) => s[0]).filter((c) => !f.missing.includes(c));
    if (JSON.stringify(f.codes) !== JSON.stringify(wantCodes) || new Set(f.codes).size !== f.codes.length
      || f.codes.some((c) => f.missing.includes(c))) { bad.i13++; firstBad.i13 ??= [label, f.codes, wantCodes]; }

    // I14 / A-42(b): every vertex drawn in a pane is STRICTLY inside that pane's viewBox.
    for (const p of f.panes) {
      const [x, y, w, h] = p.viewBox.split(' ').map(Number);
      if (!(w > 0 && h > 0)) { bad.i14++; firstBad.i14 ??= [label, p.id, 'zero area', p.viewBox]; continue; }
      for (const c of f.countries.filter((q) => q.paneId === p.id)) {
        for (const m of c.d.matchAll(/[ML](-?[\d.e+-]+),(-?[\d.e+-]+)/g)) {
          const px = Number(m[1]), py = Number(m[2]);
          const slackL = px - x, slackR = (x + w) - px, slackT = py - y, slackB = (y + h) - py;
          const slack = Math.min(slackL, slackR, slackT, slackB);
          if (slack < worstPad) worstPad = slack;
          if (!(slackL > 0 && slackR > 0 && slackT > 0 && slackB > 0)) { bad.i14++; firstBad.i14 ??= [label, p.id, c.code, px, py, p.viewBox]; }
        }
      }
    }
    // I15: the detached pane never decides anything — removing it cannot change panes[0].
    if (det.length) {
      const w0 = f.panes[0].weight;
      const sumGeo = geo.reduce((n, p) => n + p.weight, 0);
      const totalW = spec.filter((s) => !f.missing.includes(s[0])).reduce((n, s) => n + s[1], 0);
      if (sumGeo !== totalW) { bad.i15++; firstBad.i15 ??= [label, sumGeo, totalW]; }
      if (!(w0 > 0)) { bad.i15++; }
    }
  }
  note(`${libs.length} libraries swept (239 single-country + 400 pseudo-random + 4 hand-built); ${detachedLibs} produced a detached pane; max panes ${maxPanes}`);
  note(`tightest containment margin over every drawn vertex of every pane: ${worstPad.toExponential(3)} degrees`);
  for (const k of Object.keys(bad)) ok(bad[k] === 0, `${k.toUpperCase()} holds across the sweep`, [bad[k], firstBad[k]]);
  sup('a four-pane frame is actually reachable and was exercised',
    'A-51 G6 (the cap is withdrawn — the sweep now reaches more)', maxPanes);
  ok(maxPanes >= 4, `A-51 G6: the sweep reached ${maxPanes} panes with no cap in the way`, maxPanes);
}

// ===========================================================================
head('H  I6 — byte identity under row permutation, with a detached pane present');
{
  const perms = (a) => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r]));
  // The GEOMETRY must be a function of the point set alone (I6/I9). `pane.codes` and
  // `frame.codes` are explicitly "canonical ROW order" (I2/I13), so they track the input and
  // are checked as such rather than asserted invariant.
  for (const spec of [[['FR', 2], ['GR', 1]], [['CA', 1], ['MX', 1], ['US', 1]], [['FR', 5], ['JP', 1], ['UM', 1], ['US', 1]], [['US', 1], ['JP', 1]]]) {
    const geom = new Set(), paint = new Set();
    let codesTrack = true;
    for (const p of perms(spec)) {
      const f = frameOf(p);
      // [I-8i] The PARTITION is a function of the point set (I9) and is compared as a SET.
      // The pane ORDER is not, and A-51 G5 says so: its third key is the component's position
      // in the canonical PART list, which is "drawn codes in canonical row order" (G2). Two
      // panes of equal weight and equal `home.length` — in practice two weight-0 extent panes —
      // therefore swap when the caller hands the rows over in another order. `travelStats`
      // emits `countries` in ascending ISO order, so the production ordinal is fixed (I6, and
      // it is asserted below on the canonical input). Sorting here measures I9, not I6.
      geom.add(JSON.stringify(f.panes.map((q) => `${q.home.slice().sort().join(',')}|${q.viewBox}|${q.aspect}|${q.weight}`).slice().sort()));
      paint.add(JSON.stringify(f.countries.map((c) => `${c.code}@${f.panes.find((q) => q.id === c.paneId).viewBox}`).slice().sort()));
      if (JSON.stringify(f.codes) !== JSON.stringify(p.map((s) => s[0]))) codesTrack = false;
      for (const q of f.panes) {
        if (JSON.stringify(q.codes) !== JSON.stringify(f.codes.filter((c) => q.codes.includes(c)))) codesTrack = false;
      }
    }
    const label = `${spec.map((s) => s[0]).join('+')} (${perms(spec).length} orders)`;
    ok(geom.size === 1, `${label}: every row order gives ONE partition — the same panes, viewBoxes, aspects, weights`, [...geom]);
    ok(paint.size === 1, `${label}: and ONE paint assignment (C9 is over the index, not the rows)`, [...paint]);
    ok(codesTrack, `${label}: pane.codes and frame.codes are the row order, as I2/I13 specify`);
    // I6 proper: the CANONICAL input, twice, byte for byte, order included.
    const canonical = spec.slice().sort((a, b) => (a[0] < b[0] ? -1 : 1));
    ok(JSON.stringify(frameOf(canonical)) === JSON.stringify(frameOf(canonical)),
      `${label}: I6 — the same (stats, index) yields a byte-identical frame, pane order included`);
  }
}

// ===========================================================================
head('I  KD-73 — what a degenerate ring actually costs, on a fixture');
{
  const sq = (lng, lat, s) => [lng, lat, lng + s, lat, lng + s, lat + s, lng, lat + s];
  const mk = (rings) => {
    const lngs = rings.flatMap((r) => r.filter((_, i) => i % 2 === 0));
    const lats = rings.flatMap((r) => r.filter((_, i) => i % 2 === 1));
    return { code: 'XA', rings, box: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)] };
  };
  // A country with one real landmass and one two-point "ring" 3,000 km away.
  const degenerate = [10, 10, 40, 10];
  const idx = { scale: 'test', source: 'r38', countries: [mk([sq(0, 0, 5), degenerate])] };
  const parts = core.countryParts('XA', idx, T);
  const key = core.countryKeyPoint('XA', idx);
  note(`XA: 2 rings in the index, countryParts gives ${parts.length} part(s) holding ${parts.reduce((n, p) => n + p.rings.length, 0)} ring(s); countryKeyPoint = ${JSON.stringify(key)}`);
  // [I-8i] **R38-5 is FIXED by A-52, so all four of this section's assertions FLIP.** The
  // `ring.length >= 6` filter is out of `countryParts`: a ring the index carries is a ring the
  // frame draws. The superseded rule is kept beside each as the oracle — `ringsOfA49` is what
  // the filter used to keep, and it is the injected fault for every line below.
  sup('KD-73 confirmed: the two-point ring is in NO part',
    'A-52 (the >= 6 filter is removed)', parts.map((p) => p.rings.length));
  ok(parts.reduce((n, p) => n + p.rings.length, 0) === 2,
    'R38-5 (FIXED): the two-point ring IS in a part — the frame draws what the index carries',
    parts.map((p) => p.rings.length));
  ok(ringsOfA49('XA', idx).length === 1 && ringsOf('XA', idx).length === 2,
    'the fault\'s oracle: A-49\'s >= 6 filter kept 1 of the 2 rings, so restoring it is measurable',
    [ringsOfA49('XA', idx).length, ringsOf('XA', idx).length]);
  // A degenerate ring has zero spherical area, so the strict `>` in the principal-ring
  // comparison keeps the earlier ring: the KEY POINT is untouched by A-52, and I12 still holds
  // on a fixture that reaches the removed filter. (Here the two rings are 2,500 km apart and
  // therefore one part — which is the honest answer, not a special case.)
  ok(JSON.stringify(parts.find((pp) => pp.principal).key) === JSON.stringify(key),
    'A-52: I12 still holds on a fixture with a degenerate ring — the key point is untouched',
    [parts.find((pp) => pp.principal).key, key]);
  const f = worldMapFrame(statsFor([statRow('XA')]), idx);
  const subpaths = f.countries.reduce((n, c) => n + (c.d.match(/Z/g) ?? []).length, 0);
  sup('and it is drawn nowhere — I11 fails on this fixture, silently',
    'A-52 + A-51 I11 restated (the oracle is the INDEX, not countryParts\' output)', subpaths);
  ok(subpaths === 2, 'R38-5 (FIXED): both rings reach `d`, and I11 can now see the difference', subpaths);
  // …and every vertex is inside the pane it is drawn in, which is the half round 38 did not expect.
  let allInside = true;
  for (const pane of f.panes) {
    const [px, py, pw, ph] = pane.viewBox.split(' ').map(Number);
    for (const c of f.countries.filter((x) => x.paneId === pane.id)) {
      for (const m of c.d.matchAll(/[ML](-?[\d.eE+]+),(-?[\d.eE+]+)/g)) {
        const vx = +m[1], vy = +m[2];
        if (!(vx > px && vx < px + pw && vy > py && vy < py + ph)) allInside = false;
      }
    }
  }
  sup('the dropped vertex is outside the pane it was dropped from — so nothing on screen hints at it',
    'A-52 (nothing is dropped, so there is no vertex outside its own pane)', allInside);
  ok(allInside, 'R38-5 (FIXED): every vertex of every ring is strictly inside the pane that draws it (I4)');
  // and the all-degenerate code
  const idx2 = { scale: 'test', source: 'r38', countries: [mk([degenerate])] };
  const f2 = worldMapFrame(statsFor([statRow('XA')]), idx2);
  sup('a code whose every ring is degenerate goes to `missing` — stated, not dropped (this half is honest)',
    'A-52 (such a code is now DRAWABLE, and `[]` means "the index carries no ring")', [f2.missing, f2.codes]);
  ok(f2.missing.length === 0 && f2.codes.includes('XA'),
    'R38-5 (FIXED): a code whose only ring is degenerate is drawn rather than declared missing', [f2.missing, f2.codes]);
  ok(core.countryKeyPoint('XA', idx2) !== null && core.countryParts('XA', idx2, T).length > 0,
    'A-52: core\'s two functions now AGREE about whether the code exists — `[]` iff `null`',
    [core.countryKeyPoint('XA', idx2), core.countryParts('XA', idx2, T).length]);
}

// ===========================================================================
head('J  the residual R37-1 shape — a pane C5 refuses to split');
{
  const inside = (code, at) => {
    for (const e of IDX.countries) {
      if (e.code !== code) continue;
      let hit = false;
      for (const r of e.rings) {
        let c = false;
        for (let i = 0, j = r.length - 2; i + 1 < r.length; j = i, i += 2) {
          const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
          if ((yi > at.lat) !== (yj > at.lat) && at.lng < ((xj - xi) * (at.lat - yi)) / (yj - yi) + xi) c = !c;
        }
        if (c) hit = !hit;
      }
      if (hit) return true;
    }
    return false;
  };
  const cov = (pane, codes, N = 240) => {
    const [x, y, w, h] = pane.viewBox.split(' ').map(Number);
    let land = 0, tot = 0;
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      const lng = x + (w * (a + 0.5)) / N, lat = -(y + (h * (b + 0.5)) / N);
      tot++; if (codes.some((c) => inside(c, { lat, lng }))) land++;
    }
    return (100 * land) / tot;
  };
  for (const spec of [[['US', 1], ['JP', 1]], [['GB', 1], ['AU', 1]], [['FR', 1], ['NZ', 1]], [['US', 2], ['JP', 1]]]) {
    const f = frameOf(spec);
    const p = f.panes[0];
    const codes = spec.map((s) => s[0]);
    const c = cov(p, p.codes);
    note(`${codes.join('+')} (weights ${spec.map((s) => s[1]).join('/')}): ${f.panes.length} pane(s); main is ${(p.bounds.east - p.bounds.west).toFixed(1)}° x ${(p.bounds.north - p.bounds.south).toFixed(1)}°, ${c.toFixed(2)}% land, aspect ${p.aspect.toFixed(2)}`);
  }
  // the A-48 baseline for the same libraries, so the comparison is like for like
  const a48 = (codes) => {
    const corners = [];
    for (const e of IDX.countries) {
      if (!codes.includes(e.code)) continue;
      const [w0, s0, e0, n0] = e.box;
      corners.push({ lat: s0, lng: w0 }, { lat: s0, lng: e0 }, { lat: n0, lng: e0 }, { lat: n0, lng: w0 });
    }
    const b = core.mapBounds(corners);
    return [b.east - b.west, b.north - b.south];
  };
  for (const codes of [['US', 'JP'], ['FR', 'US'], ['FR', 'NZ'], ['GB', 'AU']]) {
    const f = frameOf(codes.map((c) => [c, 1]));
    const p = f.panes[0];
    note(`${codes.join('+')}: A-49 main ${(p.bounds.east - p.bounds.west).toFixed(1)}° x ${(p.bounds.north - p.bounds.south).toFixed(1)}° · A-48 would have been ${a48(codes).map((x) => x.toFixed(1)).join('° x ')}°`);
  }

  // How common is this shape? Every two-country, one-trip-each library there is.
  let multi = 0, tot = 0;
  for (let i = 0; i < CODES.length; i++) for (let j = i + 1; j < CODES.length; j++) {
    tot++;
    const ki = core.countryKeyPoint(CODES[i], IDX), kj = core.countryKeyPoint(CODES[j], IDX);
    if (ki && kj && km(ki, kj) >= T) multi++;
  }
  note(`of all ${tot} two-country / one-trip-each libraries, ${multi} (${((100 * multi) / tot).toFixed(1)}%) have two clusters and a weight tie, so C5 refused to split and ONE pane framed both`);
  // [I-8i] **R38-2's own oracle, and it MUST flip.** The finding was that C5's abstention was
  // its majority case; A-51 withdraws the split test, so the shape it names no longer exists.
  sup('R38-2: the multi-cluster no-split pane is a minority shape',
    'A-51 (C5 withdrawn — there is no no-split pane left to be a majority)',
    `${((100 * multi) / tot).toFixed(1)}% of pairs held two clusters`);
  ok(multi / tot > 0.5,
    `R38-2 re-derived: ${((100 * multi) / tot).toFixed(1)}% of two-country libraries held two clusters, which is why C5's abstention was the majority case`,
    `${((100 * multi) / tot).toFixed(1)}%`);
  // …and the census A-51 replaces it with: the pane-count histogram over every pair, plus the
  // >120°-wide count, both re-derived here rather than quoted from the ruling.
  {
    const hist = new Map();
    let wide = 0;
    const wideCodes = new Set();
    for (let i = 0; i < CODES.length; i++) for (let j = i + 1; j < CODES.length; j++) {
      const f = frameOf([[CODES[i], 1], [CODES[j], 1]]);
      hist.set(f.panes.length, (hist.get(f.panes.length) ?? 0) + 1);
      if (f.panes.some((pp) => pp.bounds.east - pp.bounds.west > 120)) {
        wide++;
        wideCodes.add(CODES[i]); wideCodes.add(CODES[j]);
      }
    }
    const asObj = [...hist.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' · ');
    note(`A-51 pane-count histogram over all ${tot} two-country libraries: ${asObj}`);
    note(`panes wider than 120°: ${wide} pairs (A-51 Part 5 predicts 1,229, down from 8,364)`);
    ok(hist.get(1) === 5564 && hist.get(2) === 22360 && hist.get(3) === 516 && hist.get(4) === 1,
      'A-51 Part 5\'s census, re-derived: {1: 5,564 · 2: 22,360 · 3: 516 · 4: 1}', asObj);
    ok(wide === 1229, 'A-51 Part 5: panes wider than 120° fall to 1,229 (it was 8,364)', wide);
    // A-51 residue 3, decomposed rather than asserted as a slogan. ROADMAP I-8i's criterion says
    // *"**Every** one of the 1,229 contains one of AQ, FJ, KI, RU, UM"*; measured, **1,180** do,
    // and A-51 Part 5's own prose is the careful version (*"the rest are Pacific micro-states"*).
    // The other 49 split into 48 trans-antimeridian Pacific pairs — the same planar-bbox artefact
    // by a different route — and **one** honest wide pane, `CA`+`GL` at 128.8°, which is L1
    // working: Canada and Greenland are a genuine 128.8° chain of ground under the threshold.
    const five = ['AQ', 'FJ', 'KI', 'RU', 'UM'];
    let traced = 0, straddle = 0, honest = [];
    for (let i = 0; i < CODES.length; i++) for (let j = i + 1; j < CODES.length; j++) {
      const f = frameOf([[CODES[i], 1], [CODES[j], 1]]);
      const pp = f.panes.find((q) => q.bounds.east - q.bounds.west > 120);
      if (!pp) continue;
      if (five.includes(CODES[i]) || five.includes(CODES[j])) { traced++; continue; }
      const lngs = pp.codes.flatMap((c) => core.countryParts(c, IDX, T).flatMap((q) => [q.box[0], q.box[2]]));
      if (Math.min(...lngs) < -150 && Math.max(...lngs) > 150) straddle++;
      else honest.push(`${CODES[i]}+${CODES[j]}@${(pp.bounds.east - pp.bounds.west).toFixed(1)}°`);
    }
    note(`the 1,229 wide panes decompose as: ${traced} containing one of ${five.join('/')}, ${straddle} trans-antimeridian Pacific pairs, ${honest.length} genuinely-wide land chain(s) — ${honest.join(' ')}`);
    ok(traced === 1180 && straddle === 48 && honest.length === 1 && honest[0].startsWith('CA+GL'),
      'A-51 residue 3, measured: 1,180 + 48 antimeridian artefacts + ONE honest 128.8° land chain (CA+GL)',
      [traced, straddle, honest]);
    ok(traced + straddle + honest.length === 1229, 'and the three buckets account for every wide pane');
  }
}

// ===========================================================================
head('K0  cost — I-8h against I-8g, same machine, same run');
{
  const rows = (n) => CODES.slice(0, n).map((c) => statRow(c, 1));
  for (const n of [7, 25, 50, 100, 239]) {
    const r = rows(n);
    worldMapFrame(statsFor(r), IDX);
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < 10; i++) worldMapFrame(statsFor(r), IDX);
    const t1 = process.hrtime.bigint();
    note(`worldMapFrame over ${String(n).padStart(3)} codes: ${(Number(t1 - t0) / 1e7).toFixed(2)} ms per build (no memoisation — A-40 clause 4 — so this is per render)`);
  }
  const t0 = process.hrtime.bigint();
  for (const c of CODES) core.countryParts(c, IDX, T);
  const t1 = process.hrtime.bigint();
  ok(Number(t1 - t0) / 1e6 < 50, `countryParts over all 239 codes costs ${(Number(t1 - t0) / 1e6).toFixed(2)} ms — the new call is not the cost driver`);
}

// ===========================================================================
head('K  cost at the 239-code ceiling');
{
  let t0 = process.hrtime.bigint();
  let parts = 0;
  for (const c of CODES) parts += core.countryParts(c, IDX, T).length;
  let t1 = process.hrtime.bigint();
  note(`countryParts over all ${CODES.length} codes: ${parts} parts in ${(Number(t1 - t0) / 1e6).toFixed(2)} ms`);
  ok(parts === 242, 'A-49 Part 6: 242 parts at the 239-code ceiling', parts);

  const all = CODES.map((c) => statRow(c, 1));
  t0 = process.hrtime.bigint();
  const f = worldMapFrame(statsFor(all), IDX);
  t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6;
  note(`worldMapFrame over all 239 codes: ${ms.toFixed(1)} ms, ${f.panes.length} pane(s), ${f.countries.length} paint rows, ${f.countries.reduce((n, c) => n + c.d.length, 0)} chars of path data`);
  ok(ms < 2000, 'the 239-code frame builds in under 2 s', ms);
  // repeat, to see whether the caller can afford it per render
  t0 = process.hrtime.bigint();
  for (let i = 0; i < 5; i++) worldMapFrame(statsFor(all), IDX);
  t1 = process.hrtime.bigint();
  note(`5 further builds: ${(Number(t1 - t0) / 5e6).toFixed(1)} ms each (there is NO memoisation — A-40 clause 4 — so this is per render)`);
}

// ===========================================================================
head('L  the standing constraints, re-checked on the files this increment touched');
{
  const read = (p) => readFileSync(resolve(CAIRN, p), 'utf8');
  const walk = (d) => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const clientSrc = walk(resolve(CAIRN, 'packages/client/src')).filter((p) => p.endsWith('.ts'));
  const coreSrc = walk(resolve(CAIRN, 'packages/core/src')).filter((p) => p.endsWith('.ts'));
  // Comments are stripped first: `worldMap.ts`'s W1 docstring NAMES the forbidden idioms, which
  // is the point of a greppable ceiling and is not a use of them.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const domHits = [];
  for (const p of clientSrc) {
    const s = strip(readFileSync(p, 'utf8'));
    for (const tok of ['document.', 'window.', 'getBoundingClientRect', 'ResizeObserver', 'from \'react', 'localStorage', 'navigator.']) {
      if (s.includes(tok)) domHits.push(`${p.replace(CAIRN + '/', '')}:${tok}`);
    }
  }
  ok(domHits.length === 0, 'packages/client touches no DOM, no React (cairn-constraints §5)', domHits);
  const detHits = [];
  for (const p of coreSrc) {
    const s = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const tok of ['Date.now(', 'Math.random(', 'crypto.randomUUID(', 'new Date(']) if (s.includes(tok)) detHits.push(`${p.replace(CAIRN + '/', '')}:${tok}`);
  }
  ok(detHits.length === 0, 'packages/core has no ambient clock or randomness (cairn-constraints §4)', detHits);
  for (const pkg of ['packages/core', 'packages/client']) {
    const j = JSON.parse(read(`${pkg}/package.json`));
    // `@cairn/*` is this repo's own workspace, not a runtime dependency in the rule's sense.
    const ext = Object.keys(j.dependencies ?? {}).filter((d) => !d.startsWith('@cairn/'));
    ok(ext.length === 0, `${pkg} has zero third-party runtime dependencies`, j.dependencies);
  }
  ok(JSON.parse(read('package.json')).dependencies === undefined, 'and the workspace root added none either');
  const country = read('packages/core/src/derive/country.ts');
  ok(!/\bhaversine\b/.test(country.replace(/\/\*[\s\S]*?\*\//g, '')),
    'A-49 Part 9: no distance function reached derive/country.ts');
  const view = read('apps/web/src/views/WorldMap.tsx');
  for (const tok of ['.sort(', 'new Set(', 'Object.keys(']) ok(!view.includes(tok), `A-49 Part 5's greppable ceiling: \`${tok}\` absent from WorldMap.tsx`, tok);
  // The root read-only boundary.
  ok(read('../europe-2026-itinerary.html').length > 0, 'the root planner is readable and untouched by this pass (see git status)');
}

// ===========================================================================
head('M  degenerate inputs — the frame must still be a frame');
{
  const empty = worldMapFrame(statsFor([]), IDX);
  ok(empty.panes.length === 1 && empty.panes[0].id === 'p0' && empty.panes[0].viewBox === '-180 -90 360 180'
     && empty.panes[0].aspect === 2 && empty.panes[0].home.length === 0 && empty.panes[0].weight === 0
     && empty.codes.length === 0 && empty.missing.length === 0,
    'an empty library is ONE pane showing the whole world (A-41 I7), aspect 2, home [], weight 0', empty.panes);
  const unknown = worldMapFrame(statsFor([statRow('ZZ'), statRow('FR')]), IDX);
  ok(unknown.missing.join() === 'ZZ' && unknown.codes.join() === 'FR',
    'a code the index cannot fill is stated in `missing` and is not in `codes` (A-40 clause 3, I13)', [unknown.missing, unknown.codes]);
  const zero = worldMapFrame(statsFor([statRow('FR', 0), statRow('JP', 0)]), IDX);
  // [I-8i] C5 is withdrawn, so "a strict majority of zero" no longer decides anything. The
  // superseded assertion is the oracle; what matters now is that a weight-0 library still gets
  // one pane per cluster, that G5's ordering stays total when every weight ties at 0, and that
  // I18 still separates the home panes from the extent one.
  sup('two zero-weight clusters do not split (C5 needs a strict majority of zero, which does not exist)',
    'A-51 (C5 withdrawn)', zero.panes.map((pp) => [pp.home, pp.weight]));
  ok(zero.panes.length === 3 && zero.panes.every((pp) => pp.weight === 0) &&
     zero.panes.map((pp) => pp.home.length > 0).join() === 'true,true,false',
    'A-51 G5/I18: a weight-0 library still gets one pane per cluster, home panes first, ordering still total',
    zero.panes.map((pp) => [pp.codes, pp.home, pp.weight]));
  const allMissing = worldMapFrame(statsFor([statRow('ZZ'), statRow('YY')]), IDX);
  ok(allMissing.panes.length === 1 && allMissing.panes[0].viewBox === '-180 -90 360 180' && allMissing.missing.length === 2,
    'a library the index cannot fill AT ALL is still one whole-world pane, not a crash', allMissing.panes);
  const provisional = worldMapFrame(statsFor([{ ...statRow('FR'), provisional: true }]), IDX);
  ok(provisional.countries.every((c) => c.provisional),
    'A-34: both rows of a twice-drawn provisional country carry `provisional`', provisional.countries.map((c) => [c.paneId, c.provisional]));
  ok(provisional.countries.length === 2 && provisional.countries[0].tripIds.join() === provisional.countries[1].tripIds.join(),
    'and both carry the identical tripIds, so the tap is the same fact in both panes');
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL`}${sups ? ` · ${sups} SUPERSEDED by A-51/A-52/A-53 (I-8i)` : ''}`);
process.exit(0);
