import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
const env=parseEnv(readFileSync('.env.local','utf8'));
const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
const missing=required.filter(key=>!env[key]?.trim());
for(const key of ['GEMINI_API_KEY','GROQ_API_KEY','ELEVENLABS_API_KEY','OPENROUTER_API_KEY'])console.log(`${key}: ${env[key]?'configured':'not configured'}`);
if(missing.length){console.error('Deployment blocked: add '+missing.join(', ')+' to .env.local.');process.exitCode=1;}
else{
 const r=await fetch(env.NEXT_PUBLIC_SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY},signal:AbortSignal.timeout(15000)});
 if(!r.ok){console.error(`Supabase configuration check failed (HTTP ${r.status}).`);process.exitCode=1;}
 else{const settings=await r.json();if(!settings.external?.anonymous_users){console.error('Enable anonymous sign-ins in Supabase Auth.');process.exitCode=1;}else console.log('Supabase Auth reachable; anonymous sign-ins enabled.');}
}
console.log('Vercel must use APP_DATA_MODE=supabase. Local filesystem persistence is never used in hosted mode.');
