import SoundEngine from './SoundEngine';
import {useEffect,useRef,useState} from 'react';
import gsap from 'gsap';
import {CustomEase} from 'gsap/CustomEase';
import {clamp,expoInOut,mix} from './motionCore';
gsap.registerPlugin(CustomEase);
CustomEase.create('lusion','0.35,0,0,1');

export function IntroLoader({loaded,onStart}){
 const [elapsed,setElapsed]=useState(false),started=useRef(false),callback=useRef(onStart);callback.current=onStart;
 useEffect(()=>{const timer=setTimeout(()=>setElapsed(true),matchMedia('(prefers-reduced-motion: reduce)').matches?0:1200);return()=>clearTimeout(timer);},[]);
 useEffect(()=>{if(loaded&&elapsed&&!started.current){started.current=true;callback.current();}},[loaded,elapsed]);
 return <div className="loader" aria-label="正在加载作品集"><strong>LSY<span>®</span></strong><div className="loader-line"/><span>DESIGN WITH INTENTION.</span></div>;
}

export function RollText({text,className=''}){
 return <span className={`roll-text ${className}`} aria-label={text}>{Array.from(text).map((char,i)=><span className="roll-slot" aria-hidden="true" key={i} style={{'--char-index':i}}><span className="roll-strip">{[0,1,2,3,4,5].map(n=><span key={n}>{char===' '?'\u00a0':char}</span>)}</span></span>)}</span>;
}
export function WordLine({text}){return <span className="word-line" aria-label={text}>{text.split(' ').map((word,i)=><span className="word-mask" key={i} aria-hidden="true"><span className="motion-word">{word}</span>{' '}</span>)}</span>;}
export function useTextMotion(root,ready){
 useEffect(()=>{if(!ready)return;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx=gsap.context(()=>{
   if(reduce)return;
   gsap.fromTo('.topbar .motion-word',{y:'1.7em',rotation:15},{y:0,rotation:0,duration:1,delay:1,stagger:.05,ease:'lusion'});
   gsap.fromTo('.header-actions>a,.sound-button',{y:'4em'},{y:0,duration:.8,delay:.9,stagger:.1,ease:'lusion'});
   gsap.fromTo('.register-line>span',{scale:0,rotation:0},{scale:1,rotation:180,duration:.6,delay:1.2,stagger:.1,ease:'lusion'});
   gsap.fromTo('.register-line>a',{scale:.8,opacity:0},{scale:1,opacity:1,duration:.6,delay:1.23,ease:'lusion'});
   gsap.utils.toArray('.statement .statement-row').forEach((row,i)=>gsap.fromTo(row.querySelector('.statement-inner'),{yPercent:i===0?100:-100,x:i===0?-120:0},{yPercent:0,x:0,duration:1.2,delay:i*.1,ease:'lusion',scrollTrigger:{trigger:'.statement',start:'top 90%',toggleActions:'play none none reverse'}}));
   gsap.utils.toArray('.contact-statement .motion-word').forEach((word,i)=>gsap.fromTo(word,{yPercent:110,rotation:4},{yPercent:0,rotation:0,duration:1,delay:i*.03,ease:'lusion',scrollTrigger:{trigger:'.contact-statement',start:'top 90%',toggleActions:'play none none reverse'}}));
  },root);return()=>ctx.revert();
 },[root,ready]);
}

export function SoundButton(){
 const [enabled,setEnabled]=useState(false);const refs=useRef({enabled:false}),canvas=useRef(null);
 useEffect(()=>{const ctx=canvas.current.getContext('2d');let frame,time=0,last=performance.now(),hover=0;const soundEngine=new SoundEngine();const audio=soundEngine.clip('/motion/generic.wav');audio.loop=true;audio.volume=.3;refs.current.audio=audio;const sounds={};let counts={};
  const play=event=>{if(!refs.current.enabled)return;const name=event.detail||'hover';const count=name==='hover'||name==='focus'?3:2;const index=(counts[name]||0)%count;counts[name]=index+1;const key=name+'_'+index;const sound=sounds[key]||(sounds[key]=soundEngine.clip('/motion/'+key+'.wav'));sound.volume=name==='focus'?.16:.3;sound.currentTime=0;sound.play().catch(()=>{});};
  const onOver=e=>{const element=e.target.closest('a,button');if(element&&!element.contains(e.relatedTarget))play({detail:element.classList.contains('project-card')?'focus':'hover'});};
  const onClick=e=>{if(e.target.closest('a,button'))play({detail:'click'});};
  document.addEventListener('pointerover',onOver);document.addEventListener('click',onClick);window.addEventListener('portfolio-sound',play);
  const onVisibility=()=>{if(document.hidden)audio.pause();else if(refs.current.enabled)audio.play().catch(()=>{});};document.addEventListener('visibilitychange',onVisibility);
  function draw(now){frame=requestAnimationFrame(draw);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;hover=clamp(hover+dt*(refs.current.hover?1:-1)/.3);time+=dt*.6*(1+hover*.5);const size=48,dpr=Math.min(devicePixelRatio,2);canvas.current.width=size*dpr;canvas.current.height=size*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,size,size);ctx.fillStyle='#e4e6ef';ctx.beginPath();ctx.arc(24,24,24,0,Math.PI*2);ctx.fill();ctx.save();ctx.clip();ctx.translate(24,24);ctx.rotate(refs.current.angle||0);ctx.translate(0,mix(36,0,hover));ctx.fillStyle='#101116';ctx.beginPath();ctx.arc(0,0,24*hover,0,Math.PI*2);ctx.fill();ctx.restore();ctx.strokeStyle=`rgb(${Math.round(hover*255)},${Math.round(hover*255)},${Math.round(hover*255)})`;ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();for(let i=0;i<=32;i++){const x=-9.6+19.2*i/32,y=refs.current.enabled?Math.sin(time*8+i/32*7)*6.72*(.3+.7*Math.sin(Math.PI*i/32)):0;i===0?ctx.moveTo(24+x,24+y):ctx.lineTo(24+x,24+y);}ctx.stroke();}frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);audio.pause();Object.values(sounds).forEach(a=>a.pause());soundEngine.dispose();document.removeEventListener('pointerover',onOver);document.removeEventListener('click',onClick);window.removeEventListener('portfolio-sound',play);document.removeEventListener('visibilitychange',onVisibility);};
 },[]);
 const toggle=()=>{const next=!enabled;refs.current.enabled=next;setEnabled(next);if(next)refs.current.audio?.play().catch(error=>{console.warn('Ambient audio unavailable:',error.name,error.message);refs.current.enabled=false;setEnabled(false);});else refs.current.audio?.pause();};
 return <button className="sound-button" onClick={toggle} aria-label={enabled?'关闭声音':'开启声音'} aria-pressed={enabled} onPointerEnter={e=>{const r=e.currentTarget.getBoundingClientRect();refs.current.hover=true;refs.current.angle=Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)-Math.PI/2;}} onPointerLeave={()=>refs.current.hover=false}><canvas ref={canvas}/></button>;
}

export function UnderlineLink({href,children,...props}){
 const ref=useRef(null),canvas=useRef(null);
 useEffect(()=>{const el=ref.current,ctx=canvas.current.getContext('2d');let hover=false,ratio=0,frame,last=performance.now();const enter=()=>hover=true,leave=()=>hover=false;el.addEventListener('pointerenter',enter);el.addEventListener('pointerleave',leave);el.addEventListener('focus',enter);el.addEventListener('blur',leave);
 function draw(now){frame=requestAnimationFrame(draw);const dt=Math.min((now-last)/1000,.05);last=now;ratio=clamp(ratio+(hover?1:-1)*dt*3);const w=el.clientWidth,h=el.clientHeight,dpr=Math.min(devicePixelRatio,2);canvas.current.width=w*dpr;canvas.current.height=h*dpr;ctx.scale(dpr,dpr);const t=ratio<.5?2*ratio*ratio:1-(-2*ratio+2)**2/2;ctx.strokeStyle=getComputedStyle(el).color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,h-1);ctx.arcTo(w*t,h-1,w*t,h-2,30*(1-(1-Math.abs(ratio*2-1))**2));ctx.stroke();}frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);el.removeEventListener('pointerenter',enter);el.removeEventListener('pointerleave',leave);el.removeEventListener('focus',enter);el.removeEventListener('blur',leave);};},[]);
 return <a {...props} href={href} ref={ref} className={`animated-link ${props.className||''}`}>{children}<canvas ref={canvas} aria-hidden="true"/></a>;
}
