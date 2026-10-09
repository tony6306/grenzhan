import fs from 'node:fs';
import path from 'node:path';
const root='D:/作品集相关/作品整理';
const specs=[
 ['herlian','Herlian','首页设计','Homepage design','302-120',['Herlian/首页设计/26秋冬.jpg','Herlian/首页设计/双十二.jpg']],
 ['baccarat','Baccarat','首页设计','Homepage design','303-128',['Baccarat/首页设计/618活动.jpg','Baccarat/首页设计/婚礼季活动.jpg']],
 ['rimowa','RIMOWA','首页设计','Homepage design','304-153',['RIMOWA/首页设计/CNY活动.jpg','RIMOWA/首页设计/双十一活动.jpg']],
 ['moncler','Moncler','首页设计','Homepage design','304-158',['Moncler/首页设计/品牌日活动.jpg','Moncler/首页设计/七夕节活动.jpg']],
 ['maje','Maje','首页设计','Homepage design','306-197',['Maje/首页/狂暑季活动.jpg','Maje/首页/38节活动.jpg']],
 ['rimowa-story','RIMOWA','专题页设计','Landing Page design','306-205',['RIMOWA/专题页设计/海洋蓝系列.jpg','RIMOWA/专题页设计/品牌形象伙伴官宣.jpg']],
 ['moncler-story','Moncler','专题页设计','Landing Page design','310-259',['Moncler/专题页设计/滑雪系列.jpg','Moncler/专题页设计/户外系列.jpg']],
 ['maje-story','Maje','专题页设计','Landing Page design','309-239',['Maje/专题页/美少女系列.jpg','Maje/专题页/CNY系列.jpg']],
 ['details','','详情页设计','Product Detail Page design','313-290',['Herlian/详情设计/圣诞详情.jpg','Baccarat/详情页设计/千夜系列 花瓶.jpg','RIMOWA/详情页设计/薄荷绿.jpg','Moncler/详情页设计/香水.jpg']],
 ['brand','','品牌设计','Brand design','313-284',[]]
];
fs.mkdirSync('public/works',{recursive:true});
let counter=0;
function item(relative,category){const ext=path.extname(relative);const name=String(++counter).padStart(3,'0')+ext;fs.copyFileSync(path.join(root,relative),path.join('public/works',name));return {title:path.basename(relative,ext),category:category||relative.split('/')[0],src:'/works/'+name,type:ext==='.mp4'?'video':'image'};}
const projects=specs.map(([id,brand,category,en,cover,files])=>({id,brand,category,en,cover:'/figma/'+cover+'.png',items:files.map(f=>item(f))}));
function walk(dir){for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const relative=dir+'/'+entry.name;if(entry.isDirectory())walk(relative);else if(/\.(jpg|jpeg|png|gif|mp4)$/i.test(entry.name))projects.at(-1).items.push(item(relative,relative.split('/')[1]));}}
walk('品牌设计');
let exhibitionIndex=0;for(const work of projects.at(-1).items){if(work.title.startsWith('微信图片'))work.title='展会布置'+(++exhibitionIndex);}
const brandProject=projects.find(p=>p.id==='brand');const campaignIndex=brandProject.items.findIndex(w=>w.title==='campagin拍摄');if(campaignIndex>=0){const [campaign]=brandProject.items.splice(campaignIndex,1);campaign.category='campagin拍摄';campaign.title='herlian';brandProject.items.splice(2,0,campaign);}projects.splice(projects.indexOf(brandProject),1);projects.unshift(brandProject);
fs.writeFileSync('src/projects.json',JSON.stringify(projects,null,2));
console.log('Prepared',projects.length,'collections,',counter,'works.');
