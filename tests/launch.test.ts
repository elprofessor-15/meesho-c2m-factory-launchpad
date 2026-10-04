import {describe,it,expect} from 'vitest';
import {seed} from '../src/lib/fixtures';
import {batches,commitment,operatingDefaults} from '../src/lib/launch';
import {prepare,confirm} from '../src/lib/assistant/actions';
import {runTool} from '../src/lib/assistant/tools';
function ready(){const s=seed();s.operatingPlan={...operatingDefaults,packingOwner:'Sample worker',packingCapacity:60,catalogueChecked:true,packingChecked:true,pickupChecked:true};return s;}
describe('factory batches',()=>{
 it('preserves exact quantities and order identity across grouping',()=>{const s=seed(),groups=batches(s);expect(groups.reduce((n,b)=>n+b.units,0)).toBe(s.orders.filter(o=>o.status==='ready_to_ship').reduce((n,o)=>n+o.quantity,0));expect(new Set(groups.flatMap(b=>b.orders.map(o=>o.id))).size).toBe(groups.flatMap(b=>b.orders).length);});
 it('previews then atomically packs one batch without shipping',()=>{const s=seed(),b=batches(s)[0],a=prepare(s,'u',{tool:'batch_packed',args:{id:b.id}});expect(b.orders.every(o=>o.status==='ready_to_ship')).toBe(true);confirm(s,'u',a.id);expect(b.orders.every(o=>o.status==='packed')).toBe(true);expect(confirm(s,'u',a.id)).toContain('Pickup is not confirmed');expect(s.activity).toHaveLength(1);});
 it('rejects stale batches before changing any order',()=>{const s=seed(),b=batches(s).find(b=>b.orders.length>1)!,a=prepare(s,'u',{tool:'batch_packed',args:{id:b.id}});b.orders.at(-1)!.version++;expect(()=>confirm(s,'u',a.id)).toThrow('Batch changed');expect(b.orders.every(o=>o.status==='ready_to_ship')).toBe(true);});
 it('rejects confirmation from another user',()=>{const s=seed(),a=prepare(s,'u',{tool:'batch_packed',args:{id:batches(s)[0].id}});expect(()=>confirm(s,'other',a.id)).toThrow('Action not found');});
 it('scopes exact-SKU order tools',()=>{const s=seed();const r=runTool(s,'u','list_orders',{id:'SKU-102'}) as {rows:{sku:string}[]};expect(r.rows.every(o=>o.sku==='SKU-102')).toBe(true);expect(()=>runTool(s,'u','run_sql',{})).toThrow('Unknown tool');});
});
describe('conditional commitments',()=>{
 it('does not equate completed onboarding with physical readiness',()=>{const s=seed();s.step=6;const c=commitment(s,s.products[0]);expect(c.decision).toBe('Hold');expect(c.units).toBe(0);});
 it('holds when exposure is insufficient instead of concluding no demand',()=>{const s=ready();s.observations=s.observations.map(o=>({...o,visits:1,purchases:0,units:0}));const c=commitment(s,s.products[0]);expect(c.decision).toBe('Hold');expect(c.reason).toContain('Insufficient eligible exposure');});
 it('pauses below the individual contribution floor',()=>{const s=ready();s.products[0].floor=100000;const c=commitment(s,s.products[0]);expect(c.decision).toBe('Pause');expect(c.units).toBe(0);});
 it('holds missing costs',()=>{const s=ready();s.products[0].reverse=null;expect(commitment(s,s.products[0]).reason).toContain('costs are missing');});
 it('cannot silently exceed cash or production limits',()=>{const s=ready(),p=s.products[0];p.cash=50000;const c=commitment(s,p);expect(c.cashExposure).toBeLessThanOrEqual(p.cash);expect(c.units).toBeLessThanOrEqual(p.capacity);});
 it('requires a fresh preview after operating ownership changes',()=>{const s=ready(),p=s.products[0];p.floor=0;p.minMonthly=1;const c=commitment(s,p);expect(c.units).toBeGreaterThan(0);const a=prepare(s,'u',{tool:'commitment',args:{id:p.id}});s.operatingPlan!.packingOwner='';s.operatingPlan!.version++;expect(()=>confirm(s,'u',a.id)).toThrow('Commitment changed');});
 it('rejects legacy pilot actions when not ready',()=>{const s=seed();expect(()=>prepare(s,'u',{tool:'pilot_plan',args:{id:s.products[0].id,units:20}})).toThrow('physical fulfilment');});
});
