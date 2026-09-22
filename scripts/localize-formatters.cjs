// One-time mechanical migration: thread React locale into media date/time helpers.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
for(const file of walk('src/components').filter(f=>f.endsWith('.tsx'))) {
  const before=fs.readFileSync(file,'utf8');
  if(!/^['"]use client['"]/m.test(before))continue;
  const root=ts.createSourceFile(file,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX), edits=[],owners=new Set();
  function owner(node){for(let p=node.parent;p;p=p.parent)if(ts.isFunctionDeclaration(p)&&/^[A-Z]/.test(p.name?.text||'')&&p.body)return p;}
  function visit(node){
    if(ts.isCallExpression(node)&&/^(formatDurationMinutes|formatReleaseDate)$/.test(node.expression.getText(root))&&node.arguments.length===1){
      const component=owner(node);if(component){owners.add(component);edits.push({start:node.arguments[0].end,end:node.arguments[0].end,text:', mediaLocale'});}
    }
    ts.forEachChild(node,visit);
  }
  visit(root);if(!edits.length)continue;
  for(const component of owners)edits.push({start:component.body.getStart(root)+1,end:component.body.getStart(root)+1,text:'\n  const { locale: mediaLocale } = useTranslations();'});
  if(!/import\s+[^;]*\buseTranslations\b[^;]*from\s+["']@\/context\/LocaleContext/.test(before)){
    const imports=root.statements.filter(ts.isImportDeclaration),pos=imports[imports.length-1].end;
    edits.push({start:pos,end:pos,text:'\nimport { useTranslations } from "@/context/LocaleContext";'});
  }
  let after=before;for(const e of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,e.start)+e.text+after.slice(e.end);
  if(process.argv.includes('--write'))fs.writeFileSync(file,after);
  console.log(file+': '+owners.size+' components');
}
