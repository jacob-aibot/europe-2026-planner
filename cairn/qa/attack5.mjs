const core=await import('../packages/core/src/index.ts');
const {loadEurope2026}=await import('../fixtures/loadEurope2026.mjs');
const ok=(n,c,x='')=>console.log((c?'  ok   ':'  FAIL ')+n, c?'':x);
const {trip}=loadEurope2026();
const base={conf:core.detectConflicts(trip,{today:'2026-08-01'}).length, iss:core.validateTrip(trip).length};
console.log('baseline: conflicts',base.conf,'issues',base.iss);

console.log('\n--- A. the REAL historical typo: place "Fisherman\'s Bastion" 47.5025 -> 48.5025 (111 km north) ---');
const pl=trip.places.find(p=>/Bastion/.test(p.name));
const A={...trip, places:trip.places.map(p=>p.id===pl.id?{...p,at:{lat:48.5025,lng:p.at.lng}}:p)};
const Ac=core.detectConflicts(A,{today:'2026-08-01'}), Ai=core.validateTrip(A);
ok('geo_outlier fires', Ac.length>base.conf, `conflicts ${Ac.length} (was ${base.conf})`);
// REPAIRED, Phase 2 I-0: `validateTrip` deliberately says NOTHING about a coordinate typo —
// `stop_far_from_city` is DELETED, not renamed (§2.9), because it was a second implementation
// of the distance check `geo_outlier`/`geoCheck` already owns. The ceiling replaces the claim:
// the typo must move the CONFLICT count (asserted on the line above) and must NOT move the
// issue count, because a typo is not a structural validity problem.
ok('ceiling (§2.9): validateTrip is silent about a coordinate typo — that is geo_outlier\'s job',
   Ai.length===base.iss, `issue count moved ${base.iss} -> ${Ai.length}: `+JSON.stringify(Ai.filter(i=>/Bastion/.test(i.message)).map(i=>i.code)));
console.log('   total issues now',Ai.length);

console.log('\n--- B. pool stop "Fisherman\'s Bastion & Matthias Church" +1 deg ---');
const ps=trip.pool.find(s=>/Bastion/.test(s.name));
console.log('   pool stop place link:',JSON.stringify(ps.place),'-> at',JSON.stringify(core.stopLatLng(ps,trip)));
const B={...trip, pool: trip.pool.map(s=>s.id===ps.id?{...s, place:{kind:'inline',at:{lat:48.5025,lng:19.0347}}}:s)};
const Bc=core.detectConflicts(B,{today:'2026-08-01'}), Bi=core.validateTrip(B);
ok('geo_outlier fires on a POOL stop', Bc.length>base.conf, `conflicts ${Bc.length} (was ${base.conf})`);
ok('ceiling (§2.9): validateTrip is silent about the pool stop\'s typo too',
   Bi.length===base.iss, `issue count moved ${base.iss} -> ${Bi.length}: `+JSON.stringify(Bi.filter(i=>/Bastion/.test(i.message)).map(i=>i.code)));

console.log('\n--- C. scheduled stop WITH an arrival override, +1 deg ---');
const day=trip.days.find(d=>d.primaryCity==='budapest' && d.stops.some(s=>s.arrival && core.stopLatLng(s,trip)));
const s3=day.stops.find(s=>s.arrival && core.stopLatLng(s,trip));
const at3=core.stopLatLng(s3,trip);
const C={...trip, days: trip.days.map(d=>d.id!==day.id?d:{...d, stops:d.stops.map(s=>s.id!==s3.id?s:{...s, place:{kind:'inline',at:{lat:at3.lat+1,lng:at3.lng}}})})};
const Cc=core.detectConflicts(C,{today:'2026-08-01'}).filter(c=>c.ruleId==='geo_outlier');
const Ci=core.validateTrip(C);
console.log('   stop:',day.id,s3.name,'arrival',JSON.stringify(s3.arrival));
// REPAIRED, Phase 2 I-0: `params.stopName` became `params.name` when §2.13 rewrote
// `geo_outlier` over `geoCheck`, and `stop_far_from_city` is DELETED, not renamed (§2.9).
ok('geo_outlier fires on an arrival-override stop', Cc.some(c=>c.params.name===s3.name||c.subjects.some(x=>x.id===s3.id)), 'geo_outlier now: '+JSON.stringify(Cc.map(c=>c.params.name)));
ok('ceiling (§2.9): validateTrip emits no stop_far_from_city — the code does not exist',
   !Ci.some(i=>i.code==='stop_far_from_city'));

console.log('\n--- coverage summary ---');
const sched=trip.days.flatMap(d=>d.stops);
console.log('  scheduled stops:',sched.length,'| with arrival (geo_outlier skips):',sched.filter(s=>s.arrival).length);
console.log('  pool stops (geo_outlier never visits):',trip.pool.length);
console.log('  places (geo_outlier never visits):',trip.places.length);
console.log('  => geo_outlier examines',sched.filter(s=>!s.arrival).length,'of',sched.length+trip.pool.length+trip.places.length,'coordinate-bearing records');
