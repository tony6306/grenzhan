import * as THREE from 'three';
import fragmentShader from './flowShader';

const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
export const flowUniforms=()=>({flowTexture:{value:null},flowTexel:{value:new THREE.Vector2(1,1)}});
export const flowGLSL=`uniform sampler2D flowTexture;uniform vec2 flowTexel;
vec2 flowVelocity(vec2 screenUV){vec4 field=texture2D(flowTexture,screenUV);float weight=(field.z+field.w)*0.5;return (0.5-field.xy-0.001)*2.0*weight;}
`;

// Separate low-resolution ping-pong field: pointer movement leaves an advected,
// decaying displacement instead of a static circle attached to the cursor.
export default class PointerFlow{
 constructor(renderer){
  this.renderer=renderer;this.width=0;this.height=0;this.pointer=new THREE.Vector2(-10000,-10000);this.last=this.pointer.clone();this.scroll=scrollY;
  this.targets=[0,1].map(()=>new THREE.WebGLRenderTarget(1,1,{depthBuffer:false}));
  this.low=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false});
  this.geometry=new THREE.PlaneGeometry(2,2);this.camera=new THREE.Camera();this.scene=new THREE.Scene();
  this.uniforms={u_lowPaintTexture:{value:this.low.texture},u_prevPaintTexture:{value:null},u_paintTexelSize:{value:new THREE.Vector2()},u_scrollOffset:{value:new THREE.Vector2()},u_drawFrom:{value:new THREE.Vector4(-10000,-10000,0,0)},u_drawTo:{value:new THREE.Vector4(-10000,-10000,0,0)},u_pushStrength:{value:25},u_dissipations:{value:new THREE.Vector3(.975,.95,.8)},u_vel:{value:new THREE.Vector2()},u_curlScale:{value:.02},u_curlStrength:{value:3}};
  this.material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:this.uniforms,defines:{USE_NOISE:1},depthTest:false,depthWrite:false});
  this.blur=new THREE.ShaderMaterial({vertexShader,fragmentShader:`varying vec2 vUv;uniform sampler2D source;uniform vec2 texel;void main(){vec4 c=texture2D(source,vUv)*4.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){if(x!=0||y!=0)c+=texture2D(source,vUv+vec2(float(x),float(y))*texel*4.);}gl_FragColor=c/12.;}`,uniforms:{source:{value:null},texel:{value:new THREE.Vector2()}},depthTest:false,depthWrite:false});
  this.mesh=new THREE.Mesh(this.geometry,this.material);this.scene.add(this.mesh);
  this.move=e=>this.pointer.set(e.clientX,innerHeight-e.clientY);window.addEventListener('pointermove',this.move);
 }
 update(dt,width=innerWidth,height=innerHeight){
  const r=this.renderer,clear=r.getClearColor(new THREE.Color()),alpha=r.getClearAlpha(),target=r.getRenderTarget();
  const w=Math.max(1,width>>2),h=Math.max(1,height>>2);
  r.setScissorTest(false);
  if(this.width!==width||this.height!==height){
   this.width=width;this.height=height;this.targets.forEach(t=>t.setSize(w,h));this.low.setSize(Math.max(1,w>>1),Math.max(1,h>>1));this.uniforms.u_paintTexelSize.value.set(1/w,1/h);this.blur.uniforms.texel.value.set(1/w,1/h);
   r.setClearColor(new THREE.Color(.5,.5,0),0);[...this.targets,this.low].forEach(t=>{r.setRenderTarget(t);r.clear();});
  }
  const distance=this.pointer.distanceTo(this.last),radius=Math.min(1,distance/100)*Math.max(40,width/20)*h/height,u=this.uniforms;
  u.u_drawFrom.value.copy(u.u_drawTo.value);u.u_drawTo.value.set(this.pointer.x*w/width,this.pointer.y*h/height,radius,1);
  u.u_vel.value.multiplyScalar(.8).add(new THREE.Vector2(u.u_drawTo.value.x-u.u_drawFrom.value.x,u.u_drawTo.value.y-u.u_drawFrom.value.y).multiplyScalar(dt*.8));
  if(this.last.x===-10000){u.u_drawFrom.value.copy(u.u_drawTo.value);u.u_vel.value.set(0,0);}this.last.copy(this.pointer);
  u.u_scrollOffset.value.set(0,(scrollY-this.scroll)/height);this.scroll=scrollY;
  const [previous,next]=this.targets;u.u_prevPaintTexture.value=previous.texture;this.mesh.material=this.material;r.setRenderTarget(next);r.render(this.scene,this.camera);
  this.blur.uniforms.source.value=next.texture;this.mesh.material=this.blur;r.setRenderTarget(this.low);r.render(this.scene,this.camera);
  this.targets.reverse();r.setRenderTarget(target);r.setClearColor(clear,alpha);
  return next.texture;
 }
 dispose(){window.removeEventListener('pointermove',this.move);this.targets.forEach(t=>t.dispose());this.low.dispose();this.geometry.dispose();this.material.dispose();this.blur.dispose();}
}
