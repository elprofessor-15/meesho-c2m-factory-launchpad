import {expect,test} from '@playwright/test';

test('seller actions, planning, support handoff and assistant',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/today');
  await expect(page.getByRole('heading',{name:'Today’s work'})).toBeVisible();
  await expect(page.getByText('Independent prototype. Sample business data.')).toBeVisible();

  await page.goto('/orders?status=ready_to_ship&due=today');
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await page.getByRole('link',{name:'LP-8042',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Packing checklist'})).toBeVisible();
  await page.getByRole('button',{name:'Mark packed'}).click();
  await expect(page.locator('dialog')).toContainText('does not record courier handover');
  await page.getByRole('button',{name:'Confirm update'}).click();
  await expect(page.getByRole('status')).toContainText('Courier handover is still pending');

  await page.goto('/inventory');
  await page.getByRole('button',{name:'Adjust stock'}).first().click();
  await page.locator('dialog input[name="stock"]').fill('50');
  await page.locator('dialog input[name="reason"]').fill('Browser test batch receipt');
  await page.getByRole('button',{name:'Prepare request'}).click();
  await expect(page.locator('dialog .confirmation-copy')).toContainText('from 42 to 50 units');
  await page.getByRole('button',{name:'Confirm update'}).click();
  await expect(page.locator('tbody tr').first()).toContainText('50');
  await expect(page.locator('tbody tr').first()).toContainText('38');

  await page.goto('/demand?sku=SKU-101');
  const firstPlan=await page.locator('.forecast-metrics').innerText();
  await page.locator('.scenario-controls input[type="number"]').first().fill('240');
  await expect(page.locator('.forecast-explanation')).toContainText('240 detail visits / day');
  await expect(page.locator('.forecast-metrics')).not.toHaveText(firstPlan);
  await page.getByRole('button',{name:'Save scenario'}).click();
  await expect(page.locator('.scenario-row').first()).toContainText('240 visits/day');

  await page.goto('/support');
  await page.getByRole('button',{name:'Request a callback'}).click();
  await page.locator('dialog textarea[name="reason"]').fill('Playwright support request');
  await page.locator('dialog input[name="window"]').fill('Tomorrow afternoon');
  await page.getByRole('button',{name:'Prepare request'}).click();
  await expect(page.locator('dialog .confirmation-copy')).toContainText('Tomorrow afternoon');
  await page.getByRole('button',{name:'Confirm update'}).click();
  await expect(page.locator('.support-row').filter({hasText:'Playwright support request'})).toBeVisible();

  await page.goto('/operations');
  const request=page.locator('.ops-request').filter({hasText:'Playwright support request'});
  await request.getByRole('button',{name:'Update request'}).click();
  await page.locator('dialog input[name="owner"]').fill('Test executive');
  await page.locator('dialog select[name="status"]').selectOption('Resolved');
  await page.locator('dialog textarea[name="notes"]').fill('Follow-up guidance provided.');
  await page.getByRole('button',{name:'Save changes'}).click();
  await expect(page.locator('dialog')).not.toBeVisible();
  await expect(page.locator('.ops-request').filter({hasText:'Playwright support request'})).toContainText('Resolved');

  await page.getByLabel('Interface language').selectOption('hi');
  await page.goto('/today');
  await expect(page.getByRole('link',{name:/आज/})).toBeVisible();
  await page.route('**/api/assistant',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'आज 3 ऑर्डर भेजने हैं।',spoken:'आज 3 ऑर्डर भेजने हैं।',provider:'mock',records:[]})}));
  await page.setViewportSize({width:390,height:844});
  await page.locator('.floating-mic').click();
  await expect(page.locator('.assistant')).toBeVisible();
  await page.locator('.voice-controls textarea').fill('Aaj kitne orders bhejne hain?');
  await page.locator('.voice-controls button.primary').click();
  await expect(page.locator('.message.assistant-message').last()).toContainText(/orders|ऑर्डर|groq/i,{timeout:30000});
  await expect(page.locator('.voice-controls textarea')).toBeVisible();
});

test('microphone denial preserves the typed assistant path and mobile has no page overflow',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>Promise.reject(new DOMException('Permission denied','NotAllowedError'))}});
  });
  await page.setViewportSize({width:390,height:844});
  await page.goto('/today');
  await page.getByRole('button',{name:'Ask Launchpad'}).click();
  await page.getByRole('button',{name:'Record'}).click();
  await expect(page.locator('.voice-controls [role="alert"]')).toContainText('permission denied');
  await expect(page.getByRole('textbox',{name:'Type a question'})).toBeEnabled();
  const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
});

test('a Hindi voice transcript drives Hindi assistant and speech language',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>new MediaStream()}});
    class TestMediaRecorder {
      static isTypeSupported(){return true;}
      state='inactive';
      mimeType='audio/webm;codecs=opus';
      ondataavailable:((event:{data:Blob})=>void)|null=null;
      onstop:(()=>void)|null=null;
      onerror:(()=>void)|null=null;
      constructor(){}
      start(){this.state='recording';setTimeout(()=>this.ondataavailable?.({data:new Blob(['audio'],{type:this.mimeType})}),5);}
      stop(){if(this.state==='recording'){this.state='inactive';this.onstop?.();}}
    }
    Object.defineProperty(window,'MediaRecorder',{configurable:true,value:TestMediaRecorder});
  });
  let requestedLanguage='';
  await page.route('**/api/stt',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'Aaj kitne orders bhejne hain?',language:'hin',provider:'elevenlabs'})}));
  await page.route('**/api/assistant',async route=>{requestedLanguage=route.request().postDataJSON().language;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'आज 4 ऑर्डर भेजने हैं।',spoken:'आज 4 ऑर्डर भेजने हैं।',language:'hi',provider:'mock',records:[]})});});
  await page.setViewportSize({width:390,height:844});
  await page.goto('/today');
  await page.getByRole('button',{name:'Ask Launchpad'}).click();
  await page.getByRole('button',{name:'Record'}).click();
  await expect(page.locator('.voice-status')).toContainText('Listening');
  await page.getByRole('button',{name:'Stop and review'}).click();
  await expect(page.locator('.voice-controls textarea')).toHaveValue('Aaj kitne orders bhejne hain?');
  await page.locator('.voice-controls button.primary').click();
  await expect(page.locator('.message.assistant-message').last()).toContainText('आज 4 ऑर्डर');
  expect(requestedLanguage).toBe('hi');
});

test('demand chart shows complete actual and forecast series in both modes',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/demand?sku=SKU-101');
  await expect(page.getByText('Cumulative actuals')).toBeVisible();
  const cumulative=await page.evaluate(()=>({
    axis:[...document.querySelectorAll('.forecast-chart svg text')].map(node=>node.textContent),
    lines:[...document.querySelectorAll('.recharts-line-curve')].map(node=>({length:node.getAttribute('d')?.length??0,dash:node.getAttribute('stroke-dasharray')})),
    band:document.querySelector('.recharts-area-area')?.getAttribute('d')?.length??0,
  }));
  expect(cumulative.axis).toContain('-14');
  expect(cumulative.lines.length).toBeGreaterThanOrEqual(2);
  expect(cumulative.lines.every(line=>line.length>100&&!line.dash?.includes('px'))).toBe(true);
  expect(cumulative.band).toBeGreaterThan(100);
  await page.getByRole('button',{name:'Daily'}).click();
  await expect(page.getByText('Daily sample actuals')).toBeVisible();
  const daily=await page.locator('.recharts-line-curve').evaluateAll(paths=>paths.map(path=>path.getAttribute('d')?.length??0));
  expect(daily.length).toBeGreaterThanOrEqual(2);
  expect(daily.every(length=>length>60)).toBe(true);
});