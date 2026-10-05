export async function* lines(body:ReadableStream<Uint8Array>){
 const reader=body.getReader(),decoder=new TextDecoder();let pending='';
 try{while(true){const {value,done}=await reader.read();pending+=decoder.decode(value,{stream:!done});let split;while((split=pending.indexOf('\n'))>=0){yield pending.slice(0,split).replace(/\r$/,'');pending=pending.slice(split+1);}if(done){if(pending)yield pending;break;}}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export function cleanReply(text:string,language='en'){
 const labels:Record<string,string>={get_commitment_decision:language==='hi'?'तैयारी की समीक्षा':'readiness review',get_demand_plan:language==='hi'?'मांग योजना':'demand plan',explain_forecast:language==='hi'?'मांग योजना':'demand plan',get_today_summary:language==='hi'?'आज के काम':'today’s work',get_inventory:language==='hi'?'स्टॉक रिकॉर्ड':'stock records',get_payment_summary:language==='hi'?'भुगतान रिकॉर्ड':'payout records',list_orders:language==='hi'?'ऑर्डर रिकॉर्ड':'order records',get_packing_batches:language==='hi'?'पैकिंग सूची':'packing list'};
 return text.replace(/\b(?:get|prepare|list|explain)_[a-z_]+\b/g,name=>labels[name]??(language==='hi'?'संबंधित रिकॉर्ड':'workspace records')).replace(/\u2011/g,'-').replace(/[\u2014\u2013]/g,', ').replace(/\s+([.,!?।])/g,'$1');
}
// Keep an unfinished word until its next boundary, so token-split tool names cannot leak.
export class ReplyTextStream {
 private pending='';
 constructor(private language:string,private emit:(text:string)=>void){}
 push(delta:string){this.pending+=delta;const boundary=Math.max(this.pending.lastIndexOf(' '),this.pending.lastIndexOf('\n'));if(boundary>=0){this.emit(cleanReply(this.pending.slice(0,boundary+1),this.language));this.pending=this.pending.slice(boundary+1);}}
 finish(){if(this.pending){this.emit(cleanReply(this.pending,this.language));this.pending='';}}
}
export function cleanSpeech(text:string){return cleanReply(text).replace(/```[\s\S]*?```/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*#`_]/g,'').replace(/\n[-•]\s*/g,'. ').replace(/\s+/g,' ').trim();}
export function takeSentences(text:string,flush=false){const parts:string[]=[];let rest=text;let match;while((match=rest.match(/^([\s\S]*?[.!?।](?:\s|$))/))){parts.push(match[1].trim());rest=rest.slice(match[1].length);}if(flush&&rest.trim()){parts.push(rest.trim());rest='';}return{parts,rest};}
