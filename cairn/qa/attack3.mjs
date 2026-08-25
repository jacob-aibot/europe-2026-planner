const core=await import('../packages/core/src/index.ts');
const {loadEurope2026}=await import('../fixtures/loadEurope2026.mjs');
const ok=(n,c,x='')=>console.log((c?'  ok   ':'  FAIL ')+n, c?'':x);
const ctx=(p='x')=>({ids:core.sequentialIds(p), now:'2026-01-01', actorUserId:'u1'});
const {trip}=loadEurope2026();

console.log('== Fisherman\'s Bastion class typo ==');
const bud=trip.days.find(d=>d.primaryCity==='budapest');
const st=bud.stops.find(s=>core.stopLatLng(s,trip));
const at=core.stopLatLng(st,trip);
console.log('   ',bud.id, st.name, JSON.stringify(at), 'placeKind='+st.place.kind, 'arrival='+JSON.stringify(st.arrival));
let bumped=trip;
if(st.place.kind==='place'){
  bumped={...trip, places: trip.places.map(p=>p.id===st.place.placeId?{...p,at:{lat:p.at.lat+1,lng:p.at.lng}}:p)};
} else {
  bumped=core.updateStop(trip, st.id, {place:{kind:'inline',at:{lat:at.lat+1,lng:at.lng}}}, ctx());
}
const conf=core.detectConflicts(bumped,{today:'2026-08-01'}).filter(c=>c.ruleId==='geo_outlier');
ok('typo -> geo_outlier fires', conf.some(c=>c.params.stopName===st.name), JSON.stringify(conf.map(c=>c.params.stopName)));
ok('typo -> stop_far_from_city', core.validateTrip(bumped).some(i=>i.code==='stop_far_from_city'&&i.message.includes(st.name)));
console.log('   NOTE geo_outlier skips days with primaryCity="transit":', trip.days.filter(d=>d.primaryCity==='transit').map(d=>d.id).join(','));

console.log('\n== conflict id changes when Aug 18 flight time is edited ==');
const before=core.detectConflicts(trip,{today:'2026-08-01'});
const d18=trip.days.find(d=>d.id==='2026-08-18');
console.log('   Aug18 stops:',d18.stops.map(s=>`${s.placement.time} ${s.name.slice(0,34)}`).join(' | '));
const flight=d18.stops.find(s=>/Ryanair|flight|FR|→ Budapest/i.test(s.name));
console.log('   flight stop:',flight?.name, flight?.placement.time);
const edited=core.updateStop(trip, flight.id, {placement:{...flight.placement, time:'07:30'}}, ctx());
const after=core.detectConflicts(edited,{today:'2026-08-01'});
const bIds=new Set(before.map(c=>c.id)), aIds=new Set(after.map(c=>c.id));
const gone=[...bIds].filter(i=>!aIds.has(i)), added=[...aIds].filter(i=>!bIds.has(i));
console.log('   before',before.length,'after',after.length,'ids removed',gone.length,'added',added.length);
ok('conflict ids change after the flight-time edit', gone.length>0||added.length>0);
// legacy_flag for Aug18 - does its id change?
const lf=(cs)=>cs.filter(c=>c.ruleId==='legacy_flag'&&c.subjects.some(s=>s.id==='2026-08-18')).map(c=>c.id);
console.log('   legacy_flag(Aug18) id before/after:', lf(before), lf(after), lf(before)[0]===lf(after)[0]?'UNCHANGED':'changed');
const it=(cs)=>cs.filter(c=>c.ruleId==='impossible_transfer'&&c.subjects.some(s=>s.id==='2026-08-18')).map(c=>c.id);
console.log('   impossible_transfer(Aug18) id before/after:', it(before), it(after), JSON.stringify(it(before))===JSON.stringify(it(after))?'UNCHANGED':'CHANGED');

console.log('\n== acknowledged resolution carry-over ==');
const target=before.find(c=>c.ruleId==='impossible_transfer'&&c.subjects.some(s=>s.id==='2026-08-18'));
if(target){
  const ack=core.resolveConflict(trip,{conflictId:target.id,state:'acknowledged',by:'u1',at:'2026-08-01'});
  const ackEdited=core.updateStop(ack, flight.id, {placement:{...flight.placement, time:'07:30'}}, ctx());
  const post=core.detectConflicts(ackEdited,{today:'2026-08-01'});
  const same=post.find(c=>c.id===target.id);
  ok('acknowledgement does NOT carry to the edited conflict', !same || same.resolution===null, same?JSON.stringify(same.resolution):'gone');
  const stillResolved=post.filter(c=>c.resolution).map(c=>c.ruleId);
  console.log('   conflicts still carrying a resolution after the edit:', JSON.stringify(stillResolved));
  ok('resolveConflict changed nothing but resolutions', JSON.stringify({...ack,resolutions:null,revision:0})===JSON.stringify({...trip,resolutions:null,revision:0}));
}
