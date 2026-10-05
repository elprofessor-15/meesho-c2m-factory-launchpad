// Optional build-time copy generation. No translation requests run in the app.
// Check and commit bundled copy after native-speaker review before production use.
import {readFileSync,writeFileSync} from 'node:fs';
const languages=['hi','bn','mr','ta','te','gu','kn','ml','pa'];
const sources=Object.keys(JSON.parse(readFileSync('src/lib/locales/en.json','utf8')));
const slots=text=>(text.match(/\{\d+\}/g)??[]).sort().join('|');
async function translateBatch(language,keys,attempt=0){
 const protect=key=>key.replace(/\{(\d+)\}/g,(_match,slot)=>'C2M_SLOT_'+slot+'_TOKEN');
 const q=keys.length===1?protect(keys[0]):keys.map((key,i)=>`⟦${i}⟧ ${protect(key)}`).join('\n');
 const url=new URL('https://translate.googleapis.com/translate_a/single');
 for(const [key,value] of Object.entries({client:'gtx',sl:'en',tl:language,dt:'t',q}))url.searchParams.set(key,value);
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json(),text=data[0].map(part=>part[0]).join('');
  const translated=new Map([...text.matchAll(/⟦(\d+)⟧\s*([\s\S]*?)(?=⟦\d+⟧|$)/g)].map(match=>[Number(match[1]),match[2].trim().replace(/C2M[ _]*SLOT[ _]*(\d+)[ _]*TOKEN/gi,(_match,slot)=>'{'+slot+'}').replace(/\u2014/g,', ')]));
  return keys.map((key,index)=>{const value=keys.length===1?text.trim().replace(/C2M[ _]*SLOT[ _]*(\d+)[ _]*TOKEN/gi,(_match,slot)=>'{'+slot+'}').replace(/\u2014/g,', '):translated.get(index);if(!value||slots(value)!==slots(key))throw Error('Translation placeholders changed: '+key+' => '+value);return value;});
 }catch(error){
  if(keys.length>1){const half=Math.ceil(keys.length/2);return [...await translateBatch(language,keys.slice(0,half)),...await translateBatch(language,keys.slice(half))];}
  if(attempt>=3)throw Error(`Translation failed for ${language}: ${error.message}`);
  await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));return translateBatch(language,keys,attempt+1);
 }
}
let next=0;
await Promise.all(Array.from({length:3},async()=>{while(next<languages.length){const language=languages[next++],path='src/lib/locales/'+language+'.json',dictionary=JSON.parse(readFileSync(path,'utf8')),missing=sources.filter(source=>!dictionary[source]);for(let index=0;index<missing.length;index+=28){const keys=missing.slice(index,index+28),values=await translateBatch(language,keys);keys.forEach((key,i)=>dictionary[key]=values[i]);writeFileSync(path,JSON.stringify(Object.fromEntries(Object.entries(dictionary).sort(([a],[b])=>a.localeCompare(b))),null,2)+'\n');console.log(`${language}: ${Math.min(index+28,missing.length)}/${missing.length} remaining phrases bundled`);}console.log(language+' complete');}}));
