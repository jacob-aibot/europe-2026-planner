const core=await import('../packages/core/src/index.ts');
const {loadEurope2026, FIXTURE_TODAY}=await import('../fixtures/loadEurope2026.mjs');
const {trip}=loadEurope2026();
const sched=trip.days.flatMap(d=>d.stops);
console.log('ticket stops:'); for(const s of sched.filter(s=>s.ticket)) console.log('  ',s.name,'|',s.ticket.kind, s.ticket.path||s.ticket.href, s.ticket.verifiedBy??'');
console.log('\ngeo_outlier blockers:');
for(const c of core.detectConflicts(trip,{today:FIXTURE_TODAY}).filter(c=>c.ruleId==='geo_outlier')) console.log('  ',c.summary);
console.log('\nimpossible_transfer:');
for(const c of core.detectConflicts(trip,{today:FIXTURE_TODAY}).filter(c=>c.ruleId==='impossible_transfer')) console.log('  ',c.summary);
