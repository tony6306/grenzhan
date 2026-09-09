import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import PointerFlow from './PointerFlow';

export default function PageFlow(){
 const ref=useRef(null);
 useEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches)return;
  let renderer;try{renderer=new THREE.WebGLRenderer({canvas:ref.current,alpha:true,powerPreference:'low-power'});}catch{return;}
  renderer.setPixelRatio(1);renderer.setClearColor(0,0);
  const flow=new PointerFlow(renderer),scene=new THREE.Scene(),camera=new THREE.Camera(),geometry=new THREE.PlaneGeometry(2,2);
  const uniforms={field:{value:null}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthTest:false,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`varying vec2 vUv;uniform sampler2D field;void main(){vec4 data=texture2D(field,vUv);float weight=(data.z+data.w)*.5;vec2 velocity=(.5-data.xy-.001)*2.*weight;float strength=max(abs(velocity.x),abs(velocity.y));vec3 tint=.5+.5*sin(vec3(velocity.x+velocity.y)*40.+vec3(0.,2.,4.)*.5);float alpha=clamp(weight*(.12+strength*3.),0.,.26);gl_FragColor=vec4(mix(vec3(.20,.24,.95),tint,.55),alpha);}`});
  scene.add(new THREE.Mesh(geometry,material));let frame,last=performance.now(),width=0,height=0;
  let lastInput=performance.now(),cleared=false;const wake=()=>{lastInput=performance.now();};window.addEventListener('pointermove',wake,{passive:true});window.addEventListener('scroll',wake,{passive:true});
  function draw(now){frame=requestAnimationFrame(draw);const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)return;if(now-lastInput>2000||document.querySelector('dialog[open]')){if(!cleared){renderer.setRenderTarget(null);renderer.clear();cleared=true;}return;}cleared=false;if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;renderer.setSize(width,height,false);}uniforms.field.value=flow.update(dt);renderer.setRenderTarget(null);renderer.setViewport(0,0,width,height);renderer.clear();if(!document.querySelector('dialog[open]'))renderer.render(scene,camera);}
  frame=requestAnimationFrame(draw);return()=>{window.removeEventListener('pointermove',wake);window.removeEventListener('scroll',wake);cancelAnimationFrame(frame);flow.dispose();geometry.dispose();material.dispose();renderer.dispose();};
 },[]);
 return <canvas ref={ref} className="page-flow" aria-hidden="true"/>;
}
