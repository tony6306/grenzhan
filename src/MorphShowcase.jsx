import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import {clamp} from './motionCore';
const vert=`varying vec2 vUv;varying vec2 vSize;varying float vRatio;uniform vec4 fromRect;uniform vec4 toRect;uniform vec2 canvasSize;uniform float ratio;
void main(){vec2 uv=vec2(position.x+.5,.5-position.y);float weight=1.-(pow(uv.x*uv.x,.75)+pow(1.-uv.y,1.5))*.5;float t=smoothstep(weight*.3,.7+weight*.3,ratio);vec4 rect=mix(fromRect,toRect,t);rect.x+=rect.z*(1.-cos(t*6.2831853))*.05;vec2 p=(uv-.5)*rect.zw;float angle=-(smoothstep(0.,1.,t)-t);p=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p;p+=rect.xy+rect.zw*.5;gl_Position=vec4(p.x/canvasSize.x*2.-1.,1.-p.y/canvasSize.y*2.,0.,1.);vUv=vec2(uv.x,1.-uv.y);vSize=rect.zw;vRatio=t;}`;
const frag=`precision highp float;varying vec2 vUv;varying vec2 vSize;varying float vRatio;uniform sampler2D image;
void main(){vec2 p=(vUv-.5)*vSize;vec2 q=abs(p)-vSize*.5+25.;float d=length(max(q,0.))+min(max(q.x,q.y),0.)-25.;vec3 color=texture2D(image,vUv).rgb;float gray=dot(color,vec3(.299,.587,.114));vec3 tint=max(vec3(.01,.025,.12),vec3(gray*.7));gl_FragColor=vec4(mix(tint,color,.7+.3*vRatio),1.-smoothstep(-1.,1.,d));}`;
export default function MorphShowcase(){
 const host=useRef(null),canvas=useRef(null);
 useEffect(()=>{
  const el=host.current,source=el.querySelector('.showcase-source'),target=el.querySelector('.showcase-destination'),image=source.querySelector('img');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let renderer;try{renderer=new THREE.WebGLRenderer({canvas:canvas.current,alpha:true,antialias:true});}catch{return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x000000,0);let alive=true,frame,texture,oldW=0,oldH=0,triggered=false,tween;const expansion={value:0};
  const uniforms={fromRect:{value:new THREE.Vector4()},toRect:{value:new THREE.Vector4()},canvasSize:{value:new THREE.Vector2()},ratio:{value:0},image:{value:null}};
  const scene=new THREE.Scene(),camera=new THREE.Camera(),geometry=new THREE.PlaneGeometry(1,1,40,24),material=new THREE.ShaderMaterial({uniforms,vertexShader:vert,fragmentShader:frag,transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide});scene.add(new THREE.Mesh(geometry,material));
  new THREE.TextureLoader().load(image.src,t=>{if(!alive){t.dispose();return;}texture=t;texture.colorSpace=THREE.NoColorSpace;uniforms.image.value=texture;el.classList.add('morph-ready');});
  function draw(){frame=requestAnimationFrame(draw);if(!texture||document.hidden)return;const box=el.getBoundingClientRect(),a=source.getBoundingClientRect(),b=target.getBoundingClientRect();if(box.bottom<0||box.top>innerHeight||!box.width)return;
   if(oldW!==box.width||oldH!==box.height){renderer.setSize(box.width,box.height,false);oldW=box.width;oldH=box.height;}
   if(!triggered&&a.top<=Math.max(110,(innerHeight-b.height)*.5)){triggered=true;el.dataset.expansion='playing';tween=gsap.to(expansion,{value:1,duration:1.6,ease:'lusion',onComplete:()=>{el.dataset.expansion='complete';}});}
   const p=innerWidth<=700?1:clamp(expansion.value);
   uniforms.fromRect.value.set(a.left-box.left,a.top-box.top,a.width,a.height);uniforms.toRect.value.set(b.left-box.left,b.top-box.top,b.width,b.height);uniforms.canvasSize.value.set(box.width,box.height);uniforms.ratio.value=p;
   el.style.setProperty('--expand',p);el.classList.toggle('is-expanded',p>.9);renderer.render(scene,camera);
  }frame=requestAnimationFrame(draw);
  return()=>{alive=false;tween?.kill();cancelAnimationFrame(frame);texture?.dispose();geometry.dispose();material.dispose();renderer.dispose();el.classList.remove('morph-ready');};
 },[]);
 return <div ref={host} className="showcase-track"><div className="intro-copy"><h3>HI, I’m bruce</h3><p>我是李世玉，曾服务于 Herlian 做品牌设计，在百秋尚美和宝尊电子商务做过电商设计师。</p></div><div className="showcase-source"><img src="/figma/302-101.webp" alt="BRUCE’S 作品整理，AI赋能，让设计更简洁、更高效" width="1723" height="812"/></div><canvas ref={canvas} className="morph-canvas" aria-hidden="true"/><a href="#works" className="showcase-destination" aria-label="探索精选作品"><div className="showcase-register top"><span>+</span><span>+</span><span>+</span><span>+</span><span>+</span><div className="reel-marquee"><div>BRUCE’S PORTFOLIO • BRUCE’S PORTFOLIO • BRUCE’S PORTFOLIO • BRUCE’S PORTFOLIO • </div></div></div><img className="showcase-fallback" src="/figma/302-101.webp" alt=""/><div className="showcase-register bottom"><span>+</span><span>+</span><span>+</span><span>+</span><span>+</span><div className="reel-marquee"><div>CREATIVE COLLECTION • CREATIVE COLLECTION • CREATIVE COLLECTION • CREATIVE COLLECTION • </div></div></div></a></div>;
}
