import {describe,it,expect} from 'vitest';
import {AppQuotaError,QuotaStorageError,validateQuotaResult} from '../src/lib/server/quota-policy';
import {matchingVoice,speechRetryAt} from '../src/lib/speech-client';
import {assertFreeElevenLabsCharacters} from '../src/lib/providers/elevenlabs-free';

describe('quota failure classification',()=>{
 it('does not report a broken SQL function as exhausted provider quota',()=>{expect(()=>validateQuotaResult('tts',{data:null,error:{code:'42702'}})).toThrow(QuotaStorageError);});
 it('reports actual exhausted quota separately',()=>{expect(()=>validateQuotaResult('tts',{data:false,error:null})).toThrow(AppQuotaError);expect(()=>validateQuotaResult('tts',{data:true,error:null})).not.toThrow();});
 it('fails closed on unexpected quota responses',()=>{expect(()=>validateQuotaResult('stt',{data:null,error:null})).toThrow(QuotaStorageError);});
});
describe('speech fallback',()=>{
 it('chooses only the requested language and prefers installed local voices',()=>{const remote={lang:'hi-IN',localService:false},local={lang:'hi-IN',localService:true};expect(matchingVoice([{lang:'en-US'},remote,local],'hi')).toBe(local);expect(matchingVoice([{lang:'en-US'}],'hi')).toBeUndefined();});
 it('honours Retry-After without repeatedly calling the blocked cloud provider',()=>{expect(speechRetryAt(429,'60',1000)).toBe(61000);expect(speechRetryAt(503,null,1000)).toBe(61000);expect(speechRetryAt(400,null,1000)).toBe(0);});
 it('permits free ElevenLabs speech only within allowance with no overage',()=>{const account={tier:'free',status:'free',character_count:9800,character_limit:10000,max_credit_limit_extension:0};expect(()=>assertFreeElevenLabsCharacters(account,100)).not.toThrow();expect(()=>assertFreeElevenLabsCharacters(account,300)).toThrow('exhausted');expect(()=>assertFreeElevenLabsCharacters({...account,max_credit_limit_extension:1},100)).toThrow('overage');});
});
