import {test,expect} from '@playwright/test';
import {languageScripts} from '../src/lib/language-scripts';

for(const language of ['hi','bn','mr','ta','te','gu','kn','ml','pa'])test(`${language} translates pages, forms and confirmations while keeping record values correct`,async({page})=>{
 const script=languageScripts[language];const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(code=>localStorage.setItem('lp-language',code),language);
 await page.goto('/today');await expect(page.locator('.page-heading h1')).toHaveText(script);
 await expect(page.locator('html')).toHaveAttribute('lang',language);
 await expect(page.locator('.queue-row.urgent')).not.toContainText('orders ready for dispatch');
 await expect(page.locator('.queue-row.urgent')).toContainText('4');
 for(const route of ['/orders','/catalogue','/inventory','/demand','/payments','/support','/onboarding','/commitment','/operations','/settings']){
  await page.evaluate(path=>window.history.pushState(null,'',path),route);
  await expect(page.locator('.page-heading h1')).toHaveText(script);
  await expect(page.locator('main')).not.toContainText('Sample settlement records.');
 }
 await page.evaluate(()=>window.history.pushState(null,'','/inventory'));
 await page.locator('tbody tr').first().getByRole('button').click();
 await expect(page.locator('dialog h2')).toHaveText(script);
 await expect(page.locator('dialog')).not.toContainText('New stock on hand');
 await page.locator('dialog input[name="stock"]').fill('52');
 await page.locator('dialog input[name="reason"]').fill('Regional test');
 await page.locator('dialog form button.primary').click();
 await expect(page.locator('dialog')).toContainText('52');
 await expect(page.locator('dialog')).not.toContainText('Confirm update');
 await page.locator('dialog .button-row button.primary').click();
 await expect(page.locator('dialog')).not.toBeVisible();
 const state=await(await page.request.get('/api/state')).json();expect(state.products[0].stock).toBe(52);
 await page.evaluate(()=>window.history.pushState(null,'','/catalogue'));
 await page.locator('.catalogue-product').first().locator('.button-row button').first().click();
 await expect(page.locator('dialog select[name="status"]')).toHaveValue('Active');
 await expect(page.locator('dialog select[name="status"] option[value="Active"]')).toHaveText(script);
 await page.locator('dialog .dialog-title button').click();
 await page.locator('.header-actions .voice-mode').click();
 await expect(page.locator('.voice-guide summary')).toHaveText(script);
 await expect(page.locator('.voice-controls textarea')).toHaveAttribute('placeholder',script);
 await page.setViewportSize({width:390,height:900});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('tour completes and restores the route and Factory Mode without business mutations',async({page})=>{
 const writes:string[]=[];page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/'))writes.push(request.url());});
 await page.goto('/inventory');await expect(page.locator('main h1')).toHaveText('Stock');
 await page.getByRole('button',{name:'Product tour',exact:true}).click();
 await expect(page.locator('.tour-panel h2')).toHaveText('Your daily workspace');
 await page.locator('.tour-panel button.primary').click();
 await expect(page.locator('.factory-toggle')).toHaveAttribute('aria-pressed','true');
 for(let i=0;i<4;i++)await page.locator('.tour-panel button.primary').click();
 await expect(page.locator('.tour-panel h2')).toHaveText('Support and low-data fallback');
 await page.locator('.tour-panel button.primary').click();
 await expect(page.locator('.tour-panel')).toHaveCount(0);await expect(page).toHaveURL(/\/inventory$/);
 await expect(page.locator('.factory-toggle')).toHaveAttribute('aria-pressed','false');
 expect(writes).toEqual([]);
 await page.getByRole('button',{name:'Product tour',exact:true}).click();await page.keyboard.press('Escape');
 await expect(page.locator('.tour-panel')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Product tour',exact:true})).toBeFocused();
});
