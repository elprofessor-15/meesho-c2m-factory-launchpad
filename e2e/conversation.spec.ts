import {test,expect} from '@playwright/test';

test('speech and text start before the streamed reply is finished',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('lp-read-aloud','true');localStorage.setItem('lp-speech-mode','fast');
  const spoken:string[]=[];Object.defineProperty(window,'__spoken',{value:spoken});
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{text:string;lang='';onstart:(()=>void)|null=null;onend:(()=>void)|null=null;constructor(text:string){this.text=text;}}});
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'en-US',localService:true}],cancel:()=>{},addEventListener:()=>{},removeEventListener:()=>{},speak:(utterance:{text:string;onstart?:()=>void;onend?:()=>void})=>{spoken.push(utterance.text);utterance.onstart?.();setTimeout(()=>utterance.onend?.(),10);}}});
  const original=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
   if(input==='/api/assistant')return new Response(new ReadableStream({start(controller){const encoder=new TextEncoder();controller.enqueue(encoder.encode(JSON.stringify({type:'text',text:'Four orders are due today. '})+'\n'));Object.defineProperty(window,'__finishReply',{value:()=>{controller.enqueue(encoder.encode(JSON.stringify({type:'text',text:'Check the overdue list too.'})+'\n'+JSON.stringify({type:'done',reply:{text:'Four orders are due today. Check the overdue list too.',spoken:'Four orders are due today. Check the overdue list too.',language:'en',provider:'test'}})+'\n'));controller.close();}});}}),{headers:{'Content-Type':'application/x-ndjson'}});
   return original(input,init);
  };
 });
 let cloud=0;await page.route('**/api/tts',route=>{cloud++;return route.fulfill({status:503,body:'{}'});});
 await page.goto('/today');await page.getByRole('button',{name:'Ask Launchpad'}).click();
 await page.getByRole('textbox',{name:'Type a question'}).fill('Orders today?');await page.locator('.voice-controls button.primary').click();
 await expect(page.locator('.assistant-message')).toContainText('Four orders are due today.');
 await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'__spoken').length)).toBe(1);
 await expect(page.locator('.stream-cursor')).toBeVisible();
 await page.evaluate(()=>Reflect.get(window,'__finishReply')());
 await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'__spoken').length)).toBe(2);
 await expect(page.locator('.stream-cursor')).toHaveCount(0);expect(cloud).toBe(0);
});

test('several spoken order references prepare one review and update only after confirmation',async({page})=>{
 await page.goto('/today');await page.getByRole('button',{name:'Ask Launchpad'}).click();
 await page.getByRole('textbox',{name:'Type a question'}).fill('I have prepared orders LP 8042 and LP 8047');
 await page.locator('.voice-controls button.primary').click();
 await expect(page.locator('dialog')).toContainText('LP-8042, LP-8047');
 await expect(page.locator('dialog')).toContainText('Courier handover will remain pending');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(page.locator('.assistant-message').last()).toContainText('cancelled');
 await page.getByRole('textbox',{name:'Type a question'}).fill('Mark orders 8042 and 8047 packed');await page.locator('.voice-controls button.primary').click();
 await expect(page.locator('dialog')).toContainText('Mark 2 orders packed');
 await page.getByRole('button',{name:'Confirm update'}).click();
 await expect(page.locator('.notice')).toContainText('2 orders marked packed');
 await expect(page.locator('.assistant-message').last()).toContainText('2 orders marked packed');
 await page.goto('/orders?status=packed');await expect(page.locator('tbody tr').filter({hasText:'LP-8042'})).toHaveCount(1);await expect(page.locator('tbody tr').filter({hasText:'LP-8047'})).toHaveCount(1);
});

test('ambiguous preparation offers exact orders without opening confirmation',async({page})=>{
 await page.goto('/today');await page.getByRole('button',{name:'Ask Launchpad'}).click();
 await page.getByRole('textbox',{name:'Type a question'}).fill('I have prepared the orders');await page.locator('.voice-controls button.primary').click();
 await expect(page.locator('.assistant-message')).toContainText('Which orders');await expect(page.locator('.reply-choices button')).toHaveCount(6);await expect(page.locator('dialog')).toHaveCount(0);
});

test('optional automatic sending turns a Hindi recording into a packing review',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>new MediaStream()}});
  class Recorder{static isTypeSupported(){return true;}state='inactive';ondataavailable:((event:{data:Blob})=>void)|null=null;onstop:(()=>void)|null=null;start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['audio'],{type:'audio/webm'})});this.onstop?.();}}
  Object.defineProperty(window,'MediaRecorder',{configurable:true,value:Recorder});
 });
 await page.route('**/api/stt',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'मैंने ऑर्डर LP 8042 और LP 8047 तैयार कर दिए',language:'hin',provider:'test'})}));
 await page.goto('/today');await page.getByRole('button',{name:'Ask Launchpad'}).click();await page.getByLabel('Send recordings after transcription').check();
 await page.getByRole('button',{name:'Record',exact:true}).click();await expect(page.locator('.voice-status')).toContainText('Listening');await page.getByRole('button',{name:'Stop and send'}).click();
 await expect(page.locator('dialog')).toContainText('LP-8042, LP-8047');await expect(page.locator('.assistant-message')).toContainText('पुष्टि');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
});

test('stale confirmation errors are visible inside the review',async({page})=>{
 await page.route('**/api/confirm',route=>route.fulfill({status:409,contentType:'application/json',body:'{"error":"Orders changed. Prepare a fresh confirmation."}'}));
 await page.goto('/today');await page.getByRole('button',{name:'Ask Launchpad'}).click();await page.getByRole('textbox',{name:'Type a question'}).fill('Mark order LP 8042 packed');await page.locator('.voice-controls button.primary').click();
 await page.getByRole('button',{name:'Confirm update'}).click();await expect(page.locator('dialog [role="alert"]')).toContainText('Orders changed');await page.getByRole('button',{name:'Cancel',exact:true}).click();
});
