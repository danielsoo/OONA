// Mechanical JSX copy migration. Dry-run by default; --write applies it.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]); }
const decode = s => s.replace(/&amp;/g,'&').replace(/&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const patches=[];
for (const file of walk('src').filter(f=>f.endsWith('.tsx')&&!f.includes('components\\i18n'))) {
  const before=fs.readFileSync(file,'utf8');
  const source=ts.createSourceFile(file,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const edits=[];
  function visit(node) {
    if(ts.isJsxText(node)) {
      const raw=node.text;
      const value=decode(raw.replace(/\s+/g,' ').trim());
      if(/[A-Za-z\uAC00-\uD7A3]{2}/.test(value) && !/^(OONA|XIIO|\/people\/|stripe|toss|HEX|RGB|HSV|HSL|II)$/.test(value)) {
        const leading=/^[ \t]+\S/.test(raw)?'{" "}':'';
        const trailing=/\S[ \t]+$/.test(raw)?'{" "}':'';
        edits.push({start:node.pos,end:node.end,text:leading+'<UiText text={'+JSON.stringify(value)+'} />'+trailing});
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
  if(!edits.length) continue;
  const imports=source.statements.filter(ts.isImportDeclaration);
  const pos=imports.length?imports[imports.length-1].end:source.statements[0]?.end??0;
  edits.push({start:pos,end:pos,text:'\nimport UiText from "@/components/i18n/UiText";'});
  let after=before;
  for(const edit of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,edit.start)+edit.text+after.slice(edit.end);
  patches.push({file,before,after});
}
if (process.argv.includes('--write')) {
  for (const patch of patches) fs.writeFileSync(patch.file, patch.after);
}
console.log(JSON.stringify(patches.map(p => ({ file: p.file, changed: p.before !== p.after }))));
