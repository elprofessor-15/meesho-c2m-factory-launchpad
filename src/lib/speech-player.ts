import {matchingVoice,speechRetryAt,waitForVoices} from './speech-client';
import {cleanSpeech} from './stream';
type Prepared={kind:'device';voice:SpeechSynthesisVoice}|{kind:'cloud';blob:Blob}|{kind:'silent'};
type Job={text:string;prepared?:Promise<Prepared>};
export class SpeechPlayer {
 private jobs:Job[]=[];private running=false;private generation=0;private abort=new AbortController();private audio:HTMLAudioElement|null=null;private url='';private settle:(()=>void)|null=null;private language='en';private mode='fast';private ended=false;private retryAt=0;private voices:Promise<SpeechSynthesisVoice[]>;
 constructor(private callbacks:{status:(speaking:boolean)=>void;notice:(message:string)=>void;started:()=>void}){this.voices=window.speechSynthesis?waitForVoices(window.speechSynthesis):Promise.resolve([]);}
 start(language:string,mode:string){this.stop();this.language=language;this.mode=mode;this.ended=false;this.callbacks.notice('');}
 enqueue(text:string){text=cleanSpeech(text);if(!text)return;const job:Job={text};this.jobs.push(job);if(this.running&&this.jobs.length===1)job.prepared=this.prepare(job.text,this.generation);void this.pump();}
 finish(){this.ended=true;if(!this.running&&!this.jobs.length)this.callbacks.status(false);}
 stop(){this.generation++;this.abort.abort();this.abort=new AbortController();this.jobs=[];this.running=false;this.settle?.();this.settle=null;this.audio?.pause();this.audio=null;window.speechSynthesis?.cancel();if(this.url)URL.revokeObjectURL(this.url);this.url='';this.callbacks.status(false);}
 private async device():Promise<Prepared>{if(!window.speechSynthesis)return{kind:'silent'};const available=window.speechSynthesis.getVoices();const voices=available.length?available:await this.voices;const voice=matchingVoice(voices,this.language);return voice?{kind:'device',voice}:{kind:'silent'};}
 private async prepare(text:string,generation:number):Promise<Prepared>{
  const signal=this.abort.signal;
  if(this.mode==='fast'){const source=await this.device();if(generation!==this.generation)return{kind:'silent'};if(source.kind==='device')return source;}
  if(Date.now()<this.retryAt){this.callbacks.notice('Using device speech while the voice connection recovers.');return this.device();}
  try{
   const response=await fetch('/api/tts',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.slice(0,600),language:this.language})});
   if(generation!==this.generation)return{kind:'silent'};
   if(response.ok){const blob=await response.blob();if(!blob.size)throw new Error('Empty audio');return{kind:'cloud',blob};}
   this.retryAt=speechRetryAt(response.status,response.headers.get('Retry-After'));
   const data=await response.json();if(data.browserFallback===false)return{kind:'silent'};
   this.callbacks.notice(response.status===429?'Cloud speech has reached its allowance. Using a matching device voice.':'Cloud speech is unavailable. Trying a matching device voice.');
  }catch{if(signal.aborted)return{kind:'silent'};this.callbacks.notice('The voice connection is unavailable. Trying device speech.');}
  return this.device();
 }
 private async play(source:Prepared,text:string,generation:number):Promise<void>{
  if(generation!==this.generation)return;
  if(source.kind==='silent'){this.callbacks.notice('No matching voice is available here. Your text answer is ready.');return;}
  this.callbacks.status(true);
  if(source.kind==='device'){
   await new Promise<void>(resolve=>{this.settle=resolve;const utterance=new SpeechSynthesisUtterance(text);utterance.voice=source.voice;utterance.lang=source.voice.lang;utterance.rate=1.03;utterance.onstart=()=>{if(generation===this.generation)this.callbacks.started();};utterance.onend=()=>resolve();utterance.onerror=()=>{if(generation===this.generation)this.callbacks.notice('Device speech could not play. Your text answer is ready.');resolve();};window.speechSynthesis.speak(utterance);});return;
  }
  this.url=URL.createObjectURL(source.blob);const audio=new Audio(this.url);this.audio=audio;
  try{
   await new Promise<void>((resolve,reject)=>{this.settle=resolve;audio.onended=()=>resolve();audio.onerror=()=>reject(new Error('Audio playback failed'));audio.play().then(()=>{if(generation===this.generation)this.callbacks.started();},reject);});
  }catch{if(generation===this.generation){this.callbacks.notice('Cloud audio could not play. Trying device speech.');await this.play(await this.device(),text,generation);}}
  finally{if(generation===this.generation){URL.revokeObjectURL(this.url);this.url='';}}
 }
 private async pump(){
  if(this.running||!this.jobs.length)return;this.running=true;const generation=this.generation;
  try{while(this.jobs.length&&generation===this.generation){const job=this.jobs.shift()!;const source=await(job.prepared??this.prepare(job.text,generation));if(generation!==this.generation)break;if(this.jobs[0]&&!this.jobs[0].prepared)this.jobs[0].prepared=this.prepare(this.jobs[0].text,generation);await this.play(source,job.text,generation);}}
  finally{if(generation===this.generation){this.running=false;this.settle=null;if(this.ended)this.callbacks.status(false);}}
 }
}
