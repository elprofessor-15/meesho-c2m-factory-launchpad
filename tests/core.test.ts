import {describe,expect,it} from 'vitest';
import {seed} from '../src/lib/fixtures';
import {available,filterOrders,money,summary} from '../src/lib/services';
import {forecast} from '../src/lib/forecast/engine';
import {confirm,prepare} from '../src/lib/assistant/actions';
import {responseLanguage} from '../src/lib/i18n';
import {assertFreeElevenLabsAccount} from '../src/lib/providers/elevenlabs-free';

describe('voice language and free provider limits',()=>{
  it('uses the transcribed Hindi language even when the interface is English',()=>{
    expect(responseLanguage('Aaj kitne orders bhejne hain?','en','hin')).toBe('hi');
  });

  it('detects Hindi text and retains the selected language for English speech',()=>{
    expect(responseLanguage('आज के ऑर्डर बताइए','en')).toBe('hi');
    expect(responseLanguage('How many orders are due?','hi')).toBe('hi');
  });

  it('permits only Free-tier accounts with overage disabled for Scribe STT fallback',()=>{
    const account={tier:'free',status:'free',character_count:8276,character_limit:10000,max_credit_limit_extension:0};
    expect(()=>assertFreeElevenLabsAccount(account)).not.toThrow();
    expect(()=>assertFreeElevenLabsAccount({...account,max_credit_limit_extension:1000})).toThrow(/overage is enabled/);
    expect(()=>assertFreeElevenLabsAccount({...account,tier:'starter',status:'active'})).toThrow(/Free account/);
  });
});

describe('seller business services',()=>{
  it('keeps today summary counts consistent with the filtered order records',()=>{
    const state=seed('2026-10-04');
    const dueToday=filterOrders(state,{status:'ready_to_ship',due:'today'});
    const totals=summary(state);
    expect(totals.due).toBe(dueToday.length);
    expect(totals.packed).toBe(filterOrders(state,{status:'packed'}).length);
  });

  it('formats integer paise without losing fractional rupees',()=>{
    expect(money(101)).toContain('1.01');
    expect(money(10000)).toContain('100');
  });

  it('keeps available inventory separate from reservations',()=>{
    const product=seed().products[0];
    expect(available(product)).toBe(product.stock-product.reserved);
  });

  it('does not create customer demand from additional factory capacity',()=>{
    const state=seed();
    const product=state.products[0];
    const standard=forecast(product,state.observations);
    const moreCapacity=forecast({...product,capacity:product.capacity*10},state.observations);
    expect(standard.status).toBe('ready');
    expect(moreCapacity.status).toBe('ready');
    if(standard.status==='ready'&&moreCapacity.status==='ready'){
      expect(moreCapacity.ordered).toBe(standard.ordered);
      expect(moreCapacity.series.map(day=>day.p50)).toEqual(standard.series.map(day=>day.p50));
    }
  });

  it('produces deterministic ordered quantiles and cumulative trajectories',()=>{
    const state=seed();
    const product=state.products[0];
    const first=forecast(product,state.observations);
    const second=forecast(product,state.observations);
    expect(first).toEqual(second);
    if(first.status==='ready'){
      expect(first.series.every(day=>day.p10<=day.p50&&day.p50<=day.p90)).toBe(true);
      expect(first.series.every((day,index)=>index===0||day.c50>=first.series[index-1].c50)).toBe(true);
    }
  });
});

describe('confirmed write actions',()=>{
  it('rejects stock below reservations and requires a matching version',()=>{
    const state=seed();
    const product=state.products[0];
    expect(()=>prepare(state,'seller-1',{tool:'inventory_update',args:{id:product.id,stock:product.reserved-1,reason:'Invalid count',version:product.version}})).toThrow('Stock cannot be below reserved units');
    expect(()=>prepare(state,'seller-1',{tool:'inventory_update',args:{id:product.id,stock:50,reason:'Batch received',version:product.version+1}})).toThrow('Record changed');
  });

  it('executes once and makes confirmation replay idempotent',()=>{
    const state=seed();
    const product=state.products[0];
    const action=prepare(state,'seller-1',{tool:'inventory_update',args:{id:product.id,stock:80,reason:'New production batch',version:product.version}},1000);
    const first=confirm(state,'seller-1',action.id,2000);
    const second=confirm(state,'seller-1',action.id,3000);
    expect(first).toBe(second);
    expect(product.stock).toBe(80);
    expect(state.activity).toHaveLength(1);
  });

  it('rejects expired actions before applying a change',()=>{
    const state=seed();
    const product=state.products[0];
    const action=prepare(state,'seller-1',{tool:'inventory_update',args:{id:product.id,stock:80,reason:'New production batch',version:product.version}},1000);
    expect(()=>confirm(state,'seller-1',action.id,action.expires+1)).toThrow('expired or cancelled');
    expect(product.stock).not.toBe(80);
  });
});