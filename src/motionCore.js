export const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
export const mix=(a,b,t)=>a+(b-a)*t;
export const quadInOut=t=>t<.5?2*t*t:1-(-2*t+2)**2/2;
export const expoInOut=t=>t===0||t===1?t:t<.5?2**(20*t-10)/2:(2-2**(-20*t+10))/2;
export const fit=(v,a,b,c=0,d=1,ease=x=>x)=>mix(c,d,ease(clamp((v-a)/(b-a))));
export function readBuffer(buffer){
 const size=new DataView(buffer).getUint32(0,true),header=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,size)));
 let offset=4+size;const result={};
 const constructors={Float32Array,Int16Array,Uint16Array,Uint8Array,Int8Array,Uint32Array,Int32Array};
 for(const attr of header.attributes){const Type=constructors[attr.storageType],count=(attr.id==='indices'?header.indexCount:header.vertexCount)*attr.componentSize;
  const raw=new Type(buffer.slice(offset,offset+count*Type.BYTES_PER_ELEMENT));offset+=raw.byteLength;
  let data=raw;
  if(attr.needsPack){const range=2**(Type.BYTES_PER_ELEMENT*8),bias=attr.storageType.startsWith('Int')?range/2:0;data=Float32Array.from(raw,(value,index)=>{const pack=attr.packedComponents[index%attr.componentSize];return(value+bias)/range*pack.delta+pack.from;});}
  result[attr.id]={array:data,itemSize:attr.componentSize};
 }
 return result;
}
export class Spring{
 constructor(value=0,frequency=2.2,damping=.7,response=3){this.value=value;this.velocity=0;this.previous=value;this.k1=damping/(Math.PI*frequency);this.k2=1/(2*Math.PI*frequency)**2;this.k3=response*damping/(2*Math.PI*frequency);}
 update(target,dt){dt=Math.min(dt,.05);if(dt<=0)return this.value;const velocity=(target-this.previous)/dt;this.previous=target;const k2=Math.max(this.k2,dt*dt/2+dt*this.k1/2,dt*this.k1);this.velocity+=(target+this.k3*velocity-this.value-this.k1*this.velocity)*dt/k2;this.value+=this.velocity*dt;return this.value;}
}
