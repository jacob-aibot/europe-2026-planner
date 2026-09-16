// Input is Natural Earth's public-domain 1:10m Admin 0 GeoJSON. Presentation asset only.
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
await writeFile('apps/web/public/images/croatia-coast.svg',svg);
console.log(`Natural Earth source SHA256 ${createHash('sha256').update(source).digest('hex')}; SVG ${svg.length} bytes.`);
