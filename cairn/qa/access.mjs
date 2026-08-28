const core = await import('../packages/core/src/index.ts');
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);
const NOW = '2026-08-01';

const owner = { kind: 'user', userId: 'u:owner' };
const co = { kind: 'user', userId: 'u:co' };
const ed = { kind: 'user', userId: 'u:editor' };
const cm = { kind: 'user', userId: 'u:commenter' };
const vw = { kind: 'user', userId: 'u:viewer' };
const fr = { kind: 'user', userId: 'u:friend' };
const rv = { kind: 'user', userId: 'u:revoked' };
const sx = { kind: 'user', userId: 'u:stranger' };
const anon = { kind: 'anonymous' };
const link = { kind: 'link', token: 'tok-live' };
const expired = { kind: 'link', token: 'tok-expired' };
const revokedLink = { kind: 'link', token: 'tok-revoked' };

const rel = {
  tripId: 't', ownerId: 'u:owner', memberIds: ['u:co'], friendIds: ['u:friend'],
  shares: [
    { principal: ed, role: 'editor' },
    { principal: cm, role: 'commenter' },
    { principal: vw, role: 'viewer' },
    { principal: rv, role: 'editor', revokedAt: '2026-07-01' },
    { principal: link, role: 'viewer', expiresAt: '2026-12-31' },
    { principal: expired, role: 'viewer', expiresAt: '2026-07-01' },
    { principal: revokedLink, role: 'viewer', revokedAt: '2026-07-01' },
  ],
};

const principals = [['owner', owner], ['co-owner', co], ['editor', ed], ['commenter', cm], ['viewer', vw],
  ['friend', fr], ['revoked editor', rv], ['stranger', sx], ['anonymous', anon],
  ['live link', link], ['expired link', expired], ['revoked link', revokedLink]];
const ops = [['view', core.canView], ['comment', core.canComment], ['edit', core.canEdit], ['share', core.canShare], ['delete', core.canDelete]];

console.log('== access conformance matrix ==');
console.log('   ' + 'principal'.padEnd(16) + ops.map(([n]) => n.padEnd(9)).join(''));
const rows = {};
for (const [name, p] of principals) {
  const r = ops.map(([, f]) => f(p, rel, NOW));
  rows[name] = r;
  console.log('   ' + name.padEnd(16) + r.map((v) => String(v).padEnd(9)).join(''));
}
console.log('');
ok('owner has everything', rows['owner'].every(Boolean));
ok('co-owner has everything', rows['co-owner'].every(Boolean));
ok('editor: view+comment+edit, no share/delete', JSON.stringify(rows['editor']) === '[true,true,true,false,false]');
ok('commenter: view+comment only', JSON.stringify(rows['commenter']) === '[true,true,false,false,false]');
ok('viewer: view only', JSON.stringify(rows['viewer']) === '[true,false,false,false,false]');
ok('a friend gets NOTHING by itself', rows['friend'].every((v) => v === false));
ok('a revoked share grants nothing', rows['revoked editor'].every((v) => v === false));
ok('a stranger gets nothing', rows['stranger'].every((v) => v === false));
ok('anonymous gets nothing', rows['anonymous'].every((v) => v === false));
ok('a live link token can view', rows['live link'][0] === true);
ok('a live viewer link cannot edit', rows['live link'][2] === false);
ok('an expired link gets nothing', rows['expired link'].every((v) => v === false));
ok('a revoked link gets nothing', rows['revoked link'].every((v) => v === false));

console.log('');
console.log('== boundary probes ==');
ok('an anonymous principal cannot match a *link* share', !core.canView(anon, { ...rel, shares: [{ principal: link, role: 'viewer' }] }, NOW));
ok('a link token cannot match a *user* share', !core.canView({ kind: 'link', token: 'u:editor' }, rel, NOW));
ok('expiresAt exactly today is still live', core.canView(link, { ...rel, shares: [{ principal: link, role: 'viewer', expiresAt: NOW }] }, NOW));
ok('an anonymous share grants access to ALL anonymous principals (by design?)',
  core.canView(anon, { ...rel, shares: [{ principal: anon, role: 'viewer' }] }, NOW));
ok('empty relationship denies everyone', !core.canView(sx, { tripId: 't', ownerId: 'u:owner' }, NOW));
ok('undefined now does not silently pass an expired share',
  (() => { try { return core.canView(expired, rel, undefined) === false; } catch (e) { return 'threw'; } })(),
  'canView(expiredLink, rel, undefined) = ' + (() => { try { return core.canView(expired, rel, undefined); } catch (e) { return 'threw'; } })());
ok('a revoked share with revokedAt in the FUTURE is already dead (any revokedAt kills it)',
  !core.canView(vw, { ...rel, shares: [{ principal: vw, role: 'viewer', revokedAt: '2099-01-01' }] }, NOW));

console.log('');
console.log('== is any of this actually called by the client or the web app? ==');
