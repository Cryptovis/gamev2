import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
import {resumeFixture} from '../e2e/seedCampaign';
import {distribution,measuredCampaign} from './campaign';

async function paint(page:Page) {
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
}
async function clickToPaint(page:Page,selector:string) {
 return page.evaluate(selector=>new Promise<number>(resolve=>{
  const element=document.querySelector<HTMLElement>(selector);if(!element)throw new Error(`Missing ${selector}`);
  const started=performance.now();element.click();requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-started)));
 }),selector);
}
test('measure cold entry, saved campaign resume, menus and map camera',async({browser})=>{
 let context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const cold:number[]=[];
 for(let i=0;i<5;i++){
  const session=await context.newCDPSession(page);await session.send('Network.enable');await session.send('Network.setCacheDisabled',{cacheDisabled:true});
  await page.goto('/');await expect(page.locator('[data-entry="demo"]')).toBeVisible();await paint(page);
  cold.push(await page.evaluate(()=>performance.now()));await session.detach();
 }
 const reports=[];
 for(const days of [0,365,1095]){
  await context.close();context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const state=measuredCampaign(days);state.mapMode='relations';
  await resumeFixture(page,state);await expect(page.locator('.country-shape').first()).toBeAttached();await paint(page);
  const resume:number[]=[];
  for(let i=0;i<3;i++){
   await page.reload();await expect(page.locator('.load-previous')).toBeEnabled();
   await page.evaluate(()=>performance.mark('resume-start'));await clickToPaint(page,'.load-previous');await expect(page.locator('.country-shape').first()).toBeAttached();await paint(page);resume.push(await page.evaluate(()=>performance.now()-performance.getEntriesByName('resume-start').at(-1)!.startTime));
  }
  const menus:Record<string,ReturnType<typeof distribution>>={};
  for(const [name,selector,target] of [['market','[data-guide="rail-market"]','#market-window'],['world','[data-guide="rail-world"]','#pulse-window'],['supply','[data-guide="rail-supply"]','#resource-command-window']]){
   const times:number[]=[];
   for(let i=0;i<6;i++){const duration=await clickToPaint(page,selector);await expect(page.locator(target)).toBeVisible();if(i>0)times.push(duration);await page.keyboard.press('Escape');await paint(page);}
   menus[name]=distribution(times);
  }
  const map=page.locator('.strategy-svg');await map.focus();
  const camera:number[]=[];
  for(let i=0;i<12;i++)camera.push(await page.evaluate(i=>new Promise<number>(resolve=>{
   const start=performance.now();document.querySelector('.strategy-svg')!.dispatchEvent(new KeyboardEvent('keydown',{key:i%2?'ArrowLeft':'ArrowRight',bubbles:true}));requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-start)));
  }),i));
  const session=await context.newCDPSession(page);await session.send('Performance.enable');const metrics=await session.send('Performance.getMetrics');await session.detach();
  console.log(`Measured campaign day ${state.day}`);
  reports.push({days,day:state.day,tradeDeals:Object.keys(state.tradeDeals).length,contracts:Object.keys(state.industrialContracts).length,resumeToMapPaintMs:distribution(resume),menuClickToPaintMs:menus,cameraKeyToPaintMs:distribution(camera),metrics:metrics.metrics.filter(m=>['JSHeapUsedSize','Nodes'].includes(m.name))});
 }
 expect(errors).toEqual([]);
 mkdirSync('performance/results',{recursive:true});writeFileSync(`performance/results/browser-${(process.env.PERFORMANCE_LABEL??'current').replace(/[^a-zA-Z0-9_-]/g,'_')}.json`,JSON.stringify({version,browser:browser.version(),viewport:{width:1440,height:900},coldEntryToPaintMs:distribution(cold),reports},null,2)+'\n');
 await context.close();
});
