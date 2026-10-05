import {State,Action} from '../types';
import {filterOrders,money,sellerProducts,summary} from '../services';
import {batches} from '../launch';
import {prepare} from './actions';
import {translate} from '../i18n';
export type Reply={text:string;spoken:string;provider:string;language:string;route?:string;action?:Action;records?:unknown[];choices?:{label:string;message:string}[]};
export type QuickIntent={kind:'read'|'write';run:(state:State,user:string,language:string)=>Reply};
const reply=(text:string,language:string,extra:Partial<Reply>={}):Reply=>{const localized=translate(language,text);return{text:localized,spoken:localized,provider:'Workspace',language,...extra};};
const hindi=(language:string)=>language==='hi';
export function orderReferences(message:string){
 const digits:Record<string,string>={zero:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9'};
 const normalized=message.toUpperCase().replace(/[\u2013\u2014]/g,'-').replace(/[०-९]/g,c=>String(c.charCodeAt(0)-'०'.charCodeAt(0))).replace(/एल\s*पी/g,'LP').replace(/\b(?:zero|one|two|three|four|five|six|seven|eight|nine)(?:\s+(?:zero|one|two|three|four|five|six|seven|eight|nine)){3}\b/gi,phrase=>phrase.toLowerCase().split(/\s+/).map(word=>digits[word]).join(''));
 const matches=[...normalized.matchAll(/\bLP[\s-]*(\d{4})\b/g)].map(m=>'LP-'+m[1]);
 if(/order|ऑर्डर|आर्डर/i.test(message))for(const m of normalized.matchAll(/\b(\d{4})\b/g))matches.push('LP-'+m[1]);
 return [...new Set(matches)];
}
export function quickIntent(state:State,message:string):QuickIntent|null{
 const m=message.toLowerCase(),products=sellerProducts(state);
 const nativeOrderCount=/(অর্ডার|ஆர்டர்|ఆర్డర్|ઓર્ડર|ಆರ್ಡರ್|ഓർഡ(?:ർ|റ)|ਆਰਡਰ)/u.test(m)&&/(আজ|இன்று|ఈరోజు|આજે|ಇಂದು|ഇന്ന്|ਅੱਜ)/u.test(m)&&/(কত|எத்தனை|ఎన్ని|કેટલા|ಎಷ್ಟು|എത്ര|ਕਿੰਨੇ)/u.test(m);
 const ids=orderReferences(message);
 if((/pack|prepared|stock|तैयार|पैक|स्टॉक/.test(m))&&(/\b(don't|do not|not|mat)\b|नहीं|मत/.test(m)))return{kind:'read',run:(_s,_u,l)=>reply(hindi(l)?'कोई बदलाव नहीं किया गया। जब तैयार हों, सही ऑर्डर नंबर या नया कुल स्टॉक बताइए।':'No changes made. When you are ready, tell me the exact order numbers or new total stock.',l)};
 const packing=/pack|prepared|taiyar|तैयार|पैक/.test(m)&&/order|orders|ऑर्डर|आर्डर|ऑर्डर्स|LP[\s-]*\d/i.test(message)&&/\b(i|i've|have|mark|update|maine|kar|kiya|ho gaye)\b|मैंने|कर दिया|कर दो|किया/.test(m);
 if(packing){
  if(/\b(don't|do not|not|mat)\b|नहीं|मत/.test(m))return{kind:'read',run:(_s,_u,l)=>reply(hindi(l)?'कोई बदलाव नहीं किया गया। ऑर्डर पैक करने के लिए उनके सही नंबर बताइए।':'No changes made. Tell me the exact order numbers when you want to mark them packed.',l)};
  if(!ids.length)return{kind:'read',run:(s,_u,l)=>reply(hindi(l)?'कौन से ऑर्डर तैयार हैं? सही ऑर्डर नंबर चुनिए या बोलिए, जैसे LP 8042 और LP 8047।':'Which orders have you prepared? Choose or say the exact numbers, such as LP 8042 and LP 8047.',l,{route:'/orders',records:filterOrders(s,{status:'ready_to_ship'}).map(o=>({id:o.id,sku:o.sku,quantity:o.quantity})),choices:filterOrders(s,{status:'ready_to_ship'}).slice(0,6).map(o=>({label:o.id,message:`Mark order ${o.id} packed`}))})};
  return{kind:'write',run:(s,u,l)=>{const action=prepare(s,u,{tool:'orders_packed',args:{ids}});const text=hindi(l)?`${ids.join(', ')} को पैक किया हुआ दर्ज करने का अनुरोध तैयार है। नीचे सही ऑर्डर देखकर पुष्टि कीजिए। कूरियर को सौंपना दर्ज नहीं होगा।`:`Review ${ids.join(', ')} below, then confirm to mark them packed. Courier handover will remain pending.`;return reply(text,l,{action,route:'/orders?status=packed',records:ids.map(id=>({id,status:'Waiting for confirmation'}))});}};
 }
 if(/dispatch.*(done|kar diya|kiya)|shipped|भेज दिया|dispatch kar/.test(m))return{kind:'read',run:(_s,_u,l)=>reply(hindi(l)?'कूरियर हैंडओवर इस प्रोटोटाइप से दर्ज नहीं होता। यदि ऑर्डर केवल पैक हुए हैं, उनके नंबर बताइए।':'Courier handover is not connected in this prototype. If the orders are packed, tell me their numbers to prepare a packing update.',l,{route:'/orders'})};
 const batchId=message.toUpperCase().match(/\bB\d{8}-\d+\b/)?.[0];
 if(batchId&&/pack|prepared|taiyar|तैयार|पैक/.test(m)&&/mark|prepared|maine|कर|तैयार/.test(m))return{kind:'write',run:(s,u,l)=>{const action=prepare(s,u,{tool:'batch_packed',args:{id:batchId}});return reply(hindi(l)?'बैच पैकिंग का अनुरोध तैयार है। सही ऑर्डर देखकर पुष्टि कीजिए।':'Your batch packing update is ready to review. Confirm the exact orders below.',l,{action});}};
 const matches=products.filter(p=>m.includes(p.id.toLowerCase())||m.includes(p.name.toLowerCase())||(/bedsheet|बेडशीट/.test(m)&&/bedsheet/i.test(p.name))||(/cushion|कुशन/.test(m)&&/cushion/i.test(p.name)));
 const product=matches.length===1?matches[0]:undefined;
 if(/stock|inventory|स्टॉक/.test(m)&&/\b(set|update|change|adjust|make|add|increase|reduce)\b|बदल|कर दो/.test(m)){
  const amount=m.match(/(?:\bto\b|=|\btotal\b)\s*(\d+)\b/)?.[1];
  if(!product||!amount||/\b(add|more|increase|reduce|less)\b|जोड़|घटा/.test(m))return{kind:'read',run:(_s,_u,l)=>reply(hindi(l)?'उत्पाद का सही SKU और नया कुल स्टॉक बताइए, जैसे SKU-101 का stock to 50।':'Tell me the exact SKU and new total stock, for example: Set SKU-101 stock to 50. Added or removed units need a new total before confirmation.',l,{route:'/inventory'})};
  return{kind:'write',run:(s,u,l)=>{const p=sellerProducts(s).find(p=>p.id===product.id)!;const action=prepare(s,u,{tool:'inventory_update',args:{id:p.id,version:p.version,stock:Number(amount),reason:'Requested in conversation'}});return reply(hindi(l)?'नया कुल स्टॉक दर्ज करने का अनुरोध तैयार है। नीचे पुष्टि कीजिए।':action.preview,l,{action,route:'/inventory'});}};
 }
 if(/\b(open|show me|take me to)\b|खोल/.test(m)&&!/[?]|how|kitn|कितन/.test(m)){
  const destination=/stock|inventory|स्टॉक/.test(m)?'/inventory':/payment|payout|भुगतान/.test(m)?'/payments':/support|help|सहायता/.test(m)?'/support':/order|ऑर्डर/.test(m)?'/orders':undefined;
  if(destination)return{kind:'read',run:(_s,_u,l)=>reply(hindi(l)?'संबंधित पेज खोलने के लिए नीचे दबाइए।':'Open the relevant page below.',l,{route:destination})};
 }
 if(/batch|packing run|पैकिंग बैच/.test(m)&&!packing)return{kind:'read',run:(s,_u,l)=>{const rows=batches(s).filter(b=>b.due<=s.date);return reply(hindi(l)?`आज और पिछले बाकी काम के ${rows.length} पैकिंग बैच हैं।`:`${rows.length} packing batches are due today or overdue.`,l,{route:'/orders?view=batches',records:rows.map(b=>({id:b.id,name:b.name,variant:b.variant,due:b.due,units:b.units,orders:b.orders.map(o=>o.id)})),choices:rows.slice(0,4).map(b=>({label:`Pack ${b.name}`,message:`Mark batch ${b.id} packed`}))});}};
 if(/stock|inventory|स्टॉक|kitna stock|running low|products.*low/.test(m)&&!/(why|explain|demand|forecast|next week|क्यों)/.test(m))return{kind:'read',run:(s,_u,l)=>{let rows=sellerProducts(s);if(product)rows=rows.filter(p=>p.id===product.id);if(/low|कम/.test(m))rows=rows.filter(p=>p.stock-p.reserved<40);const text=rows.length===1?(hindi(l)?`${rows[0].name} का उपलब्ध स्टॉक ${rows[0].stock-rows[0].reserved} यूनिट है। ${rows[0].reserved} यूनिट ऑर्डर के लिए आरक्षित हैं।`:`${rows[0].name} has ${rows[0].stock-rows[0].reserved} available units, with ${rows[0].reserved} reserved for orders.`):(hindi(l)?`${rows.length} उत्पादों का उपलब्ध स्टॉक नीचे है।`:`Stock for ${rows.length} products is listed below.`);return reply(text,l,{route:'/inventory',records:rows.map(p=>({id:p.id,name:p.name,stock:p.stock,reserved:p.reserved,available:p.stock-p.reserved}))});}};
 if(/payment|payout|भुगतान|paisa kab/.test(m)&&!/(why|explain|क्यों)/.test(m))return{kind:'read',run:(s,_u,l)=>{const rows=s.payments.filter(p=>p.status==='Expected').sort((a,b)=>a.date.localeCompare(b.date));const next=rows[0];const text=next?(hindi(l)?`अगला अपेक्षित भुगतान ${money(next.amount)} है, तारीख ${next.date}।`:`Your next expected payout is ${money(next.amount)} on ${next.date}.`):(hindi(l)?'अभी कोई अपेक्षित भुगतान दर्ज नहीं है।':'No expected payout is currently recorded.');return reply(text,l,{route:'/payments',records:rows});}};
 if((nativeOrderCount||/order|bhej|ऑर्डर|भेज/.test(m)&&/(how many|today|aaj|kitne|kitna|due|आज|कितने|show)/.test(m)&&!/(why|explain|next|tomorrow|cancel|prepared|pack|कल)/.test(m)))return{kind:'read',run:(s,_u,l)=>{const rows=filterOrders(s,{status:'ready_to_ship',due:'today',...(product?{sku:product.id}:{})});const overdue=summary(s).overdue;return reply(hindi(l)?`आज ${rows.length} ऑर्डर भेजने हैं। ${overdue} पुराने ऑर्डर भी बाकी हैं।`:`${rows.length} orders are ready for dispatch today. ${overdue} overdue orders also need attention.`,l,{route:'/orders?status=ready_to_ship&due=today',records:rows.map(o=>({id:o.id,sku:o.sku,quantity:o.quantity,due:o.due,status:o.status}))});}};
 return null;
}
