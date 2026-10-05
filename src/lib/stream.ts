export async function* lines(body:ReadableStream<Uint8Array>){
 const reader=body.getReader(),decoder=new TextDecoder();let pending='';
 try{while(true){const {value,done}=await reader.read();pending+=decoder.decode(value,{stream:!done});let split;while((split=pending.indexOf('\n'))>=0){yield pending.slice(0,split).replace(/\r$/,'');pending=pending.slice(split+1);}if(done){if(pending)yield pending;break;}}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export function cleanReply(text:string){return text.replace(/\u2011/g,'-').replace(/[\u2014\u2013]/g,', ').replace(/\s+([.,!?।])/g,'$1');}
export function cleanSpeech(text:string){return cleanReply(text).replace(/```[\s\S]*?```/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*#`_]/g,'').replace(/\n[-•]\s*/g,'. ').replace(/\s+/g,' ').trim();}
export function takeSentences(text:string,flush=false){const parts:string[]=[];let rest=text;let match;while((match=rest.match(/^([\s\S]*?[.!?।](?:\s|$))/))){parts.push(match[1].trim());rest=rest.slice(match[1].length);}if(flush&&rest.trim()){parts.push(rest.trim());rest='';}return{parts,rest};}
