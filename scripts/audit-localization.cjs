const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
const rows = [];
for (const file of walk('src').filter(f => f.endsWith('.tsx'))) {
  const source = ts.createSourceFile(file, fs.readFileSync(file,'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const texts = [];
  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g,' ').trim();
      if (/[A-Za-z\uAC00-\uD7A3]{2}/.test(text)) texts.push(text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (texts.length) rows.push({file, texts});
}
console.log(JSON.stringify(rows));
