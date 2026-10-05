import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
const project=JSON.parse(readFileSync('.vercel/project.json','utf8'));
if(project.projectName!=='meesho-c2m-factory-launchpad')throw new Error('Link the intended factory-launchpad project before uploading secrets.');
const local=parseEnv(readFileSync('.env.local','utf8'));
const allowed=new Set([...Object.keys(parseEnv(readFileSync('.env.example','utf8'))),'OPENROUTER_API_KEY','OPENROUTER_MODEL']);
const env=Object.fromEntries(Object.entries(local).filter(([key])=>allowed.has(key)&&key!=='SUPABASE_ACCESS_TOKEN'&&key!=='VERCEL_OIDC_TOKEN'));
const url=process.argv[2];
if(!url||!/^https:\/\/[a-z0-9.-]+\.vercel\.app$/.test(url))throw new Error('Supply the verified production Vercel URL.');
if(!env.NEXT_PUBLIC_SUPABASE_URL||!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)throw new Error('Configure Supabase before syncing the hosted environment.');
env.APP_DATA_MODE='supabase';
env.NEXT_PUBLIC_APP_URL=url;
// Paid speech providers remain disabled unless the developer explicitly opts in.
if(!env.ALLOW_PAID_SPEECH_FALLBACK)env.ALLOW_PAID_SPEECH_FALLBACK='false';
for(const [key,value] of Object.entries(env)){
 if(!value)continue;
 if(!/^[A-Z][A-Z0-9_]*$/.test(key))throw new Error('Invalid environment variable name.');
 const secret=!key.startsWith('NEXT_PUBLIC_')&&/KEY|SECRET|TOKEN|PASSWORD/.test(key);
 const result=spawnSync('npx',['--yes','vercel@62.2.0','env','add',key,'production,preview','--force','--yes',secret?'--sensitive':'--no-sensitive'],{input:value,encoding:'utf8',stdio:['pipe','pipe','pipe']});
 if(result.status!==0){console.error(`Upload failed for ${key}. Check Vercel authentication/project access. Provider values were not logged.`);process.exit(1);}
 console.log(`Synced ${key} (${secret?'secret':'configuration'})`);
}
console.log('Environment synchronized. Redeploy before testing changes. Local .env.local is unchanged.');
