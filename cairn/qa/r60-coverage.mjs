/**
 * R60 — how much of a real traveller's history can the I-21 gazetteer actually record?
 *
 * A-82's own bar is Jacob's: *"For people wanting to put in past trips — how would they do it? …
 * Otherwise it's not a true sign of their travels."* A-82 Part 1 measurement 3 named nine misses
 * anecdotally (Hvar, Vis, Interlaken, Positano, Hallstatt, Hakone, Cinque Terre, Ubud, Kotor).
 * Nobody had a NUMBER. This produces one.
 *
 * Method, and why it is strict rather than generous:
 *   - every query is written in already-folded ASCII form, so no third copy of `foldPlaceName`
 *     is needed to score it (`foldPlaceName` is module-private by A-82 Part 3);
 *   - a HIT is a returned row whose `fold` or one of whose `alts` EQUALS the query **and** whose
 *     `countryCode` is the country the place is actually in. That is the bar a user's map needs:
 *     found, and attributed to the right nation.
 *   - a row that matches the name but names the wrong country is scored WRONG-COUNTRY, separately,
 *     because it is a different (worse) failure than a miss;
 *   - a row that matches only as a prefix of something longer (query `nara` -> `Naracoorte`) is
 *     NOT a hit; the traveller wanted the place they typed.
 *   - rank is recorded: a hit below the default 20-row window is reported, because a form shows a
 *     list, not a set.
 *
 * Run:  node qa/r60-coverage.mjs        (from cairn/)
 *       node qa/r60-coverage.mjs --misses    prints only the misses
 */
const { GAZETTEER } = await import('@cairn/core/gazetteer');
const { searchGazetteer } = await import('../packages/core/src/index.ts');

/** [query (pre-folded ASCII), expected ISO_A2, display name, bucket] */
const CORPUS = [
  // ---- bucket A: famous small towns and villages people actually log ----
  ['hallstatt', 'AT', 'Hallstatt', 'village'],
  ['positano', 'IT', 'Positano', 'village'],
  ['giverny', 'FR', 'Giverny', 'village'],
  ['sintra', 'PT', 'Sintra', 'village'],
  ['zermatt', 'CH', 'Zermatt', 'village'],
  ['interlaken', 'CH', 'Interlaken', 'village'],
  ['ronda', 'ES', 'Ronda', 'village'],
  ['obidos', 'PT', 'Óbidos', 'village'],
  ['hoi an', 'VN', 'Hoi An', 'village'],
  ['nikko', 'JP', 'Nikko', 'village'],
  ['monterosso al mare', 'IT', 'Monterosso al Mare (Cinque Terre)', 'village'],
  ['vernazza', 'IT', 'Vernazza (Cinque Terre)', 'village'],
  ['corniglia', 'IT', 'Corniglia (Cinque Terre)', 'village'],
  ['manarola', 'IT', 'Manarola (Cinque Terre)', 'village'],
  ['riomaggiore', 'IT', 'Riomaggiore (Cinque Terre)', 'village'],
  ['colmar', 'FR', 'Colmar', 'village'],
  ['cesky krumlov', 'CZ', 'Český Krumlov', 'village'],
  ['rothenburg ob der tauber', 'DE', 'Rothenburg ob der Tauber', 'village'],
  ['hallstatt', 'AT', 'Hallstatt', 'village'],
  ['bled', 'SI', 'Bled', 'village'],
  ['kotor', 'ME', 'Kotor', 'village'],
  ['mostar', 'BA', 'Mostar', 'village'],
  ['amalfi', 'IT', 'Amalfi', 'village'],
  ['ravello', 'IT', 'Ravello', 'village'],
  ['portofino', 'IT', 'Portofino', 'village'],
  ['alberobello', 'IT', 'Alberobello', 'village'],
  ['matera', 'IT', 'Matera', 'village'],
  ['taormina', 'IT', 'Taormina', 'village'],
  ['assisi', 'IT', 'Assisi', 'village'],
  ['siena', 'IT', 'Siena', 'village'],
  ['san gimignano', 'IT', 'San Gimignano', 'village'],
  ['bellagio', 'IT', 'Bellagio (Lake Como)', 'village'],
  ['hallstatt', 'AT', 'Hallstatt', 'village'],
  ['gruyeres', 'CH', 'Gruyères', 'village'],
  ['lauterbrunnen', 'CH', 'Lauterbrunnen', 'village'],
  ['grindelwald', 'CH', 'Grindelwald', 'village'],
  ['annecy', 'FR', 'Annecy', 'village'],
  ['eze', 'FR', 'Èze', 'village'],
  ['chamonix', 'FR', 'Chamonix', 'village'],
  ['mont saint michel', 'FR', 'Mont-Saint-Michel', 'village'],
  ['carcassonne', 'FR', 'Carcassonne', 'village'],
  ['guimaraes', 'PT', 'Guimarães', 'village'],
  ['nazare', 'PT', 'Nazaré', 'village'],
  ['mijas', 'ES', 'Mijas', 'village'],
  ['cadaques', 'ES', 'Cadaqués', 'village'],
  ['hallstatt', 'AT', 'Hallstatt', 'village'],
  ['reine', 'NO', 'Reine (Lofoten)', 'village'],
  ['flam', 'NO', 'Flåm', 'village'],
  ['geiranger', 'NO', 'Geiranger', 'village'],
  ['vik', 'IS', 'Vík í Mýrdal', 'village'],
  ['shirakawa', 'JP', 'Shirakawa-go', 'village'],
  ['takayama', 'JP', 'Takayama', 'village'],
  ['hakone', 'JP', 'Hakone', 'village'],
  ['miyajima', 'JP', 'Miyajima', 'village'],
  ['luang prabang', 'LA', 'Luang Prabang', 'village'],
  ['vang vieng', 'LA', 'Vang Vieng', 'village'],
  ['sapa', 'VN', 'Sa Pa', 'village'],
  ['ninh binh', 'VN', 'Ninh Binh', 'village'],
  ['pai', 'TH', 'Pai', 'village'],
  ['ubud', 'ID', 'Ubud', 'village'],
  ['chefchaouen', 'MA', 'Chefchaouen', 'village'],
  ['essaouira', 'MA', 'Essaouira', 'village'],
  ['jaisalmer', 'IN', 'Jaisalmer', 'village'],
  ['pushkar', 'IN', 'Pushkar', 'village'],
  ['hampi', 'IN', 'Hampi', 'village'],
  ['oia', 'GR', 'Oia (Santorini)', 'village'],
  ['delphi', 'GR', 'Delphi', 'village'],
  ['kalambaka', 'GR', 'Kalambaka (Meteora)', 'village'],
  ['sighisoara', 'RO', 'Sighișoara', 'village'],
  ['banos', 'EC', 'Baños', 'village'],
  ['monteverde', 'CR', 'Monteverde', 'village'],
  ['la fortuna', 'CR', 'La Fortuna (Arenal)', 'village'],
  ['aguas calientes', 'PE', 'Aguas Calientes (Machu Picchu)', 'village'],
  ['ollantaytambo', 'PE', 'Ollantaytambo', 'village'],
  ['el chalten', 'AR', 'El Chaltén', 'village'],

  // ---- bucket B: island / beach destinations ----
  ['santorini', 'GR', 'Santorini', 'island'],
  ['thira', 'GR', 'Thira (Santorini town)', 'island'],
  ['mykonos', 'GR', 'Mykonos', 'island'],
  ['hydra', 'GR', 'Hydra', 'island'],
  ['naxos', 'GR', 'Naxos', 'island'],
  ['hvar', 'HR', 'Hvar', 'island'],
  ['vis', 'HR', 'Vis', 'island'],
  ['korcula', 'HR', 'Korčula', 'island'],
  ['capri', 'IT', 'Capri', 'island'],
  ['ibiza', 'ES', 'Ibiza', 'island'],
  ['palma', 'ES', 'Palma de Mallorca', 'island'],
  ['bora bora', 'PF', 'Bora Bora', 'island'],
  ['male', 'MV', 'Malé', 'island'],
  ['stone town', 'TZ', 'Stone Town, Zanzibar', 'island'],
  ['phuket', 'TH', 'Phuket', 'island'],
  ['krabi', 'TH', 'Krabi', 'island'],
  ['ko samui', 'TH', 'Ko Samui', 'island'],
  ['el nido', 'PH', 'El Nido, Palawan', 'island'],
  ['boracay', 'PH', 'Boracay', 'island'],
  ['gili trawangan', 'ID', 'Gili Trawangan', 'island'],
  ['nusa penida', 'ID', 'Nusa Penida', 'island'],
  ['key west', 'US', 'Key West', 'island'],
  ['tulum', 'MX', 'Tulum', 'island'],
  ['positano', 'IT', 'Positano', 'island'],

  // ---- bucket C: national-park gateways ----
  ['banff', 'CA', 'Banff', 'park'],
  ['jasper', 'CA', 'Jasper', 'park'],
  ['whistler', 'CA', 'Whistler', 'park'],
  ['moab', 'US', 'Moab', 'park'],
  ['springdale', 'US', 'Springdale (Zion)', 'park'],
  ['estes park', 'US', 'Estes Park', 'park'],
  ['west yellowstone', 'US', 'West Yellowstone', 'park'],
  ['jackson', 'US', 'Jackson, WY (Grand Teton)', 'park'],
  ['sedona', 'US', 'Sedona', 'park'],
  ['gatlinburg', 'US', 'Gatlinburg (Smokies)', 'park'],
  ['bar harbor', 'US', 'Bar Harbor (Acadia)', 'park'],
  ['puerto natales', 'CL', 'Puerto Natales (Torres del Paine)', 'park'],
  ['el calafate', 'AR', 'El Calafate', 'park'],
  ['ushuaia', 'AR', 'Ushuaia', 'park'],
  ['puerto iguazu', 'AR', 'Puerto Iguazú', 'park'],
  ['kasane', 'BW', 'Kasane (Chobe)', 'park'],
  ['livingstone', 'ZM', 'Livingstone (Victoria Falls)', 'park'],
  ['moshi', 'TZ', 'Moshi (Kilimanjaro)', 'park'],
  ['arusha', 'TZ', 'Arusha (Serengeti)', 'park'],
  ['skukuza', 'ZA', 'Skukuza (Kruger)', 'park'],
  ['queenstown', 'NZ', 'Queenstown', 'park'],
  ['wanaka', 'NZ', 'Wanaka', 'park'],
  ['te anau', 'NZ', 'Te Anau (Milford Sound)', 'park'],
  ['franz josef', 'NZ', 'Franz Josef Glacier', 'park'],
  ['siem reap', 'KH', 'Siem Reap (Angkor)', 'park'],
  ['huaraz', 'PE', 'Huaraz', 'park'],

  // ---- bucket D: the control set — ordinary large cities ----
  ['paris', 'FR', 'Paris', 'control'],
  ['london', 'GB', 'London', 'control'],
  ['tokyo', 'JP', 'Tokyo', 'control'],
  ['new york', 'US', 'New York', 'control'],
  ['berlin', 'DE', 'Berlin', 'control'],
  ['madrid', 'ES', 'Madrid', 'control'],
  ['rome', 'IT', 'Rome', 'control'],
  ['cairo', 'EG', 'Cairo', 'control'],
  ['lagos', 'NG', 'Lagos', 'control'],
  ['mumbai', 'IN', 'Mumbai', 'control'],
  ['sydney', 'AU', 'Sydney', 'control'],
  ['toronto', 'CA', 'Toronto', 'control'],
  ['buenos aires', 'AR', 'Buenos Aires', 'control'],
  ['nairobi', 'KE', 'Nairobi', 'control'],
  ['bangkok', 'TH', 'Bangkok', 'control'],
  ['seoul', 'KR', 'Seoul', 'control'],
  ['istanbul', 'TR', 'Istanbul', 'control'],
  ['mexico city', 'MX', 'Mexico City', 'control'],
  ['sao paulo', 'BR', 'São Paulo', 'control'],
  ['jakarta', 'ID', 'Jakarta', 'control'],
  ['manila', 'PH', 'Manila', 'control'],
  ['lima', 'PE', 'Lima', 'control'],
  ['johannesburg', 'ZA', 'Johannesburg', 'control'],
  ['warsaw', 'PL', 'Warsaw', 'control'],
  ['vienna', 'AT', 'Vienna', 'control'],
  ['budapest', 'HU', 'Budapest', 'control'],
  ['prague', 'CZ', 'Prague', 'control'],
  ['lisbon', 'PT', 'Lisbon', 'control'],
  ['athens', 'GR', 'Athens', 'control'],
  ['dublin', 'IE', 'Dublin', 'control'],
  ['stockholm', 'SE', 'Stockholm', 'control'],
  ['copenhagen', 'DK', 'Copenhagen', 'control'],
  ['oslo', 'NO', 'Oslo', 'control'],
  ['helsinki', 'FI', 'Helsinki', 'control'],
  ['zurich', 'CH', 'Zürich', 'control'],
  ['munich', 'DE', 'Munich', 'control'],
  ['hamburg', 'DE', 'Hamburg', 'control'],
  ['milan', 'IT', 'Milan', 'control'],
  ['naples', 'IT', 'Naples', 'control'],
  ['barcelona', 'ES', 'Barcelona', 'control'],
  ['seville', 'ES', 'Seville', 'control'],
  ['porto', 'PT', 'Porto', 'control'],
  ['krakow', 'PL', 'Kraków', 'control'],
  ['split', 'HR', 'Split', 'control'],
  ['dubrovnik', 'HR', 'Dubrovnik', 'control'],
  ['edinburgh', 'GB', 'Edinburgh', 'control'],
  ['reykjavik', 'IS', 'Reykjavík', 'control'],
  ['marrakesh', 'MA', 'Marrakesh', 'control'],
  ['kyoto', 'JP', 'Kyoto', 'control'],
  ['osaka', 'JP', 'Osaka', 'control'],
];

// de-duplicate (the list above deliberately repeats Hallstatt/Positano across buckets)
const seen = new Set();
const corpus = CORPUS.filter(([qq, cc]) => {
  const k = `${qq}|${cc}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const LIMIT = 20;
const rows = [];
for (const [query, cc, display, bucket] of corpus) {
  const hits = searchGazetteer(query, GAZETTEER, { limit: LIMIT });
  const nameMatches = hits.filter((h) => h.fold === query || h.alts.includes(query));
  const right = nameMatches.find((h) => h.countryCode === cc);
  const wrongCountryOnly = nameMatches.length > 0 && right === undefined;
  let verdict;
  if (right) verdict = 'HIT';
  else if (wrongCountryOnly) verdict = 'WRONG-COUNTRY';
  else if (hits.length === 0) verdict = 'MISS(no rows at all)';
  else verdict = 'MISS(no exact name)';
  rows.push({
    query, cc, display, bucket, verdict,
    rank: right ? hits.indexOf(right) + 1 : null,
    label: right ? right.label : (nameMatches[0]?.label ?? hits[0]?.label ?? ''),
    nHits: hits.length,
  });
}

const only = process.argv.includes('--misses');
const buckets = ['village', 'island', 'park', 'control'];
const pad = (s, n) => String(s).padEnd(n);

console.log(`R60 gazetteer coverage — ${rows.length} destinations, ${GAZETTEER.rows.length} shipped rows`);
console.log('');
for (const b of buckets) {
  const rs = rows.filter((r) => r.bucket === b);
  const hit = rs.filter((r) => r.verdict === 'HIT');
  console.log(`## ${b}  —  ${hit.length}/${rs.length} = ${((hit.length / rs.length) * 100).toFixed(1)}%`);
  for (const r of rs) {
    if (only && r.verdict === 'HIT') continue;
    const mark = r.verdict === 'HIT' ? (r.rank === 1 ? '  ok  ' : `  ok@${r.rank} `) : ' ---- ';
    console.log(`${mark}${pad(r.display, 34)} ${pad(r.verdict, 22)} ${r.verdict === 'HIT' ? r.label : (r.label ? `top: ${r.label}` : 'no rows')}`);
  }
  console.log('');
}

const hits = rows.filter((r) => r.verdict === 'HIT');
const wrong = rows.filter((r) => r.verdict === 'WRONG-COUNTRY');
const misses = rows.filter((r) => r.verdict.startsWith('MISS'));
const travel = rows.filter((r) => r.bucket !== 'control');
const travelHits = travel.filter((r) => r.verdict === 'HIT');
const ctrl = rows.filter((r) => r.bucket === 'control');
const ctrlHits = ctrl.filter((r) => r.verdict === 'HIT');

console.log('==================== SUMMARY ====================');
console.log(`overall           ${hits.length}/${rows.length}  = ${((hits.length / rows.length) * 100).toFixed(1)}%`);
console.log(`travel corpus     ${travelHits.length}/${travel.length}  = ${((travelHits.length / travel.length) * 100).toFixed(1)}%   (villages + islands + park gateways)`);
console.log(`control (cities)  ${ctrlHits.length}/${ctrl.length}  = ${((ctrlHits.length / ctrl.length) * 100).toFixed(1)}%`);
console.log(`wrong country     ${wrong.length}`);
console.log(`hit but ranked >5 ${hits.filter((r) => r.rank > 5).length}`);
console.log('');
console.log('MISSES, named:');
console.log(misses.map((r) => r.display).join(', '));
if (wrong.length) {
  console.log('');
  console.log('WRONG-COUNTRY, named:');
  for (const r of wrong) console.log(`  ${r.display} expected ${r.cc} -> ${r.label}`);
}
