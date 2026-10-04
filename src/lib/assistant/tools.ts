import {z} from 'zod';
import {State} from '../types';
import {summary,filterOrders,sellerProducts} from '../services';
import {forecast} from '../forecast/engine';
import {prepare} from './actions';
export const toolNames=['get_today_summary','list_orders','get_order_details','get_inventory','get_product_details','get_payment_summary','get_demand_plan','explain_forecast','get_support_requests','get_launch_status','prepare_inventory_update','prepare_price_update','prepare_mark_packed','prepare_callback_request','prepare_visit_request','prepare_pilot_plan'] as const;
const properties={id:{type:'string',description:'Exact product SKU or order ID from the supplied product list; preserve it exactly.'},status:{type:'string',enum:['all','ready_to_ship','packed','shipped','delivered','cancelled']},due:{type:'string',enum:['today','overdue']},q:{type:'string',description:'Product or order search text.'},stock:{type:'integer',description:'Exact new total stock-on-hand quantity requested by the user, in units.'},price:{type:'integer',description:'Exact new price in integer paise.'},units:{type:'integer',description:'Exact pilot quantity in units.'},reason:{type:'string',description:'User-provided reason, or concise summary of the request.'},window:{type:'string',description:'Preferred callback or visit time window as stated by the user.'},language:{type:'string',description:'Selected assistant response language.'}};
const descriptions:Record<typeof toolNames[number],{description:string;required?:string[]}>= {
 get_today_summary:{description:'Get the exact current seller work summary and due-today orders route.'},
 list_orders:{description:'List matching seller orders. Use id for an exact SKU, due for due-today/overdue, and status for order state.'},
 get_order_details:{description:'Get one order using its exact order ID in id.',required:['id']},
 get_inventory:{description:'Get stock-on-hand, reservations and available stock. Optional exact product SKU in id.'},
 get_product_details:{description:'Get product details for an optional exact SKU in id.'},
 get_payment_summary:{description:'Get expected seller payouts from sample settlement records.'},
 get_demand_plan:{description:'Retrieve calculated demand and supply scenario for an exact product SKU in id.',required:['id']},
 explain_forecast:{description:'Retrieve the calculated forecast and constraints for an exact product SKU in id.',required:['id']},
 get_support_requests:{description:'List saved callback, visit and onboarding support requests.'},
 get_launch_status:{description:'Get saved onboarding progress and pilot plan.'},
 prepare_inventory_update:{description:'Prepare, but do not execute, an inventory stock-on-hand update. stock is the exact new total quantity in units, not a delta. Use an exact SKU as id. The server returns a confirmation action only when the request is valid.',required:['id','stock']},
 prepare_price_update:{description:'Prepare, but do not execute, a price change. price must be the exact new INR amount converted to integer paise. Use an exact SKU as id.',required:['id','price']},
 prepare_mark_packed:{description:'Prepare marking one ready-to-ship order packed. This does not book or hand over a courier. Use exact order ID in id.',required:['id']},
 prepare_callback_request:{description:'Prepare a callback support request only. This does not place a phone call. Include the request reason and preferred time.',required:['reason','window']},
 prepare_visit_request:{description:'Prepare a cluster visit support request only. This does not schedule or perform a visit. Include the request reason and preferred time.',required:['reason','window']},
 prepare_pilot_plan:{description:'Prepare a pilot quantity for confirmation; do not accept it automatically. Use exact SKU and requested units.',required:['id','units']},
};
export const toolDefinitions=toolNames.map(name=>({name,...descriptions[name],parameters:{type:'object',properties,required:descriptions[name].required??[],additionalProperties:false}}));
export const toolParameters={type:'object',properties,additionalProperties:false};
const schema=z.object({id:z.string().max(80).optional(),status:z.string().max(40).optional(),due:z.enum(['today','overdue']).optional(),q:z.string().max(100).optional(),stock:z.number().int().nonnegative().optional(),price:z.number().int().positive().optional(),units:z.number().int().nonnegative().optional(),reason:z.string().max(500).optional(),window:z.string().max(100).optional(),language:z.string().max(40).optional()}).strict();
export function runTool(s:State,user:string,name:string,input:unknown){if(!toolNames.includes(name as typeof toolNames[number]))throw new Error('Unknown tool');const a=schema.parse(input);const products=sellerProducts(s);const p=products.find(p=>p.id===a.id);const stamp={asOf:s.date};
 if(name==='get_today_summary')return{...summary(s),...stamp,route:'/orders?status=ready_to_ship&due=today'};
 if(name==='list_orders'){const rows=filterOrders(s,Object.fromEntries(Object.entries(a).filter(([,v])=>typeof v==='string')) as Record<string,string>);return{total:rows.length,rows:rows.slice(0,10),hasMore:rows.length>10,...stamp,route:'/orders?'+new URLSearchParams({...(a.status?{status:a.status}:{}),...(a.due?{due:a.due}:{}),...(a.q?{q:a.q}:{}),...(a.id?{sku:a.id}:{})})};}
 if(name==='get_order_details'){const order=filterOrders(s).find(o=>o.id===a.id);if(!order)throw new Error('Order not found');return{order,route:'/orders/'+order.id,...stamp};}
 if(name==='get_inventory'||name==='get_product_details')return{rows:(a.id?products.filter(p=>p.id===a.id):products).map(p=>({id:p.id,name:p.name,stock:p.stock,reserved:p.reserved,available:p.stock-p.reserved,price:p.price,lead:p.lead,version:p.version})).slice(0,10),route:'/inventory',...stamp};
 if(name==='get_payment_summary')return{rows:s.payments.filter(p=>p.status==='Expected').slice(0,10),expected:s.payments.filter(p=>p.status==='Expected').reduce((a,p)=>a+p.amount,0),route:'/payments',...stamp};
 if(name==='get_demand_plan'||name==='explain_forecast'){if(!p)return{clarification:'Choose an exact product.',products:products.map(p=>({id:p.id,name:p.name}))};const f=forecast(p,s.observations);return{...f,series:undefined,route:'/demand?sku='+p.id,...stamp};}
 if(name==='get_support_requests')return{rows:s.support.filter(r=>r.manufacturerId===s.manufacturerId).slice(0,10),route:'/support',...stamp};
 if(name==='get_launch_status')return{step:s.step,onboarding:s.onboarding,pilot:s.pilot,route:'/onboarding',...stamp};
 const tool=name.replace('prepare_','');let args:Record<string,unknown>={};if(['inventory_update','price_update','pilot_plan'].includes(tool)){if(!p)return{clarification:'Choose a product.',products:products.map(p=>({id:p.id,name:p.name}))};args={id:p.id,version:p.version,...(tool==='inventory_update'?{stock:a.stock,reason:a.reason??'Assistant request'}:tool==='price_update'?{price:a.price}:{units:a.units})};}else if(tool==='mark_packed'){const o=s.orders.find(o=>o.id===a.id);args={id:a.id,version:o?.version};}else args={reason:a.reason??'Manufacturer requests assistance',window:a.window??'Please contact to arrange a time',language:a.language??'Hindi',contact:'Phone',related:a.id??''};return{action:prepare(s,user,{tool,args})};
}
