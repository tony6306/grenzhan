// PCM playback also works in desktop webviews without an HTML media decoder.
export default class SoundEngine{
 constructor(){this.context=null;this.clips=new Set();}
 clip(url){
  const engine=this;let source=null,gain=null,bufferPromise=null,revision=0;
  const clip={volume:1,loop:false,
   set currentTime(_value){clip.pause();},
   async play(){
    const request=++revision;
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)throw Error('Web Audio unavailable');
    const context=engine.context||(engine.context=new AudioContext());
    await context.resume();
    bufferPromise||=fetch(url).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).then(data=>{
     const view=new DataView(data),channels=view.getUint16(22,true),rate=view.getUint32(24,true),length=view.getUint32(40,true)/2/channels;
     const buffer=context.createBuffer(channels,length,rate);
     for(let c=0;c<channels;c++){const samples=buffer.getChannelData(c);for(let i=0;i<length;i++)samples[i]=view.getInt16(44+(i*channels+c)*2,true)/32768;}
     return buffer;
    });
    const buffer=await bufferPromise;if(request!==revision||source||context.state==='closed')return;
    source=context.createBufferSource();source.buffer=buffer;source.loop=clip.loop;gain=context.createGain();gain.gain.value=clip.volume;source.connect(gain);gain.connect(context.destination);source.onended=()=>{source=null;gain?.disconnect();};source.start();
   },
   pause(){revision++;if(source){source.onended=null;source.stop();source.disconnect();source=null;gain?.disconnect();}}
  };engine.clips.add(clip);return clip;
 }
 dispose(){this.clips.forEach(clip=>clip.pause());this.context?.close();}
}
