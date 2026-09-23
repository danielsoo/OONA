// No connection during --validate. Import is read-only unless --apply is explicit.
const registry = require('../data/school-email-domains.json');
const { validateRegistry, buildPlan, stagePlan } = require('./lib/school-domain-registry.cjs');

function parseArgs(args) {
  const options = { apply: false, validate: false };
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--apply' || key === '--validate') options[key.slice(2)] = true;
    else if (key === '--project' || key === '--database') {
      const value = args[++i];
      if (!value || value.startsWith('--') || options[key.slice(2)]) throw Error(`Expected one value for ${key}`);
      options[key.slice(2)] = value;
    } else throw Error(`Unknown argument: ${key}`);
  }
  if (options.validate && (options.apply || options.project || options.database)) throw Error('--validate cannot be combined with database options');
  if (!options.validate && (!options.project || !options.database)) throw Error('Specify --project YOUR_PROJECT_ID --database YOUR_DATABASE_ID; use "(default)" explicitly for the default database. No writes without --apply.');
  return options;
}

async function main(args) {
  const options = parseArgs(args);
  console.log('Registry validated:', validateRegistry(registry));
  if (options.validate) return;
  require('@next/env').loadEnvConfig(process.cwd(), true);
  const { initializeApp, cert, applicationDefault, deleteApp } = require('firebase-admin/app');
  const { getFirestore, FieldValue } = require('firebase-admin/firestore');
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let account;
    try { account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON); }
    catch { throw Error('FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON (contents not logged).'); }
    if ((account.project_id || account.projectId) !== options.project) throw Error('Service-account project does not match --project. Check the target before importing.');
    credential = cert(account);
  } else credential = applicationDefault();
  console.log(`Target: project=${options.project}, database=${options.database}, mode=${options.apply ? 'APPLY' : 'DRY RUN (no writes)'}, emulator=${process.env.FIRESTORE_EMULATOR_HOST || 'none'}`);
  const app = initializeApp({ projectId: options.project, credential }, 'school-domain-import');
  try {
    const db = getFirestore(app, options.database);
    const collection = db.collection('schools');
    // Fail closed rather than miss duplicates in a truncated catalog.
    const query = collection.limit(5001);
    const planFor = snap => {
      if (snap.size > 5000) throw Error('Catalog exceeds 5,000 schools; review the import scan limit first.');
      return buildPlan(registry, snap.docs.map(d => ({ id: d.id, data: d.data() })));
    };
    const plan = options.apply ? await db.runTransaction(async tx => {
      const freshPlan = planFor(await tx.get(query));
      stagePlan(tx, collection, freshPlan, () => FieldValue.serverTimestamp());
      return freshPlan;
    }) : planFor(await query.get());
    console.table(plan.map(p => ({ action: p.action, schoolId: p.id, fields: Object.keys(p.fields).join(', ') })));
    console.log(options.apply ? 'Import committed atomically. Existing IDs, names, branding, locations and work counts preserved.' : 'No data written. Review the plan, then repeat with --apply.');
  } finally { await deleteApp(app); }
}

if (require.main === module) main(process.argv.slice(2)).catch(error => {
  // Do not dump credentials, full database documents or provider request bodies.
  console.error('School registry import failed:', error.message);
  process.exitCode = 1;
});
module.exports = { parseArgs };
