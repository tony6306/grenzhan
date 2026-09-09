import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {Spring,clamp,fit} from './motionCore';
import PointerFlow,{flowGLSL,flowUniforms} from './PointerFlow';

const vertex=`varying vec2 vUv;varying vec2 vScreenUV;uniform vec2 size;uniform vec4 cardRect;uniform vec2 screenSize;uniform float angle;void main(){vUv=uv;vec2 p=position.xy*size*.5;p=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p;p+=cardRect.xy+cardRect.zw*.5;vScreenUV=p/screenSize;gl_Position=vec4(vScreenUV*2.-1.,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 vUv;uniform sampler2D image;uniform vec2 size;uniform vec2 focus;uniform vec2 shift;uniform float zoom;uniform float hover;uniform float elapsed;uniform float scrollPower;uniform float show;
uniform vec4 cardRect;uniform vec2 screenSize;varying vec2 vScreenUV;
${flowGLSL}
float coverLuma(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){
 vec2 baseUv=vUv;baseUv.x-=(vScreenUV.x-.5)*(1.-sin(vScreenUV.y*3.14159265))*abs(scrollPower);
 vec2 p=(baseUv-.5)*size;vec2 q=abs(p)-size*.5+25.;float edge=length(max(q,0.))+min(max(q.x,q.y),0.)-25.;float alpha=1.-smoothstep(-1.,1.,edge);
 vec2 trail=flowVelocity(vScreenUV);
 vec2 uv=(baseUv-.5)/(1.+.045*zoom)+.5+trail*3.75*flowTexel*screenSize/size;
 float depth=coverLuma(texture2D(image,uv).rgb);uv+=focus*.018*(depth-.35)*zoom;
 vec2 pulse=shift*.0035*(1.-smoothstep(0.,.35,hover));
 float distanceToFocus=length((uv-.5-focus*.5)*vec2(size.x/size.y,1.));
 float blur=min(4.,distanceToFocus*2.3)*zoom;
 vec3 color=vec3(0.);for(int i=0;i<6;i++){float a=float(i)*1.04719755;vec2 offset=vec2(cos(a),sin(a))*blur/size;vec3 sampleColor=texture2D(image,clamp(uv+offset+ pulse,.001,.999)).rgb;color+=sampleColor/6.;}
 color.r= mix(color.r,texture2D(image,clamp(uv+pulse*2.,.001,.999)).r,length(pulse)*60.);
 float reveal=smoothstep(0.,1.,show);float radial=length((vUv-.5)*vec2(1.,size.y/size.x));alpha*=1.-smoothstep(reveal*.85-.05,reveal*.85,radial);
 gl_FragColor=vec4(color,alpha);
}`;
export default function CardEffects(){
 const canvas=useRef(null);
 useEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let renderer;try{renderer=new THREE.WebGLRenderer({canvas:canvas.current,alpha:true,antialias:false,powerPreference:'low-power'});}catch{return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x000000,0);renderer.autoClear=false;
  const flow=new PointerFlow(renderer);
  const scene=new THREE.Scene(),camera=new THREE.Camera(),geometry=new THREE.PlaneGeometry(2,2),records=[];let frame,previous=performance.now(),time=0,lastScroll=scrollY,velocity=0,disposed=false;
  const pointer={x:-1000,y:-1000};const loader=new THREE.TextureLoader();
  document.querySelectorAll('.project-image').forEach((element,index)=>{
   const img=element.querySelector('img'),uniforms={...flowUniforms(),angle:{value:0},cardRect:{value:new THREE.Vector4()},screenSize:{value:new THREE.Vector2()},image:{value:null},size:{value:new THREE.Vector2()},focus:{value:new THREE.Vector2()},shift:{value:new THREE.Vector2()},zoom:{value:0},hover:{value:0},elapsed:{value:0},scrollPower:{value:0},show:{value:0}};
   const material=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthTest:false,depthWrite:false});
   const mesh=new THREE.Mesh(geometry,material);mesh.visible=false;scene.add(mesh);
   const record={element,img,index,mesh,uniforms,ready:false,started:0,hover:0,zoom:new Spring(0,2.2,.7,3),x:new Spring(0,1,.6,2),y:new Spring(0,1,.6,2),shift:new THREE.Vector2(),lastThreshold:0};records.push(record);

  });
  const near=new IntersectionObserver(entries=>{for(const entry of entries){const record=records.find(r=>r.element===entry.target);if(!entry.isIntersecting||record.loading)continue;record.loading=true;loader.load(record.img.currentSrc||record.img.src,texture=>{if(disposed){texture.dispose();return;}texture.colorSpace=THREE.NoColorSpace;record.uniforms.image.value=texture;record.ready=true;});near.unobserve(entry.target);}},{rootMargin:'400px'});records.forEach(r=>near.observe(r.element));
  const visible=new Set();const visibility=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);}});records.forEach(r=>visibility.observe(r.element));let cleared=false;
  const move=e=>{pointer.x=e.clientX;pointer.y=e.clientY;};const leave=()=>{pointer.x=-1000;};window.addEventListener('pointermove',move);document.addEventListener('pointerleave',leave);
  let oldWidth=0,oldHeight=0;
  function draw(now){frame=requestAnimationFrame(draw);const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden||!innerWidth||!innerHeight)return;time+=dt;
   if(innerWidth!==oldWidth||innerHeight!==oldHeight){renderer.setSize(innerWidth,innerHeight,false);oldWidth=innerWidth;oldHeight=innerHeight;}
   if(!visible.size||document.querySelector('dialog[open]')){if(!cleared){renderer.setScissorTest(false);renderer.clear();cleared=true;}lastScroll=scrollY;return;}cleared=false;
   const field=flow.update(dt);renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.clear();renderer.setScissorTest(true);
   const scrollSpeed=(scrollY-lastScroll)/Math.max(.001,dt)/Math.max(1,innerHeight);
   velocity+=(Math.max(-.15,Math.min(.15,scrollSpeed*.12))-velocity)*(1-Math.exp(-12*dt));lastScroll=scrollY;
   if(document.querySelector('dialog[open]'))return;
   for(const record of records){const {element,mesh,uniforms}=record;if(!visible.has(element)){record.started=0;record.img.style.opacity="";continue;}const r=element.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight||!record.ready||r.width===0){record.started=0;record.img.style.opacity='';continue;}
    const hovered=pointer.x>=r.left&&pointer.x<=r.right&&pointer.y>=r.top&&pointer.y<=r.bottom;
    uniforms.flowTexture.value=field;uniforms.flowTexel.value.copy(flow.uniforms.u_paintTexelSize.value);uniforms.screenSize.value.set(innerWidth,innerHeight);uniforms.cardRect.value.set(r.left,innerHeight-r.bottom,r.width,r.height);
    if(!record.started)record.started=time;record.hover=clamp(record.hover+dt*(hovered?1:-1));
    const threshold=record.hover>.3?3:record.hover>.2?2:record.hover>0?1:0;
    if(threshold>record.lastThreshold){const angle=Math.random()*Math.PI*2;record.shift.set(Math.cos(angle),Math.sin(angle)).multiplyScalar(fit(record.hover,0,.6,1,0));}else record.shift.multiplyScalar(.95);record.lastThreshold=threshold;
    const tremor=hovered?fit(record.hover,0,.3,1,0)*.75:0;
    const x=hovered?-(pointer.x-r.left-r.width/2)/r.width+Math.cos(time*20)*tremor:0,y=hovered?(pointer.y-r.top-r.height/2)/r.height+Math.sin(time*30)*tremor:0;
    const matrix=new DOMMatrixReadOnly(getComputedStyle(element).transform);uniforms.angle.value=Math.atan2(matrix.b,matrix.a);
    uniforms.size.value.set(element.clientWidth,element.clientHeight);uniforms.focus.value.set(record.x.update(x,dt),record.y.update(y,dt));uniforms.shift.value.lerp(record.shift,.2);uniforms.zoom.value=record.zoom.update(hovered?1:0,dt);uniforms.hover.value=record.hover;uniforms.elapsed.value=time;uniforms.scrollPower.value=velocity;uniforms.show.value=1-2**(-10*clamp((time-record.started)/1.5));
    renderer.setViewport(0,0,innerWidth,innerHeight);renderer.setScissor(Math.max(0,r.left),Math.max(0,innerHeight-r.bottom),Math.min(r.right,innerWidth)-Math.max(0,r.left),Math.min(r.bottom,innerHeight)-Math.max(0,r.top));mesh.visible=true;renderer.render(scene,camera);mesh.visible=false;record.img.style.opacity='0';
   }
  }frame=requestAnimationFrame(draw);
  return()=>{disposed=true;near.disconnect();visibility.disconnect();cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',leave);records.forEach(r=>{r.img.style.opacity='';r.uniforms.image.value?.dispose();r.mesh.material.dispose();});flow.dispose();geometry.dispose();renderer.dispose();};
 },[]);
 return <canvas ref={canvas} className="card-effects" aria-hidden="true"/>;
}
