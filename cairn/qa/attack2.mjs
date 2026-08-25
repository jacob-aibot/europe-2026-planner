const core=await import('../packages/core/src/index.ts');
const {loadEurope2026}=await import('../fixtures/loadEurope2026.mjs');
const ok=(n,c,x='')=>console.log((c?'  ok   ':'  FAIL ')+n, c?'':x);
const ctx=(p='x')=>({ids:core.sequentialIds(p), now:'2026-01-01', actorUserId:'u1'});
const {trip}=loadEurope2026();

console.log('== validateTrip: gap detection ==');
const gapped={...trip, days: trip.days.filter(d=>d.date!=='2026-08-12')};
const g=core.validateTrip(gapped);
ok('gap in middle detected', g.some(i=>i.code==='days_not_dense'), JSON.stringify(g.filter(i=>i.level==='error').map(i=>i.code)));

console.log('\n== validateTrip: days do not cover [startDate,endDate] ==');
const trunc={...trip, days: trip.days.slice(0,5)};
const t=core.validateTrip(trunc);
ok('truncated tail detected', t.some(i=>i.code==='days_not_dense'), 'errors='+JSON.stringify(t.filter(i=>i.level==='error').map(i=>i.code)));
const noDays={...trip, days: []};
const n=core.validateTrip(noDays);
ok('zero days over a 16-day range detected', n.some(i=>i.level==='error'), 'issues='+JSON.stringify(n.map(i=>i.code)));

console.log('\n== validateTrip: shifted start ==');
const shifted={...trip, startDate:'2026-07-01'};
ok('startDate moved back 37 days detected', core.validateTrip(shifted).some(i=>i.code==='days_not_dense'), JSON.stringify(core.validateTrip(shifted).filter(i=>i.level==='error')));

console.log('\n== geo typo: +1 latitude ==');
const d=trip.days.find(x=>x.id==='2026-08-19');
const target=d.stops.find(s=>s.place.kind!=='none');
console.log('   target:',target?.name, JSON.stringify(target?.place));
// mutate an inline stop's coords by +1 deg via updateStop
const inline=trip.days.flatMap(x=>x.stops).find(s=>s.place.kind==='inline');
console.log('   inline sample:', inline?.name, JSON.stringify(inline?.place));
const at=inline.place.at;
const bumped=core.updateStop(trip, inline.id, {place:{kind:'inline',at:{lat:at.lat+1,lng:at.lng}}}, ctx());
const bi=core.validateTrip(bumped);
ok('+1deg typo -> stop_far_from_city', bi.some(i=>i.code==='stop_far_from_city'), JSON.stringify(bi.filter(i=>i.code==='stop_far_from_city').map(i=>i.message)));
const bc=core.detectConflicts(bumped,{today:'2026-08-01'});
ok('+1deg typo -> geo_outlier conflict', bc.some(c=>c.ruleId==='geo_outlier'&&c.params.stopName===inline.name), '');

console.log('\n== out-of-range coords ==');
const wild=core.updateStop(trip, inline.id, {place:{kind:'inline',at:{lat:999,lng:-4000}}}, ctx());
ok('lat/lng out of range', core.validateTrip(wild).some(i=>i.code==='lat_lng_out_of_range'), JSON.stringify(core.validateTrip(wild).filter(i=>i.level==='error').map(i=>i.code)));
ok('haversine on wild coords is finite', Number.isFinite(core.haversine({lat:999,lng:-4000},{lat:0,lng:0})), core.haversine({lat:999,lng:-4000},{lat:0,lng:0}));
ok('NaN coords do not crash legs', (()=>{try{const nan=core.updateStop(trip,inline.id,{place:{kind:'inline',at:{lat:NaN,lng:NaN}}},ctx());const dd=nan.days.find(x=>x.stops.some(s=>s.id===inline.id));core.computeLegs(dd,nan);core.focusCluster(dd.stops,nan);return true;}catch(e){return 'threw '+e.message}})()===true);

console.log('\n== duplicate ids ==');
const dup={...trip, days: trip.days.map(dd=>dd.id==='2026-08-13'?{...dd, stops:[...dd.stops, dd.stops[0]]}:dd)};
ok('duplicate stop id detected', core.validateTrip(dup).some(i=>i.code==='duplicate_id'), JSON.stringify(core.validateTrip(dup).filter(i=>i.level==='error').map(i=>i.code)));

console.log('\n== pool round trip losslessness ==');
const day=trip.days.find(x=>x.id==='2026-08-13');
for(const idx of [0, 2, day.stops.length-1]){
  const st=day.stops[idx];
  const a=core.returnToPool(trip, st.id, ctx());
  const b=core.scheduleFromPool(a, st.id, {dayId:day.id, time:st.placement.time}, ctx());
  const back=b.days.find(x=>x.id===day.id);
  const pos=back.stops.findIndex(s=>s.id===st.id);
  const sameJson=JSON.stringify({...back.stops[pos], provenance:null})===JSON.stringify({...st,provenance:null});
  ok(`pool round trip idx ${idx} (${st.name.slice(0,28)}) position ${idx}->${pos}`, pos===idx&&sameJson, `pos ${pos} sameJson=${sameJson}\n     was=${JSON.stringify(st.placement)}\n     now=${JSON.stringify(back.stops[pos]?.placement)}`);
}
