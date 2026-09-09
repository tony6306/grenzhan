import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
import {readBuffer,fit} from './motionCore';
import PointerFlow,{flowGLSL,flowUniforms} from './PointerFlow';

const COLORS=['#061dfb','#adff00','#f6000e','#7e09f5','#ffc000'];
const backOut=t=>1+2.70158*(t-1)**3+1.70158*(t-1)**2;
export default function Sculpture({ready,onLoaded,onInteract}){
 const host=useRef(null),callbacks=useRef({onLoaded,onInteract});callbacks.current={onLoaded,onInteract,ready};
 useEffect(()=>{
  const container=host.current;let renderer,disposed=false,frame=0,geometry,matcap,startedAt=0,previous=performance.now();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{callbacks.current.onLoaded?.();return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#141515');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;container.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(18,1,.1,120),materials=[],bodies=[];
  const background=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearMipmapLinearFilter,generateMipmaps:true});
  const finalScene=new THREE.WebGLRenderTarget(1,1),flow=new PointerFlow(renderer),postScene=new THREE.Scene(),postCamera=new THREE.Camera(),postGeometry=new THREE.PlaneGeometry(2,2);
  const postUniforms={...flowUniforms(),source:{value:finalScene.texture},heroRect:{value:new THREE.Vector4()},screenSize:{value:new THREE.Vector2()}};
  const postMaterial=new THREE.ShaderMaterial({uniforms:postUniforms,depthTest:false,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`varying vec2 vUv;uniform sampler2D source;uniform vec4 heroRect;uniform vec2 screenSize;${flowGLSL}
   void main(){vec2 vel=flowVelocity((heroRect.xy+vUv*heroRect.zw)/screenSize);vec2 stepUV=vel*3.75*flowTexel*screenSize/heroRect.zw;vec4 color=vec4(0.);for(int i=0;i<9;i++)color+=texture2D(source,clamp(vUv+stepUV*float(i),.001,.999));gl_FragColor=color/9.;
   #include <colorspace_fragment>
   }`});postScene.add(new THREE.Mesh(postGeometry,postMaterial));
  camera.position.z=17.5;
  let colorIndex=0,active=true,inside=false,mouseInitialized=false;const pointer=new THREE.Vector2(20,20),mouse=new THREE.Vector3(),lastMouse=new THREE.Vector3(),mouseVelocity=new THREE.Vector3(),ray=new THREE.Raycaster();
  const delta=new THREE.Vector3(),normal=new THREE.Vector3(),closest=new THREE.Vector3(),axis=new THREE.Vector3(),turn=new THREE.Quaternion();
  let seed=25;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function build(){
   for(let i=0;i<24;i++){
    const n=i%11,glass=i>21,colored=glass?i===23:n<3,rough=![2,6,10].includes(n);
    const material=new THREE.MeshMatcapMaterial({matcap,color:colored?COLORS[0]:n<7?'#eee':'#111'});
    material.customProgramCacheKey=()=>rough?'rough':'gloss';
    material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float ao;varying float vAO;').replace('#include <begin_vertex>','#include <begin_vertex>\nvAO=ao;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vAO;').replace('vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;',`vec3 outgoingLight = (diffuseColor.rgb * (0.25 + 0.75 * matcapColor.r) + vec3(matcapColor.${rough?'g':'b'}) * 0.65) * mix(0.42,1.0,vAO);`);};
    if(glass){
     material.color.set(colored?COLORS[0]:'#eeeeee');if(colored)material.color.offsetHSL(0,0,.3);
     material.customProgramCacheKey=()=> 'frosted-refraction';
     const baseCompile=material.onBeforeCompile;
     material.onBeforeCompile=shader=>{
      baseCompile(shader);shader.uniforms.uScene={value:background.texture};
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 SN; attribute float thickness; varying vec3 vSmoothNormal; varying float vThickness;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSmoothNormal=normalMatrix*SN;vThickness=thickness;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uScene;uniform mat4 projectionMatrix;varying vec3 vSmoothNormal;varying float vThickness;').replace('#include <opaque_fragment>',`vec3 smoothNormal=normalize(vSmoothNormal);
       vec3 refracted=refract(-normalize(vViewPosition),smoothNormal,1.0/2.4);
       vec4 projected=projectionMatrix*vec4(-vViewPosition+refracted*0.3,1.0);
       vec2 refractedUV=projected.xy/projected.w*0.5+0.5;
       vec3 blurred=textureLod(uScene,clamp(refractedUV,0.001,0.999),2.5+vThickness).rgb;
       vec3 albedo=blurred*(0.75+diffuseColor.rgb*0.4);
       albedo=albedo*0.8+(0.125+0.2*vAO)*diffuseColor.rgb;
       float fresnel=(1.0-clamp(abs(dot(smoothNormal,normalize(vViewPosition))),0.001,1.0))*(1.0-vThickness);
       outgoingLight=(albedo+0.15*(0.25+0.75*matcapColor.r)+fresnel*albedo*0.5)*(vAO*0.75+0.25);
       #include <opaque_fragment>`);
     };
    }
    const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);materials.push(material);
    const position=new THREE.Vector3((random()-.5)*12,(random()-.5)*12,glass?7+random():(random()-.5)*6);
    const radius=1.05,mass=Math.PI*radius*4/3*radius*radius;
    mesh.position.copy(position);bodies.push({mesh,position,velocity:position.clone().multiplyScalar(-2),mass,radius,inertia:mass*radius*radius*.4,friction:0,colored,rough,glass});
   }
   callbacks.current.onLoaded?.();
  }
  Promise.all([fetch('/motion/cross.buf').then(r=>{if(!r.ok)throw Error('Model unavailable');return r.arrayBuffer();}),new EXRLoader().loadAsync('/motion/matcap.exr')]).then(([buffer,texture])=>{
   if(disposed){texture.dispose();return;}matcap=texture;matcap.minFilter=THREE.LinearFilter;matcap.magFilter=THREE.LinearFilter;
   geometry=new THREE.BufferGeometry();for(const [key,value] of Object.entries(readBuffer(buffer))){if(key==='indices')geometry.setIndex(new THREE.BufferAttribute(value.array,1));else geometry.setAttribute(key,new THREE.BufferAttribute(value.array,value.itemSize));}build();
  }).catch(()=>{if(!disposed){container.classList.add('scene-unavailable');callbacks.current.onLoaded?.();}});
  const resize=()=>{const r=container.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);background.setSize(Math.round(r.width),Math.round(r.height));finalScene.setSize(Math.round(r.width*renderer.getPixelRatio()),Math.round(r.height*renderer.getPixelRatio()));camera.aspect=r.width/r.height;camera.fov=fit(camera.aspect,2.2,2/3,18,30);camera.updateProjectionMatrix();};
  const ro=new ResizeObserver(resize);ro.observe(container);resize();
  const io=new IntersectionObserver(([entry])=>{active=entry.isIntersecting;});io.observe(container);
  const move=e=>{const r=container.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);inside=true;};
  const leave=()=>{inside=false;mouseInitialized=false;pointer.set(20,20);};
  let glassDark=false;
  const impulse=()=>{colorIndex=(colorIndex+1)%COLORS.length;glassDark=!glassDark;for(const b of bodies){if(b.colored){b.mesh.material.color.set(COLORS[colorIndex]);if(b.glass)b.mesh.material.color.offsetHSL(0,0,.3);}else if(b.glass)b.mesh.material.color.set(glassDark?'#888888':'#eeeeee');b.velocity.negate().addScaledVector(b.position,-10/b.mass);b.velocity.add(new THREE.Vector3(random()-.5,random()-.5,random()-.5).multiplyScalar(80/b.mass));}callbacks.current.onInteract?.();};
  const key=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();impulse();}};
  container.addEventListener('pointermove',move);container.addEventListener('pointerleave',leave);container.addEventListener('click',impulse);container.addEventListener('keydown',key);
  const visibility=()=>{previous=performance.now();};document.addEventListener('visibilitychange',visibility);
  function step(dt){
   ray.setFromCamera(pointer,camera);ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),0),mouse);if(inside&&!mouseInitialized){lastMouse.copy(mouse);mouseInitialized=true;}mouseVelocity.copy(mouse).sub(lastMouse).multiplyScalar(.12/dt);lastMouse.copy(mouse);
   for(let i=0;i<bodies.length;i++){
    const b=bodies[i];b.velocity.addScaledVector(b.position,-40*dt/b.mass/(1+b.friction));b.friction*=.5;
    for(let j=i+1;j<bodies.length;j++){
     const other=bodies[j];delta.copy(b.position).sub(other.position);const distance=delta.length(),minimum=b.radius+other.radius;if(distance>=minimum||distance<.0001)continue;
     normal.copy(delta).divideScalar(distance);b.position.addScaledVector(normal,(minimum-distance)*.5);other.position.addScaledVector(normal,-(minimum-distance)*.5);b.friction+=2;other.friction+=2;
     const va=b.velocity.dot(normal),vb=other.velocity.dot(normal),total=b.mass+other.mass;
     b.velocity.addScaledVector(normal,((b.mass*va+other.mass*vb-other.mass*(va-vb)*.8)/total-va)/3);
     other.velocity.addScaledVector(normal,((b.mass*va+other.mass*vb-b.mass*(vb-va)*.8)/total-vb)/3);
    }
    if(inside){ray.ray.closestPointToPoint(b.position,closest);delta.copy(b.position).sub(closest);const distance=delta.length(),penetration=b.radius+.025-distance;if(penetration>0){delta.normalize();b.position.addScaledVector(delta,penetration*.1);b.velocity.addScaledVector(delta,penetration*.1*.12/dt);b.velocity.add(mouseVelocity);}}
    const distance=b.position.length();axis.set(1,1,1).normalize();const angle=(1-Math.abs(axis.dot(normal.copy(b.position).normalize())))*dt*fit(distance,0,2)*.5*(i%2?1:-1);turn.setFromAxisAngle(axis,angle);delta.copy(b.position).applyQuaternion(turn).sub(b.position);b.velocity.add(delta);
    axis.copy(b.position).cross(b.velocity);const speed=axis.length()/b.inertia;if(speed>.00001){axis.normalize();turn.setFromAxisAngle(axis,speed*dt);b.mesh.quaternion.premultiply(turn);}
    b.position.addScaledVector(b.velocity,dt);b.velocity.multiplyScalar(.2**dt);b.mesh.position.copy(b.position);
   }
  }
  function animate(now){frame=requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.05);previous=now;if(disposed||!active||document.hidden||!bodies.length)return;
   if(!startedAt&&callbacks.current.ready)startedAt=now;
   const time=startedAt?(now-startedAt)/1000:0;
   camera.position.z=reduced?17.5:fit(time,.3,2,25,17.5,backOut);
   const baseFov=fit(camera.aspect,2.2,2/3,18,30),fovOffset=reduced?0:fit(time,.3,3,100,0,backOut);
   const fov=Math.max(8,baseFov+fovOffset);camera.fov=fov;camera.position.z*=Math.tan(THREE.MathUtils.degToRad(baseFov/2))/Math.tan(THREE.MathUtils.degToRad(fov/2));camera.updateProjectionMatrix();camera.updateMatrixWorld();
   if(!reduced||time<1)step(Math.max(.001,dt));
   bodies.forEach(b=>{if(b.glass)b.mesh.visible=false;});renderer.setRenderTarget(background);renderer.render(scene,camera);
   bodies.forEach(b=>{if(b.glass)b.mesh.visible=true;});renderer.setRenderTarget(finalScene);renderer.render(scene,camera);
   postUniforms.flowTexture.value=flow.update(dt);postUniforms.flowTexel.value.copy(flow.uniforms.u_paintTexelSize.value);
   const rect=container.getBoundingClientRect();postUniforms.heroRect.value.set(rect.left,innerHeight-rect.bottom,rect.width,rect.height);postUniforms.screenSize.value.set(innerWidth,innerHeight);
   renderer.setRenderTarget(null);renderer.setViewport(0,0,rect.width,rect.height);renderer.render(postScene,postCamera);
  }frame=requestAnimationFrame(animate);
  return()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',visibility);container.removeEventListener('pointermove',move);container.removeEventListener('pointerleave',leave);container.removeEventListener('click',impulse);container.removeEventListener('keydown',key);geometry?.dispose();matcap?.dispose();background.dispose();finalScene.dispose();flow.dispose();postGeometry.dispose();postMaterial.dispose();materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={host} className="sculpture" role="button" tabIndex={0} aria-label="互动三维雕塑，移动鼠标推动，点击切换配色"><div className="scene-fallback">BRUCE’S<br/>CREATIVE WORLD</div></div>;
}
