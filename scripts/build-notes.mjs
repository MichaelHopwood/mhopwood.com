import fs from 'node:fs/promises';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import matter from 'gray-matter';
const root=path.resolve(import.meta.dirname,'..');
const notebooks=path.resolve(root,'content/notebooks');
const metadata=JSON.parse(await fs.readFile(path.join(root,'content/notebooks.json'),'utf8'));
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source=c=>Array.isArray(c)?c.join(''):c||'';
const processor=unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkRehype,{allowDangerousHtml:true}).use(rehypeRaw).use(rehypeSanitize,{...defaultSchema,attributes:{...defaultSchema.attributes,code:[...(defaultSchema.attributes.code||[]),['className',/^language-./,'math-inline','math-display']]}}).use(rehypeKatex,{strict:false,throwOnError:false}).use(rehypeHighlight,{detect:false,ignoreMissing:true}).use(rehypeSlug).use(rehypeStringify);
const files=(await fs.readdir(notebooks)).filter(f=>f.endsWith('.ipynb')).sort();
const slugs=new Map(files.map(f=>[f,slugify(f.slice(0,-6))]));
function rewrite(md){
 return md.replace(/(?:\.\/|\.\.\/)?_static\//g,'/note-assets/').replace(/(?:\.\/|\.\.\/)?([\w %&().-]+\.ipynb)(#[\w-]+)?/g,(whole,file,hash)=>{
  let decoded;try{decoded=decodeURIComponent(file)}catch{return whole}
  return slugs.has(decoded)?`/notes/${slugs.get(decoded)}/${hash||''}`:whole;
 });
}
async function render(md){return String(await processor.process(rewrite(md.replace(/\r\n?/g,'\n').replace(/\$\$([\s\S]*?)\$\$/g, (_,math)=>'\n\n$$\n'+math.trim()+'\n$$\n\n'))));}
for(const dir of ['notebooks','note-assets','legacy-assets'])await fs.mkdir(path.join(root,'public',dir),{recursive:true});
await fs.cp(path.join(notebooks,'_static'),path.join(root,'public/note-assets'),{recursive:true});
await fs.cp(path.resolve(root,'content/legacy-assets'),path.join(root,'public/legacy-assets'),{recursive:true});
const notes=[];
for(const file of files){
 const nb=JSON.parse(await fs.readFile(path.join(notebooks,file),'utf8')); const meta=metadata[file];
 if(!meta)throw Error(`Add metadata for ${file} in content/notebooks.json`);
 const slug=slugs.get(file);let html='',text='',firstMarkdown=true;
 for(const [index,cell] of nb.cells.entries()){
  let src=source(cell.source);text+='\n'+src;
  if(cell.cell_type==='markdown'){
   if(firstMarkdown){src=src.replace(/^\s*# [^\n]+\n?/,'');firstMarkdown=false;}
   if(cell.attachments)for(const [name,data]of Object.entries(cell.attachments)){const mime=Object.keys(data).find(k=>k.startsWith('image/'));if(mime)src=src.replaceAll(`attachment:${name}`,`data:${mime};base64,${source(data[mime])}`);}
   html+=await render(src);
  }else if(cell.cell_type==='code'&&src.trim()){
   const language=nb.metadata?.language_info?.name?.toLowerCase()==='r'?'r':'python';
   html+=`<div class="code-cell"><div class="code-label">${language.toUpperCase()}<button class="copy-code" type="button" aria-label="Copy code">Copy</button></div>${await render('```'+language+'\n'+src+'\n```')}</div>`;
   let outputHTML='';let logs='';
   for(const output of cell.outputs||[]){
    const data=output.data||{};
    if(data['image/png']){const name=`${slug}-${index}-${outputHTML.length}.png`;await fs.writeFile(path.join(root,'public/note-assets',name),Buffer.from(source(data['image/png']),'base64'));outputHTML+=`<figure><img loading="lazy" src="/note-assets/${name}" alt="Saved notebook output for ${escape(meta.title)}"/><figcaption>Saved notebook output</figcaption></figure>`;}
    else if(data['text/html'])outputHTML+=`<div class="table-scroll">${await render(source(data['text/html']))}</div>`;
    else if(data['image/svg+xml'])outputHTML+=await render(source(data['image/svg+xml']));
    else if(data['text/plain'])logs+=source(data['text/plain'])+'\n';
    else if(output.text)logs+=source(output.text);
    else if(output.output_type==='error')logs+=(output.traceback||[]).join('\n');
   }
   if(logs.trim())outputHTML+=`<details class="saved-output"><summary>Saved output</summary><pre>${escape(logs.replace(/\x1b\[[0-9;]*m/g,''))}</pre></details>`;
   html+=outputHTML;
  }
 }
 await fs.copyFile(path.join(notebooks,file),path.join(root,'public/notebooks',file));
 notes.push({...meta,slug,source:file,sourceType:'notebook',html,text,minutes:Math.max(1,Math.ceil(text.split(/\s+/).length/220))});
}
const walk=async dir=>(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(x=>x.isDirectory()?walk(path.join(dir,x.name)):path.join(dir,x.name)))).flat();
for(const file of await walk(path.join(root,'content/notes'))){
 if(!file.endsWith('.md'))continue;
 const {data,content}=matter(await fs.readFile(file,'utf8'));
 for(const key of ['title','topic','summary'])if(!data[key])throw Error(`${file} is missing ${key}`);
 const slug=data.slug||slugify(path.basename(file,'.md'));
 notes.push({...data,slug,status:data.status||'note',source:path.relative(root,file),sourceType:'markdown',html:await render(content),text:content,minutes:Math.max(1,Math.ceil(content.split(/\s+/).length/220))});
}
const seen=new Set();for(const n of notes){if(seen.has(n.slug))throw Error(`Duplicate note slug: ${n.slug}`);seen.add(n.slug);const headingIds=new Map();n.html=n.html.replace(/(<h[1-6] id=")([^"]+)(")/g,(_,open,id,close)=>{const count=headingIds.get(id)||0;headingIds.set(id,count+1);return open+id+(count?'-'+count:'')+close});n.toc=[...n.html.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h[23]>/g)].map(m=>({level:+m[1],id:m[2],title:m[3].replace(/<math[\s\S]*?<\/math>/g,'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&')}));}
notes.sort((a,b)=>a.title.localeCompare(b.title));
await fs.mkdir(path.join(root,'src/data'),{recursive:true});await fs.writeFile(path.join(root,'src/data/notes.json'),JSON.stringify(notes));
await fs.writeFile(path.join(root,'public/search-index.json'),JSON.stringify(notes.map(({html,toc,...n})=>n)));
// Preserve legacy paths on a future custom-domain cutover. External RTD URLs require redirects there.
const aliases={};
for(const file of (await fs.readdir(path.resolve(root,'content/legacy-links'))).filter(f=>f.endsWith('.nblink'))){
 const link=JSON.parse(await fs.readFile(path.resolve(root,'content/legacy-links',file),'utf8'));const notebook=path.basename(link.path||'');if(slugs.has(notebook))aliases[`en/latest/nblinks/${file.replace('.nblink','.html')}`]=`/notes/${slugs.get(notebook)}/`;
}
aliases['en/latest/index.html']='/';aliases['en/latest/notes.html']='/notes/';aliases['en/latest/projects.html']='/projects/';aliases['en/latest/resources.html']='/resources/';
for(const [from,to]of Object.entries(aliases)){const dest=path.join(root,'public',from);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${to}"><link rel="canonical" href="https://mhopwood.com${to}"><title>Page moved</title></head><body><a href="${to}">Continue to the updated page</a></body></html>`);}
console.log(`Imported ${notes.length} notes (${notes.filter(n=>n.status==='draft').length} drafts), with notebook downloads and legacy routes.`);
