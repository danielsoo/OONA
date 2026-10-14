// Offline security regressions. No real email, Firebase, secrets, or user data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');
const DELETE = '__delete_field__';
const FieldValue = { delete: () => DELETE, serverTimestamp: () => Date.now() };
let now = Date.UTC(2026, 8, 22, 12);
const originalNow = Date.now;
const originalFetch = global.fetch;
const originalEnv = Object.fromEntries(['SCHOOL_VERIFICATION_SECRET','RESEND_API_KEY','RESEND_FROM_EMAIL'].map(k=>[k,process.env[k]]));
let sent = [], providerOk = true, authUid = 'u';
const store = new Map();
let tail = Promise.resolve();
function update(key, fields, merge=true) {
  const doc = merge ? structuredClone(store.get(key) || {}) : {};
  for (const [field,value] of Object.entries(fields)) {
    const parts = field.split('.'); let target=doc;
    for(const part of parts.slice(0,-1)) target=target[part] ??= {};
    if(value===DELETE) delete target[parts.at(-1)]; else target[parts.at(-1)]=structuredClone(value);
  }
  store.set(key,doc);
}
const snapshot = key => ({ exists:store.has(key), id:key.split('/').at(-1), data:()=>structuredClone(store.get(key)) });
const ref = key => ({ path:key, collection:name=>collection(key+'/'+name), get:async()=>snapshot(key), set:async(fields,opts)=>update(key,fields,!!opts?.merge), update:async fields=>update(key,fields), delete:async()=>store.delete(key) });
const collection = key => ({doc:id=>ref(key+'/'+id)});
const db = {collection, runTransaction(fn) {
  const run=tail.then(async()=>{
    const writes=[];
    const result=await fn({get:async r=>snapshot(r.path), set:(r,v,o)=>writes.push(()=>update(r.path,v,!!o?.merge)), update:(r,v)=>writes.push(()=>update(r.path,v))});
    writes.forEach(write=>write()); return result;
  });
  tail=run.catch(()=>{}); return run;
}};
const cache=new Map();
function load(file) {
  file=path.resolve(file);
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}}; cache.set(file,module);
  const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const localRequire=id=>{
    if(id==='firebase-admin/firestore')return {FieldValue,Timestamp:{fromMillis:n=>({millis:n})}};
    if(id==='@/lib/server/api-auth')return {
      jsonError:(error,message,status)=>NextResponse.json({error,message},{status}),
      requireUser:async()=>authUid?{session:{uid:authUid}}:{error:NextResponse.json({error:'unauthorized'},{status:401})},
    };
    if(id==='@/lib/server/works')return {FieldValue,getDbOrNull:async()=>db,worksCol:(db,uid)=>collection('users/'+uid+'/works'),nextWorkSortOrder:async()=>0,parseWorkDoc:(id,d)=>d,parsePromoDoc:d=>d,parsePrologueDoc:d=>d,promoRef:(db,uid,workId)=>ref(`users/${uid}/works/${workId}/promoShort/main`),prologueRef:(db,uid,workId)=>ref(`users/${uid}/works/${workId}/prologueShort/main`)};
    if(id==='@/lib/server/member-access')return {requireCompleteMemberProfile:async()=>null};
    if(id==='@/lib/payments/config')return {isUploaderDepositEnabled:()=>false};
    if(id==='@/lib/server/deposit-verification')return {};
    if(id==='@/lib/cloudflare/stream')return {MAX_STREAM_UPLOAD_BYTES:30e9};
    if(id==='@/lib/server/credits')return {validateCreditInputs:()=>({ok:false}),ensureOwnerDirectorCredit:async()=>{}};
    if(id.startsWith('.')||id.startsWith('@/')) {
      const base=id.startsWith('@/')?path.resolve('src',id.slice(2)):path.resolve(path.dirname(file),id);
      const target=[base+'.ts',base+'.tsx',path.join(base,'index.ts')].find(p=>fs.existsSync(p));
      if(!target)throw Error('Unresolved '+id); return load(target);
    }
    return require(id);
  };
  vm.runInThisContext('(function(require,module,exports){'+output+'\n})',{filename:file})(localRequire,module,module.exports);
  return module.exports;
}
function seed() {
  store.clear(); sent=[]; providerOk=true; now=Date.UTC(2026,8,22,12);
  store.set('schools/test-school',{status:'active',name:'Test School',emailDomains:['students.test.edu']});
  store.set('schools/other-school',{status:'active',name:'Other',emailDomains:['other.edu']});
  store.set('users/u',{role:'member',displayName:'Test',schoolName:'Forged school',schoolEmailVerified:true});
}
function latestCode() { return sent.at(-1).text.match(/\b\d{6}\b/)[0]; }
function input(overrides={}) { return {schoolId:'test-school',email:'student@students.test.edu',enrolled:true,graduationMonth:'2027-06',locale:'en',...overrides}; }
async function rejected(fn,code) { await assert.rejects(fn,e=>e.code===code); }
const record = uid=>store.get(`users/${uid}/private/schoolVerification`);

(async()=>{
  Date.now=()=>now;
  process.env.SCHOOL_VERIFICATION_SECRET='offline-test-secret-not-for-deployment-123456789';
  process.env.RESEND_API_KEY='offline-only';process.env.RESEND_FROM_EMAIL='OONA <noreply@example.test>';
  global.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');sent.push(JSON.parse(options.body));return {ok:providerOk};};
  const pure=load('src/lib/school-verification.ts');
  const service=load('src/lib/server/school-verification.ts');
  const {sendSchoolCode:send,verifySchoolCode:verify,getSchoolVerificationStatus:status,requireSchoolUploadEligibility:gate,leaveSchool:leave}=service;
  assert.equal(pure.graduationExpiry('2026-09'),Date.UTC(2026,9,1));
  assert.equal(pure.graduationExpiry('2026-13'),0);
  assert.equal(pure.validGraduationMonth('2026-08'),false);
  assert.equal(pure.validGraduationMonth('2099-01'),false);
  assert.equal(pure.emailMatchesSchool('x@students.test.edu.evil.org',['students.test.edu']),false);
  assert.equal(pure.emailMatchesSchool('x@sub.students.test.edu',['students.test.edu']),false);
  assert.equal(pure.normalizeSchoolEmail('x@students.test.edu\r\nBcc:x@evil.org'),null);
  assert.deepEqual(pure.schoolEmailDomains(['*.test.edu','edu','STUDENTS.TEST.EDU']),['students.test.edu']);
  seed();
  assert.equal(await gate({collection(){throw Error('General uploads must not query verification');}},'u',null),null);
  assert.equal((await gate(db,'u','test-school')).status,403,'Editable profile fields never grant eligibility');
  await rejected(()=>send(db,'u',input({email:'u@other.edu'})),'school_email_mismatch');
  await rejected(()=>send(db,'u',input({enrolled:false})),'school_enrollment_required');
  await rejected(()=>send(db,'u',input({graduationMonth:'2025-01'})),'school_enrollment_required');
  store.set('schools/pending',{status:'pending',emailDomains:['students.test.edu']});
  await rejected(()=>send(db,'u',input({schoolId:'pending'})),'school_unavailable');
  const concurrent=await Promise.allSettled([send(db,'u',input()),send(db,'u',input())]);
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(sent.length,1,'Concurrent sends must not bypass cooldown');
  const code=latestCode();
  assert.notEqual(record('u').challenge.hash,code);
  assert.equal(JSON.stringify(await status(db,'u','test-school')).includes(code),false);
  await rejected(()=>verify(db,'intruder','test-school',code),'school_code_expired');
  await rejected(()=>verify(db,'u','other-school',code),'school_code_expired');
  await verify(db,'u','test-school',code);
  assert.equal((await status(db,'u','test-school')).eligible,true);
  assert.equal(await gate(db,'u','test-school'),null);
  const safeStatus=JSON.stringify(await status(db,'u','test-school'));
  assert.equal(safeStatus.includes('student@'),false,'Status must mask email');
  assert.equal(record('u').challenge,undefined,'Code consumed once');
  await rejected(()=>verify(db,'u','test-school',code),'school_code_expired');
  assert.equal(store.get('users/u').schoolName,'Test School');
  now=Date.UTC(2027,6,1);
  assert.equal((await status(db,'u','test-school')).reason,'school_enrollment_expired');
  assert.equal((await gate(db,'u','test-school')).status,403);
  assert.equal(await gate(db,'u',null),null);

  seed(); await send(db,'u',input());
  let current=latestCode(),wrong=current==='000000'?'000001':'000000';
  for(let i=0;i<5;i++)await rejected(()=>verify(db,'u','test-school',wrong),'school_code_invalid');
  await rejected(()=>verify(db,'u','test-school',current),'school_code_expired');
  assert.equal(record('u').challenge.attempts,5);
  now+=61000;await send(db,'u',input());current=latestCode();
  now+=10*60*1000;await rejected(()=>verify(db,'u','test-school',current),'school_code_expired');
  now+=61000;await send(db,'u',input());await verify(db,'u','test-school',latestCode());
  store.get('schools/test-school').emailDomains=['changed.edu'];
  assert.equal((await gate(db,'u','test-school')).status,403,'Domain revocation must take effect');
  store.get('schools/test-school').emailDomains=['students.test.edu'];
  store.get('users/u/private/schoolVerification').reviewRequired=true;
  await leave(db,'u');now+=61000;
  await rejected(()=>send(db,'u',input()),'school_review_required');
  assert.equal((await status(db,'u','test-school')).reason,'school_review_required','Withdrawal must not clear review hold');
  assert.equal(await gate(db,'u',null),null);

  seed();providerOk=false;
  await rejected(()=>send(db,'u',input()),'school_mail_unavailable');
  await rejected(()=>verify(db,'u','test-school',latestCode()),'school_code_expired');
  assert.equal((await status(db,'u','test-school')).eligible,false);
  seed(); delete process.env.SCHOOL_VERIFICATION_SECRET;
  await rejected(()=>send(db,'u',input()),'school_mail_unavailable');assert.equal(sent.length,0);
  process.env.SCHOOL_VERIFICATION_SECRET='offline-test-secret-not-for-deployment-123456789';
  seed();
  for(let i=0;i<5;i++){await send(db,'u',input());now+=61000;}
  await rejected(()=>send(db,'u',input()),'school_rate_limited');
  seed();
  for(let i=0;i<10;i++){await send(db,'u'+i,input());now+=61000;}
  await rejected(()=>send(db,'extra',input()),'school_rate_limited');

  seed();
  const api=load('src/app/api/me/school-verification/route.ts');
  authUid=null;
  assert.equal((await api.GET(new Request('http://localhost/api/me/school-verification'))).status,401);
  assert.equal((await api.POST(new Request('http://localhost/api/me/school-verification',{method:'POST',body:'{}'}))).status,401);
  authUid='u';
  const create=load('src/app/api/stream/upload-url/route.ts');
  const createBody={title:'Fixture',description:'Fixture',section:'movies',uploadLength:1000,promoDraft:{title:'Preview'}};
  const createRequest=body=>new Request('http://localhost/api/stream/upload-url',{method:'POST',body:JSON.stringify(body)});
  assert.equal((await create.POST(createRequest({...createBody,schoolId:'test-school',schoolEmailVerified:true}))).status,403);
  assert.equal((await create.POST(createRequest({...createBody,schoolId:'unknown'}))).status,403);
  assert.equal((await create.POST(createRequest(createBody))).status,200,'General upload remains available');
  await send(db,'u',input());await verify(db,'u','test-school',latestCode());
  assert.equal((await create.POST(createRequest({...createBody,schoolId:'test-school'}))).status,200);
  const submit=load('src/app/api/me/works/[workId]/submit-for-review/route.ts');
  store.set('users/u/works/draft',{proposedSchoolId:'test-school',platformStatus:'draft',streamStatus:'ready',streamUid:'stream',title:'Title'});
  store.set('users/u/works/draft/promoShort/main',{platformStatus:'draft',streamStatus:'ready',thumbnailUrl:'fixture',title:'Preview'});
  await leave(db,'u');
  const submitReq=()=>new Request('http://localhost/submit',{method:'POST'});
  assert.equal((await submit.POST(submitReq(),{params:Promise.resolve({workId:'draft'})})).status,403);
  assert.equal(store.get('users/u/works/draft').platformStatus,'draft');
  store.get('users/u/works/draft').proposedSchoolId=null;
  assert.equal((await submit.POST(submitReq(),{params:Promise.resolve({workId:'draft'})})).status,200);
  console.log('PASS: school domain binding, graduation boundaries, private eligibility, single-use/expiry/attempt limits, transactional send limits, delivery failure, review holds, general uploads and API bypass checks.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
  Date.now=originalNow;global.fetch=originalFetch;
  for(const [key,value] of Object.entries(originalEnv)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
