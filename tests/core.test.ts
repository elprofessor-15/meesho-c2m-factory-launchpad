import {describe,expect,it} from 'vitest';
import {seed} from '../src/lib/fixtures';
import {available,filterOrders,money,summary} from '../src/lib/services';
import {forecast} from '../src/lib/forecast/engine';
import {forecastChartData} from '../src/lib/forecast/chart';
import {confirm,prepare} from '../src/lib/assistant/actions';
import {responseLanguage} from '../src/lib/i18n';
import {assertFreeElevenLabsAccount} from '../src/lib/providers/elevenlabs-free';
import {quotaMessage,speechQuotaSeconds} from '../src/lib/server/quota-policy';

describe('voice language and free provider limits',()=>{
  it('charges measured speech seconds rather than the recording maximum',()=>{
    expect(speechQuotaSeconds(2.1)).toBe(3);
    expect(speechQuotaSeconds(2.1,3.4)).toBe(4);
    expect(speechQuotaSeconds(45)).toBe(45);
    expect(()=>speechQuotaSeconds(47)).toThrow(/between 0 and 45 seconds/);
  });

  it('explains the speech limit and preserves the typed fallback',()=>{
    expect(quotaMessage('stt')).toMatch(/keep typing questions/);
    expect(quotaMessage('tts')).toMatch(/text answer is still available/);
  });

  it('uses the transcribed Hindi language even when the interface is English',()=>{
    expect(responseLanguage('Aaj kitne orders bhejne hain?','en','hin')).toBe('hi');
  });

  it('detects Hindi text and retains the selected language for English speech',()=>{
    expect(responseLanguage('आज के ऑर्डर बताइए','en')).toBe('hi');
    expect(responseLanguage('Aaj kitne orders bhejne hain?','en')).toBe('hi');
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

  it('plots cumulative actual units from the same baseline as forecast quantiles',()=>{
    const state=seed();
    const product=state.products[0];
    const plan=forecast({...product,horizon:7},state.observations);
    expect(plan.status).toBe('ready');
    if(plan.status!=='ready')return;
    const chart=forecastChartData(state.observations,product.id,plan.series,7,true);
    const historical=chart.filter(point=>point.day<0);
    const start=chart.find(point=>point.day===0);
    const firstForecast=chart.find(point=>point.day===1);
    const historicalTotal=state.observations.filter(observation=>observation.sku===product.id&&observation.day<0).sort((a,b)=>a.day-b.day).slice(-14).reduce((total,observation)=>total+observation.units,0);
    expect(historical).toHaveLength(14);
    expect(historical.at(-1)?.actual).toBe(historicalTotal);
    expect(start?.median).toBe(historicalTotal);
    expect(firstForecast?.median).toBe(historicalTotal+plan.series[0].c50);
    expect(firstForecast?.band?.[0]).toBeLessThanOrEqual(firstForecast?.median??0);
    expect(firstForecast?.band?.[1]).toBeGreaterThanOrEqual(firstForecast?.median??0);
  });

  it('creates synthetic history with plausible visit, purchase and unit ordering',()=>{
    const state=seed();
    const observations=state.observations.filter(observation=>observation.sku==='SKU-101');
    expect(observations).toHaveLength(90);
    expect(observations.every(observation=>observation.visits>=observation.purchases&&observation.purchases<=observation.units)).toBe(true);
    expect(observations.every(observation=>observation.available||(observation.purchases===0&&observation.units===0))).toBe(true);
    expect(new Set(observations.slice(-14).map(observation=>observation.visits)).size).toBeGreaterThan(6);
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