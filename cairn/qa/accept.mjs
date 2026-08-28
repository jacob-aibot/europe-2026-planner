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
// REPAIRED, Phase 2 I-0: `JSON.stringify` of an object compares KEY ORDER as well as values,
// and the importer's insertion order is the trip's city order, not the order ROADMAP §A lists
// them in. The values have always matched; the comparison never could. Per-key now.
const poolWant={vienna:8,dubrovnik:3,split:3,prague:8,budapest:6,london:3};
ck('pool split', Object.keys(poolWant).every(k=>poolBy[k]===poolWant[k]) && Object.keys(poolBy).length===Object.keys(poolWant).length, JSON.stringify(poolBy));
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
// REPAIRED, Phase 2 I-0: **3**, not 2. ROADMAP §A: "7 stops carrying a `Ticket`; 3 of them
// `kind:'bundled'`, over 2 distinct files" — revision 1 said 2, the repo's own
// `import.test.ts:63` asserted 3, and ROADMAP sequencing rule 5 names this exact number as the
// worked example of a stated count the suite contradicted. The 2 was the document's error.
ck('3 bundled', sched.filter(s=>s.ticket?.kind==='bundled').length===3, sched.filter(s=>s.ticket?.kind==='bundled').length);
ck('81 arrival overrides', sched.filter(s=>s.arrival).length===81, sched.filter(s=>s.arrival).length);
ck('49 costed', sched.filter(s=>s.cost).length===49, sched.filter(s=>s.cost).length);
console.log('cityRangeCheck:', JSON.stringify(cityRangeCheck));

console.log('== conflicts ==');
const cf=core.detectConflicts(trip,{today:FIXTURE_TODAY});
const byS={}; for(const c of cf) byS[c.severity]=(byS[c.severity]||0)+1;
console.log('  severities', JSON.stringify(byS));
const byR={}; for(const c of cf) byR[c.ruleId]=(byR[c.ruleId]||0)+1;
console.log('  rules', JSON.stringify(byR));
// REPAIRED, Phase 2 I-0: **2**, not 12. ROADMAP §C: "`detectConflicts` returns exactly 2
// blockers on the unmodified reference trip: the `legacy_flag` days Aug 18 and Aug 20, and
// nothing else." The 12 was revision 1's number, of which QA found 3 real (§0.5); §2.12's
// `travelRole` and §2.13's `geoCheck` rewrite removed the other ten.
ck('2 blockers', byS.blocker===2, byS.blocker);
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
// REPAIRED, Phase 2 I-0: **1 error, 10 warn**. The 30 was 10 + the 20 `stop_far_from_city`
// warnings that code emitted before §2.9 DELETED it (ROADMAP Phase 1 row 2). Measured on this
// run, not quoted; the one error is asserted by identity below as well as by count.
ck('1 error 10 warn', lv.error===1&&lv.warn===10, JSON.stringify(lv));
ck('...and the one error is place-92, the place with no coordinates at all',
   iss.filter(i=>i.level==='error').every(i=>i.code==='lat_lng_out_of_range'&&i.ref.id==='place-92'),
   JSON.stringify(iss.filter(i=>i.level==='error').map(i=>[i.code,i.ref.id])));
console.log('  error:', JSON.stringify(iss.filter(i=>i.level==='error')));

console.log('== round trip ==');
const a=core.toJSON(trip); const b=core.toJSON(core.fromJSON(a));
ck('toJSON(fromJSON(toJSON)) byte-identical', a===b);

console.log('== conflict id stability ==');
const r2=loadEurope2026();
const cf2=core.detectConflicts(r2.trip,{today:FIXTURE_TODAY});
ck('ids stable on re-import', JSON.stringify(cf.map(c=>c.id))===JSON.stringify(cf2.map(c=>c.id)));

console.log(`\n${pass} pass, ${fail} fail`);
