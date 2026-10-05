import {test,expect} from '@playwright/test';

test('workspace tabs and filters work without server navigation or reloading data',async({page})=>{
 let stateReads=0;const navigationRequests:string[]=[];
 page.on('request',request=>{if(request.url().endsWith('/api/state'))stateReads++;});
 await page.goto('/today');await expect(page.getByRole('heading',{name:'Today’s work'})).toBeVisible();
 await page.evaluate(()=>Reflect.set(window,'workspaceMarker','same workspace'));
 const initialReads=stateReads;
 await page.route('**/*',route=>{
  const request=route.request();
  if(request.isNavigationRequest()||request.headers().rsc==='1'){navigationRequests.push(request.url());return route.abort();}
  return route.continue();
 });
 await page.locator('.sidebar nav').getByRole('link',{name:/Orders/}).click();
 await expect(page).toHaveURL(/\/orders$/);await expect(page.locator('main h1')).toHaveText('Orders');
 await page.getByRole('button',{name:'Packed',exact:true}).click();
 await expect(page).toHaveURL(/status=packed/);
 await page.locator('.sidebar nav').getByRole('link',{name:'Stock',exact:true}).click();
 await expect(page.locator('main h1')).toHaveText('Stock');
 await page.goBack();await expect(page).toHaveURL(/status=packed/);
 await expect(page.getByRole('button',{name:'Packed',exact:true})).toHaveClass('active');
 await page.locator('.header-actions .voice-mode').click();
 await page.getByRole('textbox',{name:'Type a question'}).fill('My question stays here');
 await page.locator('.sidebar nav').getByRole('link',{name:'Payments',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Type a question'})).toHaveValue('My question stays here');
 expect(await page.evaluate(()=>Reflect.get(window,'workspaceMarker'))).toBe('same workspace');
 expect(stateReads).toBe(initialReads);expect(navigationRequests).toEqual([]);
});

test('Factory Mode opens batches immediately and stays consistent on reload and language changes',async({page})=>{
 await page.goto('/today');await expect(page.locator('main h1')).toHaveText('Today’s work');
 const toggle=page.getByRole('button',{name:'Factory Mode',exact:true});
 await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');
 await expect(page).toHaveURL(/\/orders\?view=batches$/);
 await expect(page.getByRole('heading',{name:'One packing run. Every order accounted for.'})).toBeVisible();
 await expect(page.locator('.sidebar nav a')).toHaveCount(5);
 await page.locator('.sidebar nav').getByRole('link',{name:'Today',exact:true}).click();
 await expect(page.locator('main h1')).toHaveText('Today’s work');
 await page.locator('.sidebar nav').getByRole('link',{name:/Orders/}).click();
 await expect(page.getByRole('heading',{name:'One packing run. Every order accounted for.'})).toBeVisible();
 await page.goto('/today');await expect(page).toHaveURL(/\/orders\?view=batches$/);
 await page.getByLabel('Interface language').selectOption('hi');
 await expect(page.getByRole('button',{name:'फैक्टरी मोड',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.voice-mode')).toHaveText('बोलकर काम करें');
 await expect(page.locator('html')).toHaveAttribute('lang','hi');
 await page.getByRole('button',{name:'फैक्टरी मोड',exact:true}).click();
 await expect(page).toHaveURL(/view=individual/);await expect(page.locator('.batch-row')).toHaveCount(0);
 await expect(page.locator('.sidebar nav a')).toHaveCount(7);
 await page.reload();await expect(page.getByRole('button',{name:'फैक्टरी मोड',exact:true})).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('html')).toHaveAttribute('lang','hi');
});

test('mode and language controls remain visible on small screens',async({page})=>{
 await page.goto('/today');await expect(page.locator('main h1')).toBeVisible();
 for(const width of [1440,1024,768,390,320]){
  await page.setViewportSize({width,height:900});
  for(const language of ['en','hi','ta']){
   await page.getByLabel('Interface language').selectOption(language);
   await expect(page.locator('.header-actions .factory-toggle')).toBeVisible();
   await expect(page.locator('.header-actions .voice-mode')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${width} ${language}`).toBe(true);
  }
 }
});

test('Factory Mode and language changes sync across browser tabs',async({page,context})=>{
 await page.goto('/today');await expect(page.getByRole('heading',{name:'Today’s work'})).toBeVisible();
 const other=await context.newPage();await other.goto('/today');await expect(other.getByRole('heading',{name:'Today’s work'})).toBeVisible();
 await page.getByRole('button',{name:'Factory Mode',exact:true}).click();
 await expect(other).toHaveURL(/view=batches/);
 await expect(other.getByRole('button',{name:'Factory Mode',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('Interface language').selectOption('hi');
 await expect(other.getByLabel('Interface language')).toHaveValue('hi');
 await expect(other.locator('html')).toHaveAttribute('lang','hi');
 await page.getByRole('button',{name:'फैक्टरी मोड',exact:true}).click();
 await expect(other).toHaveURL(/view=individual/);
 await expect(other.getByRole('button',{name:'फैक्टरी मोड',exact:true})).toHaveAttribute('aria-pressed','false');
});

test('SMS links open from an already mounted batch screen',async({page})=>{
 await page.goto('/orders?view=batches');await expect(page.locator('.factory-banner')).toBeVisible();
 await page.evaluate(()=>window.history.pushState(null,'','/orders?view=batches&sms=1'));
 await expect(page.getByRole('heading',{name:'SMS reply simulator'})).toBeVisible();
 await page.locator('dialog').getByRole('button',{name:'Close',exact:true}).click();
 await expect(page.locator('dialog')).not.toBeVisible();await expect(page).toHaveURL(/\/orders\?view=batches$/);
});
