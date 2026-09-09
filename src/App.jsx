import PageFlow from './PageFlow';
import {useEffect,useRef,useState} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Sculpture from './Sculpture';
import GrowingLine from './GrowingLine';
import CardEffects from './CardEffects';
import MorphShowcase from './MorphShowcase';
import {IntroLoader,RollText,WordLine,SoundButton,UnderlineLink,useTextMotion} from './MotionUI';
import projects from './projects.json';
gsap.registerPlugin(ScrollTrigger);

function WorkCard({project,index,onOpen}){
 const ref=useRef(null),meta=useRef(null);
 const label=project.category+(project.brand?'-'+project.brand:'');
 useEffect(()=>{
  const el=ref.current,description='About '+project.brand+' '+project.en;let frame=0,startTime=0,visible=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx=gsap.context(()=>{},el);
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(!visible){cancelAnimationFrame(frame);startTime=0;return;}
   if(reduced)return;
   ctx.add(()=>{
    gsap.fromTo(el.querySelector('.project-image'),{x:(index%2?-.05:.05)*innerWidth,rotation:(index%2?1:-1)*2.86},{x:0,rotation:0,duration:2,ease:'expo.out',overwrite:true});
    gsap.fromTo(el.querySelectorAll('.roll-strip'),{yPercent:-83.333},{yPercent:0,duration:1.25,ease:'expo.inOut',stagger:{each:.012,from:'center'},overwrite:true});
   });
   const tick=now=>{if(!visible)return;if(!startTime)startTime=now;const count=Math.floor((now-startTime)/1000*40),settled=Math.max(0,count-5);meta.current.textContent=Array.from(description).slice(0,Math.min(count,description.length)).map((c,i)=>i<settled?c:String.fromCharCode(33+Math.floor(Math.random()*93))).join('');if(settled<description.length)frame=requestAnimationFrame(tick);else meta.current.textContent=description;};frame=requestAnimationFrame(tick);
  },{threshold:0});observer.observe(el);return()=>{observer.disconnect();cancelAnimationFrame(frame);ctx.revert();};
 },[project,index]);
 const hover=enabled=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;gsap.to(ref.current.querySelectorAll('.roll-slot'),{x:enabled?'1.5em':0,duration:.4,ease:'lusion',stagger:{each:.01,from:'end'},overwrite:true});};
 return <button ref={ref} className="project-card" onPointerEnter={()=>hover(true)} onPointerLeave={()=>hover(false)} onFocus={()=>hover(true)} onBlur={()=>hover(false)} onClick={e=>onOpen(project,e.currentTarget)} aria-label={'查看'+label}>
  <div className="project-image"><img src={project.cover} alt={project.brand+' '+project.category+'封面'} decoding="async" loading="lazy" width="846" height="554"/></div>
  <div className="project-caption"><span ref={meta} className="eyebrow">About {project.brand} {project.en}</span><h3><span className="caption-arrow" aria-hidden="true">↗</span><RollText text={label}/></h3></div>
 </button>;
}

function WorkViewer({project,onClose}){
 const dialog=useRef(null),[category,setCategory]=useState('全部'),[itemIndex,setItemIndex]=useState(0);
 const categories=[...new Set(project.items.map(item=>item.category))];
 const filtered=category==='全部'?project.items:project.items.filter(item=>item.category===category);
 const item=filtered[Math.min(itemIndex,filtered.length-1)];
 useEffect(()=>{dialog.current.showModal();dialog.current.querySelector('button').focus({preventScroll:true});const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[]);
 const change=index=>{setItemIndex(index);dialog.current.scrollTo({top:0,behavior:'instant'});};
 return <dialog className="work-viewer" ref={dialog} data-lenis-prevent aria-labelledby="viewer-title" onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>{if(e.key==='ArrowRight')change((itemIndex+1)%filtered.length);if(e.key==='ArrowLeft')change((itemIndex-1+filtered.length)%filtered.length);}}>
  <header className="viewer-header"><a href="#top" className="wordmark" onClick={e=>{e.preventDefault();onClose();}}>LSY</a><div><span className="eyebrow">SELECTED WORK / {project.en.toUpperCase()}</span><h2 id="viewer-title">{project.brand} {project.category}</h2></div><button className="pill dark" onClick={onClose} autoFocus>关闭 <span>×</span></button></header>
  <div className="viewer-layout"><aside className="viewer-sidebar"><p className="eyebrow">COLLECTION / {String(project.items.length).padStart(2,'0')}</p>{categories.length>1&&<div className="category-tabs" aria-label="作品分类">{['全部',...categories].map(name=><button key={name} aria-pressed={name===category} onClick={()=>{setCategory(name);change(0);}}>{name}</button>)}</div>}<div className="work-tabs" aria-label="选择作品">{filtered.map((work,i)=><button key={work.title} className={i===itemIndex?'active':''} aria-pressed={i===itemIndex} onClick={()=>change(i)}><span>{String(i+1).padStart(2,'0')}</span>{work.title}<b>↗</b></button>)}</div><p className="viewer-hint">向下滚动查看完整设计<br/>← → 切换作品 · Esc 关闭</p></aside>
  <article className="work-art" key={item.title}><div className="art-title"><span>{item.category}</span><h3>{item.title}</h3></div>{item.type==='video'?<video controls playsInline preload="metadata" src={item.src}/>:item.pages.map((page,i)=><img key={page.src} src={page.src} alt={i===0?`${item.category} · ${item.title} 完整作品`:`${item.title} 续图 ${i+1}`} width={page.width} height={page.height} decoding="async" loading={i===0?'eager':'lazy'}/>)}<div className="art-end"><span>THANK YOU FOR VIEWING</span><button className="pill dark" onClick={()=>change((itemIndex+1)%filtered.length)}>下一件作品 ↗</button></div></article></div>
 </dialog>;
}

export default function App(){
 const root=useRef(null),lenis=useRef(null),lastTrigger=useRef(null),[ready,setReady]=useState(false),[assetsLoaded,setAssetsLoaded]=useState(false),[selected,setSelected]=useState(null),[copied,setCopied]=useState('');
 const transitionBusy=useRef(false);
 useTextMotion(root,ready);
 useEffect(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smooth=new Lenis({lerp:1-Math.exp(-12/60),smoothWheel:!reduced,anchors:true});lenis.current=smooth;smooth.on('scroll',ScrollTrigger.update);
  const tick=time=>smooth.raf(time*1000);gsap.ticker.add(tick);
  const ctx=gsap.context(()=>{
   if(reduced)return;
   gsap.utils.toArray('.reveal').forEach(el=>gsap.from(el,{y:65,opacity:0,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 94%',once:true}}));
  },root);
  return()=>{ctx.revert();gsap.ticker.remove(tick);smooth.destroy();};
 },[]);
 useEffect(()=>{if(selected||!ready)lenis.current?.stop();else lenis.current?.start();},[selected,ready]);
 const open=(project,trigger)=>{
  if(transitionBusy.current)return;transitionBusy.current=true;lastTrigger.current=trigger;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){setSelected(project);transitionBusy.current=false;return;}
  lenis.current?.stop();window.dispatchEvent(new CustomEvent('portfolio-sound',{detail:'page'}));
  const rect=trigger.querySelector('.project-image').getBoundingClientRect(),layer=document.createElement('div'),image=document.createElement('img');
  layer.className='project-transition';image.src=project.cover;layer.appendChild(image);document.body.appendChild(layer);
  gsap.set(layer,{left:rect.left,top:rect.top,width:rect.width,height:rect.height,borderRadius:25});
  const scale=Math.max(innerWidth/rect.width,innerHeight/rect.height)*1.2;
  gsap.to(layer,{x:innerWidth/2-rect.left-rect.width/2,y:innerHeight/2-rect.top-rect.height/2,scale,rotation:(innerWidth*.5-rect.left-rect.width*.5)/innerWidth*-17.2,borderRadius:0,duration:.8,ease:'power2.inOut',onComplete:()=>{setSelected(project);gsap.to(layer,{opacity:0,duration:.35,onComplete:()=>{layer.remove();transitionBusy.current=false;}});}});
 };
 const close=()=>{if(transitionBusy.current)return;transitionBusy.current=true;const finish=()=>{setSelected(null);transitionBusy.current=false;requestAnimationFrame(()=>lastTrigger.current?.focus({preventScroll:true}));};const dialog=document.querySelector('.work-viewer');if(dialog&&!matchMedia('(prefers-reduced-motion: reduce)').matches)gsap.to(dialog,{opacity:0,y:30,duration:.4,ease:'lusion',onComplete:finish});else finish();};
 const copy=async(text)=>{try{await navigator.clipboard.writeText(text);setCopied(text);}catch{setCopied('复制失败，请手动复制');}setTimeout(()=>setCopied(''),2400);};
 return <div ref={root} className={ready?'site is-ready':'site'}>
  <IntroLoader loaded={assetsLoaded} onStart={()=>setReady(true)}/>
  <main className="shell" id="top" inert={!ready}>
   <header className="topbar"><a className="wordmark" href="#top" aria-label="李世玉作品集首页">LSY</a><h1><WordLine text="WELCOME TO MY"/><WordLine text="PORTFOLIO WEBSITE"/></h1><div className="header-actions"><SoundButton/><a className="talk-button" href="#contact-details"><span className="talk-arrow" aria-hidden="true">→</span><span className="talk-label">与我聊聊</span><i/></a></div></header>
   <section className="hero" aria-label="作品集开场"><Sculpture ready={ready} onLoaded={()=>setAssetsLoaded(true)} onInteract={()=>window.dispatchEvent(new CustomEvent('portfolio-sound',{detail:'click'}))}/><div className="hero-note"><span>DESIGN IN MOTION</span><span>MOVE TO INTERACT · CLICK TO CHANGE</span></div></section>
   <div className="register-line"><span>+</span><span>+</span><a href="#about" aria-hidden="false">探索更多 ↓</a><span>+</span><span>+</span></div>
   <section className="about" id="about"><GrowingLine/><h2 className="statement"><span className="statement-row"><span className="statement-inner">大胆的构想，</span></span><span className="statement-row"><span className="statement-inner">焕新设计</span></span></h2><MorphShowcase/></section>
   <section className="works" id="works"><div className="works-heading reveal"><h2>精选作品</h2><span className="eyebrow">SELECTED WORKS /<br/>CREATIVE COLLECTION</span></div><div className="projects-grid">{projects.map((project,index)=><WorkCard key={project.id} project={project} index={index} onOpen={open}/>)}</div></section>
   <section className="contact" id="contact"><GrowingLine mint/><h2 className="contact-statement"><WordLine text="Where The Brand Core"/><WordLine text="Evolves Into Visual"/><WordLine text="Perception"/></h2><div className="contact-bottom" id="contact-details"><div className="contact-card reveal"><a href="tel:18211635527"><span>Number</span><strong>18211635527</strong><b>↗</b></a><button onClick={()=>copy('LSY74498')}><span>Weixin</span><strong>LSY74498</strong><b>↗</b></button><UnderlineLink href="mailto:1916306770@qq.com"><span>Email</span><strong>1916306770@qq.com</strong><b>↗</b></UnderlineLink><div className="qr-row"><img src="/figma/313-346.png" alt="微信联系二维码" width="250" height="260"/><span>LET’S CONNECT.<br/>期待与你的下一次合作</span></div></div><a className="contact-cta reveal" href="mailto:1916306770@qq.com">LET’S CREATE<br/>A GOOD<br/><span>↙ START</span></a></div></section>
   <footer><span>© {new Date().getFullYear()} BRUCE · 李世玉</span><span>DESIGN WITH INTENTION.</span><a href="#top">回到顶部 ↑</a></footer>
  </main><CardEffects/><PageFlow/>{selected&&<WorkViewer project={selected} onClose={close}/>}<div className={`toast ${copied?'show':''}`} role="status">{copied==='LSY74498'?'微信号已复制':copied}</div>
 </div>;
}

