const assert = require('node:assert/strict');

const PUBLIC_DOMAINS = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'yahoo.co.jp', 'naver.com', 'daum.net', 'icloud.com']);
const SUFFIXES = new Set(['edu', 'ac.kr', 'ac.jp', 'co.kr', 'co.jp', 'com', 'org', 'net']);
const normalizeName = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const unique = values => [...new Set(values)];
function validDomain(value) {
  return typeof value === 'string' && value.length <= 253 && value === value.toLowerCase() &&
    !PUBLIC_DOMAINS.has(value) && !SUFFIXES.has(value) &&
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value);
}

function validateRegistry(registry) {
  assert.equal(registry.version, 1, 'Unsupported registry version');
  assert.match(registry.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(registry.checkedAt).toISOString().slice(0, 10), registry.checkedAt);
  assert.ok(Array.isArray(registry.schools) && registry.schools.length > 0 && registry.schools.length <= 400);
  const ids = new Set(), domains = new Set(), names = new Set();
  const excluded = new Set(registry.schools.flatMap(s => s.excludedDomains || []));
  for (const s of registry.schools) {
    assert.match(s.id, /^[a-z0-9][a-z0-9-]{0,79}$/);
    assert.ok(!ids.has(s.id), `Duplicate school ID: ${s.id}`); ids.add(s.id);
    assert.ok(['US', 'KR', 'JP'].includes(s.countryCode), `Unsupported country: ${s.id}`);
    for (const key of ['name', 'shortName']) assert.ok(typeof s[key] === 'string' && s[key].trim() === s[key] && s[key].length > 0 && s[key].length <= 120);
    for (const key of ['matchNames', 'aliases']) {
      assert.ok(Array.isArray(s[key]), `${s.id}: ${key} must be an array`);
      assert.ok(s[key].every(n => typeof n === 'string' && n.trim() === n && n.length > 0 && n.length <= 120));
    }
    for (const n of unique([s.name, ...s.matchNames].map(normalizeName))) {
      assert.ok(n && !names.has(n), `Ambiguous school name: ${s.id}`); names.add(n);
    }
    assert.ok(Array.isArray(s.emailDomains) && s.emailDomains.length > 0);
    for (const d of s.emailDomains) {
      assert.ok(validDomain(d) && !excluded.has(d) && !/(^|\.)alumni\./.test(d), `Unsafe domain: ${d}`);
      assert.ok(!domains.has(d), `Duplicate email domain: ${d}`); domains.add(d);
    }
    for (const d of s.excludedDomains || []) assert.ok(validDomain(d), `Invalid excluded domain: ${d}`);
    assert.ok(Array.isArray(s.sources) && s.sources.length > 0);
    for (const source of s.sources) {
      const url = new URL(source);
      assert.ok(url.protocol === 'https:' && !url.username && !url.password, `Invalid source: ${s.id}`);
    }
  }
  return { schools: ids.size, domains: domains.size, countries: Object.fromEntries(['US', 'KR', 'JP'].map(c => [c, registry.schools.filter(s => s.countryCode === c).length])) };
}

/** Pure preflight. A conflict anywhere aborts the entire import before any writes. */
function buildPlan(registry, existing) {
  validateRegistry(registry);
  const plan = [], claimed = new Set();
  const excluded = new Set(registry.schools.flatMap(s => s.excludedDomains || []));
  for (const school of registry.schools) {
    const names = new Set([school.name, ...school.matchNames].map(normalizeName));
    const candidates = existing.filter(d => d.id === school.id || names.has(normalizeName(d.data.name)) || d.data.emailDomainRegistry?.id === school.id);
    if (candidates.length > 1) throw Error(`Ambiguous existing school for ${school.id}: ${candidates.map(d => d.id).join(', ')}. Resolve duplicates manually.`);
    const current = candidates[0];
    if (current && !names.has(normalizeName(current.data.name))) throw Error(`Identity conflict at schools/${current.id}; the full school name does not match ${school.id}.`);
    if (!current) {
      // Acronyms and display aliases are search aids, never identity/authentication evidence.
      const weakNames = new Set([school.shortName, ...school.aliases].map(normalizeName));
      const weak = existing.filter(d => weakNames.has(normalizeName(d.data.name)) || weakNames.has(normalizeName(d.data.shortName)));
      if (weak.length) throw Error(`Possible duplicate for ${school.id}: ${weak.map(d => d.id).join(', ')}. Confirm the full institution name before importing.`);
    }
    const id = current?.id || school.id;
    if (!/^[a-z0-9][a-z0-9_-]{0,159}$/.test(id)) throw Error(`Unsupported existing school ID: ${id}`);
    if (claimed.has(id)) throw Error(`Two registry schools resolved to ${id}`);
    claimed.add(id);
    const before = current?.data || {};
    if (current && !['active', 'pending'].includes(before.status)) throw Error(`School ${id} is merged or has an unknown status; review its canonical destination first.`);
    for (const country of [before.countryCode, before.location?.countryCode].filter(Boolean)) {
      if (country !== school.countryCode) throw Error(`Country conflict at schools/${id}`);
    }
    if (before.emailDomainRegistry?.id && before.emailDomainRegistry.id !== school.id) throw Error(`Registry identity conflict at schools/${id}`);
    if (before.emailDomains !== undefined && (!Array.isArray(before.emailDomains) || before.emailDomains.some(d => !validDomain(d) || excluded.has(d) || /(^|\.)alumni\./.test(d)))) throw Error(`Review existing emailDomains at schools/${id}; unsafe or excluded entries will not be silently removed.`);
    if (before.aliases !== undefined && (!Array.isArray(before.aliases) || before.aliases.some(a => typeof a !== 'string'))) throw Error(`Invalid aliases at schools/${id}`);
    const emailDomains = unique([...(before.emailDomains || []), ...school.emailDomains]).sort();
    for (const other of existing) {
      if (other.id !== id && Array.isArray(other.data.emailDomains) && other.data.emailDomains.some(d => emailDomains.includes(d))) throw Error(`Domain ownership conflict between ${id} and ${other.id}. Review manually.`);
    }
    const metadata = {
      countryCode: school.countryCode,
      aliases: unique([...(before.aliases || []), ...school.matchNames, ...school.aliases, school.shortName]).sort(),
      status: 'active', emailDomains,
      emailDomainRegistry: { id: school.id, version: registry.version, checkedAt: registry.checkedAt, sources: school.sources },
    };
    const fields = Object.fromEntries(Object.entries(metadata).filter(([key, value]) => JSON.stringify(before[key]) !== JSON.stringify(value)));
    if (!current) Object.assign(fields, {
      name: school.name, shortName: school.shortName, slug: id,
      colorPrimary: '#0ea5e9', colorSecondary: '#ffffff', logoUrl: null, location: null, workCount: 0,
    });
    plan.push({ id, registryId: school.id, action: !current ? 'create' : Object.keys(fields).length ? 'update' : 'unchanged', fields });
  }
  return plan;
}

function stagePlan(tx, collection, plan, timestamp) {
  for (const item of plan) {
    if (item.action === 'unchanged') continue;
    const fields = { ...item.fields, updatedAt: timestamp() };
    if (item.action === 'create') tx.create(collection.doc(item.id), { ...fields, createdAt: timestamp() });
    else tx.update(collection.doc(item.id), fields);
  }
}

module.exports = { validateRegistry, buildPlan, stagePlan };
