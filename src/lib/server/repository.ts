import 'server-only';
import {cookies} from 'next/headers';
import {createClient,SupabaseClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {State} from '../types';
import {seed} from '../fixtures';
import {env} from './env';
import {AppQuotaError,QuotaKind,validateQuotaResult} from './quota-policy';
export type Session={id:string;db?:SupabaseClient};
export async function session():Promise<Session>{const e=env(),jar=await cookies();if(e.APP_DATA_MODE==='local'){let id=jar.get('launchpad-local')?.value;if(!id||!/^[-a-f0-9]{36}$/.test(id)){id=randomUUID();jar.set('launchpad-local',id,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:2592000});}return{id};}
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});let token=jar.get('lp-access')?.value;const refresh=jar.get('lp-refresh')?.value;
 let user=token?(await db.auth.getUser(token)).data.user:null;
 if(!user){const r=refresh?await db.auth.refreshSession({refresh_token:refresh}):await db.auth.signInAnonymously();if(r.error||!r.data.session)throw new Error('Sign-in failed. Enable Supabase anonymous sign-ins.');token=r.data.session.access_token;user=r.data.user;jar.set('lp-access',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:3600});jar.set('lp-refresh',r.data.session.refresh_token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:2592000});}
 if(!user)throw new Error('Authentication required');return{id:user.id,db:createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}})};
}
const dir=path.join(process.cwd(),'.local-data');
async function localRead(id:string){try{return JSON.parse(await readFile(path.join(dir,id+'.json'),'utf8')) as State;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;return seed(env().DEMO_DATE);}}
export async function read(s:Session):Promise<State>{if(!s.db)return localRead(s.id);const {data,error}=await s.db.from('workspaces').select('state').eq('owner_id',s.id).maybeSingle();if(error)throw new Error('Database read failed. Check migrations and RLS.');if(data)return data.state;const initial=seed(env().DEMO_DATE);const created=await s.db.rpc('bootstrap_workspace',{initial_state:initial});if(created.error)throw new Error('Workspace setup failed. Apply migrations.');return created.data;}
const locks=new Map<string,Promise<unknown>>();
export async function mutate<T>(s:Session,fn:(state:State)=>T,initial?:State):Promise<T>{if(s.db){for(let attempt=0;attempt<4;attempt++){const state=attempt===0&&initial?structuredClone(initial):await read(s),version=state.version;const result=fn(state);state.version++;const r=await s.db.rpc('save_workspace',{expected_version:version,next_state:state});if(r.error)throw new Error('Database write failed');if(r.data)return result;}throw new Error('Concurrent update. Refresh and try again.');}
 const previous=locks.get(s.id)??Promise.resolve();const next=previous.catch(()=>{}).then(async()=>{const state=await localRead(s.id),result=fn(state);state.version++;await mkdir(dir,{recursive:true});const temporary=path.join(dir,s.id+'.tmp');await writeFile(temporary,JSON.stringify(state));await rename(temporary,path.join(dir,s.id+'.json'));return result;});locks.set(s.id,next);try{return await next;}finally{if(locks.get(s.id)===next)locks.delete(s.id);}}
export function log(s:State,text:string){s.activity.unshift({id:randomUUID(),at:new Date().toISOString(),text});s.activity=s.activity.slice(0,150);}
export const quotaRetryAfterSeconds=()=>Math.max(1,Math.ceil((Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth(),new Date().getUTCDate()+1)-Date.now())/1000));
export async function quota(s:Session,kind:QuotaKind,amount=1){const e=env(),limits={turns:e.AI_USER_DAILY_TURNS,model:e.AI_PROJECT_DAILY_MODEL_REQUESTS,stt:e.STT_USER_DAILY_SECONDS,tts:e.TTS_PROJECT_DAILY_REQUESTS};if(s.db){const r=await s.db.rpc('consume_quota',{quota_kind:kind,amount,max_value:limits[kind],project_scope:['model','tts'].includes(kind)});validateQuotaResult(kind,r);return;}const day=new Date().toISOString().slice(0,10);const target=['model','tts'].includes(kind)?{id:'project-quota'}:s;await mutate(target,state=>{const key=day+kind;const count=state.quota[key]??0;if(count+amount>limits[kind])throw new AppQuotaError(kind);state.quota[key]=count+amount;});}
