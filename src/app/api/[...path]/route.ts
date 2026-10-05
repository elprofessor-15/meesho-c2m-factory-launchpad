import {operatingPlan} from '@/lib/launch';
import {NextRequest,NextResponse,after} from 'next/server';
import {z} from 'zod';
import {session,read,mutate,log,quota,quotaRetryAfterSeconds} from '@/lib/server/repository';
import {configuration,env} from '@/lib/server/env';
import {prepare,confirm} from '@/lib/assistant/actions';
import {assistant,recordUsages,AssistantEvent} from '@/lib/assistant/orchestrator';
import {transcribe,speak,elevenLabsSubscription,ProviderError} from '@/lib/providers/ai';
import {assertFreeElevenLabsAccount} from '@/lib/providers/elevenlabs-free';
import {AppQuotaError,QuotaStorageError,speechQuotaSeconds} from '@/lib/server/quota-policy';
import {seed} from '@/lib/fixtures';
import {Usage} from '@/lib/types';
export const runtime='nodejs';export const maxDuration=60;
export async function GET(req:NextRequest){try{const s=await session();if(req.nextUrl.pathname.endsWith('/config'))return NextResponse.json(configuration());return NextResponse.json(await read(s),{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e,req.nextUrl.pathname.endsWith('/tts')&&process.env.TTS_BROWSER_FALLBACK!=='false');}}
function failure(e:unknown,browserFallback=false){
 const message=e instanceof z.ZodError?'Please check the entered values.':e instanceof Error?e.message:'Request failed';
 const retryAfter=e instanceof AppQuotaError?String(quotaRetryAfterSeconds()):e instanceof ProviderError?e.retryAfter:null;
 const status=e instanceof AppQuotaError?429:e instanceof QuotaStorageError?503:e instanceof ProviderError?e.status:e instanceof z.ZodError?400:/changed|concurrent/i.test(message)?409:400;
 return NextResponse.json({error:message,...(e instanceof AppQuotaError||e instanceof QuotaStorageError?{code:e.code}:{}),...(browserFallback?{browserFallback:true}:{})},{status,...(retryAfter?{headers:{'Retry-After':retryAfter}}:{})});
}
export async function POST(req:NextRequest){try{
 const origin=req.headers.get('origin');
 if(origin){
  let parsedOrigin:URL;
  try{parsedOrigin=new URL(origin);}catch{throw new Error('Origin not allowed');}
  const trustedHost=(req.headers.get('x-forwarded-host')??req.headers.get('host')??'').split(',')[0].trim();
  const trustedProtocol=(req.headers.get('x-forwarded-proto')??req.nextUrl.protocol.replace(':','')).split(',')[0].trim();
  if(!trustedHost||parsedOrigin.host!==trustedHost||parsedOrigin.protocol!==`${trustedProtocol}:`)throw new Error('Origin not allowed');
 }
 const s=await session();const path=req.nextUrl.pathname.split('/').at(-1)!;
 if(path==='stt'){
  if(Number(req.headers.get('content-length')??0)>3100000)throw new Error('Audio must be under 3 MB.');
  const form=await req.formData(),file=form.get('audio'),duration=Number(form.get('duration'));
  if(!(file instanceof File)||!file.size||file.size>3000000||!/^audio\/(webm|mp4|mpeg|wav|ogg|x-wav)(;.*)?$/.test(file.type))throw new Error('Use a supported recording under 3 MB.');
  if(!Number.isFinite(duration)||duration<=0||duration>46)throw new Error('Recording must be 45 seconds or less.');
  const reserved=speechQuotaSeconds(duration);await quota(s,'stt',reserved);
  const usage:Partial<Usage>[]=[];after(()=>recordUsages(s,usage));
  for(const provider of configuration().stt){const started=Date.now();try{
   if(provider==='elevenlabs'&&env().ENABLE_ELEVENLABS_FREE_TIER==='true')assertFreeElevenLabsAccount(await elevenLabsSubscription());
   const result=await transcribe(provider,file);if(result.seconds>46)throw new Error('Audio exceeds 45 seconds');if(!result.text?.trim())throw new Error('No speech detected.');
   const actual=speechQuotaSeconds(duration,result.seconds||duration);if(actual>reserved)await quota(s,'stt',actual-reserved);
   usage.push({provider,model:result.model,kind:'stt',seconds:result.seconds||duration,latency:Date.now()-started});return NextResponse.json({text:result.text,provider,language:result.language});
  }catch(error){if(error instanceof AppQuotaError||error instanceof QuotaStorageError)throw error;usage.push({provider,kind:'stt',latency:Date.now()-started,error:error instanceof Error?error.message:'Transcription failed'});}}
  return NextResponse.json({error:'Transcription is unavailable. Try again shortly, or type your message.'},{status:503,headers:{'Retry-After':'60'}});
 }
 const b=await req.json();
 if(path==='tts'){
  const {text,language}=z.object({text:z.string().trim().min(1).max(600),language:z.string().max(30).default('en')}).parse(b);await quota(s,'tts');
  const usage:Partial<Usage>[]=[];after(()=>recordUsages(s,usage));
  for(const provider of configuration().tts.filter(p=>p!=='browser')){const started=Date.now();try{
   const audio=await speak(provider,text,language);if(!audio.bytes.length)throw new Error('No audio received');usage.push({provider,model:audio.model,kind:'tts',characters:text.length,latency:Date.now()-started});
   return new Response(new Uint8Array(audio.bytes),{headers:{'Content-Type':audio.mime,'X-Speech-Provider':provider,'Cache-Control':'no-store'}});
  }catch(error){usage.push({provider,kind:'tts',characters:text.length,latency:Date.now()-started,error:error instanceof Error?error.message:'Speech failed'});}}
  return NextResponse.json({browserFallback:process.env.TTS_BROWSER_FALLBACK!=='false',error:'Cloud speech is unavailable. Your text answer is ready.'},{status:503,headers:{'Retry-After':'60'}});
 }
 if(path==='assistant'){const x=z.object({message:z.string().min(1).max(2000),language:z.string().max(30).default('en')}).parse(b);if(!req.headers.get('accept')?.includes('application/x-ndjson'))return NextResponse.json(await assistant(s,x.message,x.language));
  const controller=new AbortController(),signal=AbortSignal.any([req.signal,controller.signal]);const encoder=new TextEncoder();
  const stream=new ReadableStream<Uint8Array>({async start(output){const emit=(event:AssistantEvent)=>{if(!signal.aborted)output.enqueue(encoder.encode(JSON.stringify(event)+'\n'));};try{const reply=await assistant(s,x.message,x.language,{onEvent:emit,signal});emit({type:'done',reply});}catch(error){emit({type:'error',error:error instanceof Error?error.message:'The connection was interrupted. Please try again.'});}finally{if(!signal.aborted)output.close();}},cancel(){controller.abort();}});
  return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'}});}
 if(path==='prepare')return NextResponse.json(await mutate(s,st=>prepare(st,s.id,b)));
 if(path==='confirm'){const {id}=z.object({id:z.string().uuid()}).parse(b);return NextResponse.json({message:await mutate(s,st=>confirm(st,s.id,id))});}
 if(path==='cancel'){const result=await mutate(s,st=>{const a=st.actions.find(a=>a.id===b.id&&a.user===s.id);if(!a)throw new Error('Action not found');if(a.status==='pending')a.status='cancelled';return{status:a.status,message:a.status==='done'?a.result:'Update cancelled. No changes were made.'};});return NextResponse.json(result);}
 if(path==='operating-plan'){const x=z.object({version:z.number().int(),contact:z.string().min(2).max(100),packingOwner:z.string().max(100),packingCapacity:z.number().int().min(0).max(10000),minutesPerParcel:z.number().min(.1).max(120),ownerMinutes:z.number().int().min(0).max(1440),catalogueChecked:z.boolean(),packingChecked:z.boolean(),pickupChecked:z.boolean(),firstOrderChecked:z.boolean(),firstPayoutChecked:z.boolean(),independent:z.boolean(),seasonalConstraint:z.string().max(300)}).parse(b);await mutate(s,st=>{if(operatingPlan(st).version!==x.version)throw new Error('Operating plan changed. Refresh first.');st.operatingPlan={...x,version:x.version+1};log(st,'Operating ownership and activation checklist updated');});}
 else if(path==='work-session'){const x=z.object({ownerMinutes:z.number().int().min(0).max(1440),workerMinutes:z.number().int().min(0).max(10000),errors:z.number().int().min(0).max(10000),note:z.string().min(3).max(500)}).parse(b);await mutate(s,st=>{st.workSessions??=[];st.workSessions.unshift({...x,id:crypto.randomUUID(),date:st.date});log(st,'Daily operating workload recorded');});}
 else if(path==='onboarding'){const x=z.object({step:z.number().int().min(0).max(6),fields:z.record(z.string(),z.string().max(300000))}).parse(b);await mutate(s,st=>{st.onboarding={...st.onboarding,...x.fields};st.step=x.step;log(st,'Onboarding progress saved');});}
 else if(path==='catalogue'){const x=z.object({id:z.string(),version:z.number(),name:z.string().min(3).max(100),variant:z.string().min(2).max(100),description:z.string().min(5).max(500),status:z.enum(['Active','Draft'])}).parse(b);await mutate(s,st=>{const p=st.products.find(p=>p.id===x.id&&p.manufacturerId===st.manufacturerId);if(!p||p.version!==x.version)throw new Error('Product changed. Refresh.');Object.assign(p,x,{version:p.version+1});log(st,'Catalogue updated: '+p.name);});}
 else if(path==='support'){if(env().DEMO_MODE!=='true')throw new Error('Operations updates require production role authorization; demo operations disabled.');const x=z.object({id:z.string(),version:z.number(),status:z.enum(['Requested','Assigned','In progress','Resolved']),owner:z.string().min(2).max(100),notes:z.string().max(1000),minutes:z.number().int().nonnegative().max(10000)}).parse(b);if(x.status==='Resolved'&&!x.notes.trim())throw new Error('Add an outcome note before resolving.');await mutate(s,st=>{const r=st.support.find(r=>r.id===x.id);if(!r||r.version!==x.version)throw new Error('Request changed. Refresh.');Object.assign(r,x,{version:r.version+1});log(st,`Support ${r.id}: ${r.status}`);});}
 else if(path==='scenario'){const x=z.object({name:z.string().min(2).max(100),sku:z.string(),inputs:z.object({price:z.number().positive(),stock:z.number().int().nonnegative(),capacity:z.number().int().nonnegative(),lead:z.number().int().min(1).max(30),batch:z.number().int().positive(),cash:z.number().nonnegative(),exposure:z.number().min(1).max(5000)})}).parse(b);await mutate(s,st=>{if(!st.products.some(p=>p.id===x.sku&&p.manufacturerId===st.manufacturerId))throw new Error('Product not found');st.scenarios.unshift({...x,id:crypto.randomUUID(),at:new Date().toISOString()});st.scenarios=st.scenarios.slice(0,30);log(st,'Demand scenario saved: '+x.name);});}
 else if(path==='demo-scenario'){if(env().DEMO_MODE!=='true')throw new Error('Demo controls disabled');const x=z.enum(['Low exposure','Weak conversion','Stock constraint','Successful launch','Missing economics']).parse(b.scenario);await mutate(s,st=>{const clean=seed(st.date);st.observations=clean.observations;st.products=clean.products;for(const p of st.products.filter(p=>p.manufacturerId===st.manufacturerId)){if(x==='Stock constraint')p.stock=p.reserved;if(x==='Successful launch'){p.stock=180;p.capacity=200;}if(x==='Missing economics')p.reverse=null;for(const o of st.observations.filter(o=>o.sku===p.id)){if(x==='Low exposure'){o.visits=Math.round(o.visits*.05);o.purchases=Math.min(o.visits,Math.round(o.purchases*.05));o.units=Math.round(o.units*.05);}if(x==='Weak conversion'){o.purchases=1;o.units=1;}}}log(st,'Demo inputs changed: '+x);});}
 else if(path==='reset'){if(env().DEMO_MODE!=='true')throw new Error('Reset disabled');await mutate(s,st=>{const next=seed(st.date);Object.assign(st,next,{version:st.version,quota:st.quota,usage:st.usage});});}
 else throw new Error('Unknown endpoint');return NextResponse.json({ok:true});
 }catch(e){return failure(e,req.nextUrl.pathname.endsWith('/tts')&&process.env.TTS_BROWSER_FALLBACK!=='false');}}
