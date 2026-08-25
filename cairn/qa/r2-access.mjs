/**
 * Round 2, attack 4 — F-13 and the rest of the access surface.
 * Run: node qa/r2-access.mjs   (from cairn/)
 */
const core = await import('../packages/core/src/index.ts');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');

const NOW = '2026-08-25';
const rel = (shares) => ({ tripId: 't1', ownerId: 'user:jacob', shares, friendIds: ['user:marta'] });
const marta = { kind: 'user', userId: 'user:marta' };

line('F-13: a missing / non-calendar `now` must throw, not allow');
for (const bad of [undefined, '', null, 0, '2026-8-25', '2026-13-45', '2026-02-30', 'today', {}, NaN, Infinity]) {
  let verdict;
  try {
    verdict = core.canView(marta, rel([{ principal: marta, role: 'viewer', expiresAt: '2026-08-01' }]), bad);
    verdict = `RETURNED ${verdict}`;
  } catch (e) {
    verdict = 'threw';
  }
  ok(`now=${JSON.stringify(bad)}`, verdict === 'threw', verdict);
}

line('the SHARE\'s own dates get no such guard — does a malformed expiry fail open?');
for (const exp of ['2026-08-01', '2026-08-25', '2026-13-45', '2026-02-30', 'tomorrow', 'never', '', null, undefined, '9999-99-99']) {
  const r = rel([{ principal: marta, role: 'viewer', expiresAt: exp }]);
  let v;
  try { v = core.canView(marta, r, NOW); } catch (e) { v = 'threw'; }
  console.log(`  expiresAt=${JSON.stringify(exp)} -> canView=${v}`);
}
const junk = core.canView(marta, rel([{ principal: marta, role: 'viewer', expiresAt: 'tomorrow' }]), NOW);
ok('an unparseable expiresAt does not silently grant access', junk === false,
  'canView=true — the F-13 guard covers `now` only, so a malformed expiry on the SHARE fails OPEN');

line('revocation');
for (const rev of ['2026-08-01', '2099-01-01', '', null, 'garbage']) {
  const r = rel([{ principal: marta, role: 'viewer', revokedAt: rev }]);
  console.log(`  revokedAt=${JSON.stringify(rev)} -> canView=${core.canView(marta, r, NOW)}`);
}

line('the matrix: 12 principals x 5 operations');
const principals = {
  owner: { kind: 'user', userId: 'user:jacob' },
  member: { kind: 'user', userId: 'user:co' },
  friend_no_share: marta,
  stranger: { kind: 'user', userId: 'user:nobody' },
  anonymous: { kind: 'anonymous' },
  link_good: { kind: 'link', token: 'tok-live' },
  link_expired: { kind: 'link', token: 'tok-old' },
  link_revoked: { kind: 'link', token: 'tok-dead' },
  link_unknown: { kind: 'link', token: 'tok-guess' },
};
const full = {
  tripId: 't1', ownerId: 'user:jacob', memberIds: ['user:co'], friendIds: ['user:marta'],
  shares: [
    { principal: { kind: 'link', token: 'tok-live' }, role: 'viewer' },
    { principal: { kind: 'link', token: 'tok-old' }, role: 'editor', expiresAt: '2026-08-01' },
    { principal: { kind: 'link', token: 'tok-dead' }, role: 'editor', revokedAt: '2026-08-02' },
  ],
};
for (const [name, p] of Object.entries(principals)) {
  const row = ['view', 'comment', 'edit', 'share', 'delete'].map((op) => `${op}=${core.can(op, p, full, NOW)}`);
  console.log(`  ${name.padEnd(16)} ${row.join(' ')}`);
}
ok('a friend with no share cannot view', core.canView(marta, full, NOW) === false);
ok('an anonymous principal cannot view', core.canView({ kind: 'anonymous' }, full, NOW) === false);
ok('an expired link cannot view', core.canView({ kind: 'link', token: 'tok-old' }, full, NOW) === false);
ok('a revoked link cannot view', core.canView({ kind: 'link', token: 'tok-dead' }, full, NOW) === false);
ok('an unknown link token cannot view', core.canView({ kind: 'link', token: 'tok-guess' }, full, NOW) === false);

line('a share granted to {kind:"anonymous"} matches EVERY anonymous caller');
const anonShare = { tripId: 't1', ownerId: 'user:jacob', shares: [{ principal: { kind: 'anonymous' }, role: 'editor' }] };
console.log('  canEdit(anonymous):', core.canEdit({ kind: 'anonymous' }, anonShare, NOW));

line('prototype-pollution style principal');
const evil = JSON.parse('{"kind":"user","userId":"user:nobody","__proto__":{"userId":"user:jacob"}}');
console.log('  canView(crafted):', core.canView(evil, full, NOW));
console.log('  canEdit(crafted):', core.canEdit(evil, full, NOW));
