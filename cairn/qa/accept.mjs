const C='../packages/core/src/index.ts';
const core=await import(C);
const {loadEurope2026, FIXTURE_TODAY}=await import('../fixtures/loadEurope2026.mjs');
const {trip, issues, cityRangeCheck}=loadEurope2026();
let pass=0,fail=0;
const ck=(name,cond,extra='')=>{ if(cond){pass++;console.log('  ok  ',name);} else {fail++;console.log('  FAIL',name,extra);} };

console.log('== counts ==');
ck('16 days', trip.days.length===16, trip.days.length);
const dates=trip.days.map(d=>d.date);
ck('dense 08-07..08-22', dates[0]==='2026-08-07'&&dates[15]==='2026-08-22');
ck('Day.id===Day.date', trip.days.every(d=>d.id===d.date));
const sched=trip.days.flatMap(d=>d.stops);
ck('112 scheduled', sched.length===112, sched.length);
ck('31 pool', trip.pool.length===31, trip.pool.length);
const poolBy={}; for(const s of trip.pool) poolBy[s.placement.cityKey]=(poolBy[s.placement.cityKey]||0)+1;
ck('pool split', JSON.stringify(poolBy)===JSON.stringify({vienna:8,dubrovnik:3,split:3,prague:8,budapest:6,london:3}), JSON.stringify(poolBy));
ck('95 places', trip.places.length===95, trip.places.length);
const plBy={}; for(const p of trip.places) plBy[p.cityKey]=(plBy[p.cityKey]||0)+1;
ck('places split', plBy.vienna===15&&plBy.dubrovnik===12&&plBy.split===15&&plBy.prague===25&&plBy.budapest===21&&plBy.london===7, JSON.stringify(plBy));
ck('21 bookings', trip.bookings.length===21, trip.bookings.length);
const multi=trip.days.filter(d=>d.cities.length>1);
ck('5 multi-city days', multi.length===5, multi.map(d=>d.id+':'+d.cities.join('+')).join(' '));
ck('multi-city membership', JSON.stringify(multi.map(d=>d.id+' '+d.cities.join('+')))===JSON.stringify(['2026-08-10 vienna+dubrovnik','2026-08-12 dubrovnik+split','2026-08-15 split+prague','2026-08-18 prague+budapest','2026-08-21 budapest+london']), JSON.stringify(multi.map(d=>d.id+' '+d.cities.join('+'))));
ck('3 candidate days', trip.days.filter(d=>d.provenance.state==='candidate').length===3);
ck('21 suggested stops', sched.filter(s=>core.displayStatus(s)==='suggested').length===21, sched.filter(s=>core.displayStatus(s)==='suggested').length);
ck('7 ticket stops', sched.filter(s=>s.ticket).length===7, sched.filter(s=>s.ticket).length);
ck('2 bundled', sched.filter(s=>s.ticket?.kind==='bundled').length===2);
ck('81 arrival overrides', sched.filter(s=>s.arrival).length===81, sched.filter(s=>s.arrival).length);
ck('49 costed', sched.filter(s=>s.cost).length===49, sched.filter(s=>s.cost).length);
console.log('cityRangeCheck:', JSON.stringify(cityRangeCheck));

console.log('== conflicts ==');
const cf=core.detectConflicts(trip,{today:FIXTURE_TODAY});
const byS={}; for(const c of cf) byS[c.severity]=(byS[c.severity]||0)+1;
console.log('  severities', JSON.stringify(byS));
const byR={}; for(const c of cf) byR[c.ruleId]=(byR[c.ruleId]||0)+1;
console.log('  rules', JSON.stringify(byR));
ck('12 blockers', byS.blocker===12, byS.blocker);
ck('4 warnings', byS.warning===4, byS.warning);
ck('11 notes', byS.note===11, byS.note);
ck('legacy_flag Aug18+Aug20', cf.filter(c=>c.ruleId==='legacy_flag').length===2);
ck('superseded YZGDTS', cf.some(c=>c.ruleId==='superseded_booking'));
ck('2 unverified_reference', cf.filter(c=>c.ruleId==='unverified_reference').length===2, cf.filter(c=>c.ruleId==='unverified_reference').length);
ck('no booking_vs_plan on Aug15', !cf.some(c=>c.ruleId==='booking_vs_plan'&&JSON.stringify(c.subjects).includes('08-15')), JSON.stringify(cf.filter(c=>c.ruleId==='booking_vs_plan').map(c=>c.summary)));

console.log('== validation ==');
const iss=core.validateTrip(trip);
const lv={}; for(const i of iss) lv[i.level]=(lv[i.level]||0)+1;
console.log('  ', JSON.stringify(lv));
ck('1 error 30 warn', lv.error===1&&lv.warn===30, JSON.stringify(lv));
console.log('  error:', JSON.stringify(iss.filter(i=>i.level==='error')));

console.log('== round trip ==');
const a=core.toJSON(trip); const b=core.toJSON(core.fromJSON(a));
ck('toJSON(fromJSON(toJSON)) byte-identical', a===b);

console.log('== conflict id stability ==');
const r2=loadEurope2026();
const cf2=core.detectConflicts(r2.trip,{today:FIXTURE_TODAY});
ck('ids stable on re-import', JSON.stringify(cf.map(c=>c.id))===JSON.stringify(cf2.map(c=>c.id)));

console.log(`\n${pass} pass, ${fail} fail`);
