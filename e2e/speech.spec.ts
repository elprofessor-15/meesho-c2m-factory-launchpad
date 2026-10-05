import {test,expect} from '@playwright/test';

for(const failure of [429,503])test(`cloud speech ${failure} uses Hindi device speech and avoids repeated cloud requests`,async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('lp-read-aloud','true');localStorage.setItem('lp-speech-mode','cloud');
  const spoken:string[]=[];
  Object.defineProperty(window,'__spoken',{value:spoken});
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {text:string;voice:unknown;lang='';onend:(()=>void)|null=null;constructor(text:string){this.text=text;}}});
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Hindi test',lang:'hi-IN',localService:true}],cancel:()=>{},speak:(utterance:{lang:string;onend?:()=>void})=>{spoken.push(utterance.lang);setTimeout(()=>utterance.onend?.(),10);},addEventListener:()=>{},removeEventListener:()=>{}}});
 });
 let cloudRequests=0;
 await page.route('**/api/tts',route=>{cloudRequests++;return route.fulfill({status:failure,headers:{'Retry-After':'120'},contentType:'application/json',body:JSON.stringify({error:'Cloud unavailable',browserFallback:true})});});
 await page.route('**/api/assistant',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'आज 4 ऑर्डर भेजने हैं।',spoken:'आज 4 ऑर्डर भेजने हैं।',language:'hi',provider:'test',records:[]})}));
 await page.goto('/today');await page.getByRole('button',{name:'Ask Launchpad'}).click();
 for(let i=0;i<2;i++){
  await page.getByRole('textbox',{name:'Type a question'}).fill('Aaj kitne orders bhejne hain?');
  await page.locator('.voice-controls button.primary').click();
  await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'__spoken').length)).toBe(i+1);
  await expect(page.locator('.voice-status')).toContainText('Idle');
  await expect(page.locator('.voice-controls [role="alert"]')).toHaveCount(0);
 }
 expect(cloudRequests).toBe(1);
 expect(await page.evaluate(()=>Reflect.get(window,'__spoken'))).toEqual(['hi-IN','hi-IN']);
 await expect(page.locator('.voice-controls')).toContainText('voice connection recovers');
});

test('pending speech does not start after read-aloud is turned off',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('lp-read-aloud','true');localStorage.setItem('lp-speech-mode','cloud');});
 let release!:()=>void;const held=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/tts',async route=>{await held;await route.fulfill({status:503,contentType:'application/json',body:'{"browserFallback":true}'});});
 await page.route('**/api/assistant',route=>route.fulfill({status:200,contentType:'application/json',body:'{"text":"Four orders","spoken":"Four orders","language":"en","provider":"test"}'}));
 await page.goto('/today');await page.getByRole('button',{name:'Ask Launchpad'}).click();
 await page.getByRole('textbox',{name:'Type a question'}).fill('Orders today?');
 const pendingSpeech=page.waitForRequest(request=>request.url().endsWith('/api/tts'));await page.locator('.voice-controls button.primary').click();await pendingSpeech;
 await page.getByLabel('Read answers aloud').uncheck();release();
 await expect(page.locator('.voice-status')).toContainText('Idle');
 await expect(page.locator('.voice-controls .small-note')).toHaveCount(0);
});
