// Offline regression tests: no Firebase connection, emails or database writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const registry = require('../data/school-email-domains.json');
const { validateRegistry, buildPlan, stagePlan } = require('./lib/school-domain-registry.cjs');
const { parseArgs } = require('./import-school-email-domains.cjs');
const clone = () => structuredClone(registry);
const one = id => registry.schools.find(s => s.id === id);
const snapshot = (id, data) => ({ id, data });

const summary = validateRegistry(registry);
assert.equal(summary.schools, 24);
assert.deepEqual(summary.countries, { US: 8, KR: 8, JP: 8 });
assert.equal(summary.domains, 34);
assert.ok(Buffer.byteLength(JSON.stringify(registry)) < 25000);
assert.deepEqual(one('the-ohio-state-university').emailDomains, ['osu.edu', 'buckeyemail.osu.edu']);
assert.deepEqual(one('university-of-tsukuba').emailDomains, ['u.tsukuba.ac.jp', 's.tsukuba.ac.jp']);
assert.equal(one('waseda-university').emailDomains.length, 7);
for (const invalid of ['*.edu', 'edu', 'ac.kr', 'ac.jp', 'gmail.com', 'naver.com', 'alumni.kaist.ac.kr', 'kyoto-u.jp', 'PSU.EDU', 'sub..edu', 'x@psu.edu']) {
  const bad = clone(); bad.schools[0].emailDomains = [invalid];
  assert.throws(() => validateRegistry(bad), undefined, invalid);
}
{
  const bad = clone(); bad.schools[1].emailDomains.push('psu.edu');
  assert.throws(() => validateRegistry(bad), /Duplicate email domain/);
}
{
  const bad = clone(); bad.schools[1].matchNames.push(registry.schools[0].name);
  assert.throws(() => validateRegistry(bad), /Ambiguous school name/);
}
const initial = buildPlan(registry, []);
assert.equal(initial.filter(p => p.action === 'create').length, 24);
const existing = initial.map(p => snapshot(p.id, { ...p.fields, createdAt: 1, updatedAt: 1 }));
assert.ok(buildPlan(registry, existing).every(p => p.action === 'unchanged'), 'Repeat import is a no-op');

const original = {
  name: 'Pennsylvania State University', shortName: 'Penn State', status: 'pending',
  slug: 'penn-state', logoUrl: '/brand/psu.png', workCount: 17, createdAt: 123,
  colorPrimary: '#123456', location: { latitude: 40, longitude: -77, countryCode: 'US' },
  aliases: ['Existing alias'], emailDomains: ['department.psu.edu'],
};
const plan = buildPlan(registry, [snapshot('psu-existing-id', original)]);
const update = plan.find(p => p.registryId === registry.schools[0].id);
assert.equal(update.id, 'psu-existing-id');
assert.equal(update.action, 'update');
assert.deepEqual(update.fields.emailDomains, ['department.psu.edu', 'psu.edu']);
assert.ok(update.fields.aliases.includes('Existing alias'));
for (const key of ['name', 'slug', 'shortName', 'logoUrl', 'location', 'workCount', 'createdAt', 'colorPrimary']) assert.equal(update.fields[key], undefined, `Preserve ${key}`);
assert.deepEqual(original.emailDomains, ['department.psu.edu'], 'Planning does not mutate snapshots');

const canonical = registry.schools[0];
const active = { name: canonical.name, status: 'active' };
assert.throws(() => buildPlan(registry, [snapshot('one', active), snapshot('two', active)]), /Ambiguous existing school/);
assert.throws(() => buildPlan(registry, [snapshot(canonical.id, { name: 'Different University', status: 'active' })]), /Identity conflict/);
assert.throws(() => buildPlan(registry, [snapshot('old', { ...active, status: 'merged' })]), /merged/);
assert.throws(() => buildPlan(registry, [snapshot('old', { ...active, countryCode: 'KR' })]), /Country conflict/);
assert.throws(() => buildPlan(registry, [snapshot('old', { ...active, location: { countryCode: 'JP' } })]), /Country conflict/);
assert.throws(() => buildPlan(registry, [snapshot('old', { ...active, emailDomainRegistry: { id: 'wrong' } })]), /Registry identity/);
assert.throws(() => buildPlan(registry, [snapshot('old', { ...active, emailDomains: ['gmail.com'] })]), /Review existing emailDomains/);
assert.throws(() => buildPlan(registry, [snapshot('unrelated', { name: 'Other University', emailDomains: ['psu.edu'] })]), /Domain ownership conflict/);
assert.throws(() => buildPlan(registry, [snapshot('nyu-tisch', { name: 'NYU', status: 'pending' })]), /Possible duplicate/);
assert.throws(() => buildPlan(registry, [snapshot('kaist', { name: 'KAIST', status: 'active', emailDomains: ['alumni.kaist.ac.kr'] })]), /Review existing emailDomains/);
const kaist = buildPlan(registry, [snapshot('kaist', { name: 'KAIST', status: 'pending' })]);
assert.equal(kaist.find(p => p.registryId === one('korea-advanced-institute-of-science-and-technology').id).id, 'kaist');

// Exercise the exact write staging used in the Firestore transaction.
const staged = [];
stagePlan({ create: (id, fields) => staged.push({ method: 'create', id, fields }), update: (id, fields) => staged.push({ method: 'update', id, fields }) }, { doc: id => id }, plan, () => 999);
assert.equal(staged.length, 24);
const stagedUpdate = staged.find(w => w.id === 'psu-existing-id');
assert.equal(stagedUpdate.method, 'update');
assert.equal(stagedUpdate.fields.createdAt, undefined);
assert.equal(stagedUpdate.fields.updatedAt, 999);
const after = staged.map(w => snapshot(w.id, { ...(w.method === 'update' ? original : {}), ...w.fields }));
assert.ok(buildPlan(registry, after).every(p => p.action === 'unchanged'));
const noWrites = [];
stagePlan({ create: (...a) => noWrites.push(a), update: (...a) => noWrites.push(a) }, { doc: id => id }, buildPlan(registry, after), () => 1000);
assert.equal(noWrites.length, 0);

assert.deepEqual(parseArgs(['--validate']), { apply: false, validate: true });
assert.equal(parseArgs(['--project', 'example-project', '--database', 'xiio']).apply, false);
assert.equal(parseArgs(['--project', 'example-project', '--database', '(default)', '--apply']).apply, true);
for (const args of [[], ['--apply'], ['--project', 'x'], ['--database', '--apply'], ['--validate', '--apply'], ['--unknown'], ['--project', 'x', '--project', 'y', '--database', 'xiio']]) assert.throws(() => parseArgs(args));

// Test actual school parser/search with the imported aliases, not a duplicate implementation.
const moduleShim = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('src/lib/server/schools.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInThisContext('(function(require,module,exports){' + source + '\n})')(id => {
  assert.equal(id, 'firebase-admin/firestore'); return { FieldValue: {} };
}, moduleShim, moduleShim.exports);
const { parseSchoolDoc, filterSchoolSuggestions } = moduleShim.exports;
const catalog = initial.map(p => parseSchoolDoc(p.id, p.fields));
for (const [query, expected] of [['한예종', 'korea-national-university-of-arts'], ['東京', 'the-university-of-tokyo'], ['와세다', 'waseda-university'], ['NYU', 'new-york-university'], ['PSU', 'the-pennsylvania-state-university']]) {
  assert.ok(filterSchoolSuggestions(catalog, query).some(s => s.id === expected), query);
}
console.log('School registry tests passed:', summary, '(validation, conflicts, preservation, idempotence, write staging, CLI safeguards, multilingual search)');
