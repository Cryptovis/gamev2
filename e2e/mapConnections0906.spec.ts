import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';

for(const active of [true,false])test(`relation map preserves colors with active=${active} and archived contracts`,async({page})=>{
 const s=campaignFixture('en');s.mapMode='relations';s.selectedCountryId=null;
 s.tradeDeals={trade:{id:'trade',sellerId:'FRA',buyerId:'TUR',resource:'food',quantityPerDay:1,pricePerUnit:.01,active}};
 s.industrialContracts={contract:{id:'contract',sellerId:'TUR',buyerId:'DEU',good:'steel',quantity:1,price:.01,nextDeliveryDay:30,expiresDay:365,active,missedDeliveries:0}};
 s.embassies={france:{id:'france',countryA:'TUR',countryB:'FRA',openedDay:1,level:1},spain:{id:'spain',countryA:'ESP',countryB:'TUR',openedDay:1,level:1}};
 s.countries.TUR.diplomacy.relations.DEU.treaties=[];
 await resumeFixture(page,s);
 const country=(name:string)=>page.locator('.country-shape').filter({has:page.locator('title',{hasText:new RegExp(`^${name}$`)})}).first();
 await expect(country('France')).toHaveAttribute('fill',active?'#4ca775':'#599fc9');
 await expect(country('Germany')).toHaveAttribute('fill',active?'#4ca775':'#526f80');
 await expect(country('Spain')).toHaveAttribute('fill','#599fc9');
 await page.locator('.strategy-svg').focus();await page.keyboard.press('ArrowRight');
 await expect(country('France')).toHaveAttribute('fill',active?'#4ca775':'#599fc9');
});

test('Supply renders extra supplier rows only while their disclosure is open',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));await page.locator('[data-guide="rail-supply"]').click();
 const details=page.locator('#resource-command-window .trade-more').first();
 await expect(details).toBeVisible();await expect(details.locator('.trade-row')).toHaveCount(0);
 const summary=details.locator('summary');await summary.click();
 await expect.poll(()=>details.locator('.trade-row').count()).toBeGreaterThan(0);
 const name=await details.locator('.trade-row').first().textContent();
 await summary.click();await expect(details.locator('.trade-row')).toHaveCount(0);
 await summary.focus();await page.keyboard.press('Enter');await expect(details.locator('.trade-row').first()).toHaveText(name!);
});
