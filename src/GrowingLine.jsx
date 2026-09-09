import {useEffect,useRef} from 'react';
import {readBuffer,clamp,fit,quadInOut,mix} from './motionCore';
const toHSV=([r,g,b])=>{r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=d===0?0:max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;return[(h/6+1)%1,max===0?0:d/max,max];};
const fromHSV=([h,s,v])=>[0,4,2].map(n=>{let c=clamp(Math.abs(((h*6+n)%6+6)%6-3)-1);c=c*c*(3-2*c);return 255*v*mix(1,c,s);});

export default function GrowingLine({mint=false}){
 const ref=useRef(null);
 useEffect(()=>{
  const canvas=ref.current,ctx=canvas.getContext('2d'),host=canvas.parentElement;
  const palette=mint?['#1285dc','#94fffb']:['#2a38ee','#5a90ff'];let points=[],alive=true,raf=0,lastProgress=-1,lastWidth=0,lastHeight=0;
  fetch(`/motion/line-${mint?'goal':'reel'}.buf`).then(r=>{if(!r.ok)throw Error('Curve unavailable');return r.arrayBuffer();}).then(buffer=>{if(!alive)return;const attrs=readBuffer(buffer),cp=attrs.CP.array,pos=attrs.position.array;const unique=new Map();for(let i=0;i<cp.length/3;i++){const ratio=pos[i*3+2];unique.set(ratio,{x:cp[i*3],y:cp[i*3+1],ratio,ao:attrs.Cd.array[i]});}points=[...unique.values()].sort((a,b)=>a.ratio-b.ratio);lastProgress=-1;}).catch(()=>{canvas.style.display='none';});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colors=palette.map(hex=>toHSV([1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))));
  let dirty=true;const invalidate=()=>{dirty=true;};window.addEventListener('scroll',invalidate,{passive:true});window.addEventListener('resize',invalidate,{passive:true});
  function draw(){raf=requestAnimationFrame(draw);if(!points.length||document.hidden||(!dirty&&lastProgress>=0))return;dirty=false;const rect=host.getBoundingClientRect(),width=innerWidth,height=canvas.clientHeight,viewHeight=innerHeight;if(!width||!viewHeight)return;
   const factors=mint?[1.2,2]:[.4,1.3],progress=reduced?1:quadInOut(clamp((factors[0]*viewHeight-rect.top)/(factors[1]*viewHeight)));
   if(progress===lastProgress&&width===lastWidth&&height===lastHeight)return;lastProgress=progress;lastWidth=width;lastHeight=height;
   const dpr=Math.min(devicePixelRatio,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
   const diagonal=Math.hypot(width,viewHeight),radius=.008*fit(width,540,1920,2,1)*diagonal,margin=mint?{x:.2,y:-.6}:{x:-.05,y:-.8};ctx.lineWidth=radius*2;ctx.lineCap='round';ctx.lineJoin='round';
   const point=p=>[(p.x+margin.x)*diagonal,-(p.y+margin.y)*diagonal];
   const aoRatio=fit(progress,(mint?.0001:.555)-.02,(mint?.0001:.555)+.02);
   for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(a.ratio>=progress)break;const weight=clamp((progress-a.ratio)/(b.ratio-a.ratio));const [x,y]=point(a),[bx,by]=point(b);const blend=1-(1-a.ratio)**2,shade=Math.min(1,.9+.1*a.ao+1-aoRatio);ctx.strokeStyle=`rgb(${fromHSV(colors[0].map((c,j)=>mix(c,colors[1][j],blend))).map(c=>Math.round(c*shade)).join(',')})`;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(mix(x,bx,weight),mix(y,by,weight));ctx.stroke();}
  }raf=requestAnimationFrame(draw);
  return()=>{window.removeEventListener('scroll',invalidate);window.removeEventListener('resize',invalidate);alive=false;cancelAnimationFrame(raf);};
 },[mint]);
 return <canvas ref={ref} className="growing-line" aria-hidden="true"/>;
}
