import fs from 'node:fs';
import sharp from 'sharp';
const projects=JSON.parse(fs.readFileSync('src/projects.json','utf8'));
for(const project of projects){
 for(const work of project.items){
  if(work.type==='video')continue;
  const file='public'+work.src,meta=await sharp(file).metadata();
  const stem=work.src.replace(/\.[^.]+$/,'');
  work.thumb=stem+'-thumb.webp';
  await sharp(file).resize({width:560,height:640,fit:'cover',position:'top',withoutEnlargement:true}).webp({quality:80}).toFile('public'+work.thumb);
  work.width=Math.min(meta.width,1440);work.height=Math.round(meta.height*work.width/meta.width);
  work.pages=[];
  const scale=work.width/meta.width;
  for(let top=0,index=0;top<meta.height;top+=2200,index++){
   const height=Math.min(2200,meta.height-top),src=stem+'-p'+index+'.webp';
   await sharp(file,{limitInputPixels:false}).extract({left:0,top,width:meta.width,height}).resize({width:work.width}).webp({quality:86}).toFile('public'+src);
   work.pages.push({src,width:work.width,height:Math.round(height*scale)});
  }
  delete work.src;
  fs.unlinkSync(file);
 }
}
fs.writeFileSync('src/projects.json',JSON.stringify(projects,null,2));
console.log('Optimized 36 works with lazy-loadable image sections.');
