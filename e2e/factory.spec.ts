import {test,expect} from '@playwright/test';

test('factory mode, batch confirmation, readiness and bounded commitment persist',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/today');
 await page.getByRole('button',{name:/Factory Mode/}).click();
 await expect(page.locator('.sidebar nav a')).toHaveCount(5);
 await page.goto('/orders');
 await expect(page.getByRole('heading',{name:'One packing run. Every order accounted for.'})).toBeVisible();
 const row=page.locator('.batch-row').first();
 const batchId=await row.locator('small').first().innerText();
 await row.getByRole('button',{name:'Mark batch packed'}).click();
 await expect(page.locator('dialog')).toContainText('Pickup is not confirmed');
 await page.getByRole('button',{name:'Confirm update'}).click();
 await expect(page.locator('.batch-row').filter({hasText:batchId})).toHaveCount(0);
 await page.goto('/commitment');
 await expect(page.locator('.decision-word')).toHaveText('Hold');
 await expect(page.getByRole('button',{name:'Review 0-unit commitment'})).toBeDisabled();
 await page.getByRole('button',{name:'Edit operating setup'}).click();
 await page.getByLabel('Physical packing owner').fill('Sample packing worker');
 await page.getByLabel('Packing capacity in parcels/day').fill('60');
 await page.getByLabel('First catalogue checked').check();
 await page.getByLabel('Packing and labels checked').check();
 await page.getByLabel('Pickup arrangement reviewed').check();
 await page.getByRole('button',{name:'Save operating setup'}).click();
 await expect(page.locator('dialog')).not.toBeVisible();
 await expect(page.locator('.decision-word')).toHaveText(/Replenish|Test/);
 await page.locator('.commitment-decision button').click();
 await expect(page.locator('dialog')).toContainText('No minimum orders are guaranteed');
 await page.getByRole('button',{name:'Confirm update'}).click();
 await expect(page.locator('.commitment-history')).toHaveCount(1);
 await page.reload();
 await expect(page.locator('.commitment-history')).toHaveCount(1);
 await page.getByRole('button',{name:'Record today’s workload'}).click();
 await page.getByLabel('Owner minutes',{exact:true}).fill('12');
 await page.getByLabel('Worker minutes',{exact:true}).fill('45');
 await page.getByLabel('Task errors',{exact:true}).fill('1');
 await page.getByLabel('Observation note').fill('Measured a sample preparation run.');
 await page.getByRole('button',{name:'Save workload observation'}).click();
 await expect(page.locator('.workload-section')).toContainText('1 self-reported work observations');
});

test('new workspaces render without overflow at laptop, tablet and mobile widths',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,1024,768,390]){
  await page.setViewportSize({width,height:1000});
  for(const route of ['/today','/orders?view=batches','/commitment','/support']){
   await page.goto(route);await expect(page.locator('.page-heading h1')).toBeVisible();
   const overflow=await page.evaluate(()=>Array.from(document.querySelectorAll('main *')).filter(el=>el.getBoundingClientRect().right>window.innerWidth+1).map(el=>el.className).slice(0,8));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${route} at ${width}: ${overflow.join(', ')}`).toBe(true);
   if(width===1440||width===390)await page.screenshot({path:`test-results/${route.split('?')[0].slice(1)}-${width}.png`,fullPage:true});
  }
 }
 expect(errors).toEqual([]);
});

test('SMS simulator rejects ambiguous replies without writes',async({page})=>{
 await page.goto('/orders?view=batches');
 await page.getByRole('button',{name:'SMS simulator'}).click();
 await page.getByLabel('Simulated reply').fill('DISPATCH');
 await page.getByRole('button',{name:'Validate reply and preview'}).click();
 await expect(page.locator('dialog [role="alert"]')).toContainText('exact pending batch ID');
 await expect(page.locator('dialog')).toContainText('No SMS is sent or received');
});
