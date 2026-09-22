// Offline regression tests: no Firebase, real accounts, or outgoing writes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function loader(resolveMock) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const requireLocal = id => {
      const mock = resolveMock(id);
      if (mock !== undefined) return mock;
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(file), id);
        const target = [base, base+'.tsx', base+'.ts'].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
        if (!target) throw Error('Unresolved test module: '+id);
        return load(target);
      }
      return require(id);
    };
    vm.runInThisContext('(function(require,module,exports){'+code+'\n})', { filename: file })(requireLocal, module, module.exports);
    return module.exports;
  }
  return load;
}

let auth = { user: null, loading: false };
let firstArray = true;
let firstLoading = true;
let requestedTab = 'discover';
const person = { uid:'public-creator', handle:'public-creator', displayName:'Public Creator', roleTags:['director'], openToCollaborate:true };
const t = key => key;
const fakeRouter = { push() { throw Error('Rendering must not redirect a guest'); } };
let renderedButtons = [];
let stateUpdates = [];
let streamProps;
const loadUi = loader(id => {
  if (id === 'react') return { ...React, useState(initial) {
    if (Array.isArray(initial) && firstArray) { firstArray = false; initial = [person]; }
    // Render the populated-directory state, rather than the initial loading skeleton.
    if (initial === true && firstLoading) { firstLoading = false; initial = false; }
    const [value, setValue] = React.useState(initial);
    return [value, next => { stateUpdates.push(next); setValue(next); }];
  } };
  if (id === 'react/jsx-runtime') {
    const runtime = require('react/jsx-runtime');
    return { ...runtime, ...Object.fromEntries(['jsx','jsxs'].map(name => [name, (type, props, key) => {
      if (type === 'button') renderedButtons.push(props);
      return runtime[name](type, props, key);
    }])) };
  }
  if (id === 'next/navigation') return { useRouter:()=>fakeRouter, useSearchParams:()=>new URLSearchParams('tab='+requestedTab) };
  if (id === 'next/link') return ({children, ...props}) => React.createElement('a', props, children);
  if (id === 'next/image') return () => null;
  if (id.endsWith('.css')) return new Proxy({}, {get:(_,key)=>String(key)});
  if (id.endsWith('.webp')) return {src:'/test-image.webp'};
  if (id === '@/context/AuthContext') return {useAuth:()=>auth};
  if (id === '@/context/LocaleContext') return {useTranslations:()=>({t,locale:'en'})};
  if (id === '@/components/i18n/UiText') return {__esModule:true,default:({text})=>text,useUiCopy:()=>s=>s};
  if (id.includes('BusinessInviteComposerModal')) return () => { throw Error('Unexpected invitation composer'); };
  if (id.includes('SocietySelfProfileSection')) return () => 'PRIVATE PORTFOLIO';
  if (id.includes('ProfileAvatar')) return () => null;
  if (id === '@/lib/feedCache') return { invalidateCache() { throw Error('Unexpected guest mutation'); } };
  if (id === '@/components/shorts/StreamHlsVideo') return props => { streamProps=props; return null; };
  if (id === '@/components/report/ReportContentModal') return () => null;
  if (id === '@/hooks/useRecordEngagementView') return {useRecordEngagementView:()=>{}};
  if (id === '@/hooks/useElementFullscreen') return {useElementFullscreen:()=>({ref:{current:null},active:false,fallbackActive:false})};
  if (id === '@/hooks/usePromoDescriptionExpand') return {usePromoDescriptionExpand:()=>({progress:0,toggle:()=>{}})};
  if (/society(People|Invite)Cache$/.test(id)) return {};
});
const Page = loadUi('src/components/society/SocietyPage.tsx').default;
const Actions = loadUi('src/components/profile/PeopleProfileActions.tsx').default;
function render(Component, props={}) { firstArray=true; firstLoading=true; renderedButtons=[]; stateUpdates=[]; return renderToStaticMarkup(React.createElement(Component, props)); }
function clickButton(label) {
  const found = renderedButtons.find(props => renderToStaticMarkup(React.createElement('span',null,props.children)).replace(/<[^>]*>/g,'').replace(/[+✓↗]$/, '').trim() === label);
  assert.ok(found && !found.disabled && found.onClick, 'Missing clickable action '+label);
  return found.onClick();
}
function button(html, label) {
  const found = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].find(m=>m[2].replace(/<[^>]*>/g,'').replace(/[+✓↗]$/, '').trim() === label);
  assert.ok(found, 'Missing button '+label);
  return found[1];
}
for (const tab of ['discover','connections','requests','sent','works']) {
  requestedTab=tab;
  const html=render(Page);
  assert.ok(html.includes('Public Creator'), 'Guests must still see public creators on '+tab);
  assert.ok(!html.includes('society.guest.browseHint'), 'No persistent login banner');
  assert.doesNotMatch(html, /<dialog[^>]*\bopen(?:=|\s|>)/, 'No automatic popup');
  for (const label of ['Connect','Message','Invite to project','My Connections','Requests','Sent','My Works']) assert.doesNotMatch(button(html,label), /disabled/);
  assert.doesNotMatch(button(html,'Discover'), /disabled/);
  assert.ok(html.includes('/people/public-creator'), 'Public profile navigation must stay available');
  assert.ok(!html.includes('PRIVATE PORTFOLIO'));
}
const profileProps={profileUid:'public-creator',handle:'public-creator',isSelf:false,initialFollowing:false};
const guestProfile=render(Actions,profileProps);
for(const label of ['follow.follow','dm.message','dm.invites.composerTitle']) {
  assert.doesNotMatch(button(guestProfile,label),/ disabled=""/);
  clickButton(label);
  assert.equal(stateUpdates.at(-1), true, 'Profile action should open login dialog');
}
assert.ok(guestProfile.includes('returnTo=%2Fpeople%2Fpublic-creator'));
auth={user:{uid:'member'},loading:false};requestedTab='discover';
const memberHtml=render(Page);
for(const label of ['Connect','Message','Invite to project','My Connections'])assert.doesNotMatch(button(memberHtml,label),/disabled/);
assert.ok(!memberHtml.includes('society.guest.browseHint'));
auth={user:{uid:'member'},loading:true};
assert.match(button(render(Page),'Connect'),/disabled/);
auth={user:null,loading:false};requestedTab='works';
assert.ok(render(Page).includes('Public Creator'), 'Signing out must restore public browsing');

const forbidden = new Proxy({}, { get:(_,key)=>()=>{throw Error('Unauthenticated service call: '+String(key));} });
const loadApi=loader(id=>{
  if(id==='@/lib/server/api-auth')return undefined; // Exercise the real requireUser gate.
  if(id==='@/lib/server/firebase-admin')return {getFirebaseAdminApp:()=>({}),verifyBearerIdToken:async()=>null,getAdminDb:()=>{throw Error('Unexpected private DB access');}};
  if(id==='@/lib/server/works')return {...forbidden,getDbOrNull:async()=>({})};
  if(id==='@/lib/server/discover')return {listDiscoverablePeople:async()=>[person]};
  if(id==='@/lib/roleTags')return {isProfileRoleTag:()=>false};
  if(id.startsWith('@/'))return forbidden;
});
(async()=>{
  const realFetch = global.fetch;
  global.fetch = async () => { throw Error('Guest actions must not send a network request'); };
  const Watchlist = loadUi('src/components/watchlist/WatchlistButton.tsx').default;
  render(Watchlist,{ownerUid:'creator',workId:'film'});
  await clickButton('watchlist.add');
  assert.equal(stateUpdates.at(-1),true,'Watchlist should prompt, not redirect or save');
  const Overlay = loadUi('src/components/watch/GuestPreviewOverlay.tsx').default;
  const overlay = render(Overlay,{loginHref:'/login?returnTo=%2Fwatch%2Fcreator%2Ffilm'});
  assert.ok(overlay.includes('society.guest.dialogTitle') && overlay.includes('society.guest.dialogBody'));
  assert.ok(!overlay.includes('watch.guestPreviewLead'),'Preview must reuse the approved short copy');
  assert.ok(overlay.includes('returnTo=%2Fwatch%2Fcreator%2Ffilm'));
  const GuestPlayer=loadUi('src/components/watch/GuestLimitedPlayer.tsx').default;
  render(GuestPlayer,{src:'/fixture.mp4',durationSec:120});
  let pauses=0;
  const video={duration:120,currentTime:0,pause:()=>{pauses++;}};
  streamProps.onLoadedMetadata({currentTarget:video});
  video.currentTime=29;streamProps.onTimeUpdate({currentTarget:video});assert.equal(pauses,0);
  video.currentTime=30;streamProps.onTimeUpdate({currentTarget:video});assert.equal(pauses,1);assert.equal(stateUpdates.at(-1),true);
  video.currentTime=90;streamProps.onSeeking({currentTarget:video});assert.equal(video.currentTime,30,'Seeking must remain clamped to preview limit');
  streamProps.onSeeked({currentTarget:video});assert.equal(pauses,2);
  const Promo=loadUi('src/components/shorts/PromoShortPlayer.tsx').default;
  const previousWindow=global.window;
  global.window={location:{pathname:'/shorts',search:'?promo=fixture'}};
  for(const persisted of [true,false]) {
    render(Promo,{item:{id:'fixture',title:'Fixture',videoUrl:'/fixture.mp4',...(persisted?{ownerUid:'creator',workId:'film'}:{})},isActive:true,showChrome:true});
    const like=renderedButtons.find(p=>p['aria-label']==='home.promoLike');
    assert.ok(like && !like.disabled);
    await like.onClick();
    assert.deepEqual(stateUpdates,['/shorts?promo=fixture'],'Guest like must only open the prompt, including demo items');
  }
  if(previousWindow===undefined) delete global.window; else global.window=previousWindow;
  global.fetch=realFetch;
  requestedTab='discover'; render(Page);
  for (const label of ['Connect','Message','Invite to project']) {
    await clickButton(label);
    assert.equal(stateUpdates.at(-1), '/society?tab=discover', label+' should open dialog without a mutation or redirect');
  }
  for (const [label,tab] of [['My Connections','connections'],['Requests','requests'],['Sent','sent'],['My Works','works']]) {
    await clickButton(label);
    assert.equal(stateUpdates.at(-1), '/society?tab='+tab, 'Private tabs should prompt and preserve their login destination');
  }
  for(const [file,methods]of [
    ['src/app/api/me/follows/[uid]/route.ts',['POST','DELETE']],
    ['src/app/api/me/dm/threads/route.ts',['GET','POST']],
    ['src/app/api/engagement/like/route.ts',['GET','POST']],
    ['src/app/api/me/business-invites/route.ts',['GET','POST']],
    ['src/app/api/me/following/route.ts',['GET']],
    ['src/app/api/me/watchlist/route.ts',['GET','POST']],
  ])for(const method of methods){
    const response=await loadApi(file)[method](new Request('http://localhost/test',{method}),{params:Promise.resolve({uid:'public-creator'})});
    assert.equal(response.status,401,file+' '+method);
  }
  const discover=loadApi('src/app/api/discover/people/route.ts');
  const publicResponse=await discover.GET(new Request('http://localhost/api/discover/people'));
  assert.equal(publicResponse.status,200);
  assert.equal((await publicResponse.json()).people[0].uid,person.uid);
  const privateResponse=await discover.GET(new Request('http://localhost/api/discover/people?followingOnly=1'));
  assert.equal(privateResponse.status,401);
  console.log('PASS: public browsing, shared guest prompts, preview limit/seek clamp, guest likes/watchlist, private-tab isolation, authenticated controls, and API authentication gates.');
})().catch(error=>{console.error(error);process.exitCode=1;});
