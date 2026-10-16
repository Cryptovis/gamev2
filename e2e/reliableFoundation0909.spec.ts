import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture,openNation} from './seedCampaign';
import {applyGameCommand} from '../src/engine/commands';
import {withWarFuel} from '../src/tests/warFixture';
import {queueVictory} from '../src/engine/systems/victory';
import {initialFactions} from '../src/engine/systems/factions';
import {continueCampaign} from './helpers/enterAsGuest';

for(const language of ['en','tr','es','zh','ru'] as const)for(const kind of ['victory','crisis'] as const)test(`${language} ${kind} captures keyboard focus and traps both Tab directions`,async({page})=>{
 let s=campaignFixture(language);
 if(kind==='victory'){
  s=applyGameCommand(withWarFuel(s),{type:'military/declareWar',targetCountryId:'GRC'});
  const id=Object.keys(s.wars)[0];s.wars[id].status='victory';s=queueVictory(s,id);
 }else{
  const c=s.countries.TUR;c.politics.factions={...initialFactions(c),crisis:{openedDay:s.day,deadlineDay:s.day+45}};
 }
 await resumeFixture(page,s);
 const dialog=page.locator(kind==='victory'?'.victory-scroll':'.event-modal');
 await expect(dialog).toBeVisible();await expect(dialog).toHaveAttribute('aria-modal','true');await expect(dialog).toHaveAccessibleName((await dialog.locator(kind==='victory'?'h1':'.panel-kicker').innerText()).trim());
 await expect.poll(()=>dialog.evaluate(node=>node.contains(document.activeElement))).toBe(true);
 const controls=dialog.locator('button:not(:disabled),a[href]');
 await controls.last().focus();await page.keyboard.press('Tab');await expect(controls.first()).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(controls.last()).toBeFocused();
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
 await expect(page.locator('.country-shape').first()).toBeAttached();
});

test('hidden country panel is absent from the accessibility tree and restores keyboard focus',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));await openNation(page);
 const panel=page.locator('.command-panel');await expect(panel).toBeVisible();
 await page.locator('[data-guide="tab-power"]').click();await expect(page.locator('.country-dossier-window')).toBeVisible();await expect(panel).toBeHidden();await expect(panel).toHaveCount(1);
 expect(await panel.ariaSnapshot()).toBe('');
 const button=panel.locator('button').first();await button.evaluate(node=>(node as HTMLElement).focus());await expect(button).not.toBeFocused();
 await page.keyboard.press('Escape');await expect(panel).toBeVisible();
 await expect(page.locator('[data-guide="tab-power"]')).toBeFocused();
});

test('real IndexedDB manual save and resume preserve optional country fields',async({page})=>{
 const s=campaignFixture('en');s.countries.TUR.politics.factions={...initialFactions(s.countries.TUR),terms:2};s.countries.TUR.demographics.welfare=84.5;s.countries.TUR.eventFlags={phase1:s.day};s.countries.CYP.annexedBy='TUR';s.countries.CYP.controllerCountryId='TUR';s.countries.IRN.globalSanctions=true;s.countries.IRN.globalSanctionsUntil=s.day+60;
 await resumeFixture(page,s);
 for(let cycle=0;cycle<2;cycle++){
  await page.locator('.leader-avatar-button').click();await page.locator('.profile-tabs button').last().click();await page.getByRole('button',{name:/SAVE CAMPAIGN/}).click();await expect(page.locator('.campaign-save-status')).toContainText('Saved Day');
  const countries=await page.evaluate(async()=>{
   const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('alpyx-global-command');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
   const rows=await new Promise<any[]>((resolve,reject)=>{const r=db.transaction('saves').objectStore('saves').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();return rows.sort((a,b)=>b.updatedAt-a.updatedAt)[0].state.countries;
 });
 expect(countries).toEqual(s.countries);
 await page.reload();await continueCampaign(page);await expect(page.locator('.leader-avatar-button')).toBeVisible();
 }
});
