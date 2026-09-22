const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file,module);
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const localRequire = id => id.startsWith('.') ? load(path.resolve(path.dirname(file),id)+'.ts') : require(id);
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(localRequire,module,module.exports);
  return module.exports;
}
const {messages,translate,getStoredLocale,setStoredLocale,isLocale} = load('src/i18n/index.ts');
const {uiMessages} = load('src/i18n/ui-messages.ts');
const {sourceKeys} = load('src/i18n/source-keys.ts');
const {translateUi} = load('src/i18n/ui.ts');
const errors=[];
const vars = s => [...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
for(const locale of ['ko','ja']) {
  for(const [key,en] of Object.entries(messages.en)) {
    const value=messages[locale][key];
    if(value===undefined)errors.push(locale+' missing '+key);
    else if(vars(en)!==vars(value))errors.push(locale+' placeholders '+key+' '+vars(en)+' / '+vars(value));
  }
}
for(const [source,translations] of Object.entries(uiMessages))for(const translated of translations) {
  if(vars(source)!==vars(translated))errors.push('UI placeholders '+source);
}
const walk = dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const missing=new Set();
for(const file of walk('src').filter(f=>f.endsWith('.tsx'))) {
  const root=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function check(source) { if(!uiMessages[source.toLowerCase()]&&!sourceKeys[source.toLowerCase()])missing.add(source); }
  function visit(node) {
    if(ts.isCallExpression(node)&&/^(copy|_copy)$/.test(node.expression.getText(root))&&ts.isStringLiteral(node.arguments[0]))check(node.arguments[0].text);
    if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(root)==='UiText') {
      const attr=node.attributes.properties.find(p=>p.name?.getText(root)==='text');
      const expr=attr?.initializer?.expression;
      if(expr&&ts.isStringLiteral(expr))check(expr.text);
    }
    ts.forEachChild(node,visit);
  }
  visit(root);
}
for(const source of missing)errors.push('Untranslated UI: '+source);
assert.equal(isLocale('ja'),true);assert.equal(isLocale('fr'),false);
assert.equal(translate('ja','nonexistent.key'),'nonexistent.key');
assert.equal(translateUi('ja','{count} works',{count:3}),'3作品');
const storage=new Map();
global.window={};
Object.defineProperty(global,'navigator',{value:{languages:['ja-JP','en-US']},configurable:true});
global.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
assert.equal(getStoredLocale(),'ja');setStoredLocale('ko');assert.equal(getStoredLocale(),'ko');
setStoredLocale('en');assert.equal(getStoredLocale(),'en');storage.set('xiio_locale','invalid');assert.equal(getStoredLocale(),'ja');
global.localStorage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
assert.doesNotThrow(()=>setStoredLocale('ja'));assert.equal(getStoredLocale(),'ja');
if(errors.length) {console.error(errors.join('\n'));process.exitCode=1;}
else console.log('PASS: '+Object.keys(messages.en).length+' keys in all three languages, '+Object.keys(uiMessages).length+' UI phrases, placeholders, static UI coverage, and saved language preferences.');
