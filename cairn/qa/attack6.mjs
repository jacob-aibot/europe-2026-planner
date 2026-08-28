const core=await import('../packages/core/src/index.ts');
const {loadEurope2026}=await import('../fixtures/loadEurope2026.mjs');
const {extractLegacy}=await import('../tools/extract-legacy.mjs');
const {trip}=loadEurope2026();
const {constants}=extractLegacy();

console.log('== legacy OPTIONAL stops: how many carry lat/lng? ==');
let legacyWith=0, legacyTotal=0, legacyNames=[];
for(const [city,o] of Object.entries(constants.OPTIONAL)) for(const s of o.stops){ legacyTotal++; if(typeof s.lat==='number'&&typeof s.lng==='number'){legacyWith++;} else legacyNames.push(city+': '+s.n); }
console.log(`   legacy pool stops: ${legacyTotal}, with coordinates: ${legacyWith}`);
if(legacyNames.length) console.log('   without:',legacyNames);

console.log('\n== core pool stops: PlaceLink kinds ==');
const k={}; for(const s of trip.pool) k[s.place.kind]=(k[s.place.kind]||0)+1;
console.log('  ',JSON.stringify(k));
const resolvable=trip.pool.filter(s=>core.stopLatLng(s,trip)).length;
console.log(`   pool stops that resolve to a coordinate: ${resolvable}/${trip.pool.length}`);
console.log('   pool stops with NO coordinate:');
for(const s of trip.pool) if(!core.stopLatLng(s,trip)) console.log('     -',s.placement.cityKey, s.name);

console.log('\n== do scheduled stops keep their coordinates? ==');
const sched=trip.days.flatMap(d=>d.stops);
console.log(`   scheduled resolving to a coordinate: ${sched.filter(s=>core.stopLatLng(s,trip)).length}/${sched.length}`);
const kk={}; for(const s of sched) kk[s.place.kind]=(kk[s.place.kind]||0)+1;
console.log('  ',JSON.stringify(kk));

console.log('\n== legacy vs core coordinate equality, scheduled ==');
let mismatch=0;
for(const d of constants.DAYS){ const cd=trip.days.find(x=>x.date.slice(5)===d.id); 
  for(let i=0;i<d.stops.length;i++){ const ls=d.stops[i]; const cs=cd.stops[i];
    const at=core.stopLatLng(cs,trip);
    if(typeof ls.lat==='number'){ if(!at || Math.abs(at.lat-ls.lat)>1e-9 || Math.abs(at.lng-ls.lng)>1e-9){ mismatch++; if(mismatch<12) console.log(`   MISMATCH ${d.id} "${ls.n}" legacy ${ls.lat},${ls.lng} core ${at?at.lat+','+at.lng:'null'} (${cs.place.kind})`);} }
  }}
console.log('   total scheduled coordinate mismatches:',mismatch);
