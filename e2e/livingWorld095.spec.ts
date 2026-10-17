import {test,expect,type Page} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {applyGameCommand} from '../src/engine/commands';
import {withWarFuel} from '../src/tests/warFixture';

/** Phase 9.5 stage 2: alpine relief, trade lanes, war fronts with combat effects, and landmark capital pins. Presentation only. */
type Theme='dark'|'light';
const deal=(id:string,sellerId:string,buyerId:string,resource:string)=>({id,sellerId,buyerId,resource,quantityPerDay:5,pricePerUnit:10,active:true});

function worldFixture(){
 // A war with Greece (land border, so a real front), three trade deals (sea, air and an embargoed pair) and a sanction with Russia.
 let s=applyGameCommand(withWarFuel(campaignFixture('en')),{type:'military/declareWar',targetCountryId:'GRC'});
 s.selectedCountryId=null;
 s.tradeDeals={d1:deal('d1','SAU','CHN','oil'),d2:deal('d2','USA','JPN','uranium'),d3:deal('d3','FRA','DEU','iron')} as any;
 s.countries.TUR.diplomacy.relations.RUS={...(s.countries.TUR.diplomacy.relations.RUS??{score:0,status:'neutral',treaties:[]}),sanctions:true} as any;
 return s;
}
async function openWorld(page:Page,theme:Theme){
 await page.addInitScript(t=>localStorage.setItem('trp-appearance-v1',t),theme);
 await page.setViewportSize({width:1440,height:900});
 await resumeFixture(page,worldFixture());
 await expect(page.locator('.strategy-svg')).toBeVisible({timeout:45000});
}

for(const theme of ['dark','light'] as const)test(`9.5-S2 ${theme}: war front, troop chevrons and combat effects appear for an active war`,async({page})=>{
 await openWorld(page,theme);
 const svg=page.locator('.strategy-svg');
 await expect(svg.locator('[data-layer="frontlines"]')).toBeAttached();
 const front=svg.locator('.frontline').first();
 await expect(front).toBeAttached();
 await expect(front.locator('.front-atk')).toHaveAttribute('d',/^M/);
 expect(Number(await front.getAttribute('data-attacker-level'))).toBeGreaterThanOrEqual(1);
 expect(Number(await front.getAttribute('data-defender-level'))).toBeLessThanOrEqual(5);
 await expect(svg.locator('[data-layer="combat-fx"] .combat-fx').first()).toBeAttached();
 expect(await svg.locator('[data-layer="frontlines"]').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
});

for(const theme of ['dark','light'] as const)test(`9.5-S2 ${theme}: trade lanes carry ships and cargo aircraft, and sanctions draw a blockade`,async({page})=>{
 await openWorld(page,theme);
 const trade=page.locator('.strategy-svg [data-layer="trade"]');
 await expect(trade).toBeAttached();
 expect(Number(await trade.getAttribute('data-sea'))).toBeGreaterThanOrEqual(1);
 expect(Number(await trade.getAttribute('data-air'))).toBeGreaterThanOrEqual(1);
 await expect(trade.locator('.trade-carrier.carrier-sea').first()).toBeAttached();
 await expect(trade.locator('.trade-carrier.carrier-air').first()).toBeAttached();
 await expect(trade.locator('.trade-route.is-sanctioned').first()).toBeAttached();
 await expect(trade.locator('.blockade').first()).toBeAttached();
 expect(await trade.locator('.trade-route.is-sanctioned .trade-line').first().evaluate(el=>getComputedStyle(el).strokeDasharray)).not.toBe('none');
 // Carriers actually move: sample one twice.
 const carrier=trade.locator('.trade-carrier.carrier-sea').first();
 const before=await carrier.getAttribute('transform');
 await expect.poll(async()=>carrier.getAttribute('transform'),{timeout:6000,intervals:[400]}).not.toBe(before);
});

test('9.5-S2 the player capital shows its landmark, not the generic pin',async({page})=>{
 await openWorld(page,'dark');
 const pin=page.locator('.capital-pin[data-capital="TUR"]');
 await expect(pin).toBeAttached();
 await expect(pin.locator('use[data-landmark="lm-anitkabir"]')).toBeAttached();
 await expect(pin.locator('use[href="#capital-building"]')).toHaveCount(0);
});

for(const theme of ['dark','light'] as const)test(`9.5-S2 ${theme}: zooming in near Turkey reveals snow-capped relief`,async({page})=>{
 await openWorld(page,theme);
 const svg=page.locator('.strategy-svg');
 // At world zoom the relief is hidden; closing in adds peaks.
 await expect(svg.locator('[data-layer="mountains"]')).toHaveCount(0);
 await svg.focus();await page.keyboard.press('Home');
 for(let i=0;i<9;i++)await page.keyboard.press('+');
 const layer=svg.locator('[data-layer="mountains"]');
 await expect(layer).toBeAttached({timeout:15000});
 expect(Number(await layer.getAttribute('data-peaks'))).toBeGreaterThan(0);
 await expect(layer.locator('.peak-snow')).toHaveAttribute('d',/^M/);
 expect(await layer.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
});
