import {beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
vi.mock('next/server',async original=>({...await original<typeof import('next/server')>(),after:(callback:()=>Promise<void>)=>{void callback();}}));
import {AppQuotaError,QuotaStorageError} from '../src/lib/server/quota-policy';
const mocks=vi.hoisted(()=>({quota:vi.fn(),transcribe:vi.fn(),speak:vi.fn(),subscription:vi.fn(),usage:vi.fn(),assistant:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/server/repository',()=>({session:async()=>({id:'test'}),read:vi.fn(),mutate:vi.fn(),log:vi.fn(),quota:mocks.quota,quotaRetryAfterSeconds:()=>120}));
vi.mock('@/lib/server/env',()=>({configuration:()=>({stt:['groq','elevenlabs'],tts:['gemini','elevenlabs','browser']}),env:()=>({ENABLE_ELEVENLABS_FREE_TIER:'true'})}));
vi.mock('@/lib/assistant/orchestrator',()=>({assistant:mocks.assistant,recordUsages:mocks.usage}));
vi.mock('@/lib/providers/ai',()=>({transcribe:mocks.transcribe,speak:mocks.speak,elevenLabsSubscription:mocks.subscription,ProviderError:class extends Error{constructor(public status:number,public retryAfter:string|null=null){super('Provider unavailable');}}}));
import {POST} from '../src/app/api/[...path]/route';
beforeEach(()=>{vi.resetAllMocks();mocks.quota.mockResolvedValue(undefined);mocks.usage.mockResolvedValue(undefined);mocks.subscription.mockResolvedValue({tier:'free',status:'free',max_credit_limit_extension:0});});
function tts(){return new NextRequest('http://localhost/api/tts',{method:'POST',body:JSON.stringify({text:'नमस्ते',language:'hi'}),headers:{'Content-Type':'application/json'}});}
it('tries ElevenLabs when Groq transcription fails',async()=>{
 mocks.transcribe.mockRejectedValueOnce(new Error('Rate limited')).mockResolvedValueOnce({text:'नमस्ते',seconds:2,language:'hin',model:'scribe_v2'});
 const form=new FormData();form.append('audio',new File(['audio'],'recording.webm',{type:'audio/webm'}));form.append('duration','2');
 const r=await POST(new NextRequest('http://localhost/api/stt',{method:'POST',body:form}));expect(r.status).toBe(200);expect((await r.json()).provider).toBe('elevenlabs');expect(mocks.transcribe.mock.calls.map(c=>c[0])).toEqual(['groq','elevenlabs']);
});
it('tries ElevenLabs speech after Gemini fails',async()=>{
 mocks.speak.mockRejectedValueOnce(new Error('Gemini unavailable')).mockResolvedValueOnce({bytes:Buffer.from('audio'),mime:'audio/mpeg',model:'eleven_multilingual_v2'});
 const r=await POST(tts());expect(r.status).toBe(200);expect(r.headers.get('X-Speech-Provider')).toBe('elevenlabs');expect(mocks.speak.mock.calls.map(c=>c[0])).toEqual(['gemini','elevenlabs']);
});
it('offers device speech when both cloud providers fail',async()=>{mocks.speak.mockRejectedValue(new Error('Unavailable'));const r=await POST(tts());expect(r.status).toBe(503);expect((await r.json()).browserFallback).toBe(true);});
it('labels broken quota storage as unavailable, not exhausted',async()=>{mocks.quota.mockRejectedValue(new QuotaStorageError());const r=await POST(tts());expect(r.status).toBe(503);expect(await r.json()).toMatchObject({code:'QUOTA_STORAGE_UNAVAILABLE',browserFallback:true});expect(mocks.speak).not.toHaveBeenCalled();});
it('offers device speech and Retry-After on genuine app exhaustion',async()=>{mocks.quota.mockRejectedValue(new AppQuotaError('tts'));const r=await POST(tts());expect(r.status).toBe(429);expect(r.headers.get('Retry-After')).toBe('120');expect((await r.json()).browserFallback).toBe(true);expect(mocks.speak).not.toHaveBeenCalled();});

it('sends early text before the assistant finishes its work',async()=>{
 let finish!:()=>void;const gate=new Promise<void>(resolve=>finish=resolve);
 const reply={text:'Four orders.',spoken:'Four orders.',provider:'Workspace',language:'en'};
 mocks.assistant.mockImplementation(async(_session,_message,_language,options)=>{options.onEvent({type:'text',text:reply.text});await gate;return reply;});
 const r=await POST(new NextRequest('http://localhost/api/assistant',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify({message:'Orders today?'})}));expect(r.headers.get('Content-Type')).toContain('application/x-ndjson');
 const reader=r.body!.getReader();const first=await reader.read();expect(new TextDecoder().decode(first.value)).toContain('Four orders.');finish();const next=await reader.read();expect(new TextDecoder().decode(next.value)).toContain('"type":"done"');await reader.cancel();
});
