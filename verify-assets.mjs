import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('src/projects.json','utf8'));
const urls=data.flatMap(p=>[p.cover,...p.items.flatMap(i=>i.type==='video'?[i.src]:[i.thumb,...i.pages.map(p=>p.src)])]);
const missing=urls.filter(src=>!fs.existsSync('public'+src));
if(missing.length)throw Error(JSON.stringify(missing));
console.log(JSON.stringify({collections:data.length,works:data.reduce((n,p)=>n+p.items.length,0),verifiedFiles:urls.length,missing:missing.length,brandTabs:[...new Set(data.find(p=>p.id==='brand').items.map(i=>i.category))]},null,2));
