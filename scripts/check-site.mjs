import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const notes=JSON.parse(await fs.readFile(path.join(root,'src/data/notes.json'),'utf8'));
const walk=async dir=>(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(x=>x.isDirectory()?walk(path.join(dir,x.name)):path.join(dir,x.name)))).flat();
const dist=path.join(root,'dist');const files=await walk(dist);const existing=new Set(files);
const issues=[];
assert.equal(new Set(notes.map(n=>n.slug)).size,notes.length,'Note slugs must be unique');
for(const note of notes){
 assert.ok(existing.has(path.join(dist,'notes',note.slug,'index.html')),`Missing page ${note.slug}`);
 assert.ok(!note.html.includes('katex-error'),`Math rendering error in ${note.slug}`);
 if(note.sourceType==='notebook'){const original=await fs.readFile(path.resolve(root,'content/notebooks',note.source));const download=await fs.readFile(path.join(dist,'notebooks',note.source));assert.deepEqual(download,original,`Notebook changed in export: ${note.source}`);}
 const ids=[...note.html.matchAll(/ id="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,`Duplicate anchors in ${note.slug}`);
}
for(const file of files.filter(f=>f.endsWith('.html'))){
 const html=(await fs.readFile(file,'utf8')).replace(/<script[\s\S]*?<\/script>/g,'');
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  const target=match[1].replaceAll('&amp;','&');if(/^(https?:|mailto:|data:|#|javascript:)/.test(target))continue;
  const url=new URL(target,'https://mhopwood.com/'+path.relative(dist,file));
  const decoded=decodeURIComponent(url.pathname);const resolved=path.join(dist,decoded);const final=decoded.endsWith('/')?path.join(resolved,'index.html'):resolved;
  if(!existing.has(final)&&!existing.has(path.join(resolved,'index.html')))issues.push(`${path.relative(dist,file)} → ${target}`);
 }
}
if(issues.length){console.error([...new Set(issues)].join('\n'));process.exit(1)}
console.log(`PASS: ${notes.length} notes, notebook fidelity, unique anchors, zero math parse errors, and local links/assets across ${files.filter(f=>f.endsWith('.html')).length} pages.`);
