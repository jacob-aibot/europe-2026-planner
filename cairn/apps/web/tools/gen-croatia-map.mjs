// Input is Natural Earth's public-domain 1:10m Admin 0 GeoJSON. Presentation asset only.
//
// Lives under `apps/web/` because it imports `d3-geo`, and `apps/web/package.json` is the only
// manifest in the repo that declares it. `cairn/package.json` carries no `dependencies` at all
// (and the phase's dependency ceiling fences adding one), so from `cairn/tools/` it resolved only by
// npm workspace hoisting — it breaks the moment npm has a reason not to hoist.
//
// Run from anywhere; the output path is resolved against this file, not the shell's cwd:
//   node apps/web/tools/gen-croatia-map.mjs <ne_10m_admin_0_countries.geojson>
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {geoArea,geoMercator,geoPath} from 'd3-geo';
const source=await readFile(process.argv[2]);
const data=JSON.parse(source);
const selected=new Set(['Croatia','Italy','Slovenia','Bosnia and Herzegovina','Montenegro','Serbia','Hungary','Albania']);
const p=geoMercator().center([16.35,44.05]).scale(2250).translate([195,110]).clipExtent([[0,0],[390,220]]),path=geoPath(p);
const shapes=data.features.filter(f=>selected.has(f.properties.ADMIN)).map(f=>{
  const polygons=f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates];
  for(const polygon of polygons)if(geoArea({type:'Polygon',coordinates:polygon})>2*Math.PI)polygon.forEach(ring=>ring.reverse());
  return `<path d="${path(f.geometry)}" fill="${f.properties.ADMIN==='Croatia'?'#60765d':'#354f45'}" stroke="#a1ad86" stroke-width=".45"/>`;
});
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 220"><rect width="390" height="220" fill="#0b3545"/>${shapes.join('')}</svg>`;
await writeFile(new URL('../public/images/croatia-coast.svg',import.meta.url),svg);
console.log(`Natural Earth source SHA256 ${createHash('sha256').update(source).digest('hex')}; SVG ${svg.length} bytes.`);
