const core=await import('../packages/core/src/index.ts');
const {loadEurope2026, FIXTURE_TODAY}=await import('../fixtures/loadEurope2026.mjs');
const ok=(n,c,x='')=>console.log((c?'  ok   ':'  FAIL ')+n, c?'':x);
const ids=()=>core.sequentialIds();
const ctx=(p='x')=>({ids:core.sequentialIds(p), now:'2026-01-01', actorUserId:'u1'});

console.log('== zero-day / inverted trips ==');
try{
  const t=core.createTrip({id:'t1',title:'Zero',startDate:'2026-05-01',endDate:'2026-05-01',homeCurrency:'EUR',ownerId:'u1'},ctx());
  ok('same-day trip => 1 day', t.days.length===1, t.days.length);
  console.log('   validate:',JSON.stringify(core.validateTrip(t).map(i=>i.code)));
  console.log('   summary:',JSON.stringify(core.tripSummary(t)));
  console.log('   conflicts:',core.detectConflicts(t,{today:'2026-01-01'}).length);
}catch(e){ok('same-day trip',false,e.message)}
try{
  const t=core.createTrip({id:'t2',title:'Inverted',startDate:'2026-05-10',endDate:'2026-05-01',homeCurrency:'EUR',ownerId:'u1'},ctx());
  ok('end<start did NOT throw', true, 'days='+t.days.length);
  console.log('   validate:',JSON.stringify(core.validateTrip(t).map(i=>i.code)));
}catch(e){ok('end<start throws (acceptable if programmer error)',true,e.constructor.name+': '+e.message)}

console.log('\n== huge range ==');
try{
  const t=core.createTrip({id:'t3',title:'Long',startDate:'2000-01-01',endDate:'2100-01-01',homeCurrency:'EUR',ownerId:'u1'},ctx());
  ok('36525-day trip built', t.days.length>36000, t.days.length);
}catch(e){ok('huge range',false,e.message)}

console.log('\n== bad dates ==');
for(const [s,e] of [['not-a-date','2026-05-01'],['2026-13-45','2026-13-46'],['2026-02-30','2026-03-01'],['','']]){
  try{ const t=core.createTrip({id:'tx',title:'x',startDate:s,endDate:e,homeCurrency:'EUR',ownerId:'u1'},ctx());
    console.log(`   ("${s}","${e}") -> ${t.days.length} days, first=${t.days[0]?.date}, issues=${JSON.stringify(core.validateTrip(t).map(i=>i.code))}`);
  }catch(err){ console.log(`   ("${s}","${e}") -> threw ${err.constructor.name}: ${err.message}`); }
}

console.log('\n== immutability of build functions ==');
const {trip}=loadEurope2026();
const before=core.toJSON(trip);
const day=trip.days[3];
const s=day.stops[0];
core.updateStop(trip,s.id,{name:'MUTATED'},ctx());
core.removeStop(trip,s.id,ctx());
core.moveStop(trip,s.id,{kind:'pool',cityKey:'vienna'},ctx());
core.setTripMeta(trip,{title:'zzz'},ctx());
core.resolveConflict(trip,{conflictId:'nope',state:'dismissed',by:'u1',at:'2026-01-01'});
ok('input trip unchanged after 5 build fns', core.toJSON(trip)===before);

console.log('\n== displayStatus invariant: nothing un-accepted & non-user is "own" ==');
const sources=['user','email','friend','system'];const states=['candidate','accepted','rejected'];const confs=['confirmed','asserted','inferred'];
let bad=[];
for(const source of sources) for(const state of states) for(const confidence of confs){
  const p={source,state,confidence,addedAt:'2026-01-01',acceptedAt:state==='accepted'?'2026-01-02':null,actorUserId:null};
  const st=core.displayStatus({provenance:p});
  if(st==='own' && source!=='user' && state!=='accepted') bad.push(JSON.stringify(p)+' -> own');
}
ok('no non-user un-accepted => own', bad.length===0, bad.join('\n'));
// direct object (no provenance wrapper)?
try{ console.log('   displayStatus(provenance-directly):', core.displayStatus({source:'email',state:'candidate',confidence:'asserted',addedAt:'x',acceptedAt:null,actorUserId:null})); }catch(e){console.log('   direct provenance throws:',e.message);}
try{ console.log('   displayStatus({}):', core.displayStatus({})); }catch(e){console.log('   displayStatus({}) throws:',e.message);}
try{ console.log('   displayStatus({provenance:{}}):', core.displayStatus({provenance:{}})); }catch(e){console.log('   displayStatus({provenance:{}}) throws:',e.message);}
try{ console.log('   displayStatus(null):', core.displayStatus(null)); }catch(e){console.log('   displayStatus(null) throws:',e.message);}
