// Mechanical migration of literal UI attributes and JSX conditional copy.
// Only client React components are eligible; routing, data, and styles are excluded.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const visible = new Set(['placeholder','aria-label','title','label','description','subtitle','emptyMessage','eyebrow','body','intro','alt']);
const output = [];
for (const file of walk('src').filter(f => f.endsWith('.tsx') && !f.includes('components\\i18n'))) {
  const before = fs.readFileSync(file,'utf8');
  if (!/^['"]use client['"]/m.test(before)) continue;
  const root = ts.createSourceFile(file,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const edits = [], owners = new Set(), phrases = new Set();
  function owner(node) {
    for (let p=node.parent;p;p=p.parent) {
      if (ts.isFunctionDeclaration(p) && /^[A-Z]/.test(p.name?.text || '') && p.body) return p;
      if (ts.isArrowFunction(p) && ts.isVariableDeclaration(p.parent) && /^[A-Z]/.test(p.parent.name.getText(root)) && ts.isBlock(p.body)) return p;
    }
  }
  function add(node, phrase, attribute) {
    if (/^(blur|empty|Undertow|Off Script|example@email.com|your_name|https:\/\/)/.test(phrase)) return;
    if (!/[a-zA-Z\uac00-\ud7a3]{2}/.test(phrase) || /^(OONA|XIIO|Google|Apple|GitHub|YouTube|Vimeo)$/.test(phrase)) return;
    const component = owner(node);
    if (!component) return;
    owners.add(component); phrases.add(phrase);
    const call = '_copy('+JSON.stringify(phrase)+')';
    edits.push({ start:node.getStart(root),end:node.end,text:attribute?'{'+call+'}':call });
  }
  function visit(node) {
    if (ts.isJsxAttribute(node) && visible.has(node.name.getText(root)) && node.initializer && ts.isJsxExpression(node.initializer)) {
      function branch(expr) {
        if (!expr) return;
        if(ts.isStringLiteral(expr)) add(expr,expr.text,false);
        else if(ts.isConditionalExpression(expr)) {branch(expr.whenTrue);branch(expr.whenFalse);}
      }
      branch(node.initializer.expression);
      return;
    }
    if (ts.isJsxAttribute(node) && visible.has(node.name.getText(root)) && node.initializer && ts.isStringLiteral(node.initializer)) {
      add(node.initializer,node.initializer.text,true); return;
    }
    // Only plain text/conditional branches in JSX children, not event handlers or props.
    if (ts.isJsxExpression(node) && (ts.isJsxElement(node.parent)||ts.isJsxFragment(node.parent))) {
      function branch(expr) {
        if (!expr) return;
        if (ts.isStringLiteral(expr)) add(expr,expr.text,false);
        else if (ts.isConditionalExpression(expr)) { branch(expr.whenTrue); branch(expr.whenFalse); }
      }
      branch(node.expression);
    }
    ts.forEachChild(node,visit);
  }
  visit(root);
  if (!edits.length) continue;
  for (const component of owners) if (!/const _copy = useUiCopy\(\)/.test(component.body.getText(root))) edits.push({start:component.body.getStart(root)+1,end:component.body.getStart(root)+1,text:'\n  const _copy = useUiCopy();'});
  if (!/import\s+[^;]*\buseUiCopy\b[^;]*from\s+["']@\/components\/i18n\/UiText/.test(before)) {
    const imports = root.statements.filter(ts.isImportDeclaration);
    const pos = imports[imports.length-1].end;
    edits.push({start:pos,end:pos,text:'\nimport { useUiCopy } from "@/components/i18n/UiText";'});
  }
  let after = before;
  for (const e of edits.sort((a,b)=>b.start-a.start)) after=after.slice(0,e.start)+e.text+after.slice(e.end);
  if (process.argv.includes('--write')) fs.writeFileSync(file,after);
  output.push({file,phrases:[...phrases]});
}
console.log(JSON.stringify(output));
